import { useState, useEffect, useCallback } from 'react'
import { getPlayers }            from '../../store/playersStore'
import { getLogs }               from '../../store/adminStore'
import { getPlayerTotalPoints }  from '../../data/tiers'
import { tierColors, TIER_ORDER } from '../../data/tiers'
import { getDashboardStats }     from '../../server/miningServer'
import { adminGetAllPurchases }  from '../../server/shopServer'
import { gamemodes }             from '../../data/gamemodes'
import { REGIONS }               from '../../data/players'
import { RIG_TIERS, MINING_CONSTANTS, EXCHANGE_CONSTANTS } from '../../data/mining'
import type { User, CommunityBlock } from '../../data/mining'
import type { EconomyOverrides } from '../../store/miningStore'
import type { Player }           from '../../data/players'
import type { AdminLog }         from '../../store/adminStore'
import type { Purchase }         from '../../data/shop'

interface Props {
  admin: string
  setSection?: (s: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(Math.floor(n))
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function actionColor(action: string): string {
  if (action.startsWith('tier'))    return 'bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/20'
  if (action.startsWith('mining'))  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
  if (action.startsWith('shop'))    return 'bg-purple-500/15 text-purple-400 border-purple-500/20'
  if (action.startsWith('economy')) return 'bg-amber-500/15 text-amber-400 border-amber-500/20'
  if (action.startsWith('event'))   return 'bg-pink-500/15 text-pink-400 border-pink-500/20'
  if (action.startsWith('content')) return 'bg-teal-500/15 text-teal-400 border-teal-500/20'
  if (action.startsWith('user'))    return 'bg-orange-500/15 text-orange-400 border-orange-500/20'
  if (action.startsWith('github') || action.startsWith('sync')) return 'bg-gray-500/15 text-gray-300 border-gray-500/20'
  if (action.includes('login') || action.includes('logout')) return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
  return 'bg-white/8 text-gray-400 border-white/10'
}

function BlockProgress({ community, economy }: { community: CommunityBlock | null; economy: EconomyOverrides }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!community) return null
  const intervalMs = economy.BLOCK_INTERVAL_MS ?? MINING_CONSTANTS.BLOCK_INTERVAL_MS
  const elapsed = now - community.startedAt
  const remaining = intervalMs - elapsed
  const isOverdue = remaining <= 0
  const pct = isOverdue ? 100 : Math.min(100, (elapsed / intervalMs) * 100)

  // Format remaining or overdue duration
  const durMs = Math.abs(remaining)
  const dS = Math.floor(durMs / 1000)
  const dM = Math.floor(dS / 60)
  const dH = Math.floor(dM / 60)
  const timeStr = dH > 0 ? `${dH}h ${dM % 60}m` : `${dM}m ${dS % 60}s`

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Block #{community.blockNumber} in progress</span>
        {isOverdue ? (
          <span className="text-amber-400 font-mono font-bold animate-pulse">
            Overdue by {timeStr} — awaiting solver
          </span>
        ) : (
          <span className="text-[#00BFFF] font-mono font-bold">{timeStr} left</span>
        )}
      </div>
      <div className="relative w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${isOverdue
            ? 'bg-gradient-to-r from-amber-500/70 to-amber-400'
            : 'bg-gradient-to-r from-[#00BFFF]/60 to-[#00BFFF]'
          }`}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 rounded-full"
          style={{ background: isOverdue
            ? 'linear-gradient(90deg,transparent 60%,rgba(251,191,36,0.15))'
            : 'linear-gradient(90deg,transparent 60%,rgba(0,191,255,0.15))' }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-700">
        {isOverdue ? (
          <span className="text-amber-600">Block solved when next miner activity occurs</span>
        ) : (
          <span>{pct.toFixed(1)}% of {Math.round(intervalMs / 60000)}m interval elapsed</span>
        )}
        <span>{community.totalSolved.toLocaleString()} blocks solved total</span>
      </div>
    </div>
  )
}

function LiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const update = () => setT(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-[#00BFFF] text-sm font-bold tabular-nums">{t}</span>
}

function Skeleton({ className }: { className: string }) {
  return <div className={`rounded-lg bg-white/5 animate-pulse ${className}`} />
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, badge }: {
  icon: string; label: string; value: string | number
  sub?: string; color: string; badge?: { text: string; color: string }
}) {
  return (
    <div className="glass rounded-xl border border-white/8 p-5 hover:border-white/15 transition-all duration-200 group relative overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'radial-gradient(ellipse at top right,rgba(0,191,255,0.03),transparent 60%)' }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        {badge && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.text}</span>
        )}
      </div>
      <p className={`font-['Space_Grotesk'] font-black text-2xl leading-tight ${color}`}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      <p className="text-white text-xs font-semibold mt-1">{label}</p>
      {sub && <p className="text-gray-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Dashboard({ admin, setSection }: Props) {
  const [loading, setLoading]       = useState(true)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const [countdown, setCountdown]   = useState(60)
  const [refreshing, setRefreshing] = useState(false)

  // Raw server data
  const [users, setUsers]           = useState<Record<string, User>>({})
  const [community, setCommunity]   = useState<CommunityBlock | null>(null)
  const [economy, setEconomy]       = useState<EconomyOverrides>({})
  const [purchases, setPurchases]   = useState<Purchase[]>([])

  // Client data
  const [players, setPlayers]       = useState<Player[]>([])
  const [logs, setLogs]             = useState<AdminLog[]>([])

  // UI state
  const [logFilter, setLogFilter]   = useState<string>('all')
  const [topN, setTopN]             = useState(8)
  const [dateLabel, setDateLabel]   = useState('')
  const [sessionDuration, setSessionDuration] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setRefreshing(true)
    try {
      const [server, purcs] = await Promise.all([
        getDashboardStats().catch(() => ({ users: {} as Record<string, User>, community: null as unknown as CommunityBlock, economy: {} as EconomyOverrides })),
        adminGetAllPurchases().catch(() => [] as Purchase[]),
      ])
      setUsers(server.users ?? {})
      setCommunity(server.community ?? null)
      setEconomy(server.economy ?? {})
      setPurchases(purcs)
    } finally {
      setPlayers(getPlayers())
      setLogs(getLogs())
      setLastRefresh(Date.now())
      setCountdown(60)
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    const session = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('bn_admin_session') ?? 'null')
      : null
    if (session?.loginAt) {
      const mins = Math.floor((Date.now() - session.loginAt) / 60000)
      setSessionDuration(mins < 60 ? `${mins}m session` : `${Math.floor(mins / 60)}h ${mins % 60}m session`)
    }
    load()
  }, [load])

  // Auto-refresh countdown
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { load(true); return 60 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [load])

  // ── Computed stats ──────────────────────────────────────────────────────────

  const userList     = Object.values(users)
  const totalBC      = userList.reduce((s, u) => s + (u.balance ?? 0), 0)
  const totalGems    = userList.reduce((s, u) => s + (u.gems ?? 0), 0)
  const activeRigs   = userList.reduce((s, u) => s + u.rigs.filter(r => r.status === 'mining').length, 0)
  const brokenRigs   = userList.reduce((s, u) => s + u.rigs.filter(r => r.status === 'broken').length, 0)
  const totalRigs    = userList.reduce((s, u) => s + u.rigs.length, 0)
  const totalHashrate = userList.reduce((s, u) => s + u.rigs
    .filter(r => r.status === 'mining')
    .reduce((sr, r) => sr + (RIG_TIERS.find(t => t.id === r.tierId)?.hashrate ?? 0), 0), 0)

  const allPts       = players.map(p => getPlayerTotalPoints(p.ranks))
  const avgPts       = allPts.length ? Math.round(allPts.reduce((a, b) => a + b, 0) / allPts.length) : 0
  const ht1Count     = players.filter(p => Object.values(p.ranks).some(r => r === 'HT1')).length
  const lt1Count     = players.filter(p => Object.values(p.ranks).some(r => r === 'LT1')).length
  const ovCount      = Object.keys(economy).filter(k => (economy as Record<string, unknown>)[k] !== undefined).length
  const actionsToday = logs.filter(l => Date.now() - l.timestamp < 86_400_000).length
  const actionsHour  = logs.filter(l => Date.now() - l.timestamp < 3_600_000).length

  // Shop stats
  const pendingOrders    = purchases.filter(p => p.status === 'pending').length
  const processingOrders = purchases.filter(p => p.status === 'processing').length
  const completedOrders  = purchases.filter(p => p.status === 'completed').length
  const totalRevenue     = purchases.filter(p => !p.refunded).reduce((s, p) => s + p.totalCost, 0)

  // Top players
  const topPlayers = [...players]
    .sort((a, b) => getPlayerTotalPoints(b.ranks) - getPlayerTotalPoints(a.ranks))
    .slice(0, topN)
    .map(p => ({ player: p, pts: getPlayerTotalPoints(p.ranks) }))
  const maxPts = topPlayers[0]?.pts ?? 1

  // Tier distribution
  const tierDist: Record<string, number> = {}
  TIER_ORDER.forEach(t => { tierDist[t] = 0 })
  players.forEach(p => {
    Object.values(p.ranks).forEach(r => {
      if (r && r !== 'None' && r !== 'NONE' && tierDist[r] !== undefined) tierDist[r]++
    })
  })
  const maxTierCount = Math.max(1, ...Object.values(tierDist))

  // Region distribution
  const regionDist: Record<string, number> = {}
  REGIONS.forEach(r => { regionDist[r] = 0 })
  players.forEach(p => { if (regionDist[p.region] !== undefined) regionDist[p.region]++ })
  const maxRegion = Math.max(1, ...Object.values(regionDist))

  // Gamemode coverage
  const gamemodeCoverage = gamemodes.map(gm => ({
    gm,
    count: players.filter(p => {
      const r = p.ranks[gm.key]
      return r && r !== 'None' && r !== 'NONE'
    }).length,
  }))
  const maxGmCount = Math.max(1, ...gamemodeCoverage.map(g => g.count))

  // Mining richlist
  const richlist = [...userList]
    .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
    .slice(0, 6)

  // Filtered logs
  const filteredLogs = logFilter === 'all'
    ? logs.slice(0, 20)
    : logs.filter(l => l.action.startsWith(logFilter)).slice(0, 20)

  const logCategories = ['all', 'tier', 'mining', 'shop', 'economy', 'event', 'content', 'user', 'github']

  // Economy display
  const DEFAULTS = {
    BASE_RATE:          EXCHANGE_CONSTANTS.BASE_RATE,
    MIN_RATE:           EXCHANGE_CONSTANTS.MIN_RATE,
    MAX_RATE:           EXCHANGE_CONSTANTS.MAX_RATE,
    DAILY_TX_LIMIT:     EXCHANGE_CONSTANTS.DAILY_TX_LIMIT,
    FEE_PCT:            0,
    BLOCK_REWARD:       MINING_CONSTANTS.BLOCK_REWARD,
    BLOCK_INTERVAL_MS:  MINING_CONSTANTS.BLOCK_INTERVAL_MS,
    FINDER_BONUS_PCT:   MINING_CONSTANTS.FINDER_BONUS_PCT,
    STARTING_BALANCE:   MINING_CONSTANTS.STARTING_BALANCE,
  } as Record<string, number>

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-7 pb-10">

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6 bg-gradient-to-r from-[#00BFFF]/5 via-transparent to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center font-['Space_Grotesk'] font-black text-lg text-[#00BFFF]">
              {admin[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-['Space_Grotesk'] font-black text-white text-xl">
                Welcome back, <span className="text-[#00BFFF]">{admin}</span>
              </h2>
              <p className="text-gray-500 text-sm">{dateLabel}</p>
              {sessionDuration && (
                <p className="text-gray-700 text-xs mt-0.5">🔐 {sessionDuration}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <LiveClock />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/3 border border-white/8 text-xs text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`} />
              {refreshing ? 'Refreshing…' : lastRefresh ? `Updated ${Math.floor((Date.now() - lastRefresh) / 1000)}s ago` : 'Loading'}
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-gray-400 border border-white/10 hover:border-[#00BFFF]/30 hover:text-[#00BFFF] transition-all disabled:opacity-50"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              Refresh ({countdown}s)
            </button>
          </div>
        </div>

        {/* Quick nav shortcuts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: 'tier-list',   icon: '📋', label: 'Tier List'  },
            { id: 'mining-mgmt', icon: '⛏️', label: 'Mining'     },
            { id: 'shop-mgmt',   icon: '🛒', label: 'Shop'       },
            { id: 'events',      icon: '🎉', label: 'Events'     },
            { id: 'economy',     icon: '💰', label: 'Economy'    },
            { id: 'users',       icon: '👥', label: 'Users'      },
            { id: 'content',     icon: '📝', label: 'Content'    },
            { id: 'logs',        icon: '📊', label: 'Logs'       },
            { id: 'github-sync', icon: '☁️', label: 'GitHub'     },
          ].map(item => (
            <button key={item.id} onClick={() => setSection?.(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-gray-500 border border-white/8 hover:border-[#00BFFF]/25 hover:text-[#00BFFF] hover:bg-[#00BFFF]/5 transition-all">
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STAT CARDS GRID
      ═══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-0.5 h-4 rounded-full bg-[#00BFFF]" />
          <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">Platform Overview</h3>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="glass rounded-xl border border-white/8 p-5 animate-pulse space-y-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            <StatCard icon="📋" label="Ranked Players"   value={players.length}         sub={`${ht1Count} HT1 · ${lt1Count} LT1`}       color="text-[#00BFFF]"   badge={ht1Count > 0 ? { text: 'Elite', color: 'bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/20' } : undefined} />
            <StatCard icon="⭐" label="Avg Score"         value={`${avgPts} pts`}        sub={`${allPts.filter(p=>p>0).length} scored`}   color="text-yellow-400"  />
            <StatCard icon="👥" label="Mining Accounts"  value={userList.length}         sub={`${userList.filter(u=>u.rigs.length>0).length} have rigs`}  color="text-green-400"   />
            <StatCard icon="₿"  label="BC Circulating"   value={fmtShort(totalBC)}       sub={`${fmt(totalBC)} BlueCoin total`}           color="text-amber-400"   />
            <StatCard icon="💎" label="Gems Circulating" value={fmtShort(totalGems)}     sub={`${fmt(totalGems)} Gems total`}             color="text-purple-400"  />
            <StatCard icon="⛏️" label="Active Rigs"      value={activeRigs}              sub={`${totalRigs} total · ${brokenRigs} broken`} color="text-cyan-400"   badge={brokenRigs > 0 ? { text: `${brokenRigs} broken`, color: 'bg-red-500/10 text-red-400 border-red-500/20' } : undefined} />
            <StatCard icon="⚡" label="Network Hashrate" value={`${fmt(totalHashrate)} GH/s`} sub={`across ${activeRigs} active rigs`}   color="text-emerald-400" />
            <StatCard icon="🧱" label="Blocks Solved"    value={community?.totalSolved ?? 0} sub={`Block #${community?.blockNumber ?? 1} active`} color="text-teal-400" />
            <StatCard icon="🛒" label="Pending Orders"   value={pendingOrders}           sub={`${processingOrders} processing`}           color="text-orange-400"  badge={pendingOrders > 0 ? { text: 'Action needed', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' } : undefined} />
            <StatCard icon="✅" label="Completed Orders" value={completedOrders}          sub={`${fmt(totalRevenue)} ✦ revenue`}           color="text-lime-400"    />
            <StatCard icon="⚙️" label="Economy Overrides" value={ovCount}                sub={ovCount ? 'Custom values active' : 'All at defaults'} color={ovCount ? 'text-orange-400' : 'text-gray-500'} />
            <StatCard icon="📊" label="Actions Today"    value={actionsToday}            sub={`${actionsHour} in last hour`}              color="text-pink-400"    />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BLOCK PROGRESS + MINING NETWORK
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Block progress */}
        <div className="lg:col-span-2 glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-base">🧱</span>
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Community Block Progress</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
          </div>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" />
            </div>
          ) : (
            <BlockProgress community={community} economy={economy} />
          )}

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Block Reward',    value: `${(economy.BLOCK_REWARD ?? MINING_CONSTANTS.BLOCK_REWARD).toLocaleString()} BC`,   color: 'text-amber-400' },
              { label: 'Finder Bonus',    value: `${((economy.FINDER_BONUS_PCT ?? MINING_CONSTANTS.FINDER_BONUS_PCT) * 100).toFixed(0)}%`, color: 'text-[#00BFFF]' },
              { label: 'Interval',        value: `${((economy.BLOCK_INTERVAL_MS ?? MINING_CONSTANTS.BLOCK_INTERVAL_MS) / 60000).toFixed(0)}m`, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
                <p className={`font-['Space_Grotesk'] font-black text-base ${s.color}`}>{s.value}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mining Richlist */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm mb-4">💰 BC Richlist</h3>
          {loading ? (
            <div className="space-y-2 animate-pulse">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
          ) : richlist.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-6">No miners yet</p>
          ) : (
            <div className="space-y-2">
              {richlist.map((u, i) => {
                const active = u.rigs.filter(r => r.status === 'mining').length
                const hp = userList.reduce((m, x) => Math.max(m, x.balance ?? 0), 1)
                return (
                  <div key={u.username} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/3 transition-colors group">
                    <span className={`text-xs font-bold w-4 tabular-nums ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-600' : 'text-gray-700'}`}>#{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{u.username}</p>
                      <div className="w-full h-1 rounded-full bg-white/5 mt-1 overflow-hidden">
                        <div className="h-1 rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400" style={{ width: `${((u.balance??0)/hp)*100}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-amber-400 text-xs font-bold font-mono">{fmtShort(u.balance??0)}</p>
                      <p className="text-gray-700 text-[9px]">{active} rigs</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP PLAYERS + TIER DISTRIBUTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Top Players */}
        <div className="lg:col-span-3 glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🏆</span>
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Top Players</h3>
            </div>
            <div className="flex gap-1">
              {[5, 8, 10].map(n => (
                <button key={n} onClick={() => setTopN(n)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${topN === n ? 'bg-[#00BFFF]/12 border-[#00BFFF]/25 text-[#00BFFF]' : 'border-white/10 text-gray-600 hover:text-gray-300'}`}>
                  Top {n}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2.5 animate-pulse">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : (
            <div className="space-y-1.5">
              {topPlayers.map(({ player: p, pts }, i) => {
                const bestTier = Object.values(p.ranks)
                  .filter(r => r && r !== 'None' && r !== 'NONE')
                  .sort((a, b) => {
                    const ai = TIER_ORDER.indexOf(a as typeof TIER_ORDER[number])
                    const bi = TIER_ORDER.indexOf(b as typeof TIER_ORDER[number])
                    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
                  })[0]
                const tc = bestTier ? tierColors[bestTier] : null
                const pct = (pts / maxPts) * 100

                return (
                  <div key={p.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors group">
                    <span className={`text-xs font-black w-5 tabular-nums ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-600' : 'text-gray-700'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                    </span>
                    <img src={p.head} alt={p.name} className="w-8 h-8 rounded-lg shrink-0"
                      onError={e => { (e.target as HTMLImageElement).src = '' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-white text-xs font-semibold truncate">{p.name}</span>
                        {tc && bestTier && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${tc.bg} ${tc.text} ${tc.border}`}>{bestTier}</span>
                        )}
                        <span className="text-gray-700 text-[9px] ml-0.5">{p.region}</span>
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-1 rounded-full bg-gradient-to-r from-[#00BFFF]/50 to-[#00BFFF]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="font-mono text-[#00BFFF] text-xs font-bold shrink-0">{pts} pts</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tier Distribution */}
        <div className="lg:col-span-2 glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">📊</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Tier Distribution</h3>
          </div>
          {loading ? (
            <div className="space-y-2 animate-pulse">{Array.from({length:10}).map((_,i)=><Skeleton key={i} className="h-6 w-full"/>)}</div>
          ) : (
            <div className="space-y-1.5">
              {TIER_ORDER.map(tier => {
                const count = tierDist[tier] ?? 0
                const tc = tierColors[tier]
                const pct = (count / maxTierCount) * 100
                return (
                  <div key={tier} className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-black w-8 shrink-0 ${tc.text}`}>{tier}</span>
                    <div className="flex-1 h-4 rounded-md bg-white/3 overflow-hidden relative">
                      <div className={`h-full rounded-md ${tc.bg} transition-all`} style={{ width: `${pct}%` }} />
                      {count > 0 && (
                        <span className="absolute inset-y-0 left-1.5 flex items-center text-[9px] font-bold text-white/70">{count}</span>
                      )}
                    </div>
                    <span className="text-gray-700 text-[10px] w-5 text-right tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          REGION + GAMEMODE COVERAGE + SHOP QUEUE
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Region Breakdown */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🌍</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Player Regions</h3>
          </div>
          {loading ? (
            <div className="space-y-2 animate-pulse">{Array.from({length:7}).map((_,i)=><Skeleton key={i} className="h-5 w-full"/>)}</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(regionDist)
                .sort((a, b) => b[1] - a[1])
                .map(([region, count]) => (
                <div key={region} className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs truncate flex-1 min-w-0">{region}</span>
                  <div className="w-20 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-r from-[#00BFFF]/40 to-[#00BFFF]"
                      style={{ width: `${(count / maxRegion) * 100}%` }} />
                  </div>
                  <span className="text-white text-xs font-bold w-6 text-right tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gamemode Coverage */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🎮</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Gamemode Coverage</h3>
          </div>
          {loading ? (
            <div className="space-y-2 animate-pulse">{Array.from({length:7}).map((_,i)=><Skeleton key={i} className="h-5 w-full"/>)}</div>
          ) : (
            <div className="space-y-2">
              {gamemodeCoverage.sort((a,b) => b.count - a.count).map(({ gm, count }) => (
                <div key={gm.key} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">{gm.fallback}</span>
                  <span className="text-gray-500 text-xs w-14 shrink-0">{gm.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-r from-purple-500/40 to-purple-400"
                      style={{ width: `${(count / maxGmCount) * 100}%` }} />
                  </div>
                  <span className="text-white text-xs font-bold w-6 text-right tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shop Queue */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🛒</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Shop Queue</h3>
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : (
            <div className="space-y-2.5">
              {[
                { label: 'Pending',    value: pendingOrders,    icon: '⏳', color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/20', urgent: pendingOrders > 0 },
                { label: 'Processing', value: processingOrders, icon: '⚙️', color: 'text-[#00BFFF]',  bg: 'bg-[#00BFFF]/8 border-[#00BFFF]/20',  urgent: false },
                { label: 'Completed',  value: completedOrders,  icon: '✅', color: 'text-green-400',  bg: 'bg-green-500/8 border-green-500/20',   urgent: false },
                { label: 'Total Revenue', value: `${fmtShort(totalRevenue)} ✦`, icon: '💎', color: 'text-purple-400', bg: 'bg-purple-500/8 border-purple-500/20', urgent: false },
              ].map(s => (
                <div key={s.label} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${s.bg} ${s.urgent ? 'animate-pulse' : ''}`}>
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-gray-400 text-xs flex-1">{s.label}</span>
                  <span className={`font-['Space_Grotesk'] font-black text-base ${s.color}`}>{typeof s.value === 'number' ? s.value : s.value}</span>
                </div>
              ))}
              {pendingOrders > 0 && (
                <button onClick={() => setSection?.('shop-mgmt')}
                  className="w-full mt-1 py-2 rounded-xl text-xs font-semibold text-orange-400 border border-orange-500/25 hover:bg-orange-500/8 transition-all">
                  → Review {pendingOrders} pending order{pendingOrders !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ECONOMY CONSTANTS
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Economy Constants</h3>
            {ovCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400">
                {ovCount} override{ovCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
          <button onClick={() => setSection?.('economy')}
            className="text-xs text-gray-500 hover:text-[#00BFFF] transition-colors">Edit →</button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 animate-pulse">
            {Array.from({length:10}).map((_,i)=><Skeleton key={i} className="h-14 w-full"/>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(DEFAULTS).map(([key, defVal]) => {
              const curVal = (economy as Record<string, number | undefined>)[key]
              const isOverridden = curVal !== undefined
              const displayVal = isOverridden ? curVal : defVal
              const label = key.replace(/_/g, ' ').replace(/MS$/, ' (ms)').replace(/PCT$/, ' (%)')
              return (
                <div key={key} className={`p-3 rounded-xl border ${isOverridden ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white/3 border-white/5'}`}>
                  <p className={`font-['Space_Grotesk'] font-black text-sm ${isOverridden ? 'text-orange-400' : 'text-white'}`}>
                    {key.endsWith('PCT') ? `${((displayVal??0) * 100).toFixed(0)}%`
                     : key.endsWith('MS') ? `${((displayVal??0) / 60000).toFixed(0)}m`
                     : (displayVal??0).toLocaleString()}
                  </p>
                  <p className="text-gray-600 text-[9px] mt-0.5 leading-tight capitalize">{label.toLowerCase()}</p>
                  {isOverridden && <p className="text-orange-600 text-[9px]">overridden</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ACTIVITY LOG
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Activity Log</h3>
            <span className="text-gray-600 text-xs">({actionsToday} today)</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {logCategories.map(cat => (
              <button key={cat} onClick={() => setLogFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all capitalize ${
                  logFilter === cat
                    ? 'bg-[#00BFFF]/12 border-[#00BFFF]/25 text-[#00BFFF]'
                    : 'border-white/8 text-gray-600 hover:text-gray-300 hover:border-white/15'
                }`}>
                {cat}
              </button>
            ))}
            <button onClick={() => setSection?.('logs')}
              className="px-2.5 py-1 rounded-lg text-[10px] text-gray-600 border border-white/8 hover:text-[#00BFFF] hover:border-[#00BFFF]/20 transition-all">
              Full Log →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">
            <div className="text-3xl mb-2 opacity-30">📋</div>
            No activity matching this filter.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors group">
                <span className="text-[10px] font-mono text-gray-700 mt-0.5 shrink-0 w-12 tabular-nums">
                  {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${actionColor(log.action)}`}>
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  {log.details && <p className="text-gray-500 text-[11px] truncate">{log.details}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-700 text-[9px] font-mono">{log.admin}</span>
                  <span className="text-gray-800 text-[9px]">{timeAgo(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RECENT SHOP ORDERS
      ═══════════════════════════════════════════════════════════════════════ */}
      {!loading && purchases.length > 0 && (
        <div className="glass rounded-2xl border border-white/8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🧾</span>
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Recent Shop Orders</h3>
            </div>
            <button onClick={() => setSection?.('shop-mgmt')}
              className="text-xs text-gray-500 hover:text-[#00BFFF] transition-colors">Manage →</button>
          </div>
          <div className="space-y-1.5">
            {purchases.slice(0, 6).map(p => {
              const statusColor = {
                pending:    'bg-orange-500/10 border-orange-500/20 text-orange-400',
                processing: 'bg-[#00BFFF]/10 border-[#00BFFF]/20 text-[#00BFFF]',
                completed:  'bg-green-500/10 border-green-500/20 text-green-400',
                cancelled:  'bg-red-500/10 border-red-500/20 text-red-400',
                rejected:   'bg-red-800/10 border-red-800/20 text-red-600',
              }[p.status] ?? 'bg-white/5 border-white/10 text-gray-500'
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors">
                  <span className="font-mono text-gray-700 text-[10px] shrink-0">{p.id}</span>
                  <span className="text-white text-xs font-semibold flex-1 truncate">{p.itemName}</span>
                  <span className="text-gray-600 text-xs shrink-0">{p.username}</span>
                  <span className="text-purple-400 text-xs font-bold shrink-0 font-mono">{fmtShort(p.totalCost)} ✦</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${statusColor}`}>{p.status}</span>
                  <span className="text-gray-700 text-[9px] shrink-0">{timeAgo(p.createdAt)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
