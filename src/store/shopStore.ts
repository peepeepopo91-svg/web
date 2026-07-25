// ─── Shop Store — Client-side cache ────────────────────────────────────────────
// Thin in-memory/localStorage cache for shop data.

import type { ShopItem, Purchase } from '../data/shop'

const ITEMS_KEY     = 'bn_shop_items'
const PURCHASES_KEY = 'bn_shop_purchases'

function safeGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ─── Shop items cache ─────────────────────────────────────────────────────────

export function getCachedShopItems(): ShopItem[] {
  return safeGet<ShopItem[]>(ITEMS_KEY) ?? []
}

export function cacheShopItems(items: ShopItem[]): void {
  safeSet(ITEMS_KEY, items)
}

// ─── User purchases cache ─────────────────────────────────────────────────────

export function getCachedPurchases(): Purchase[] {
  return safeGet<Purchase[]>(PURCHASES_KEY) ?? []
}

export function cachePurchases(purchases: Purchase[]): void {
  safeSet(PURCHASES_KEY, purchases)
}

export function clearShopCache(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(ITEMS_KEY)
    localStorage.removeItem(PURCHASES_KEY)
  } catch { /* ok */ }
}
