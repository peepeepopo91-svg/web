// ─── BlueCoin Mining — Data Store (DB-Ready Layer) ────────────────────────────
// All persistence is via localStorage. To connect a real backend, replace each
// function body with a fetch() call — the signatures stay identical.

import type { User, CommunityBlock, UserRig, RigStatus, MiningReward } from '../data/mining'
import { MINING_CONSTANTS, RIG_TIERS, EXCHANGE_CONSTANTS } from '../data/mining'
import { markDirty } from './syncStore'

const USERS_KEY         = 'bn_mining_users'
const COMMUNITY_KEY     = 'bn_mining_community'
const CURRENT_USER_KEY  = 'bn_mining_session'
const ADMIN_ECONOMY_KEY = 'bn_admin_economy'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ─── Economy Overrides (Admin) ────────────────────────────────────────────────

export interface EconomyOverrides {
  BASE_RATE?:           number
  MIN_RATE?:            number
  MAX_RATE?:            number
  DAILY_TX_LIMIT?:      number
  FEE_PCT?:             number
  BLOCK_REWARD?:        number
  BLOCK_INTERVAL_MS?:   number
  FINDER_BONUS_PCT?:    number
  EQUAL_SPLIT_PCT?:     number
  HASHRATE_SHARE_PCT?:  number
  STARTING_BALANCE?:    number
}

export function getEconomyOverrides(): EconomyOverrides {
  return safeGet<EconomyOverrides>(ADMIN_ECONOMY_KEY) ?? {}
}

export function saveEconomyOverrides(overrides: EconomyOverrides, opts?: { silent?: boolean }) {
  safeSet(ADMIN_ECONOMY_KEY, overrides)
  if (!opts?.silent) markDirty('economy')
}

// ─── Community ────────────────────────────────────────────────────────────────

export function getCommunityState(): CommunityBlock {
  const saved = safeGet<CommunityBlock>(COMMUNITY_KEY)
  if (saved) return saved
  const initial: CommunityBlock = {
    blockNumber: 1,
    startedAt: Date.now(),
    lastSolvedAt: Date.now() - MINING_CONSTANTS.BLOCK_INTERVAL_MS,
    totalSolved: 0,
  }
  safeSet(COMMUNITY_KEY, initial)
  return initial
}

export function saveCommunityState(state: CommunityBlock) {
  safeSet(COMMUNITY_KEY, state)
}

// ─── Users ────────────────────────────────────────────────────────────────────

function getAllUsers(): Record<string, User> {
  return safeGet<Record<string, User>>(USERS_KEY) ?? {}
}

/** Export all users — for admin panel only */
export function getAllUsersForAdmin(): Record<string, User> {
  return getAllUsers()
}

function saveAllUsers(users: Record<string, User>) {
  safeSet(USERS_KEY, users)
}

/**
 * Single authoritative normalisation pass for a raw stored user object.
 *
 * Called by EVERY load site — client (localStorage) and server (disk) — so
 * that catchUpUser and all downstream code always receive clean, valid data.
 *
 * Rules:
 *  - miningExpiresAt
 *      null           → keep (explicitly no session; user must renew)
 *      valid future # → keep
 *      undefined/NaN/invalid → grant a fresh 12-hour window (pre-migration user)
 *  - miningRenewedAt: null/valid # → keep; anything else → null
 *  - balance / gems: NaN/null/undefined → 0
 *  - rig.durability: null/NaN/negative → tier.maxDurability (corrupted data recovery)
 *      Also resets rig to 'idle' so user can choose to restart it
 *  - exchangeUsedToday: non-integer or >100 → 0  (old shard-based schema)
 */
export function normalizeUser(raw: Record<string, unknown>, now: number): User {
  // ── Schema renames ─────────────────────────────────────────────────────────
  if ('shards' in raw && !('gems' in raw)) {
    raw.gems = raw.shards
    delete raw.shards
  }

  // ── Exchange counter ───────────────────────────────────────────────────────
  if (typeof raw.exchangeUsedToday === 'number' &&
      (!Number.isInteger(raw.exchangeUsedToday) || raw.exchangeUsedToday > 100)) {
    raw.exchangeUsedToday = 0
  }

  // ── Numeric balance fields ─────────────────────────────────────────────────
  if (typeof raw.balance !== 'number' || !isFinite(raw.balance)) raw.balance = 0
  if (typeof raw.gems    !== 'number' || !isFinite(raw.gems))    raw.gems    = 0

  // ── miningExpiresAt ────────────────────────────────────────────────────────
  const expiresRaw = raw.miningExpiresAt
  if (expiresRaw === null) {
    // Explicit null: user must renew — keep as-is.
  } else if (typeof expiresRaw === 'number' && isFinite(expiresRaw) && expiresRaw > 0) {
    // Valid timestamp — keep as-is.
  } else {
    // undefined / NaN / 0 / negative → pre-migration user; grant a fresh window.
    raw.miningExpiresAt = now + MINING_CONSTANTS.RENEWAL_DURATION_MS
    raw.miningRenewedAt = now
  }

  // ── miningRenewedAt ────────────────────────────────────────────────────────
  const renewedRaw = raw.miningRenewedAt
  if (renewedRaw !== null && !(typeof renewedRaw === 'number' && isFinite(renewedRaw) && renewedRaw > 0)) {
    raw.miningRenewedAt = null
  }

  // ── Rig durabilities ───────────────────────────────────────────────────────
  // JSON.stringify(NaN) → null, so null durability means the value was corrupted.
  // Treat null/NaN/negative as corrupted and restore to full durability (data recovery).
  if (Array.isArray(raw.rigs)) {
    raw.rigs = (raw.rigs as Record<string, unknown>[]).map(rig => {
      const tier = RIG_TIERS.find(t => t.id === rig.tierId)
      if (!tier) return rig   // unknown tier — leave untouched

      const dur = rig.durability as number | null | undefined
      if (dur === null || dur === undefined || !isFinite(dur) || dur < 0) {
        // Corrupted durability: restore to full (the rig never actually broke)
        return { ...rig, durability: tier.maxDurability, status: 'idle', miningSince: null }
      }
      if (dur <= 0 && rig.status !== 'broken') {
        // Inconsistent state: zero durability but not marked broken
        return { ...rig, durability: 0, status: 'broken', miningSince: null }
      }
      return rig
    })
  }

  return raw as unknown as User
}

/** Migrate a raw stored user object to the current schema (client-side entry point). */
function migrateUser(raw: Record<string, unknown>): User {
  return normalizeUser(raw, Date.now())
}

export function getUser(username: string): User | null {
  const raw = getAllUsers()[username.toLowerCase()]
  if (!raw) return null
  return migrateUser(raw as unknown as Record<string, unknown>)
}

export function createUser(username: string): User {
  const ov = getEconomyOverrides()
  const now = Date.now()
  const user: User = {
    username,
    createdAt: now,
    balance: ov.STARTING_BALANCE ?? MINING_CONSTANTS.STARTING_BALANCE,
    gems: 0,
    rigs: [],
    rewardHistory: [],
    lastCheckedAt: now,
    exchangeUsedToday: 0,
    exchangeResetAt: now + 24 * 60 * 60 * 1000,
    miningExpiresAt: null,   // Must renew before earning
    miningRenewedAt: null,
  }
  const users = getAllUsers()
  users[username.toLowerCase()] = user
  saveAllUsers(users)
  return user
}

export function saveUser(user: User) {
  const users = getAllUsers()
  users[user.username.toLowerCase()] = user
  saveAllUsers(users)
}

export function deleteUserFromStore(username: string) {
  const users = getAllUsers()
  delete users[username.toLowerCase()]
  saveAllUsers(users)
}

export function getCurrentUsername(): string | null {
  return safeGet<string>(CURRENT_USER_KEY)
}

export function setCurrentUsername(username: string | null) {
  if (username) safeSet(CURRENT_USER_KEY, username)
  else try { if (typeof window !== 'undefined') localStorage.removeItem(CURRENT_USER_KEY) } catch { /* ok */ }
}

// ─── Mining Engine ────────────────────────────────────────────────────────────

/** Deterministic hashrate-weighted block winner from block number seed */
export function pickBlockWinner(
  miners: ReadonlyArray<{ name: string; hashrate: number }>,
  blockNumber: number,
): string {
  const total = miners.reduce((s, m) => s + m.hashrate, 0)
  if (total === 0 || miners.length === 0) return 'nobody'
  const seed = (((blockNumber * 1_664_525 + 1_013_904_223) & 0xffff_ffff) >>> 0) / 0xffff_ffff
  let cumulative = 0
  for (const m of miners) {
    cumulative += m.hashrate / total
    if (seed <= cumulative) return m.name
  }
  return miners[miners.length - 1].name
}

/** Compute user's share of a single solved block (respects economy overrides) */
export function computeUserBlockReward(
  userHashrate: number,
  totalHashrate: number,
  activeMinerCount: number,
  isWinner: boolean,
): number {
  const ov = getEconomyOverrides()
  const BLOCK_REWARD      = ov.BLOCK_REWARD      ?? MINING_CONSTANTS.BLOCK_REWARD
  const FINDER_BONUS_PCT  = ov.FINDER_BONUS_PCT  ?? MINING_CONSTANTS.FINDER_BONUS_PCT
  const EQUAL_SPLIT_PCT   = ov.EQUAL_SPLIT_PCT   ?? MINING_CONSTANTS.EQUAL_SPLIT_PCT
  const HASHRATE_SHARE_PCT = ov.HASHRATE_SHARE_PCT ?? MINING_CONSTANTS.HASHRATE_SHARE_PCT
  const finder    = isWinner ? BLOCK_REWARD * FINDER_BONUS_PCT : 0
  const equal     = activeMinerCount > 0 ? (BLOCK_REWARD * EQUAL_SPLIT_PCT) / activeMinerCount : 0
  const hashShare = totalHashrate > 0 ? (BLOCK_REWARD * HASHRATE_SHARE_PCT * userHashrate) / totalHashrate : 0
  return Math.round(finder + equal + hashShare)
}

/** Apply time-based durability loss to a mining rig */
function applyDurabilityLoss(rig: UserRig, elapsedSeconds: number): UserRig {
  const tier = RIG_TIERS.find(t => t.id === rig.tierId)!
  const newDur = Math.max(0, rig.durability - tier.lossPerSecond * elapsedSeconds)
  const broken = newDur <= 0
  return {
    ...rig,
    durability: newDur,
    status: broken ? ('broken' as RigStatus) : rig.status,
    miningSince: broken ? null : rig.miningSince,
  }
}

/**
 * Catch-up: apply all elapsed time (durability + missed block rewards).
 *
 * @param user    - Current user state
 * @param now     - Authoritative "now" timestamp. When called server-side via
 *                  miningServer.ts this is the server's Date.now(). When called
 *                  client-side it should be Date.now() + clockOffset (where
 *                  clockOffset was derived from the server on login).
 * @param opts    - Optional overrides. When provided the function skips
 *                  localStorage reads entirely (safe to call from server code).
 *
 * Returns both the updated user AND the updated community block so callers can
 * persist whichever they need (server writes to disk; client writes to localStorage).
 */
export function catchUpUser(
  user: User,
  now: number,
  opts?: { community?: CommunityBlock; overrides?: EconomyOverrides },
): { user: User; community: CommunityBlock } {
  const community = opts?.community ?? getCommunityState()

  // ── Renewal enforcement ────────────────────────────────────────────────────
  // Earnings and durability loss only accrue while the session is active.
  // normalizeUser() guarantees miningExpiresAt is either null or a finite positive
  // number before catchUpUser is called, so no defensive coercion is needed here.
  // The ?? null is kept only as a last-resort safety net for direct calls.
  const expiresAt = user.miningExpiresAt ?? null
  const earnUntil = expiresAt === null
    ? user.lastCheckedAt                    // never renewed → zero elapsed
    : Math.min(now, expiresAt)              // cap at expiry if session is over

  const elapsed = Math.max(0, earnUntil - user.lastCheckedAt)
  if (elapsed < 500 && now - user.lastCheckedAt < 500) return { user, community }

  // 1. Update rig durabilities (only for active session time)
  let rigs = user.rigs.map(rig =>
    rig.status === 'mining' ? applyDurabilityLoss(rig, elapsed / 1000) : rig,
  )

  // 2. Distribute missed block rewards (only during active session)
  const ov = opts?.overrides ?? getEconomyOverrides()
  const blockIntervalMs    = ov.BLOCK_INTERVAL_MS ?? MINING_CONSTANTS.BLOCK_INTERVAL_MS
  const timeSinceLastBlock = earnUntil - community.lastSolvedAt
  const blocksPassed       = elapsed > 0 ? Math.floor(timeSinceLastBlock / blockIntervalMs) : 0

  let balance = user.balance
  const newRewards: MiningReward[] = []

  if (blocksPassed > 0) {
    const activeUserRigs = rigs.filter(r => r.status === 'mining')

    if (activeUserRigs.length > 0) {
      const userHashrate = activeUserRigs.reduce((sum, r) => {
        const tier = RIG_TIERS.find(t => t.id === r.tierId)!
        return sum + tier.hashrate
      }, 0)

      for (let i = 0; i < blocksPassed; i++) {
        const blockNum = community.blockNumber + i
        const amount    = computeUserBlockReward(userHashrate, userHashrate, 1, true)

        balance += amount
        newRewards.push({
          blockNumber: blockNum,
          solvedAt: community.lastSolvedAt + (i + 1) * blockIntervalMs,
          amount,
          type: 'finder',
        })
      }
    }
  }

  // 3. Build updated community state (advance block counter by blocks that passed globally)
  const globalTimeSinceLastBlock = now - community.lastSolvedAt
  const globalBlocksPassed       = Math.floor(globalTimeSinceLastBlock / blockIntervalMs)
  const updatedCommunity: CommunityBlock = globalBlocksPassed > 0
    ? {
        ...community,
        blockNumber:  community.blockNumber + globalBlocksPassed,
        lastSolvedAt: community.lastSolvedAt + globalBlocksPassed * blockIntervalMs,
        startedAt:    community.lastSolvedAt + globalBlocksPassed * blockIntervalMs,
        totalSolved:  community.totalSolved  + globalBlocksPassed,
      }
    : community

  // Only persist to localStorage when running client-side (no passed-in community).
  // When called from server code, the server handles persistence after this returns.
  if (!opts?.community && globalBlocksPassed > 0) {
    saveCommunityState(updatedCommunity)
  }

  // 4. Auto-stop rigs when the session has expired.
  // Durability was already applied up to earnUntil above; now we park every rig
  // that is still 'mining' so the player must deliberately restart after renewing.
  if (expiresAt !== null && expiresAt <= now) {
    rigs = rigs.map(rig =>
      rig.status === 'mining'
        ? { ...rig, status: 'idle' as RigStatus, miningSince: null }
        : rig,
    )
  }

  // 5. Reset daily exchange limit if expired
  let exchangeUsedToday = user.exchangeUsedToday
  let exchangeResetAt   = user.exchangeResetAt
  if (now >= user.exchangeResetAt) {
    exchangeUsedToday = 0
    exchangeResetAt   = now + 24 * 60 * 60 * 1000
  }

  return {
    user: {
      ...user,
      rigs,
      balance,
      rewardHistory: [...newRewards.reverse(), ...user.rewardHistory].slice(0, 50),
      lastCheckedAt: now,         // always advance to real now, not earnUntil
      exchangeUsedToday,
      exchangeResetAt,
    },
    community: updatedCommunity,
  }
}

// ─── Rig Operations ───────────────────────────────────────────────────────────

const MAX_RIGS = 10

export function buyRig(user: User, tierId: string): { user: User; error?: string } {
  const tier = RIG_TIERS.find(t => t.id === tierId)
  if (!tier) return { user, error: 'Unknown rig tier' }
  if (user.rigs.length >= MAX_RIGS)
    return { user, error: `You have reached the maximum limit of ${MAX_RIGS} mining rigs.` }
  if (user.balance < tier.cost)
    return { user, error: `Need ${tier.cost} BC — you have ${Math.floor(user.balance)} BC` }

  const rig: UserRig = {
    id: `${tierId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    tierId,
    name: tier.name,
    durability: tier.maxDurability,
    status: 'idle',
    miningSince: null,
    purchasedAt: Date.now(),
  }
  return { user: { ...user, balance: user.balance - tier.cost, rigs: [...user.rigs, rig] } }
}

export function startMining(user: User, rigId: string): User {
  return {
    ...user,
    rigs: user.rigs.map(r =>
      r.id === rigId && r.status === 'idle'
        ? { ...r, status: 'mining' as RigStatus, miningSince: Date.now() }
        : r,
    ),
  }
}

export function stopMining(user: User, rigId: string): User {
  return {
    ...user,
    rigs: user.rigs.map(r =>
      r.id === rigId && r.status === 'mining'
        ? { ...r, status: 'idle' as RigStatus, miningSince: null }
        : r,
    ),
  }
}

export function repairRig(user: User, rigId: string): { user: User; error?: string } {
  const rig = user.rigs.find(r => r.id === rigId)
  if (!rig) return { user, error: 'Rig not found' }
  const tier = RIG_TIERS.find(t => t.id === rig.tierId)!
  const damage = tier.maxDurability - rig.durability
  if (damage <= 0) return { user, error: 'Rig is already at full durability' }
  const repairCost = Math.ceil((damage / tier.maxDurability) * tier.cost * MINING_CONSTANTS.REPAIR_COST_PCT)
  if (user.balance < repairCost)
    return { user, error: `Repair costs ${repairCost} BC — you have ${Math.floor(user.balance)} BC` }

  return {
    user: {
      ...user,
      balance: user.balance - repairCost,
      rigs: user.rigs.map(r =>
        r.id === rigId
          ? { ...r, durability: tier.maxDurability, status: 'idle' as RigStatus, miningSince: null }
          : r,
      ),
    },
  }
}

export function sellRig(user: User, rigId: string): { user: User; salePrice: number } {
  const rig = user.rigs.find(r => r.id === rigId)
  if (!rig) return { user, salePrice: 0 }
  const tier = RIG_TIERS.find(t => t.id === rig.tierId)!
  const durPct = rig.durability / tier.maxDurability
  const salePrice = Math.floor(tier.cost * MINING_CONSTANTS.SELL_MAX_PCT * durPct)
  return {
    salePrice,
    user: { ...user, balance: user.balance + salePrice, rigs: user.rigs.filter(r => r.id !== rigId) },
  }
}

// ─── Exchange ─────────────────────────────────────────────────────────────────

/**
 * Algorithmic rate: two overlapping sine waves for natural price movement.
 * Returns Gems per BC. Respects admin economy overrides.
 */
export function getExchangeRate(now: number = Date.now()): number {
  const ov = getEconomyOverrides()
  const BASE_RATE = ov.BASE_RATE ?? EXCHANGE_CONSTANTS.BASE_RATE
  const MIN_RATE  = ov.MIN_RATE  ?? EXCHANGE_CONSTANTS.MIN_RATE
  const MAX_RATE  = ov.MAX_RATE  ?? EXCHANGE_CONSTANTS.MAX_RATE
  const { FLUCTUATION_PERIOD_MS } = EXCHANGE_CONSTANTS
  const t = (now % FLUCTUATION_PERIOD_MS) / FLUCTUATION_PERIOD_MS
  const wave = Math.sin(2 * Math.PI * t) * 0.65 + Math.sin(2 * Math.PI * t * 2.7 + 1.2) * 0.35
  const amplitude = (MAX_RATE - MIN_RATE) / 2
  return Math.round(BASE_RATE + wave * amplitude)
}

/** Generate a sparkline of historical rate points (Gems/BC) */
export function getRateHistory(now: number = Date.now(), points = 24, intervalMs = 10 * 60 * 1000) {
  return Array.from({ length: points }, (_, i) => getExchangeRate(now - (points - 1 - i) * intervalMs))
}

function checkDailyLimit(user: User, now: number): { used: number; resetAt: number } {
  if (now >= user.exchangeResetAt) {
    return { used: 0, resetAt: now + 24 * 60 * 60 * 1000 }
  }
  return { used: Math.floor(user.exchangeUsedToday), resetAt: user.exchangeResetAt }
}

/** Exchange BlueCoin → Gems */
export function exchangeBCForGems(
  user: User,
  bcAmount: number,
  now = Date.now(),
): { user: User; gemsGained: number; feePaid: number; error?: string } {
  const ZERO = { user, gemsGained: 0, feePaid: 0 }
  if (bcAmount <= 0) return { ...ZERO, error: 'Amount must be positive' }
  if (user.balance < bcAmount) return { ...ZERO, error: 'Insufficient BlueCoin balance' }

  const ov = getEconomyOverrides()
  const dailyLimit = ov.DAILY_TX_LIMIT ?? EXCHANGE_CONSTANTS.DAILY_TX_LIMIT
  const feePct     = ov.FEE_PCT        ?? EXCHANGE_CONSTANTS.FEE_PCT

  const { used, resetAt } = checkDailyLimit(user, now)
  if (used >= dailyLimit)
    return { ...ZERO, error: "You've reached today's exchange limit. Please try again tomorrow." }

  const rate  = getExchangeRate(now)
  const gross = bcAmount * rate
  const fee   = gross * feePct
  const net   = gross - fee

  return {
    gemsGained: net,
    feePaid: fee,
    user: {
      ...user,
      balance: user.balance - bcAmount,
      gems: (user.gems ?? 0) + net,
      exchangeUsedToday: used + 1,
      exchangeResetAt: resetAt,
    },
  }
}

/** Exchange Gems → BlueCoin */
export function exchangeGemsForBC(
  user: User,
  gemsAmount: number,
  now = Date.now(),
): { user: User; bcGained: number; feePaid: number; error?: string } {
  const ZERO = { user, bcGained: 0, feePaid: 0 }
  if (gemsAmount <= 0) return { ...ZERO, error: 'Amount must be positive' }
  if ((user.gems ?? 0) < gemsAmount) return { ...ZERO, error: 'Insufficient Gems balance' }

  const ov = getEconomyOverrides()
  const dailyLimit = ov.DAILY_TX_LIMIT ?? EXCHANGE_CONSTANTS.DAILY_TX_LIMIT
  const feePct     = ov.FEE_PCT        ?? EXCHANGE_CONSTANTS.FEE_PCT

  const { used, resetAt } = checkDailyLimit(user, now)
  if (used >= dailyLimit)
    return { ...ZERO, error: "You've reached today's exchange limit. Please try again tomorrow." }

  const rate    = getExchangeRate(now)
  const grossBC = gemsAmount / rate
  const fee     = grossBC * feePct
  const netBC   = grossBC - fee

  return {
    bcGained: netBC,
    feePaid: fee,
    user: {
      ...user,
      gems: (user.gems ?? 0) - gemsAmount,
      balance: user.balance + netBC,
      exchangeUsedToday: used + 1,
      exchangeResetAt: resetAt,
    },
  }
}
