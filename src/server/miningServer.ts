// ─── Mining Server Functions ───────────────────────────────────────────────────
// Server-authoritative time and persistence for the virtual mining system.
// All offline-earnings calculations use the SERVER's Date.now() — never client time.
// Every write calls broadcastMiningUpdate() (SSE push) and scheduleBackup() (GitHub).

import { createServerFn }      from '@tanstack/react-start'
import { z }                   from 'zod'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import { resolve }             from 'path'
import { catchUpUser, buyRig, normalizeUser } from '../store/miningStore'
import type { User, CommunityBlock } from '../data/mining'
import { MINING_CONSTANTS, RIG_TIERS } from '../data/mining'
import type { EconomyOverrides }    from '../store/miningStore'
import { broadcastMiningUpdate }    from './sseRegistry'
import { scheduleBackup }           from './miningBackup'

// ─── Economy config (read-only, no auth required) ────────────────────────────

export const getEconomyConfig = createServerFn({ method: 'GET' })
  .handler(async (): Promise<EconomyOverrides> => {
    return readJson<EconomyOverrides>('economy.json') ?? {}
  })

// ─── Leaderboard types ────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank:         number
  username:     string
  balance:      number   // current BC (floored)
  gems:         number   // current gems (floored)
  totalRigs:    number
  activeRigs:   number
  miningPower:  number   // GH/s sum of active rigs
  blockRewards: number   // sum of rewardHistory amounts (last 50 blocks)
}

const DATA_DIR = resolve('data')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8')) as T
  } catch {
    return null
  }
}

function atomicWrite(file: string, data: unknown) {
  mkdirSync(DATA_DIR, { recursive: true })
  const content = JSON.stringify(data, null, 2)
  const target  = resolve(DATA_DIR, file)
  const tmp     = `${target}.tmp`
  writeFileSync(tmp, content, 'utf8')
  renameSync(tmp, target)
}

function loadMiningUsers(): Record<string, User> {
  return readJson<Record<string, User>>('mining-users.json') ?? {}
}


function loadCommunityState(): CommunityBlock {
  const saved = readJson<CommunityBlock>('mining-community.json')
  if (saved) return saved
  const initial: CommunityBlock = {
    blockNumber:  1,
    startedAt:    Date.now(),
    lastSolvedAt: Date.now() - MINING_CONSTANTS.BLOCK_INTERVAL_MS,
    totalSolved:  0,
  }
  atomicWrite('mining-community.json', initial)
  return initial
}

// ─── Exported server functions ────────────────────────────────────────────────

/**
 * Returns the server's current Unix timestamp (ms).
 * The client uses this to compute a clockOffset so that all local ticks
 * are corrected to server time while the browser is open.
 */
export const getServerNow = createServerFn({ method: 'GET' })
  .handler((): { now: number } => ({ now: Date.now() }))

/**
 * Server-authoritative catch-up.
 * Reads from disk, runs catch-up with server time, writes back, broadcasts.
 */
export const serverCatchUp = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      username: z.string(),
      seedUser: z.any().optional(),
    })
  )
  .handler(async ({ data }): Promise<{
    user:      User | null
    community: CommunityBlock
    serverNow: number
    economy:   EconomyOverrides
  }> => {
    const serverNow = Date.now()
    const key       = data.username.toLowerCase()

    const users     = loadMiningUsers()
    const community = loadCommunityState()
    const economy   = readJson<EconomyOverrides>('economy.json') ?? {}

    const rawUser = users[key] ?? (data.seedUser as User | undefined) ?? null
    if (!rawUser) return { user: null, community, serverNow, economy }

    // normalizeUser is the single authoritative sanitisation pass.
    // It handles undefined/NaN/null for every field (including rig durabilities).
    const stored = normalizeUser({ ...rawUser } as Record<string, unknown>, serverNow)

    // Build global miner list so rewards are shared across the network.
    // Exclude users whose sessions have already expired — their rigs remain
    // 'mining' on disk until their own catch-up runs, which would incorrectly
    // dilute rewards for genuinely active miners.
    const globalMiners: Array<{ name: string; hashrate: number }> = []
    for (const u of Object.values(users)) {
      if (u.miningExpiresAt !== null && u.miningExpiresAt !== undefined && u.miningExpiresAt <= serverNow) continue
      const h = u.rigs
        .filter(r => r.status === 'mining')
        .reduce((s, r) => s + (RIG_TIERS.find(t => t.id === r.tierId)?.hashrate ?? 0), 0)
      if (h > 0) globalMiners.push({ name: u.username, hashrate: h })
    }

    const { user: updatedUser, community: updatedCommunity } = catchUpUser(
      stored, serverNow, { community, overrides: economy, globalMiners }
    )

    users[key] = updatedUser
    atomicWrite('mining-users.json', users)
    atomicWrite('mining-community.json', updatedCommunity)

    // Notify all connected clients and queue a debounced GitHub backup
    broadcastMiningUpdate()
    scheduleBackup()

    return { user: updatedUser, community: updatedCommunity, serverNow, economy }
  })

/**
 * Persist a user's current state server-side without running catch-up.
 * Called after every rig operation and periodically during active sessions.
 */
export const saveMiningUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ user: z.any() }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    // Always normalise before writing — the client may hold stale/NaN state
    // from an old code path (NaN serialises to null in JSON, corrupting disk data).
    const user = normalizeUser({ ...(data.user as User) } as Record<string, unknown>, Date.now())
    const users = loadMiningUsers()
    users[user.username.toLowerCase()] = user
    atomicWrite('mining-users.json', users)

    broadcastMiningUpdate()
    scheduleBackup()

    return { ok: true }
  })

/**
 * Server-authoritative rig purchase. Enforces the 10-rig limit and balance
 * check by reading the authoritative disk state, then atomically saves.
 */
export const purchaseRigServer = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string(), tierId: z.string() }))
  .handler(async ({ data }): Promise<{ user: User | null; error?: string }> => {
    const users = loadMiningUsers()
    const rawUser = users[data.username.toLowerCase()]
    if (!rawUser) return { user: null, error: 'User not found on server.' }

    const user = normalizeUser({ ...rawUser } as Record<string, unknown>, Date.now())
    const result = buyRig(user, data.tierId)
    if (result.error) return { user, error: result.error }

    users[data.username.toLowerCase()] = result.user
    atomicWrite('mining-users.json', users)
    broadcastMiningUpdate()
    scheduleBackup()

    return { user: result.user }
  })

/**
 * Admin dashboard: reads users, community, and economy overrides from disk
 * in one round-trip so the dashboard always reflects authoritative server state.
 */
export const getDashboardStats = createServerFn({ method: 'GET' })
  .handler(async () => {
    const users     = loadMiningUsers()
    const community = loadCommunityState()
    const economy   = readJson<EconomyOverrides>('economy.json') ?? {}
    return { users, community, economy }
  })

/**
 * Admin: read all users directly from disk.
 * Always returns fresh server-side data — never touches localStorage.
 */
export const getAllMiningUsers = createServerFn({ method: 'GET' })
  .handler(async (): Promise<Record<string, User>> => {
    return loadMiningUsers()
  })

/**
 * Admin: overwrite a single user on disk, then broadcast + schedule backup.
 * This is the ONE way the admin panel mutates mining data — keeps
 * admin panel and mining page perfectly in sync via SSE.
 */
export const adminUpdateMiningUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ user: z.any() }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const user  = data.user as User
    const users = loadMiningUsers()
    users[user.username.toLowerCase()] = user
    atomicWrite('mining-users.json', users)

    broadcastMiningUpdate()
    scheduleBackup()

    return { ok: true }
  })

// ─── Active Miners ────────────────────────────────────────────────────────────

export interface ActiveMinerEntry {
  username:         string
  activeRigs:       number
  totalRigs:        number
  hashrate:         number   // GH/s (active rigs only)
  networkSharePct:  number   // 0–100
  sessionExpiresAt: number | null
}

export interface ActiveMinersPayload {
  miners:          ActiveMinerEntry[]
  totalHashrate:   number   // GH/s across all active miners
  totalMiners:     number
  serverNow:       number
}

/**
 * Public: return all miners whose session is active and have at least one
 * 'mining' rig. Sorted by hashrate descending.
 */
export const getActiveMiners = createServerFn({ method: 'GET' })
  .handler(async (): Promise<ActiveMinersPayload> => {
    const serverNow = Date.now()
    const users     = loadMiningUsers()

    const entries: ActiveMinerEntry[] = []
    for (const u of Object.values(users)) {
      // Must have a live session
      if (u.miningExpiresAt === null || u.miningExpiresAt === undefined) continue
      if (u.miningExpiresAt <= serverNow) continue

      const activeRigs = u.rigs.filter(r => r.status === 'mining')
      if (activeRigs.length === 0) continue

      const hashrate = activeRigs.reduce(
        (s, r) => s + (RIG_TIERS.find(t => t.id === r.tierId)?.hashrate ?? 0), 0
      )

      entries.push({
        username:         u.username,
        activeRigs:       activeRigs.length,
        totalRigs:        u.rigs.length,
        hashrate,
        networkSharePct:  0,   // filled after totalling
        sessionExpiresAt: u.miningExpiresAt,
      })
    }

    const totalHashrate = entries.reduce((s, e) => s + e.hashrate, 0)
    for (const e of entries) {
      e.networkSharePct = totalHashrate > 0 ? (e.hashrate / totalHashrate) * 100 : 0
    }

    entries.sort((a, b) => b.hashrate - a.hashrate)

    return { miners: entries, totalHashrate, totalMiners: entries.length, serverNow }
  })

/**
 * Public: compute the global leaderboard from disk data.
 * Sorted by current BlueCoin balance descending.
 */
export const getLeaderboard = createServerFn({ method: 'GET' })
  .handler(async (): Promise<LeaderboardEntry[]> => {
    const users = loadMiningUsers()

    // Show all registered mining users — the old credential filter
    // incorrectly excluded real players not yet added to credentials.yml.
    const entries: LeaderboardEntry[] = Object.values(users).map(user => {
      const activeRigs  = user.rigs.filter(r => r.status === 'mining')
      const miningPower = activeRigs.reduce((sum, r) => {
        const tier = RIG_TIERS.find(t => t.id === r.tierId)
        return sum + (tier?.hashrate ?? 0)
      }, 0)
      const blockRewards = user.rewardHistory.reduce((sum, r) => sum + r.amount, 0)

      return {
        rank:         0,   // filled below
        username:     user.username,
        balance:      Math.floor(user.balance),
        gems:         Math.floor(user.gems ?? 0),
        totalRigs:    user.rigs.length,
        activeRigs:   activeRigs.length,
        miningPower,
        blockRewards,
      }
    })

    // Sort: primary = balance desc, secondary = blockRewards desc
    entries.sort((a, b) => b.balance - a.balance || b.blockRewards - a.blockRewards)
    entries.forEach((e, i) => { e.rank = i + 1 })

    return entries.slice(0, 10)
  })

/**
 * Admin: delete a user from disk.
 */
export const adminDeleteMiningUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string() }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const users = loadMiningUsers()
    delete users[data.username.toLowerCase()]
    atomicWrite('mining-users.json', users)

    broadcastMiningUpdate()
    scheduleBackup()

    return { ok: true }
  })

/**
 * Renew a player's 12-hour mining session.
 * Server-authoritative: uses server time exclusively.
 */
export const renewMiningSession = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string() }))
  .handler(async ({ data }): Promise<{
    user: User | null
    community: CommunityBlock
    serverNow: number
    error?: string
  }> => {
    const serverNow = Date.now()
    const key       = data.username.toLowerCase()

    const users     = loadMiningUsers()
    const community = loadCommunityState()
    const economy   = readJson<EconomyOverrides>('economy.json') ?? {}

    const rawUser = users[key]
    if (!rawUser) return { user: null, community, serverNow, error: 'User not found' }

    // Normalise before catching up so catchUpUser receives clean, valid data.
    const stored = normalizeUser({ ...rawUser } as Record<string, unknown>, serverNow)

    // Build global miner list so rewards are shared correctly across the network.
    // Only include users whose sessions are still active at serverNow.
    const globalMiners: Array<{ name: string; hashrate: number }> = []
    for (const u of Object.values(users)) {
      if (u.miningExpiresAt !== null && u.miningExpiresAt !== undefined && u.miningExpiresAt <= serverNow) continue
      const h = u.rigs
        .filter(r => r.status === 'mining')
        .reduce((s, r) => s + (RIG_TIERS.find(t => t.id === r.tierId)?.hashrate ?? 0), 0)
      if (h > 0) globalMiners.push({ name: u.username, hashrate: h })
    }

    // Catch up earnings first (capped at old expiry if session is expired), then renew.
    const { user: caughtUp, community: updatedCommunity } = catchUpUser(
      stored, serverNow, { community, overrides: economy, globalMiners }
    )

    const renewed: typeof caughtUp = {
      ...caughtUp,
      miningExpiresAt: serverNow + MINING_CONSTANTS.RENEWAL_DURATION_MS,
      miningRenewedAt: serverNow,
    }

    users[key] = renewed
    atomicWrite('mining-users.json', users)
    atomicWrite('mining-community.json', updatedCommunity)

    broadcastMiningUpdate()
    scheduleBackup()

    return { user: renewed, community: updatedCommunity, serverNow }
  })

/**
 * Admin: renew mining session for any player.
 */
export const adminRenewMining = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string() }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const serverNow = Date.now()
    const key       = data.username.toLowerCase()
    const users     = loadMiningUsers()
    const user      = users[key]
    if (!user) return { ok: false, error: 'User not found' }

    users[key] = {
      ...user,
      miningExpiresAt: serverNow + MINING_CONSTANTS.RENEWAL_DURATION_MS,
      miningRenewedAt: serverNow,
    }
    atomicWrite('mining-users.json', users)
    broadcastMiningUpdate()
    scheduleBackup()

    return { ok: true }
  })

/**
 * Admin: adjust a player's remaining mining time by a delta (ms).
 * Positive = extend, negative = reduce. Minimum result is current time (immediate expiry).
 */
export const adminAdjustRenewal = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string(), deltaMs: z.number() }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const serverNow = Date.now()
    const key       = data.username.toLowerCase()
    const users     = loadMiningUsers()
    const user      = users[key]
    if (!user) return { ok: false, error: 'User not found' }

    const currentExpiry = user.miningExpiresAt ?? serverNow
    const newExpiry     = Math.max(serverNow, currentExpiry + data.deltaMs)
    users[key] = { ...user, miningExpiresAt: newExpiry }
    atomicWrite('mining-users.json', users)
    broadcastMiningUpdate()
    scheduleBackup()

    return { ok: true }
  })

// ─── Mining Access Config ─────────────────────────────────────────────────────

export interface MiningAccessConfig {
  buttonLabel:        string
  sectionTitle:       string
  steps:              string[]
  discordUrl:         string
  discordButtonLabel: string
}

const DEFAULT_ACCESS_CONFIG: MiningAccessConfig = {
  buttonLabel:        'New player? How to get access',
  sectionTitle:       'How to get your mining credentials',
  steps: [
    'Join the Blue Network Discord using the button below.',
    'Head to the #mining section of the server.',
    'Open a request-credential ticket — a staff member will create your account.',
  ],
  discordUrl:         'https://discord.gg/DmEPAb3NFU',
  discordButtonLabel: 'Join Discord to Request Access',
}

export const getMiningAccessConfig = createServerFn({ method: 'GET' })
  .handler((): MiningAccessConfig => {
    return readJson<MiningAccessConfig>('mining-access.json') ?? DEFAULT_ACCESS_CONFIG
  })

export const saveMiningAccessConfig = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    buttonLabel:        z.string().min(1).max(120),
    sectionTitle:       z.string().min(1).max(120),
    steps:              z.array(z.string().max(400)).min(1).max(20),
    discordUrl:         z.string().max(300),
    discordButtonLabel: z.string().min(1).max(100),
  }))
  .handler(({ data }): { ok: boolean } => {
    atomicWrite('mining-access.json', data)
    scheduleBackup()
    return { ok: true }
  })

/**
 * Admin: reset a player's mining session (expire immediately).
 */
export const adminResetRenewal = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string() }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const key   = data.username.toLowerCase()
    const users = loadMiningUsers()
    const user  = users[key]
    if (!user) return { ok: false, error: 'User not found' }

    users[key] = { ...user, miningExpiresAt: null, miningRenewedAt: null }
    atomicWrite('mining-users.json', users)
    broadcastMiningUpdate()
    scheduleBackup()

    return { ok: true }
  })
