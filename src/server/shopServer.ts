// ─── Shop Server Functions ─────────────────────────────────────────────────────
// All purchases are server-authoritative. Gem deductions and purchase creation
// happen atomically on the server. Every write calls broadcastShopUpdate() and
// scheduleBackup() so data is live-synced and GitHub-backed.

import { createServerFn }    from '@tanstack/react-start'
import { z }                  from 'zod'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { resolve }            from 'node:path'
import { broadcastShopUpdate, broadcastMiningUpdate } from './sseRegistry'
import { scheduleBackup }     from './miningBackup'
import type { ShopItem, Purchase, ShopPurchasesFile, PurchaseStatus } from '../data/shop'
import type { User }          from '../data/mining'

const DATA_DIR = resolve('data')

// ─── In-progress purchase lock (anti-double-purchase) ─────────────────────────
const purchaseInProgress = new Set<string>()

// ─── File I/O helpers ─────────────────────────────────────────────────────────

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8')) as T
  } catch {
    return null
  }
}

function atomicWrite(file: string, data: unknown): void {
  mkdirSync(DATA_DIR, { recursive: true })
  const content = JSON.stringify(data, null, 2)
  const target  = resolve(DATA_DIR, file)
  const tmp     = `${target}.tmp`
  writeFileSync(tmp, content, 'utf8')
  renameSync(tmp, target)
}

function loadShopItems(): ShopItem[] {
  return readJson<ShopItem[]>('shop-items.json') ?? []
}

function loadPurchases(): ShopPurchasesFile {
  return readJson<ShopPurchasesFile>('shop-purchases.json') ?? { purchases: [] }
}

function loadMiningUsers(): Record<string, User> {
  return readJson<Record<string, User>>('mining-users.json') ?? {}
}

function saveMiningUsers(users: Record<string, User>): void {
  atomicWrite('mining-users.json', users)
}

function savePurchases(data: ShopPurchasesFile): void {
  atomicWrite('shop-purchases.json', data)
}

function generatePurchaseId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = 'BT-'
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

// ─── Public: Get shop items ───────────────────────────────────────────────────

export const getShopItems = createServerFn({ method: 'GET' })
  .handler((): ShopItem[] => {
    return loadShopItems().filter(item => item.enabled)
  })

// ─── Public: Purchase an item ─────────────────────────────────────────────────

export const purchaseItem = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username: z.string().min(1),
    itemId:   z.string().min(1),
    quantity: z.number().int().min(1).max(99),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; purchase?: Purchase; error?: string }> => {
    const { username, itemId, quantity } = data
    const key = username.toLowerCase()

    // Anti-double-purchase lock
    if (purchaseInProgress.has(key)) {
      return { success: false, error: 'A purchase is already in progress. Please wait.' }
    }
    purchaseInProgress.add(key)

    try {
      const items = loadShopItems()
      const item  = items.find(i => i.id === itemId && i.enabled)
      if (!item) {
        return { success: false, error: 'Item not found or unavailable.' }
      }

      const totalCost = item.price * quantity

      // Load user and validate gems
      const users = loadMiningUsers()
      const user  = users[key]
      if (!user) {
        return { success: false, error: 'Account not found. Please log in to the mining panel first.' }
      }

      const gems = typeof user.gems === 'number' && isFinite(user.gems) ? user.gems : 0
      if (gems < totalCost) {
        return { success: false, error: `Not enough Gems. You have ${Math.floor(gems).toLocaleString()} ✦ but need ${totalCost.toLocaleString()} ✦.` }
      }

      // Validate purchase limit
      if (item.purchaseLimit !== null) {
        const purchases = loadPurchases()
        const userPurchaseCount = purchases.purchases.filter(
          p => p.username.toLowerCase() === key && p.itemId === itemId &&
               p.status !== 'cancelled' && p.status !== 'rejected'
        ).length
        if (userPurchaseCount >= item.purchaseLimit) {
          return { success: false, error: `You have reached the purchase limit for ${item.name}.` }
        }
      }

      // Deduct gems atomically
      const newGems = gems - totalCost
      users[key] = { ...user, gems: newGems }
      saveMiningUsers(users)

      // Create purchase record
      const now = Date.now()
      const purchase: Purchase = {
        id:          generatePurchaseId(),
        username:    user.username,
        itemId:      item.id,
        itemName:    item.name,
        category:    item.category,
        quantity,
        price:       item.price,
        totalCost,
        status:      'pending',
        createdAt:   now,
        updatedAt:   now,
        completedAt: null,
        staffNotes:  null,
        playerNotes: null,
        refunded:    false,
        refundedAt:  null,
      }

      const purchasesFile = loadPurchases()
      purchasesFile.purchases.unshift(purchase)
      savePurchases(purchasesFile)

      // Broadcast updates + backup
      broadcastShopUpdate()
      broadcastMiningUpdate()
      scheduleBackup()

      return { success: true, purchase }

    } finally {
      purchaseInProgress.delete(key)
    }
  })

// ─── Public: Get my purchases ─────────────────────────────────────────────────

export const getMyPurchases = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string().min(1) }))
  .handler(({ data }): Purchase[] => {
    const key = data.username.toLowerCase()
    const { purchases } = loadPurchases()
    return purchases
      .filter(p => p.username.toLowerCase() === key)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

// ─── Admin: Get all purchases ─────────────────────────────────────────────────

export const adminGetAllPurchases = createServerFn({ method: 'GET' })
  .handler((): Purchase[] => {
    return loadPurchases().purchases.sort((a, b) => b.createdAt - a.createdAt)
  })

// ─── Admin: Update purchase status ────────────────────────────────────────────

export const adminUpdatePurchase = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    purchaseId:  z.string(),
    status:      z.enum(['pending', 'processing', 'completed', 'cancelled', 'rejected']),
    staffNotes:  z.string().nullable().optional(),
    playerNotes: z.string().nullable().optional(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; purchase?: Purchase; error?: string }> => {
    const file = loadPurchases()
    const idx  = file.purchases.findIndex(p => p.id === data.purchaseId)
    if (idx === -1) {
      return { success: false, error: 'Purchase not found.' }
    }

    const purchase    = { ...file.purchases[idx] }
    const prevStatus  = purchase.status
    const now         = Date.now()

    // Auto-refund on cancel/reject (prevent duplicate refunds)
    const shouldRefund =
      (data.status === 'cancelled' || data.status === 'rejected') &&
      !purchase.refunded &&
      prevStatus !== 'cancelled' && prevStatus !== 'rejected'

    if (shouldRefund) {
      const users = loadMiningUsers()
      const key   = purchase.username.toLowerCase()
      if (users[key]) {
        const currentGems = typeof users[key].gems === 'number' && isFinite(users[key].gems)
          ? users[key].gems : 0
        users[key] = { ...users[key], gems: currentGems + purchase.totalCost }
        saveMiningUsers(users)
      }
      purchase.refunded   = true
      purchase.refundedAt = now
    }

    purchase.status      = data.status as PurchaseStatus
    purchase.updatedAt   = now
    if (data.status === 'completed') purchase.completedAt = now
    if (data.staffNotes  !== undefined) purchase.staffNotes  = data.staffNotes
    if (data.playerNotes !== undefined) purchase.playerNotes = data.playerNotes

    file.purchases[idx] = purchase
    savePurchases(file)

    broadcastShopUpdate()
    if (shouldRefund) broadcastMiningUpdate()
    scheduleBackup()

    return { success: true, purchase }
  })

// ─── Admin: Get all shop items (including disabled) ───────────────────────────

export const adminGetShopItems = createServerFn({ method: 'GET' })
  .handler((): ShopItem[] => loadShopItems())

// ─── Admin: Update a shop item ────────────────────────────────────────────────

export const adminUpdateShopItem = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    id:            z.string(),
    name:          z.string().optional(),
    description:   z.string().optional(),
    price:         z.number().int().min(1).optional(),
    icon:          z.string().optional(),
    enabled:       z.boolean().optional(),
    featured:      z.boolean().optional(),
    purchaseLimit: z.number().int().min(1).nullable().optional(),
    stock:         z.number().int().min(0).nullable().optional(),
  }))
  .handler(({ data }): { success: boolean; error?: string } => {
    const items = loadShopItems()
    const idx   = items.findIndex(i => i.id === data.id)
    if (idx === -1) return { success: false, error: 'Item not found.' }

    const { id: _id, ...updates } = data
    items[idx] = { ...items[idx], ...updates }
    atomicWrite('shop-items.json', items)

    return { success: true }
  })

// ─── Admin: Add a new shop item ───────────────────────────────────────────────

export const adminAddShopItem = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    id:            z.string().min(1),
    category:      z.enum(['ranks', 'crate-keys', 'amethyst-tools']),
    name:          z.string().min(1),
    description:   z.string(),
    price:         z.number().int().min(1),
    rarity:        z.number().int().min(1).max(6),
    icon:          z.string(),
    enabled:       z.boolean(),
    featured:      z.boolean(),
    purchaseLimit: z.number().int().min(1).nullable(),
    stock:         z.number().int().min(0).nullable(),
  }))
  .handler(({ data }): { success: boolean; error?: string } => {
    const items = loadShopItems()
    if (items.some(i => i.id === data.id)) {
      return { success: false, error: 'An item with this ID already exists.' }
    }
    items.push(data as ShopItem)
    atomicWrite('shop-items.json', items)
    return { success: true }
  })

// ─── Admin: Delete a shop item ────────────────────────────────────────────────

export const adminDeleteShopItem = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(({ data }): { success: boolean; error?: string } => {
    const items = loadShopItems()
    const filtered = items.filter(i => i.id !== data.id)
    if (filtered.length === items.length) {
      return { success: false, error: 'Item not found.' }
    }
    atomicWrite('shop-items.json', filtered)
    return { success: true }
  })

// ─── Admin: Shop dashboard stats ─────────────────────────────────────────────

export const adminGetShopStats = createServerFn({ method: 'GET' })
  .handler((): {
    total: number
    pending: number
    processing: number
    completed: number
    cancelled: number
    rejected: number
    totalGemsSpent: number
    recentPurchases: Purchase[]
    topItems: { itemName: string; count: number; gemsSpent: number }[]
    topBuyers: { username: string; count: number; gemsSpent: number }[]
  } => {
    const { purchases } = loadPurchases()

    const total      = purchases.length
    const pending    = purchases.filter(p => p.status === 'pending').length
    const processing = purchases.filter(p => p.status === 'processing').length
    const completed  = purchases.filter(p => p.status === 'completed').length
    const cancelled  = purchases.filter(p => p.status === 'cancelled').length
    const rejected   = purchases.filter(p => p.status === 'rejected').length

    const totalGemsSpent = purchases
      .filter(p => !p.refunded)
      .reduce((sum, p) => sum + p.totalCost, 0)

    const recentPurchases = purchases.slice(0, 10)

    // Top items
    const itemMap = new Map<string, { count: number; gemsSpent: number }>()
    for (const p of purchases.filter(p => !p.refunded)) {
      const cur = itemMap.get(p.itemName) ?? { count: 0, gemsSpent: 0 }
      itemMap.set(p.itemName, { count: cur.count + p.quantity, gemsSpent: cur.gemsSpent + p.totalCost })
    }
    const topItems = [...itemMap.entries()]
      .map(([itemName, v]) => ({ itemName, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top buyers
    const buyerMap = new Map<string, { count: number; gemsSpent: number }>()
    for (const p of purchases.filter(p => !p.refunded)) {
      const cur = buyerMap.get(p.username) ?? { count: 0, gemsSpent: 0 }
      buyerMap.set(p.username, { count: cur.count + 1, gemsSpent: cur.gemsSpent + p.totalCost })
    }
    const topBuyers = [...buyerMap.entries()]
      .map(([username, v]) => ({ username, ...v }))
      .sort((a, b) => b.gemsSpent - a.gemsSpent)
      .slice(0, 10)

    return { total, pending, processing, completed, cancelled, rejected, totalGemsSpent, recentPurchases, topItems, topBuyers }
  })
