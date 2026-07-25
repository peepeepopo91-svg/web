// ─── Site Growth — Analytics Dashboard ────────────────────────────────────────
// Grand analytics page for the Admin Panel.
// Collects real data from the growth beacon (page views, sessions, device info)
// and integrates with existing mining and shop data.
// All historical data starts from the moment this feature was deployed —
// never fabricates past statistics.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getGrowthStats }        from '../../server/growthServer'
import { getDashboardStats }     from '../../server/miningServer'
import { adminGetAllPurchases }  from '../../server/shopServer'
import type { GrowthData, DayStatStored } from '../../server/growthServer'
import type { User }             from '../../data/mining'
import type { Purchase }         from '../../data/shop'
import { RIG_TIERS }             from '../../data/mining'

interface Props { admin: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(Math.floor(n))
}

function pct(a: number, b: number): string {
  if (b === 0) return '0%'
  return ((a / b) * 100).toFixed(1) + '%'
}

function dateRange(days: number): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function daysForRange(range: TimeRange): number {
  switch (range) {
    case '7d':  return 7
    case '30d': return 30
    case '90d': return 90
    case '1y':  return 365
    case 'all': return 9999
  }
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all'

function emptyDay(): DayStatStored {
  return { pageViews: 0, uniqueSessions: 0, pages: {}, referrers: {}, devices: {}, browsers: {}, os: {}, peakConcurrent: 0 }
}

function sumDays(days: DayStatStored[]): DayStatStored {
  const out = emptyDay()
  for (const d of days) {
    out.pageViews      += d.pageViews
    out.uniqueSessions += d.uniqueSessions
    for (const [k, v] of Object.entries(d.pages))    out.pages[k]    = (out.pages[k]    ?? 0) + v
    for (const [k, v] of Object.entries(d.referrers)) out.referrers[k]= (out.referrers[k]?? 0) + v
    for (const [k, v] of Object.entries(d.devices))  out.devices[k]  = (out.devices[k]  ?? 0) + v
    for (const [k, v] of Object.entries(d.browsers)) out.browsers[k] = (out.browsers[k] ?? 0) + v
    for (const [k, v] of Object.entries(d.os))       out.os[k]       = (out.os[k]       ?? 0) + v
    if (d.peakConcurrent > out.peakConcurrent)        out.peakConcurrent = d.peakConcurrent
  }
  return out
}

function topEntries(obj: Record<string, number>, n = 10): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ className }: { className: string }) {
  return <div className={`rounded-lg bg-white/5 animate-pulse ${className}`} />
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function Card({
  icon, label, value, sub, color = 'text-[#00BFFF]', pulse, badge,
}: {
  icon: string; label: string; value: string | number
  sub?: string; color?: string; pulse?: boolean
  badge?: { text: string; color: string }
}) {
  return (
    <div className="glass rounded-xl border border-white/8 p-4 hover:border-white/15 transition-all duration-200 group relative overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'radial-gradient(ellipse at top right,rgba(0,191,255,0.03),transparent 60%)' }} />
      <div className="flex items-start justify-between mb-2.5">
        <span className="text-lg">{icon}</span>
        <div className="flex items-center gap-1.5">
          {pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {badge && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.color}`}>{badge.text}</span>
          )}
        </div>
      </div>
      <p className={`font-['Space_Grotesk'] font-black text-xl leading-tight ${color}`}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      <p className="text-white text-xs font-semibold mt-1">{label}</p>
      {sub && <p className="text-gray-600 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHead({ icon, title, right }: { icon: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="w-0.5 h-4 rounded-full bg-[#00BFFF]" />
        <span className="text-base">{icon}</span>
        <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">{title}</h3>
      </div>
      {right}
    </div>
  )
}

// ── Line Chart (SVG) ──────────────────────────────────────────────────────────

function LineChart({
  series, height = 140,
}: {
  series: { label: string; color: string; data: { date: string; value: number }[] }[]
  height?: number
}) {
  const W = 560, H = height
  const PAD = { t: 8, r: 8, b: 24, l: 36 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // Merge all dates
  const allDates = Array.from(new Set(series.flatMap(s => s.data.map(d => d.date)))).sort()
  if (allDates.length < 2) {
    return (
      <div className="flex items-center justify-center text-gray-600 text-xs" style={{ height: H }}>
        Not enough data yet — check back after a few days
      </div>
    )
  }

  const allValues = series.flatMap(s => s.data.map(d => d.value))
  const maxV = Math.max(1, ...allValues)

  const xOf = (date: string) => PAD.l + (allDates.indexOf(date) / (allDates.length - 1)) * innerW
  const yOf = (v: number)    => PAD.t + (1 - v / maxV) * innerH

  // Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t, i) => ({
    idx: i,
    v: Math.round(t * maxV),
    y: PAD.t + (1 - t) * innerH,
  }))

  // X labels (show at most 7)
  const step = Math.max(1, Math.ceil(allDates.length / 7))
  const xLabels = allDates.filter((_, i) => i % step === 0 || i === allDates.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      {/* Grid */}
      {yTicks.map(t => (
        <g key={t.idx}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y}
            stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <text x={PAD.l - 4} y={t.y + 3.5} textAnchor="end"
            fill="rgba(255,255,255,0.25)" fontSize="8">{fmtShort(t.v)}</text>
        </g>
      ))}
      {/* Series */}
      {series.map(s => {
        const pts = s.data.map(d => ({ x: xOf(d.date), y: yOf(d.value) }))
        if (pts.length < 2) return null
        const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${PAD.t + innerH} L ${pts[0].x} ${PAD.t + innerH} Z`
        return (
          <g key={s.label}>
            <path d={areaPath} fill={s.color} fillOpacity="0.08" />
            <path d={linePath} fill="none" stroke={s.color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
            {pts.length <= 30 && pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={s.color} fillOpacity="0.7" />
            ))}
          </g>
        )
      })}
      {/* X labels */}
      {xLabels.map(d => (
        <text key={d} x={xOf(d)} y={H - 4} textAnchor="middle"
          fill="rgba(255,255,255,0.25)" fontSize="8">{d.slice(5)}</text>
      ))}
    </svg>
  )
}

// ── Horizontal Bar Chart ──────────────────────────────────────────────────────

function HBar({
  entries, color = '#00BFFF', total, limit = 8,
}: {
  entries: [string, number][]
  color?: string
  total?: number
  limit?: number
}) {
  const shown  = entries.slice(0, limit)
  const maxVal = Math.max(1, ...shown.map(e => e[1]))
  const tot    = total ?? shown.reduce((s, e) => s + e[1], 0)

  if (shown.length === 0) {
    return <p className="text-gray-700 text-xs text-center py-4">No data yet</p>
  }

  return (
    <div className="space-y-2">
      {shown.map(([key, val]) => (
        <div key={key}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-300 truncate max-w-[60%]">{key}</span>
            <span className="text-gray-500 font-mono">{fmt(val)} <span className="text-gray-700">({pct(val, tot)})</span></span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(val / maxVal) * 100}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Donut / Pie Display ───────────────────────────────────────────────────────

function DonutSegments({
  data, colors,
}: {
  data: [string, number][]
  colors: string[]
}) {
  const total = data.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return <p className="text-gray-700 text-xs text-center py-4">No data yet</p>

  const R = 40, CX = 55, CY = 55, stroke = 20
  let cum = 0
  const arcs = data.slice(0, 6).map(([label, val], i) => {
    const angle = (val / total) * 360
    const start = cum
    cum += angle
    const r1 = ((start - 90) * Math.PI) / 180
    const r2 = ((start + angle - 90) * Math.PI) / 180
    const x1 = CX + R * Math.cos(r1)
    const y1 = CY + R * Math.sin(r1)
    const x2 = CX + R * Math.cos(r2)
    const y2 = CY + R * Math.sin(r2)
    const large = angle > 180 ? 1 : 0
    return { label, val, color: colors[i % colors.length], d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`, pct: ((val/total)*100).toFixed(0) }
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 110 110" className="w-24 h-24 shrink-0">
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} fillOpacity="0.85" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />)}
        <circle cx={CX} cy={CY} r={R - stroke} fill="#0B0F17" />
        <text x={CX} y={CY + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{fmtShort(total)}</text>
      </svg>
      <div className="flex flex-col gap-1 min-w-0">
        {arcs.map((a, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
            <span className="text-gray-400 truncate">{a.label}</span>
            <span className="text-gray-600 ml-auto shrink-0">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Insight Card ──────────────────────────────────────────────────────────────

function Insight({ emoji, text, color = 'text-[#00BFFF]' }: { emoji: string; text: string; color?: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-white/3 border border-white/6 hover:border-white/10 transition-colors">
      <span className="text-base shrink-0">{emoji}</span>
      <p className={`text-xs leading-relaxed ${color}`}>{text}</p>
    </div>
  )
}

// ── Time Range Picker ─────────────────────────────────────────────────────────

const RANGES: { id: TimeRange; label: string }[] = [
  { id: '7d',  label: '7 days'  },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '1y',  label: '1 year'  },
  { id: 'all', label: 'All time' },
]

// ── Main Component ────────────────────────────────────────────────────────────

export function SiteGrowth({ admin: _admin }: Props) {
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const [countdown, setCountdown]   = useState(60)
  const [range, setRange]           = useState<TimeRange>('7d')

  // Data
  const [growth, setGrowth]         = useState<GrowthData | null>(null)
  const [concurrent, setConcurrent] = useState(0)
  const [todaySessions, setTodaySessions] = useState(0)
  const [miningUsers, setMiningUsers]     = useState<Record<string, User>>({})
  const [purchases, setPurchases]         = useState<Purchase[]>([])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setRefreshing(true)
    try {
      const [gs, mining, purcs] = await Promise.all([
        getGrowthStats().catch(() => null),
        getDashboardStats().catch(() => null),
        adminGetAllPurchases().catch(() => [] as Purchase[]),
      ])
      if (gs) {
        setGrowth(gs.growth)
        setConcurrent(gs.concurrent)
        setTodaySessions(gs.todaySessions)
      }
      if (mining) setMiningUsers(mining.users ?? {})
      setPurchases(purcs)
    } finally {
      setLastRefresh(Date.now())
      setCountdown(60)
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  // ── Computed values ──────────────────────────────────────────────────────────

  const days       = daysForRange(range)
  const allKeys    = growth ? Object.keys(growth.dailyStats).sort() : []
  const rangeKeys  = range === 'all'
    ? allKeys
    : dateRange(days).filter(k => growth?.dailyStats[k])

  const rangeStats: DayStatStored = useMemo(() => {
    if (!growth) return emptyDay()
    const subset = rangeKeys.map(k => growth.dailyStats[k] ?? emptyDay())
    return sumDays(subset)
  }, [growth, rangeKeys])

  const todayStats   = growth?.dailyStats[new Date().toISOString().slice(0, 10)] ?? emptyDay()
  const allTimeStats = growth ? sumDays(Object.values(growth.dailyStats)) : emptyDay()

  // Week / month subsets
  const weekKeys  = dateRange(7).filter(k  => growth?.dailyStats[k])
  const monthKeys = dateRange(30).filter(k => growth?.dailyStats[k])
  const weekStats  = growth ? sumDays(weekKeys.map(k  => growth.dailyStats[k]  ?? emptyDay())) : emptyDay()
  const monthStats = growth ? sumDays(monthKeys.map(k => growth.dailyStats[k] ?? emptyDay())) : emptyDay()

  // Chart data for selected range
  const chartDates = range === 'all' ? allKeys : dateRange(days)
  const visitorSeries = [{
    label: 'Page Views',
    color: '#00BFFF',
    data: chartDates.map(d => ({ date: d, value: growth?.dailyStats[d]?.pageViews ?? 0 })),
  }, {
    label: 'Unique Sessions',
    color: '#a78bfa',
    data: chartDates.map(d => ({ date: d, value: growth?.dailyStats[d]?.uniqueSessions ?? 0 })),
  }]

  // Mining stats
  const userList    = Object.values(miningUsers)
  const activeRigs  = userList.reduce((s, u) => s + u.rigs.filter(r => r.status === 'mining').length, 0)
  const totalRigs   = userList.reduce((s, u) => s + u.rigs.length, 0)
  const totalBC     = userList.reduce((s, u) => s + (u.balance ?? 0), 0)
  const totalGems   = userList.reduce((s, u) => s + (u.gems ?? 0), 0)
  const now         = Date.now()
  const activeMiners = userList.filter(u => u.miningExpiresAt && u.miningExpiresAt > now).length
  const expiredMiners = userList.filter(u => u.miningExpiresAt && u.miningExpiresAt <= now).length

  // Rig popularity
  const rigCounts: Record<string, number> = {}
  userList.forEach(u => u.rigs.forEach(r => { rigCounts[r.tierId] = (rigCounts[r.tierId] ?? 0) + 1 }))
  const topRigs = Object.entries(rigCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, count]) => ({ rig: RIG_TIERS.find(r => r.id === id), count }))
    .filter(r => r.rig)

  // Top miners by balance
  const topMiners = [...userList].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)).slice(0, 5)

  // Shop stats
  const pendingP    = purchases.filter(p => p.status === 'pending').length
  const completedP  = purchases.filter(p => p.status === 'completed').length
  const cancelledP  = purchases.filter(p => p.status === 'cancelled').length
  const totalGemsSpent = purchases.filter(p => !p.refunded).reduce((s, p) => s + p.totalCost, 0)
  const itemCounts: Record<string, number> = {}
  purchases.forEach(p => { itemCounts[p.itemName] = (itemCounts[p.itemName] ?? 0) + p.quantity })
  const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const catCounts: Record<string, number> = {}
  purchases.forEach(p => { catCounts[p.category] = (catCounts[p.category] ?? 0) + 1 })

  // Smart Insights
  const insights: { emoji: string; text: string; color?: string }[] = useMemo(() => {
    const out: { emoji: string; text: string; color?: string }[] = []
    if (!growth) return out

    // Visitor growth
    const prevWeekKeys = dateRange(14).slice(0, 7).filter(k => growth.dailyStats[k])
    const prevWeekStats = sumDays(prevWeekKeys.map(k => growth.dailyStats[k] ?? emptyDay()))
    if (weekStats.pageViews > 0 && prevWeekStats.pageViews > 0) {
      const delta = ((weekStats.pageViews - prevWeekStats.pageViews) / prevWeekStats.pageViews) * 100
      if (delta > 0) out.push({ emoji: '📈', text: `Traffic is up ${delta.toFixed(0)}% this week compared to last week.`, color: 'text-emerald-400' })
      else if (delta < 0) out.push({ emoji: '📉', text: `Traffic is down ${Math.abs(delta).toFixed(0)}% this week compared to last week.`, color: 'text-red-400' })
    }

    // Most visited page
    const topPage = topEntries(allTimeStats.pages)[0]
    if (topPage) out.push({ emoji: '🏆', text: `Most visited page is "${topPage[0]}" with ${fmt(topPage[1])} views.` })

    // Top traffic source
    const topSrc = topEntries(allTimeStats.referrers)[0]
    if (topSrc && topSrc[0] !== 'Direct') out.push({ emoji: '🔗', text: `Top external traffic source is ${topSrc[0]} (${pct(topSrc[1], allTimeStats.pageViews)} of traffic).` })

    // Device distribution
    const totalDevices = Object.values(allTimeStats.devices).reduce((s, v) => s + v, 0)
    const desktop = allTimeStats.devices['Desktop'] ?? 0
    const mobile  = allTimeStats.devices['Mobile']  ?? 0
    if (totalDevices > 0) {
      if (mobile > desktop) out.push({ emoji: '📱', text: `Majority of visitors use mobile (${pct(mobile, totalDevices)}).` })
      else out.push({ emoji: '🖥️', text: `Most visitors are on desktop (${pct(desktop, totalDevices)}).` })
    }

    // Top browser
    const topBrowser = topEntries(allTimeStats.browsers)[0]
    if (topBrowser) out.push({ emoji: '🌐', text: `${topBrowser[0]} is the most popular browser (${pct(topBrowser[1], allTimeStats.pageViews)} of sessions).` })

    // Mining insight
    if (activeMiners > 0) out.push({ emoji: '⛏️', text: `${activeMiners} active miners currently running ${activeRigs} rigs with ${fmtShort(totalBC)} BC in circulation.` })

    // Shop insight
    if (purchases.length > 0) {
      out.push({ emoji: '🛒', text: `${fmt(purchases.length)} total shop orders — ${completedP} completed, ${pendingP} awaiting processing.` })
    }
    if (topItems[0]) out.push({ emoji: '🏅', text: `Most purchased shop item: "${topItems[0][0]}" (${fmt(topItems[0][1])} units).` })

    // Data age
    if (allKeys.length === 0) out.push({ emoji: '🆕', text: 'Analytics just started — data will accumulate as visitors arrive.', color: 'text-gray-400' })

    return out.slice(0, 8)
  }, [growth, weekStats, allTimeStats, purchases, topItems, activeMiners, activeRigs, totalBC, completedP, pendingP, allKeys.length])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-7 pb-10">

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-['Space_Grotesk'] font-black text-white text-xl flex items-center gap-2">
              📈 <span>Site <span className="text-emerald-400">Growth</span></span>
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {growth?.startedAt
                ? `Collecting data since ${new Date(growth.startedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'Real-time analytics dashboard'
              }
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {concurrent} online now
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/3 border border-white/8 text-xs text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`} />
              {refreshing ? 'Refreshing…' : lastRefresh ? `Updated ${Math.floor((Date.now() - lastRefresh) / 1000)}s ago` : 'Loading…'}
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-gray-400 border border-white/10 hover:border-emerald-400/30 hover:text-emerald-400 transition-all disabled:opacity-50"
            >
              <span className={refreshing ? 'animate-spin' : ''}>↻</span>
              Refresh ({countdown}s)
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          LIVE OVERVIEW CARDS
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <SectionHead icon="⚡" title="Live Overview" right={
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        } />
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="glass rounded-xl border border-white/8 p-4 animate-pulse space-y-2">
                <Skel className="h-4 w-4" /><Skel className="h-6 w-16" /><Skel className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <Card icon="👁️" label="Online Now"          value={concurrent}             color="text-emerald-400" pulse sub="active sessions"           badge={concurrent > 0 ? { text: 'Live', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' } : undefined} />
            <Card icon="📅" label="Visitors Today"      value={todaySessions}          color="text-[#00BFFF]"   sub={`${fmt(todayStats.pageViews)} views`} />
            <Card icon="📊" label="Views Today"         value={todayStats.pageViews}   color="text-sky-400"     sub="page views" />
            <Card icon="📆" label="Visitors This Week"  value={weekStats.uniqueSessions}  color="text-violet-400"  sub={`${fmt(weekStats.pageViews)} views`} />
            <Card icon="🗓️" label="Visitors This Month" value={monthStats.uniqueSessions} color="text-purple-400"  sub={`${fmt(monthStats.pageViews)} views`} />
            <Card icon="🌍" label="All-Time Sessions"   value={allTimeStats.uniqueSessions} color="text-pink-400"  sub={`${fmt(allTimeStats.pageViews)} views`} />
            <Card icon="⛏️" label="Total Miners"         value={userList.length}        color="text-amber-400"   sub={`${activeMiners} active`} />
            <Card icon="🛒" label="Total Purchases"      value={purchases.length}       color="text-orange-400"  sub={`${pendingP} pending`} />
            <Card icon="₿"  label="BC Circulating"       value={fmtShort(totalBC)}      color="text-yellow-400"  sub={`${fmtShort(totalGems)} gems`} />
            <Card icon="⛏️" label="Active Rigs"           value={activeRigs}             color="text-cyan-400"    sub={`${totalRigs} total`} />
            <Card icon="🏔️" label="Peak Concurrent"       value={growth?.peakConcurrentEver ?? 0} color="text-indigo-400" sub="all-time peak" />
            <Card icon="📈" label="Today Peak"            value={todayStats.peakConcurrent}      color="text-teal-400"   sub="concurrent today" />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TIME RANGE + VISITOR TRENDS CHART
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-0.5 h-4 rounded-full bg-[#00BFFF]" />
            <span className="text-base">📉</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Visitor Growth Trends</h3>
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <div className="w-5 h-0.5 rounded-full bg-[#00BFFF]" /> Page Views
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <div className="w-5 h-0.5 rounded-full bg-violet-400" /> Unique Sessions
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                  range === r.id
                    ? 'bg-[#00BFFF]/12 border-[#00BFFF]/25 text-[#00BFFF]'
                    : 'border-white/10 text-gray-600 hover:text-gray-300'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <Skel className="h-36 w-full" />
        ) : (
          <LineChart series={visitorSeries} height={140} />
        )}

        {/* Period summary */}
        {!loading && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Page Views', value: fmt(rangeStats.pageViews),       color: 'text-[#00BFFF]' },
              { label: 'Sessions',   value: fmt(rangeStats.uniqueSessions),   color: 'text-violet-400' },
              { label: 'Peak Concurrent', value: fmt(rangeStats.peakConcurrent), color: 'text-emerald-400' },
              { label: 'Avg Views/Day', value: rangeKeys.length > 0 ? fmt(Math.round(rangeStats.pageViews / rangeKeys.length)) : '0', color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
                <p className={`font-['Space_Grotesk'] font-black text-base ${s.color}`}>{s.value}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VISITOR ANALYTICS + TOP PAGES
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Visitor Analytics */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <SectionHead icon="👥" title="Visitor Analytics" />
          {loading ? (
            <div className="space-y-3">{Array.from({length:6}).map((_,i) => <Skel key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-2.5">
              {[
                { label: 'Today',           value: todaySessions,             sub: `${fmt(todayStats.pageViews)} views` },
                { label: 'This week',        value: weekStats.uniqueSessions,  sub: `${fmt(weekStats.pageViews)} views` },
                { label: 'This month',       value: monthStats.uniqueSessions, sub: `${fmt(monthStats.pageViews)} views` },
                { label: 'All time',         value: allTimeStats.uniqueSessions, sub: `${fmt(allTimeStats.pageViews)} total views` },
                { label: 'Pages / session (today)', value: todayStats.uniqueSessions > 0 ? (todayStats.pageViews / todayStats.uniqueSessions).toFixed(1) : '0', sub: 'avg depth' },
                { label: 'Concurrent peak (today)', value: todayStats.peakConcurrent, sub: 'simultaneous visitors' },
                { label: 'Concurrent peak (ever)',  value: growth?.peakConcurrentEver ?? 0, sub: 'all-time record' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/3 transition-colors">
                  <span className="text-gray-400 text-xs">{row.label}</span>
                  <div className="text-right">
                    <span className="text-white text-xs font-bold font-mono">{typeof row.value === 'number' ? fmt(row.value) : row.value}</span>
                    {row.sub && <p className="text-gray-700 text-[9px]">{row.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Pages */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <SectionHead icon="📄" title="Most Visited Pages" />
          {loading ? (
            <Skel className="h-48 w-full" />
          ) : (
            <HBar
              entries={topEntries(rangeStats.pages, 8)}
              total={rangeStats.pageViews}
              color="#00BFFF"
            />
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TRAFFIC SOURCES + DEVICE ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Traffic Sources */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <SectionHead icon="🔗" title="Traffic Sources" />
          {loading ? <Skel className="h-40 w-full" /> : (
            <HBar
              entries={topEntries(rangeStats.referrers)}
              total={rangeStats.uniqueSessions}
              color="#a78bfa"
            />
          )}
        </div>

        {/* Device Distribution */}
        <div className="glass rounded-2xl border border-white/8 p-6">
          <SectionHead icon="📱" title="Devices" />
          {loading ? <Skel className="h-40 w-full" /> : (
            <DonutSegments
              data={topEntries(rangeStats.devices, 4)}
              colors={['#00BFFF', '#a78bfa', '#34d399']}
            />
          )}
          {!loading && (
            <div className="mt-4">
              <HBar entries={topEntries(rangeStats.devices)} total={rangeStats.uniqueSessions} color="#00BFFF" />
            </div>
          )}
        </div>

        {/* Browser + OS */}
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
          <div>
            <SectionHead icon="🌐" title="Browsers" />
            {loading ? <Skel className="h-24 w-full" /> : (
              <HBar entries={topEntries(rangeStats.browsers, 5)} total={rangeStats.uniqueSessions} color="#f59e0b" />
            )}
          </div>
          <div>
            <SectionHead icon="💻" title="Operating Systems" />
            {loading ? <Skel className="h-24 w-full" /> : (
              <HBar entries={topEntries(rangeStats.os, 5)} total={rangeStats.uniqueSessions} color="#34d399" />
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MINING ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <SectionHead icon="⛏️" title="Mining Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              Array.from({length:6}).map((_,i)=><Skel key={i} className="h-20 rounded-xl" />)
            ) : (
              <>
                <Card icon="👥" label="Total Miners"   value={userList.length}    color="text-[#00BFFF]"   sub={`${activeMiners} active`} />
                <Card icon="⌛" label="Expired Miners" value={expiredMiners}      color="text-red-400"     sub="need renewal" />
                <Card icon="⛏️" label="Active Rigs"    value={activeRigs}         color="text-emerald-400" sub={`${totalRigs} total`} />
                <Card icon="₿"  label="BC Total"        value={fmtShort(totalBC)} color="text-amber-400"   sub="in circulation" />
                <Card icon="💎" label="Gems Total"      value={fmtShort(totalGems)} color="text-purple-400" sub="in circulation" />
                <Card icon="📊" label="Avg Rigs/Miner"  value={userList.length > 0 ? (totalRigs / userList.length).toFixed(1) : '0'} color="text-cyan-400" sub="per account" />
              </>
            )}
          </div>

          {/* Top Miners */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-3">Top Miners by BC</p>
            {loading ? (
              <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skel key={i} className="h-9 w-full" />)}</div>
            ) : topMiners.length === 0 ? (
              <p className="text-gray-700 text-xs text-center py-4">No miners yet</p>
            ) : (
              <div className="space-y-1.5">
                {topMiners.map((u, i) => {
                  const maxB = Math.max(1, topMiners[0].balance ?? 1)
                  return (
                    <div key={u.username} className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/3 transition-colors">
                      <span className={`text-xs font-bold w-4 ${i===0?'text-amber-400':i===1?'text-gray-300':i===2?'text-orange-600':'text-gray-700'}`}>#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate">{u.username}</p>
                        <div className="h-1 w-full rounded-full bg-white/5 mt-0.5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400"
                            style={{ width: `${((u.balance??0)/maxB)*100}%` }} />
                        </div>
                      </div>
                      <span className="text-amber-400 text-xs font-bold font-mono shrink-0">{fmtShort(u.balance??0)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Popular Rigs */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-3">Most Popular Rigs</p>
            {loading ? (
              <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skel key={i} className="h-9 w-full" />)}</div>
            ) : topRigs.length === 0 ? (
              <p className="text-gray-700 text-xs text-center py-4">No rigs yet</p>
            ) : (
              <div className="space-y-2">
                {topRigs.map(({ rig, count }) => (
                  <div key={rig!.id} className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/3 transition-colors">
                    <span className="text-white text-xs font-semibold">{rig!.name}</span>
                    <div className="text-right">
                      <span className="text-cyan-400 text-xs font-bold font-mono">{count}</span>
                      <p className="text-gray-700 text-[9px]">{rig!.hashrate} GH/s</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SHOP ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <SectionHead icon="🛒" title="Shop Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              Array.from({length:6}).map((_,i)=><Skel key={i} className="h-20 rounded-xl" />)
            ) : (
              <>
                <Card icon="📦" label="Total Orders"   value={purchases.length}   color="text-[#00BFFF]"   sub="all time" />
                <Card icon="⏳" label="Pending"         value={pendingP}           color="text-orange-400"  sub="awaiting action" badge={pendingP > 0 ? { text: 'Action needed', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' } : undefined} />
                <Card icon="✅" label="Completed"       value={completedP}         color="text-emerald-400" sub="fulfilled" />
                <Card icon="❌" label="Cancelled"       value={cancelledP}         color="text-red-400"     sub="refunded/cancelled" />
                <Card icon="💎" label="Gems Spent"      value={fmtShort(totalGemsSpent)} color="text-purple-400" sub="all-time revenue" />
                <Card icon="📊" label="Avg Order"       value={purchases.length > 0 ? fmtShort(Math.round(totalGemsSpent / purchases.length)) : '0'} color="text-pink-400" sub="gems per order" />
              </>
            )}
          </div>

          {/* Top Items */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-3">Top Purchased Items</p>
            {loading ? (
              <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skel key={i} className="h-8 w-full" />)}</div>
            ) : topItems.length === 0 ? (
              <p className="text-gray-700 text-xs text-center py-4">No purchases yet</p>
            ) : (
              <div className="space-y-2">
                {topItems.map(([name, count], i) => (
                  <div key={name} className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/3 transition-colors">
                    <span className={`text-xs font-bold w-4 ${i===0?'text-amber-400':i===1?'text-gray-300':i===2?'text-orange-600':'text-gray-700'}`}>#{i+1}</span>
                    <span className="flex-1 text-white text-xs font-semibold truncate">{name}</span>
                    <span className="text-purple-400 text-xs font-bold font-mono shrink-0">{count} units</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-3">Popular Categories</p>
            {loading ? (
              <Skel className="h-32 w-full" />
            ) : (
              <HBar
                entries={topEntries(catCounts, 6)}
                total={purchases.length}
                color="#a78bfa"
              />
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SMART INSIGHTS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <SectionHead icon="🤖" title="Smart Insights" right={
          <span className="text-[10px] text-gray-600">Auto-generated from real data</span>
        } />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Array.from({length:6}).map((_,i) => <Skel key={i} className="h-12 w-full" />)}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-gray-500 text-sm">Insights will appear once visitors start arriving.</p>
            <p className="text-gray-700 text-xs mt-1">Data collection started — check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {insights.map((ins, i) => (
              <Insight key={i} emoji={ins.emoji} text={ins.text} color={ins.color} />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DAILY BREAKDOWN TABLE
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <SectionHead icon="📆" title="Daily Breakdown" right={
          <span className="text-[10px] text-gray-600">{rangeKeys.length} days with data</span>
        } />
        {loading ? (
          <Skel className="h-48 w-full" />
        ) : rangeKeys.length === 0 ? (
          <div className="text-center py-10 text-gray-600 text-sm">
            No data for the selected range. Pages are tracked as visitors arrive.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {['Date', 'Views', 'Sessions', 'Peak Concurrent', 'Top Page', 'Top Source'].map(h => (
                    <th key={h} className="text-left text-gray-600 font-semibold pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rangeKeys].reverse().map(k => {
                  const d = growth?.dailyStats[k] ?? emptyDay()
                  const topPage = topEntries(d.pages)[0]
                  const topSrc  = topEntries(d.referrers)[0]
                  return (
                    <tr key={k} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                      <td className="py-2 pr-4 text-gray-300 font-mono whitespace-nowrap">{k}</td>
                      <td className="py-2 pr-4 text-[#00BFFF] font-bold font-mono">{fmt(d.pageViews)}</td>
                      <td className="py-2 pr-4 text-violet-400 font-mono">{fmt(d.uniqueSessions)}</td>
                      <td className="py-2 pr-4 text-emerald-400 font-mono">{d.peakConcurrent}</td>
                      <td className="py-2 pr-4 text-gray-400 truncate max-w-[120px]">{topPage?.[0] ?? '—'}</td>
                      <td className="py-2 text-gray-400">{topSrc?.[0] ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
