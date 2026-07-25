import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { User, CommunityBlock, ExchangeDirection } from '../data/mining'
import { MINING_CONSTANTS, EXCHANGE_CONSTANTS } from '../data/mining'
import {
  getUser, createUser, saveUser, getCurrentUsername, setCurrentUsername,
  getCommunityState, saveCommunityState, catchUpUser, normalizeUser,
  buyRig, startMining, stopMining, repairRig, sellRig,
  exchangeBCForGems, exchangeGemsForBC, getExchangeRate, saveEconomyOverrides,
} from '../store/miningStore'
import { validateCredentials } from '../server/auth'
import { serverCatchUp, saveMiningUser, purchaseRigServer, renewMiningSession, getEconomyConfig } from '../server/miningServer'

// ─── Context Shape ─────────────────────────────────────────────────────────────

interface ExchangeResult {
  gained: number
  feePaid: number
  error?: string
}

interface MiningCtx {
  user: User | null
  community: CommunityBlock | null
  currentRate: number
  nextBlockIn: number
  isLoading: boolean
  miningExpired: boolean       // true when the 12-h session has lapsed (server-corrected time)
  login: (username: string, password: string) => Promise<{ error?: string }>
  logout: () => void
  purchaseRig: (tierId: string) => Promise<{ error?: string }>
  startRig: (rigId: string) => void
  stopRig: (rigId: string) => void
  startAllRigs: () => void
  stopAllRigs: () => void
  repairUserRig: (rigId: string) => { error?: string }
  sellUserRig: (rigId: string) => { salePrice: number }
  exchange: (amount: number, direction: ExchangeDirection) => ExchangeResult
  renewMining: () => Promise<{ error?: string }>
  toast: Toast | null
  clearToast: () => void
}

interface Toast { message: string; type: 'success' | 'error' | 'info' }

const MiningContext = createContext<MiningCtx | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MiningProvider({ children }: { children: React.ReactNode }) {
  const [user,         setUser]      = useState<User | null>(null)
  const [community,    setCommunity] = useState<CommunityBlock | null>(null)
  const [currentRate,  setRate]      = useState<number>(EXCHANGE_CONSTANTS.BASE_RATE)
  const [nextBlockIn,  setNext]      = useState<number>(MINING_CONSTANTS.BLOCK_INTERVAL_MS)
  const [isLoading,    setLoading]   = useState(true)
  const [miningExpired, setMiningExpired] = useState(false)
  const [toast,        setToast]     = useState<Toast | null>(null)

  const tickRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastRef       = useRef<ReturnType<typeof setTimeout>  | null>(null)
  // Server-client clock offset, computed on login/bootstrap.
  const clockOffset    = useRef(0)
  // Timestamp of the most recent local save — SSE events within 5 s of this are suppressed.
  const lastLocalSave  = useRef(0)
  // Ref that always holds the current user so the SSE handler can read it.
  const userRef        = useRef<User | null>(null)

  useEffect(() => { userRef.current = user }, [user])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type })
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Server-accurate "now". Always use this instead of Date.now() for mining math. */
  const serverNow = useCallback(() => Date.now() + clockOffset.current, [])

  function applyServerResult(result: { user: User; community: CommunityBlock; serverNow: number; economy?: Record<string, number> }) {
    clockOffset.current = result.serverNow - Date.now()
    // Seed localStorage with server-authoritative economy overrides so that
    // getExchangeRate() and ExchangePanel pick up admin-saved values.
    if (result.economy && Object.keys(result.economy).length > 0) {
      saveEconomyOverrides(result.economy as Parameters<typeof saveEconomyOverrides>[0], { silent: true })
    }
    saveUser(result.user)
    saveCommunityState(result.community)
    setUser(result.user)
    setCommunity(result.community)
    const now = result.serverNow
    setRate(getExchangeRate(now))
    const elapsed = now - result.community.lastSolvedAt
    setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - (elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS))
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') { setLoading(false); return }

    async function bootstrap() {
      const username = getCurrentUsername()

      if (username) {
        const localUser = getUser(username)
        try {
          const result = await serverCatchUp({ data: { username, seedUser: localUser } })
          if (result.user) {
            applyServerResult(result as { user: User; community: CommunityBlock; serverNow: number })
          } else {
            setCurrentUsername(null)
          }
        } catch {
          if (localUser) {
            const now = Date.now()
            const { user: u, community: c } = catchUpUser(localUser, now)
            saveUser(u)
            setUser(u)
            setCommunity(c)
            setRate(getExchangeRate(now))
            const elapsed = now - c.lastSolvedAt
            setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - (elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS))
          }
        }
      } else {
        // Guest path — still need to seed economy overrides from disk
        try {
          const economy = await getEconomyConfig()
          if (economy && Object.keys(economy).length > 0) {
            saveEconomyOverrides(economy as Parameters<typeof saveEconomyOverrides>[0], { silent: true })
          }
        } catch { /* ignore — fall back to hardcoded defaults */ }
        const now  = Date.now()
        const comm = getCommunityState()
        setCommunity(comm)
        setRate(getExchangeRate(now))
        const elapsed = now - comm.lastSolvedAt
        setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - (elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS))
      }

      setLoading(false)
    }

    bootstrap()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── SSE — real-time push from server ───────────────────────────────────────
  // When the admin panel (or another session) changes this user's data, the
  // server broadcasts `mining_updated`. We re-run serverCatchUp to pull the
  // latest state, but only if we weren't the ones who triggered the event.
  useEffect(() => {
    if (typeof window === 'undefined') return

    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let active = true

    function connect() {
      if (!active) return
      es = new EventSource('/api/mining-events')

      es.addEventListener('mining_updated', async () => {
        // Skip if we triggered this ourselves within the last 5 s
        if (Date.now() - lastLocalSave.current < 5_000) return
        const username = getCurrentUsername()
        if (!username || !userRef.current) return
        try {
          const result = await serverCatchUp({ data: { username, seedUser: userRef.current } })
          if (result.user) {
            applyServerResult(result as { user: User; community: CommunityBlock; serverNow: number })
          }
        } catch { /* server unreachable — current state is fine */ }
      })

      // Forward shop_updated events to window so ShopPage can react without
      // a second SSE connection. MiningContext owns the single SSE connection.
      es.addEventListener('shop_updated', () => {
        window.dispatchEvent(new CustomEvent('shop_updated'))
      })

      es.onerror = () => {
        es?.close()
        es = null
        // Reconnect after 5 s
        if (active) {
          reconnectTimer = setTimeout(connect, 5_000)
        }
      }
    }

    connect()

    return () => {
      active = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      es?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 1-second countdown tick (display only) ─────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const now     = serverNow()
      const comm    = getCommunityState()
      const elapsed = now - comm.lastSolvedAt
      setNext(MINING_CONSTANTS.BLOCK_INTERVAL_MS - (elapsed % MINING_CONSTANTS.BLOCK_INTERVAL_MS))
      // Keep miningExpired flag in sync with server-corrected time
      setUser(prev => {
        if (!prev) return prev
        // Use ?? null to handle undefined on pre-migration accounts
        const expiresAt = prev.miningExpiresAt ?? null
        const expired = expiresAt === null || now > expiresAt
        setMiningExpired(expired)
        return prev
      })
    }, 1000)
    return () => clearInterval(id)
  }, [serverNow])

  // ── 10-second mining engine tick ───────────────────────────────────────────
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const now  = serverNow()
      const comm = getCommunityState()

      setRate(getExchangeRate(now))
      setCommunity({ ...comm })

      setUser(prev => {
        if (!prev) return prev

        // Normalise first so catchUpUser never sees NaN/null in durability or
        // miningExpiresAt — stale in-memory state from old code paths can carry
        // NaN which JSON.stringify converts to null, corrupting the disk on save.
        const clean = normalizeUser({ ...prev } as Record<string, unknown>, now)
        const { user: updated, community: updatedComm } = catchUpUser(clean, now)

        if (updated.rewardHistory.length > prev.rewardHistory.length) {
          const newest = updated.rewardHistory[0]
          if (newest) showToast(`⛏ Block #${newest.blockNumber}: +${newest.amount} BC earned!`, 'success')
        }

        saveUser(updated)
        saveCommunityState(updatedComm)

        queueMicrotask(() => {
          lastLocalSave.current = Date.now()
          saveMiningUser({ data: { user: updated } }).catch(() => {})
        })

        return updated
      })
    }, MINING_CONSTANTS.TICK_INTERVAL_MS)

    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [showToast, serverNow])

  // ── Auth ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
    const trimmed = username.trim()
    if (!trimmed) return { error: 'Username is required' }
    if (!password) return { error: 'Password is required' }

    const result = await validateCredentials({ data: { username: trimmed, password } })
    if (!result || !result.valid) return { error: (result as any)?.error ?? 'Invalid username or password' }

    const canonicalUsername = result.username
    const isNew = !getUser(canonicalUsername)

    if (isNew) createUser(canonicalUsername)
    const localUser = getUser(canonicalUsername)!

    try {
      const catchResult = await serverCatchUp({ data: { username: canonicalUsername, seedUser: localUser } })
      if (catchResult.user) {
        applyServerResult(catchResult as { user: User; community: CommunityBlock; serverNow: number })
        setCurrentUsername(canonicalUsername)
        showToast(isNew ? `Welcome to Blue Mining, ${canonicalUsername}! 🎉` : `Welcome back, ${canonicalUsername}!`, 'success')
        return {}
      }
    } catch { /* fallback below */ }

    const { user: u } = catchUpUser(localUser, Date.now())
    saveUser(u)
    setCurrentUsername(canonicalUsername)
    setUser(u)
    showToast(isNew ? `Welcome to Blue Mining, ${canonicalUsername}! 🎉` : `Welcome back, ${canonicalUsername}!`, 'success')
    return {}
  }, [showToast])

  const logout = useCallback(() => {
    setCurrentUsername(null)
    setUser(null)
    showToast('Logged out', 'info')
  }, [showToast])

  // ── Rig ops — each one saves to server after local update ──────────────────

  const purchaseRig = useCallback(async (tierId: string): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not logged in' }
    // Client-side pre-checks (balance + limit) for instant feedback
    const precheck = buyRig(user, tierId)
    if (precheck.error) return { error: precheck.error }
    // Server-authoritative purchase — enforces limit & balance against disk state
    const result = await purchaseRigServer({ data: { username: user.username, tierId } })
    if (result.error) return { error: result.error }
    if (!result.user) return { error: 'Server error — please try again.' }
    saveUser(result.user)
    setUser(result.user)
    lastLocalSave.current = Date.now()
    showToast(`${result.user.rigs.at(-1)?.name} purchased!`, 'success')
    return {}
  }, [user, showToast])

  const startRig = useCallback((rigId: string) => {
    if (!user) return
    const updated = startMining(user, rigId)
    saveUser(updated)
    setUser(updated)
    lastLocalSave.current = Date.now()
    saveMiningUser({ data: { user: updated } }).catch(() => {})
  }, [user])

  const stopRig = useCallback((rigId: string) => {
    if (!user) return
    const updated = stopMining(user, rigId)
    saveUser(updated)
    setUser(updated)
    lastLocalSave.current = Date.now()
    saveMiningUser({ data: { user: updated } }).catch(() => {})
  }, [user])

  const startAllRigs = useCallback(() => {
    if (!user) return
    // Fold startMining over every idle rig in one pass — one setUser call
    const updated = user.rigs
      .filter(r => r.status === 'idle')
      .reduce((acc, r) => startMining(acc, r.id), user)
    saveUser(updated)
    setUser(updated)
    lastLocalSave.current = Date.now()
    saveMiningUser({ data: { user: updated } }).catch(() => {})
  }, [user])

  const stopAllRigs = useCallback(() => {
    if (!user) return
    const updated = user.rigs
      .filter(r => r.status === 'mining')
      .reduce((acc, r) => stopMining(acc, r.id), user)
    saveUser(updated)
    setUser(updated)
    lastLocalSave.current = Date.now()
    saveMiningUser({ data: { user: updated } }).catch(() => {})
  }, [user])

  const repairUserRig = useCallback((rigId: string): { error?: string } => {
    if (!user) return { error: 'Not logged in' }
    const result = repairRig(user, rigId)
    if (result.error) return { error: result.error }
    saveUser(result.user)
    setUser(result.user)
    lastLocalSave.current = Date.now()
    saveMiningUser({ data: { user: result.user } }).catch(() => {})
    showToast('Rig fully repaired ✓', 'success')
    return {}
  }, [user, showToast])

  const sellUserRig = useCallback((rigId: string): { salePrice: number } => {
    if (!user) return { salePrice: 0 }
    const result = sellRig(user, rigId)
    saveUser(result.user)
    setUser(result.user)
    lastLocalSave.current = Date.now()
    saveMiningUser({ data: { user: result.user } }).catch(() => {})
    showToast(`Rig sold for ${result.salePrice} BC`, 'info')
    return { salePrice: result.salePrice }
  }, [user, showToast])

  // ── Renewal ────────────────────────────────────────────────────────────────
  const renewMining = useCallback(async (): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not logged in' }
    try {
      const result = await renewMiningSession({ data: { username: user.username } })
      if (result.error || !result.user) return { error: result.error ?? 'Server error' }
      applyServerResult(result as { user: User; community: CommunityBlock; serverNow: number })
      setMiningExpired(false)
      showToast('⛏ Mining renewed — 12 hours active!', 'success')
      return {}
    } catch {
      return { error: 'Could not reach server — try again.' }
    }
  }, [user, showToast]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exchange ───────────────────────────────────────────────────────────────
  const exchange = useCallback((amount: number, direction: ExchangeDirection): ExchangeResult => {
    if (!user) return { gained: 0, feePaid: 0, error: 'Not logged in' }

    if (direction === 'bc-to-gems') {
      const result = exchangeBCForGems(user, amount, serverNow())
      if (result.error) return { gained: 0, feePaid: 0, error: result.error }
      saveUser(result.user)
      setUser(result.user)
      lastLocalSave.current = Date.now()
      saveMiningUser({ data: { user: result.user } }).catch(() => {})
      showToast(`Exchanged ${amount} BC → ${Math.floor(result.gemsGained).toLocaleString()} 💎 Gems`, 'success')
      return { gained: result.gemsGained, feePaid: result.feePaid }
    } else {
      const result = exchangeGemsForBC(user, amount, serverNow())
      if (result.error) return { gained: 0, feePaid: 0, error: result.error }
      saveUser(result.user)
      setUser(result.user)
      lastLocalSave.current = Date.now()
      saveMiningUser({ data: { user: result.user } }).catch(() => {})
      showToast(`Exchanged ${amount} 💎 Gems → ${result.bcGained.toFixed(2)} BC`, 'success')
      return { gained: result.bcGained, feePaid: result.feePaid }
    }
  }, [user, serverNow, showToast])

  return (
    <MiningContext.Provider value={{
      user, community, currentRate, nextBlockIn, isLoading, miningExpired,
      login, logout, purchaseRig, startRig, stopRig, startAllRigs, stopAllRigs,
      repairUserRig, sellUserRig, exchange, renewMining, toast, clearToast,
    }}>
      {children}
    </MiningContext.Provider>
  )
}

export function useMining(): MiningCtx {
  const ctx = useContext(MiningContext)
  if (!ctx) throw new Error('useMining must be used inside <MiningProvider>')
  return ctx
}
