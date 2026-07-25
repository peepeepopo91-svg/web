import { useState, useEffect } from 'react'
import { getEconomyOverrides, saveEconomyOverrides } from '../../store/miningStore'
import type { EconomyOverrides } from '../../store/miningStore'
import { MINING_CONSTANTS, EXCHANGE_CONSTANTS, RIG_TIERS } from '../../data/mining'
import type { User } from '../../data/mining'
import { getDashboardStats } from '../../server/miningServer'
import { addLog } from '../../store/adminStore'

interface Props { admin: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: '📊' },
  { id: 'exchange',   label: 'Exchange',   icon: '💱' },
  { id: 'mining',     label: 'Mining',     icon: '⛏️' },
  { id: 'hardware',   label: 'Hardware',   icon: '🖥️' },
  { id: 'simulator',  label: 'Simulator',  icon: '🧪' },
  { id: 'history',    label: 'History',    icon: '📋' },
] as const
type Tab = typeof TABS[number]['id']

const HISTORY_KEY = 'bn_economy_history'

interface HistoryEntry {
  ts: number
  overrides: EconomyOverrides
  overrideCount: number
  admin: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}
function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(Math.floor(n))
}
function fmtMs(ms: number) {
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`
  if (ms >= 60_000)    return `${Math.round(ms / 60_000)}m`
  return `${Math.round(ms / 1000)}s`
}
function safeGet<T>(key: string): T | null {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : null } catch { return null }
}
function safeSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
}

// Replicate the rate formula client-side (same math as miningStore.getExchangeRate)
function computeRate(now: number, ov: EconomyOverrides) {
  const BASE = ov.BASE_RATE ?? EXCHANGE_CONSTANTS.BASE_RATE
  const MIN  = ov.MIN_RATE  ?? EXCHANGE_CONSTANTS.MIN_RATE
  const MAX  = ov.MAX_RATE  ?? EXCHANGE_CONSTANTS.MAX_RATE
  const PERIOD = EXCHANGE_CONSTANTS.FLUCTUATION_PERIOD_MS
  const t = (now % PERIOD) / PERIOD
  const wave = Math.sin(2 * Math.PI * t) * 0.65 + Math.sin(2 * Math.PI * t * 2.7 + 1.2) * 0.35
  const amplitude = (MAX - MIN) / 2
  return Math.round(BASE + wave * amplitude)
}

function computeRateHistory(ov: EconomyOverrides, points = 96) {
  const PERIOD = EXCHANGE_CONSTANTS.FLUCTUATION_PERIOD_MS
  const step = PERIOD / points
  const now = Date.now()
  const amplitude = ((ov.MAX_RATE ?? EXCHANGE_CONSTANTS.MAX_RATE) - (ov.MIN_RATE ?? EXCHANGE_CONSTANTS.MIN_RATE)) / 2
  // points[0] = 4 h ago, points[95] = now — rightmost dot matches currentRate exactly
  return Array.from({ length: points }, (_, i) => {
    const tMs = now - (points - 1 - i) * step
    const t   = ((tMs % PERIOD) + PERIOD) % PERIOD / PERIOD
    const wave = Math.sin(2 * Math.PI * t) * 0.65 + Math.sin(2 * Math.PI * t * 2.7 + 1.2) * 0.35
    return Math.round((ov.BASE_RATE ?? EXCHANGE_CONSTANTS.BASE_RATE) + wave * amplitude)
  })
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border ${
      type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
    }`}>
      {type === 'success' ? '✓ ' : '⚠ '}{msg}
    </div>
  )
}

function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-base">
        {icon}
      </div>
      <div>
        <h3 className="font-['Space_Grotesk'] font-black text-white text-base">{title}</h3>
        {sub && <p className="text-gray-600 text-xs">{sub}</p>}
      </div>
    </div>
  )
}

// Sparkline SVG
function RateChart({ points, min, max, base, current }: {
  points: number[]; min: number; max: number; base: number; current: number
}) {
  const W = 600; const H = 120; const PAD = 8
  const range = max - min || 1
  const scaleY = (v: number) => PAD + (1 - (v - min) / range) * (H - PAD * 2)
  const scaleX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(' ')
  const area = d + ` L${scaleX(points.length - 1).toFixed(1)},${H} L${PAD},${H} Z`
  const baseY = scaleY(base)
  const curX = scaleX(points.length - 1) // current is at rightmost
  const curY = scaleY(current)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* area fill */}
      <path d={area} fill="url(#rateGrad)" />
      {/* base rate dashed line */}
      <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY}
        stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 4" />
      {/* min/max lines */}
      <line x1={PAD} y1={scaleY(min)} x2={W - PAD} y2={scaleY(min)}
        stroke="#ef4444" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 4" />
      <line x1={PAD} y1={scaleY(max)} x2={W - PAD} y2={scaleY(max)}
        stroke="#22c55e" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 4" />
      {/* main line */}
      <path d={d} fill="none" stroke="#00BFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* current dot */}
      <circle cx={curX} cy={curY} r="5" fill="#00BFFF" />
      <circle cx={curX} cy={curY} r="9" fill="#00BFFF" fillOpacity="0.2" />
    </svg>
  )
}

// Reward split donut using SVG
function SplitDonut({ finder, equal, hashrate }: { finder: number; equal: number; hashrate: number }) {
  const total = finder + equal + hashrate || 1
  const f = finder / total; const e = equal / total; const h = hashrate / total
  const R = 36; const cx = 44; const cy = 44; const stroke = 14
  const circumference = 2 * Math.PI * R
  function arc(from: number, pct: number) {
    return {
      strokeDasharray: `${(pct * circumference).toFixed(2)} ${circumference.toFixed(2)}`,
      strokeDashoffset: `${(-from * circumference).toFixed(2)}`,
    }
  }
  const segments = [
    { pct: f, from: 0, color: '#f59e0b', label: 'Finder' },
    { pct: e, from: f, color: '#00BFFF', label: 'Equal' },
    { pct: h, from: f + e, color: '#a78bfa', label: 'Hashrate' },
  ]
  return (
    <div className="flex items-center gap-6">
      <svg width="88" height="88">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        {segments.map(s => (
          <circle key={s.label} cx={cx} cy={cy} r={R} fill="none"
            stroke={s.color} strokeWidth={stroke}
            {...arc(s.from, s.pct)}
            style={{ transition: 'stroke-dasharray 0.4s, stroke-dashoffset 0.4s' }}
            transform="rotate(-90, 44, 44)"
          />
        ))}
      </svg>
      <div className="space-y-1.5">
        {[
          { label: 'Finder Bonus', val: finder, color: 'bg-amber-400' },
          { label: 'Equal Split',  val: equal,  color: 'bg-[#00BFFF]' },
          { label: 'Hashrate Share', val: hashrate, color: 'bg-purple-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
            <span className="text-gray-500 w-24">{s.label}</span>
            <span className="text-white font-bold font-mono">{(s.val * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Slider + number field combo
function Field({
  label, desc, value, defaultVal, min, max, step, unit, pct, ms,
  onChange, onReset,
}: {
  label: string; desc: string; value: number; defaultVal: number
  min: number; max: number; step: number; unit: string
  pct?: boolean; ms?: boolean
  onChange: (v: number) => void; onReset: () => void
}) {
  const isOverridden = value !== defaultVal
  const display = pct ? `${(value * 100).toFixed(1)}%` : ms ? fmtMs(value) : `${fmt(value, step < 1 ? 3 : 0)} ${unit}`
  return (
    <div className={`p-5 rounded-xl border transition-all ${isOverridden ? 'bg-orange-500/5 border-orange-500/20' : 'bg-white/3 border-white/6'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm font-semibold">{label}</span>
            {isOverridden && (
              <span className="text-[9px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/25 px-1.5 py-0.5 rounded-full">OVERRIDE</span>
            )}
          </div>
          <p className="text-gray-600 text-xs mt-0.5">{desc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-['Space_Grotesk'] font-black text-lg ${isOverridden ? 'text-orange-300' : 'text-white'}`}>
            {display}
          </span>
          {isOverridden && (
            <button onClick={onReset} title="Reset to default"
              className="text-gray-700 hover:text-gray-300 transition-colors text-sm">✕</button>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#00BFFF] cursor-pointer"
      />
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-[10px] text-gray-700">Default: {pct ? `${(defaultVal * 100).toFixed(0)}%` : ms ? fmtMs(defaultVal) : `${defaultVal} ${unit}`}</span>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n) }}
          className={`w-24 text-right text-xs bg-white/5 border rounded-lg px-2 py-1 outline-none font-mono transition-colors ${isOverridden ? 'border-orange-500/30 text-orange-300 focus:border-orange-500/60' : 'border-white/10 text-white focus:border-[#00BFFF]/40'}`}
        />
      </div>
    </div>
  )
}


export function EconomyManager({ admin }: Props) {
  const [tab, setTab]           = useState<Tab>('overview')
  const [overrides, setOverrides] = useState<EconomyOverrides>(getEconomyOverrides)
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [now, setNow]           = useState(Date.now())
  const [users, setUsers]       = useState<Record<string, User>>({})
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [history, setHistory]   = useState<HistoryEntry[]>([])

  // Simulator state
  const [simRigTier,  setSimRigTier]  = useState('pro')
  const [simRigCount, setSimRigCount] = useState(3)
  const [simBlocks,   setSimBlocks]   = useState(24)
  const [simBcInput,  setSimBcInput]  = useState(100)

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load users for overview metrics
  useEffect(() => {
    getDashboardStats()
      .then(s => { setUsers(s.users ?? {}); setLoadingUsers(false) })
      .catch(() => setLoadingUsers(false))
  }, [])

  // Load history
  useEffect(() => {
    setHistory(safeGet<HistoryEntry[]>(HISTORY_KEY) ?? [])
  }, [])

  // ── Derived values ──────────────────────────────────────────────────────────

  function get<K extends keyof EconomyOverrides>(key: K, def: number): number {
    const v = overrides[key]
    return v !== undefined ? (v as number) : def
  }

  const currentRate = computeRate(now, overrides)
  const rateHistory = computeRateHistory(overrides, 96)
  const minRate  = get('MIN_RATE', EXCHANGE_CONSTANTS.MIN_RATE)
  const maxRate  = get('MAX_RATE', EXCHANGE_CONSTANTS.MAX_RATE)
  const baseRate = get('BASE_RATE', EXCHANGE_CONSTANTS.BASE_RATE)
  const feePct   = get('FEE_PCT', EXCHANGE_CONSTANTS.FEE_PCT)
  const dailyTxLimit = get('DAILY_TX_LIMIT', EXCHANGE_CONSTANTS.DAILY_TX_LIMIT)
  const blockReward     = get('BLOCK_REWARD', MINING_CONSTANTS.BLOCK_REWARD)
  const blockIntervalMs = get('BLOCK_INTERVAL_MS', MINING_CONSTANTS.BLOCK_INTERVAL_MS)
  const finderPct    = get('FINDER_BONUS_PCT',  MINING_CONSTANTS.FINDER_BONUS_PCT)
  const equalPct     = get('EQUAL_SPLIT_PCT',   MINING_CONSTANTS.EQUAL_SPLIT_PCT)
  const hashratePct  = get('HASHRATE_SHARE_PCT',MINING_CONSTANTS.HASHRATE_SHARE_PCT)
  const startingBal  = get('STARTING_BALANCE',  MINING_CONSTANTS.STARTING_BALANCE)

  const splitSum = finderPct + equalPct + hashratePct
  const splitOk  = Math.abs(splitSum - 1) < 0.011

  const userList   = Object.values(users)
  const totalBC    = userList.reduce((s, u) => s + (u.balance ?? 0), 0)
  const totalGems  = userList.reduce((s, u) => s + (u.gems ?? 0), 0)
  const activeRigs = userList.reduce((s, u) => s + u.rigs.filter(r => r.status === 'mining').length, 0)
  const overrideCount = Object.values(overrides).filter(v => v !== undefined).length

  // Simulator — reference-pool projection (same formula as Hardware Catalogue)
  const simTier         = RIG_TIERS.find(t => t.id === simRigTier) ?? RIG_TIERS[2]
  const userHashrate    = simTier.hashrate * simRigCount
  const blocksPerDay    = (24 * 60 * 60 * 1000) / blockIntervalMs
  const refPoolHashrate = RIG_TIERS.reduce((s, t) => s + t.hashrate, 0) // 163 GH/s
  const refMinerCount   = RIG_TIERS.length  // 5
  const totalHashrate   = userHashrate + refPoolHashrate
  const userShare       = userHashrate / totalHashrate
  const avgPerBlock     = blockReward * finderPct  * userShare
                        + blockReward * equalPct   / (refMinerCount + 1)
                        + blockReward * hashratePct * userShare
  const simEarnings   = avgPerBlock * simBlocks
  const simDays       = simBlocks / blocksPerDay
  const rigCost       = simTier.cost * simRigCount
  const blocksToROI   = rigCost / (avgPerBlock || 1)

  // Exchange calculator
  const calcFee      = simBcInput * currentRate * feePct
  const calcGems     = simBcInput * currentRate - calcFee

  // ── Actions ─────────────────────────────────────────────────────────────────

  function showMsg(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function handleSave() {
    if (!splitOk) {
      showMsg(`Reward splits must sum to 1.00 (currently ${splitSum.toFixed(3)})`, 'error')
      return
    }
    saveEconomyOverrides(overrides)
    addLog(admin, 'economy:save', `Saved ${overrideCount} override${overrideCount !== 1 ? 's' : ''}`)
    const entry: HistoryEntry = { ts: Date.now(), overrides: { ...overrides }, overrideCount, admin }
    const newHistory = [entry, ...history].slice(0, 15)
    setHistory(newHistory)
    safeSet(HISTORY_KEY, newHistory)
    showMsg(`Economy saved — ${overrideCount} override${overrideCount !== 1 ? 's' : ''} active.`)
  }

  function handleReset() {
    saveEconomyOverrides({})
    setOverrides({})
    setShowReset(false)
    addLog(admin, 'economy:reset', 'Reset all economy overrides to defaults')
    showMsg('Economy reset to coded defaults.')
  }

  function restoreHistory(entry: HistoryEntry) {
    setOverrides(entry.overrides)
    showMsg('Snapshot restored — click Save to apply.')
  }

  function setField(key: keyof EconomyOverrides, val: number) {
    setOverrides(prev => ({ ...prev, [key]: val }))
  }

  function resetField(key: keyof EconomyOverrides) {
    setOverrides(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/8 p-6 mb-6 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-['Space_Grotesk'] font-black text-white text-xl flex items-center gap-2">
              ⚙️ Economy Control Panel
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Configure exchange rates, mining rewards, and platform constants</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {overrideCount > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500/10 border border-orange-500/25 text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                {overrideCount} override{overrideCount !== 1 ? 's' : ''} active
              </span>
            )}
            <button onClick={() => setShowReset(true)}
              className="px-4 py-2 rounded-xl text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
              ↺ Reset All
            </button>
            <button onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-sm font-bold border transition-all ${
                !splitOk
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed'
                  : 'btn-primary text-white'
              }`}>
              💾 Save Economy
            </button>
          </div>
        </div>

        {/* Quick stat pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'Current Rate',   value: `${currentRate} Gems/BC`, color: 'text-[#00BFFF]' },
            { label: 'Block Reward',   value: `${blockReward} BC`,      color: 'text-amber-400' },
            { label: 'Block Interval', value: fmtMs(blockIntervalMs),   color: 'text-purple-400' },
            { label: 'Daily TX Limit', value: `${dailyTxLimit}/day`,    color: 'text-green-400' },
            { label: 'Exchange Fee',   value: `${(feePct*100).toFixed(1)}%`, color: 'text-pink-400' },
            { label: 'Starting BC',    value: `${startingBal} BC`,      color: 'text-cyan-400' },
          ].map(p => (
            <div key={p.label} className="px-3 py-1.5 rounded-lg bg-white/3 border border-white/6 flex items-center gap-1.5">
              <span className={`font-['Space_Grotesk'] font-black text-sm ${p.color}`}>{p.value}</span>
              <span className="text-gray-600 text-[10px]">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
              tab === t.id
                ? 'bg-[#00BFFF]/12 border-[#00BFFF]/30 text-[#00BFFF]'
                : 'border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-5">

          {/* Live Rate Card */}
          <div className="glass rounded-2xl border border-[#00BFFF]/15 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Live Exchange Rate</p>
                <div className="flex items-end gap-3">
                  <span className="font-['Space_Grotesk'] font-black text-5xl text-[#00BFFF]">{currentRate}</span>
                  <span className="text-gray-400 text-lg mb-1">Gems / BC</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                  <span>↓ Min <strong className="text-red-400">{minRate}</strong></span>
                  <span>◆ Base <strong className="text-white">{baseRate}</strong></span>
                  <span>↑ Max <strong className="text-green-400">{maxRate}</strong></span>
                  <span>📈 Amplitude <strong className="text-purple-400">±{Math.round((maxRate - minRate) / 2)}</strong></span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs mb-1">4-hour wave cycle</p>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  currentRate > baseRate
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : currentRate < baseRate
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}>
                  {currentRate > baseRate ? '▲ Above base' : currentRate < baseRate ? '▼ Below base' : '◆ At base'}
                  {' '}({currentRate > baseRate ? '+' : ''}{currentRate - baseRate})
                </div>
              </div>
            </div>
            <RateChart points={rateHistory} min={minRate} max={maxRate} base={baseRate} current={currentRate} />
            <p className="text-gray-700 text-[10px] mt-1 text-center">Full 4-hour wave cycle — current position at right</p>
          </div>

          {/* Economy Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '₿', label: 'BC Circulating', value: fmtShort(totalBC),   sub: `${fmt(totalBC)} BlueCoin`, color: 'text-amber-400' },
              { icon: '💎', label: 'Gems Circulating', value: fmtShort(totalGems), sub: `${fmt(totalGems)} Gems`, color: 'text-purple-400' },
              { icon: '⛏️', label: 'Active Rigs', value: String(activeRigs), sub: `across ${userList.length} accounts`, color: 'text-cyan-400' },
              { icon: '⚙️', label: 'Overrides Active', value: String(overrideCount), sub: overrideCount ? 'Custom values in effect' : 'All at defaults', color: overrideCount ? 'text-orange-400' : 'text-gray-500' },
            ].map(c => (
              <div key={c.label} className="glass rounded-xl border border-white/8 p-5">
                <span className="text-lg">{c.icon}</span>
                <p className={`font-['Space_Grotesk'] font-black text-2xl mt-2 ${c.color}`}>{loadingUsers ? '—' : c.value}</p>
                <p className="text-white text-xs font-semibold mt-1">{c.label}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Reward Split + Block Info side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass rounded-2xl border border-white/8 p-6">
              <SectionHeader icon="🎁" title="Block Reward Distribution" sub="How each block's BC is split among miners" />
              <SplitDonut finder={finderPct} equal={equalPct} hashrate={hashratePct} />
              <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/5">
                <p className="text-gray-500 text-xs mb-2">At {blockReward} BC per block:</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Finder Bonus', val: Math.round(blockReward * finderPct), color: 'text-amber-400' },
                    { label: 'Equal Pool', val: Math.round(blockReward * equalPct), color: 'text-[#00BFFF]' },
                    { label: 'Hashrate Pool', val: Math.round(blockReward * hashratePct), color: 'text-purple-400' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className={`font-['Space_Grotesk'] font-black text-xl ${s.color}`}>{s.val}</p>
                      <p className="text-gray-600 text-[9px]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {!splitOk && (
                <p className="mt-3 text-red-400 text-xs flex items-center gap-1">
                  <span>⚠</span> Splits sum to {splitSum.toFixed(3)} — must equal 1.000
                </p>
              )}
            </div>

            <div className="glass rounded-2xl border border-white/8 p-6">
              <SectionHeader icon="🧱" title="Block Economics" sub="Mining cadence and earning potential" />
              <div className="space-y-3">
                {[
                  { label: 'Block Interval',    value: fmtMs(blockIntervalMs),  sub: `${(blockIntervalMs / 60000).toFixed(0)} minutes`, color: 'text-purple-400' },
                  { label: 'Blocks per Day',    value: fmt(blocksPerDay, 1),     sub: 'theoretical maximum',     color: 'text-[#00BFFF]' },
                  { label: 'Daily Max Payout',  value: `${fmt(blockReward * blocksPerDay)} BC`, sub: 'total BC distributed/day', color: 'text-amber-400' },
                  { label: 'Session Duration',  value: fmtMs(MINING_CONSTANTS.RENEWAL_DURATION_MS), sub: 'per renewal', color: 'text-green-400' },
                  { label: 'Starting Balance',  value: `${startingBal} BC`,     sub: 'new account bonus',       color: 'text-cyan-400' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white text-xs font-semibold">{r.label}</p>
                      <p className="text-gray-600 text-[10px]">{r.sub}</p>
                    </div>
                    <span className={`font-['Space_Grotesk'] font-black text-base ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: EXCHANGE
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'exchange' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Controls */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="📈" title="Rate Bounds" sub="Define the min, base, and max of the exchange rate wave" />
                <div className="space-y-4">
                  <Field label="Base Rate" desc="Centre of the sine wave — the long-run equilibrium"
                    value={baseRate} defaultVal={EXCHANGE_CONSTANTS.BASE_RATE}
                    min={1} max={500} step={1} unit="Gems/BC"
                    onChange={v => setField('BASE_RATE', v)}
                    onReset={() => resetField('BASE_RATE')} />
                  <Field label="Minimum Rate" desc="Floor — rate can never fall below this value"
                    value={minRate} defaultVal={EXCHANGE_CONSTANTS.MIN_RATE}
                    min={1} max={baseRate - 1} step={1} unit="Gems/BC"
                    onChange={v => setField('MIN_RATE', v)}
                    onReset={() => resetField('MIN_RATE')} />
                  <Field label="Maximum Rate" desc="Ceiling — rate can never exceed this value"
                    value={maxRate} defaultVal={EXCHANGE_CONSTANTS.MAX_RATE}
                    min={baseRate + 1} max={10000} step={1} unit="Gems/BC"
                    onChange={v => setField('MAX_RATE', v)}
                    onReset={() => resetField('MAX_RATE')} />
                </div>
              </div>
              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="🔒" title="Rate Chart Preview" sub="Live wave with current settings applied" />
                <RateChart points={computeRateHistory(overrides, 96)} min={minRate} max={maxRate} base={baseRate} current={currentRate} />
                <div className="mt-2 flex justify-between text-[10px] text-gray-700">
                  <span>Now</span><span>+1h</span><span>+2h</span><span>+3h</span><span>+4h (full cycle)</span>
                </div>
              </div>
              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="⏱️" title="Transaction Controls" sub="Manage exchange throughput and costs" />
                <div className="space-y-4">
                  <Field label="Daily Transaction Limit" desc="Max exchange transactions per player per 24-hour window"
                    value={dailyTxLimit} defaultVal={EXCHANGE_CONSTANTS.DAILY_TX_LIMIT}
                    min={1} max={100} step={1} unit="trades/day"
                    onChange={v => setField('DAILY_TX_LIMIT', v)}
                    onReset={() => resetField('DAILY_TX_LIMIT')} />
                  <Field label="Exchange Fee" desc="Percentage taken from each exchange output (0 = free)"
                    value={feePct} defaultVal={EXCHANGE_CONSTANTS.FEE_PCT}
                    min={0} max={0.5} step={0.001} unit="fraction" pct
                    onChange={v => setField('FEE_PCT', v)}
                    onReset={() => resetField('FEE_PCT')} />
                </div>
              </div>
            </div>

            {/* Live Calculator */}
            <div className="space-y-4">
              <div className="glass rounded-2xl border border-[#00BFFF]/15 p-6 sticky top-4">
                <SectionHeader icon="🧮" title="Exchange Calculator" sub="Live preview at current rate" />
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-500 text-xs mb-1.5 block">BC to exchange</label>
                    <input type="number" value={simBcInput} min={1} onChange={e => setSimBcInput(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg outline-none focus:border-[#00BFFF]/40" />
                  </div>
                  <div className="p-4 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/15 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Rate</span>
                      <span className="text-[#00BFFF] font-bold">{currentRate} Gems/BC</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Gross output</span>
                      <span className="text-white font-mono">{fmt(simBcInput * currentRate)} Gems</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Fee ({(feePct * 100).toFixed(1)}%)</span>
                      <span className="text-red-400 font-mono">−{fmt(calcFee, 1)} Gems</span>
                    </div>
                    <div className="border-t border-white/8 pt-2 flex justify-between">
                      <span className="text-white text-sm font-bold">Net received</span>
                      <span className="text-purple-400 font-['Space_Grotesk'] font-black text-lg">{fmt(calcGems, 1)} ✦</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-xs space-y-1.5 text-gray-500">
                    <div className="flex justify-between"><span>Min rate scenario</span><span className="text-red-400">{fmt(simBcInput * minRate * (1 - feePct), 1)} Gems</span></div>
                    <div className="flex justify-between"><span>Max rate scenario</span><span className="text-green-400">{fmt(simBcInput * maxRate * (1 - feePct), 1)} Gems</span></div>
                    <div className="flex justify-between"><span>Daily limit</span><span className="text-white">{dailyTxLimit} trades</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: MINING
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'mining' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="🧱" title="Block Settings" sub="Control block cadence and total reward per block" />
                <div className="space-y-4">
                  <Field label="Block Reward" desc="Total BC distributed to all active miners when a block is solved"
                    value={blockReward} defaultVal={MINING_CONSTANTS.BLOCK_REWARD}
                    min={1} max={100000} step={1} unit="BC"
                    onChange={v => setField('BLOCK_REWARD', v)}
                    onReset={() => resetField('BLOCK_REWARD')} />
                  <Field label="Block Interval" desc="Time between consecutive block solutions (determines earning speed)"
                    value={blockIntervalMs} defaultVal={MINING_CONSTANTS.BLOCK_INTERVAL_MS}
                    min={60000} max={86400000} step={60000} unit="ms" ms
                    onChange={v => setField('BLOCK_INTERVAL_MS', v)}
                    onReset={() => resetField('BLOCK_INTERVAL_MS')} />
                  <Field label="Starting Balance" desc="BC awarded to new mining accounts on registration"
                    value={startingBal} defaultVal={MINING_CONSTANTS.STARTING_BALANCE}
                    min={0} max={100000} step={50} unit="BC"
                    onChange={v => setField('STARTING_BALANCE', v)}
                    onReset={() => resetField('STARTING_BALANCE')} />
                </div>
              </div>

              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="🎁" title="Reward Distribution" sub={`Must sum to 1.000 — currently ${splitSum.toFixed(3)}`} />
                <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${splitOk ? 'bg-green-500/8 border-green-500/20 text-green-400' : 'bg-red-500/8 border-red-500/20 text-red-400'}`}>
                  <span>{splitOk ? '✓' : '⚠'}</span>
                  {splitOk ? `Splits are valid (sum = ${splitSum.toFixed(3)})` : `Invalid: sum is ${splitSum.toFixed(3)}, needs to be 1.000`}
                </div>
                <div className="space-y-4">
                  <Field label="Finder Bonus" desc="Extra bonus for the miner who wins the block lottery"
                    value={finderPct} defaultVal={MINING_CONSTANTS.FINDER_BONUS_PCT}
                    min={0} max={1} step={0.01} unit="fraction" pct
                    onChange={v => setField('FINDER_BONUS_PCT', v)}
                    onReset={() => resetField('FINDER_BONUS_PCT')} />
                  <Field label="Equal Split" desc="Fraction split evenly among all active miners regardless of hashrate"
                    value={equalPct} defaultVal={MINING_CONSTANTS.EQUAL_SPLIT_PCT}
                    min={0} max={1} step={0.01} unit="fraction" pct
                    onChange={v => setField('EQUAL_SPLIT_PCT', v)}
                    onReset={() => resetField('EQUAL_SPLIT_PCT')} />
                  <Field label="Hashrate Share" desc="Fraction distributed proportionally by each miner's hashrate"
                    value={hashratePct} defaultVal={MINING_CONSTANTS.HASHRATE_SHARE_PCT}
                    min={0} max={1} step={0.01} unit="fraction" pct
                    onChange={v => setField('HASHRATE_SHARE_PCT', v)}
                    onReset={() => resetField('HASHRATE_SHARE_PCT')} />
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="🥧" title="Split Visualizer" />
                <SplitDonut finder={finderPct} equal={equalPct} hashrate={hashratePct} />
                <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/5 text-xs space-y-2 text-gray-500">
                  <p className="text-gray-400 font-semibold text-[11px] mb-2">Per block ({blockReward} BC total)</p>
                  <div className="flex justify-between"><span>🏆 Finder gets</span><span className="text-amber-400 font-bold">{Math.round(blockReward * finderPct)} BC</span></div>
                  <div className="flex justify-between"><span>👥 Equal pool</span><span className="text-[#00BFFF] font-bold">{Math.round(blockReward * equalPct)} BC</span></div>
                  <div className="flex justify-between"><span>⚡ Hashrate pool</span><span className="text-purple-400 font-bold">{Math.round(blockReward * hashratePct)} BC</span></div>
                </div>
              </div>

              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="🔒" title="Fixed Constants" sub="Hardcoded — not overrideable" />
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Repair Cost', value: `${(MINING_CONSTANTS.REPAIR_COST_PCT * 100).toFixed(0)}% of rig cost` },
                    { label: 'Max Sell-Back', value: `${(MINING_CONSTANTS.SELL_MAX_PCT * 100).toFixed(0)}% at 100% dur.` },
                    { label: 'UI Tick', value: fmtMs(MINING_CONSTANTS.TICK_INTERVAL_MS) },
                    { label: 'Session Length', value: fmtMs(MINING_CONSTANTS.RENEWAL_DURATION_MS) },
                    { label: 'Price Cycle', value: fmtMs(EXCHANGE_CONSTANTS.FLUCTUATION_PERIOD_MS) },
                    { label: 'Max Rigs/User', value: '10 rigs' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-gray-600">{r.label}</span>
                      <span className="text-gray-400 font-mono">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: HARDWARE
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'hardware' && (
        <div className="space-y-5">
          <div className="glass rounded-2xl border border-white/8 p-6">
            <SectionHeader icon="🖥️" title="Rig Tier Catalogue" sub="All hardware tiers and their specifications (read-only)" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Rig', 'Hashrate', 'Cost', 'Lifespan', 'Repair (full)', 'Max Sell', 'Blocks to ROI', 'BC/day (pool est.)'].map(h => (
                      <th key={h} className="text-left py-3 pr-4 text-gray-500 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RIG_TIERS.map(rig => {
                    const lifedays = rig.maxDurability / (rig.lossPerSecond * 86400)
                    const repairCost = Math.ceil(rig.cost * MINING_CONSTANTS.REPAIR_COST_PCT)
                    const maxSell = Math.floor(rig.cost * MINING_CONSTANTS.SELL_MAX_PCT)
                    const refPoolHR = RIG_TIERS.reduce((s, t) => s + t.hashrate, 0)
                    const refN      = RIG_TIERS.length
                    const rigShare  = rig.hashrate / refPoolHR
                    const avgBlockEarn = blockReward * finderPct  * rigShare
                                      + blockReward * equalPct   / refN
                                      + blockReward * hashratePct * rigShare
                    const dailyEarn = avgBlockEarn * blocksPerDay
                    const blocksROI = Math.ceil(rig.cost / (avgBlockEarn || 1))
                    return (
                      <tr key={rig.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{rig.emoji}</span>
                            <div>
                              <p className={`font-semibold ${rig.color}`}>{rig.name}</p>
                              <p className="text-gray-700 text-[9px]">{rig.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-['Space_Grotesk'] font-black text-[#00BFFF]">{rig.hashrate}</span>
                          <span className="text-gray-600"> GH/s</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-bold text-amber-400">{rig.cost.toLocaleString()}</span>
                          <span className="text-gray-600"> BC</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-white">{lifedays.toFixed(1)}d</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-orange-400">{repairCost.toLocaleString()} BC</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-green-400">{maxSell.toLocaleString()} BC</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-purple-400 font-bold">{blocksROI.toLocaleString()}</span>
                          <span className="text-gray-600"> blocks</span>
                        </td>
                        <td className="py-3">
                          <span className="text-cyan-400 font-bold">{fmt(dailyEarn, 0)}</span>
                          <span className="text-gray-600"> BC</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rig comparison cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {RIG_TIERS.map(rig => {
              const lifedays = rig.maxDurability / (rig.lossPerSecond * 86400)
              const refPoolHR2 = RIG_TIERS.reduce((s, t) => s + t.hashrate, 0)
              const refN2      = RIG_TIERS.length
              const rigShare2  = rig.hashrate / refPoolHR2
              const avgBlockEarn2 = blockReward * finderPct  * rigShare2
                                  + blockReward * equalPct   / refN2
                                  + blockReward * hashratePct * rigShare2
              const daysROI = (rig.cost / (avgBlockEarn2 * blocksPerDay)) || 0
              return (
                <div key={rig.id} className={`glass rounded-xl p-4 border ${rig.borderColor} text-center`}
                  style={{ boxShadow: `0 0 20px ${rig.glowColor}20` }}>
                  <span className="text-2xl">{rig.emoji}</span>
                  <p className={`font-semibold text-xs mt-1 ${rig.color}`}>{rig.name}</p>
                  <p className="font-['Space_Grotesk'] font-black text-xl text-white mt-2">{rig.hashrate} <span className="text-gray-600 text-[10px] font-normal">GH/s</span></p>
                  <div className="mt-3 space-y-1 text-[10px]">
                    <div className="flex justify-between"><span className="text-gray-600">Cost</span><span className="text-amber-400 font-bold">{rig.cost.toLocaleString()} BC</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Lifespan</span><span className="text-white">{lifedays.toFixed(1)}d</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">ROI</span><span className="text-purple-400 font-bold">{daysROI.toFixed(1)}d</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: SIMULATOR
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'simulator' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Controls */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass rounded-2xl border border-white/8 p-6">
                <SectionHeader icon="🧪" title="Mining Simulator" sub="Projected earnings with current economy settings" />
                <div className="space-y-5">
                  <div>
                    <label className="text-gray-400 text-xs font-semibold block mb-2">Rig Tier</label>
                    <div className="grid grid-cols-1 gap-2">
                      {RIG_TIERS.map(t => (
                        <button key={t.id} onClick={() => setSimRigTier(t.id)}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                            simRigTier === t.id ? `${t.borderColor} bg-white/5` : 'border-white/8 hover:border-white/15'
                          }`}>
                          <span className="text-base">{t.emoji}</span>
                          <div className="flex-1">
                            <p className={`text-xs font-semibold ${simRigTier === t.id ? t.color : 'text-gray-400'}`}>{t.name}</p>
                            <p className="text-gray-700 text-[10px]">{t.hashrate} GH/s · {t.cost.toLocaleString()} BC</p>
                          </div>
                          {simRigTier === t.id && <span className={`text-[10px] font-bold ${t.color}`}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-semibold block mb-2">Number of Rigs: <span className="text-white">{simRigCount}</span></label>
                    <input type="range" min={1} max={10} step={1} value={simRigCount}
                      onChange={e => setSimRigCount(Number(e.target.value))}
                      className="w-full accent-[#00BFFF]" />
                    <div className="flex justify-between text-[10px] text-gray-700 mt-1"><span>1</span><span>5</span><span>10</span></div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-semibold block mb-2">Blocks to Simulate: <span className="text-white">{simBlocks}</span></label>
                    <input type="range" min={1} max={500} step={1} value={simBlocks}
                      onChange={e => setSimBlocks(Number(e.target.value))}
                      className="w-full accent-[#00BFFF]" />
                    <div className="flex justify-between text-[10px] text-gray-700 mt-1"><span>1</span><span>≈{fmt(blocksPerDay,0)}/day</span><span>500</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3 space-y-4">
              <div className="glass rounded-2xl border border-[#00BFFF]/15 p-6">
                <SectionHeader icon="📈" title="Projected Earnings" sub={`${simRigCount}× ${simTier.name} over ${simBlocks} blocks`} />
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { label: 'Total Hashrate', value: `${userHashrate} GH/s`, color: 'text-[#00BFFF]', sub: `${simRigCount} × ${simTier.hashrate} GH/s` },
                    { label: 'Avg Per Block', value: `${fmt(avgPerBlock, 1)} BC`, color: 'text-purple-400', sub: 'expected per block' },
                    { label: 'Total Earnings', value: `${fmt(simEarnings, 0)} BC`, color: 'text-amber-400', sub: `over ${simBlocks} blocks` },
                    { label: 'Time Elapsed', value: fmtMs(simBlocks * blockIntervalMs), color: 'text-green-400', sub: `${simDays.toFixed(1)} days` },
                  ].map(s => (
                    <div key={s.label} className="p-4 rounded-xl bg-white/3 border border-white/5">
                      <p className={`font-['Space_Grotesk'] font-black text-2xl ${s.color}`}>{s.value}</p>
                      <p className="text-white text-xs font-semibold mt-1">{s.label}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Big earnings display */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Projected BC Earned</p>
                  <p className="font-['Space_Grotesk'] font-black text-5xl text-amber-400">{fmt(simEarnings)}</p>
                  <p className="text-gray-500 text-sm mt-1">BlueCoin over {simBlocks} block{simBlocks !== 1 ? 's' : ''}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-amber-300 font-bold text-sm">{fmt(simEarnings / (simDays || 1))}</p>
                      <p className="text-gray-600 text-[10px]">BC per day</p>
                    </div>
                    <div>
                      <p className="text-amber-300 font-bold text-sm">{fmt(simEarnings / (simBlocks || 1), 1)}</p>
                      <p className="text-gray-600 text-[10px]">BC per block</p>
                    </div>
                    <div>
                      <p className="text-amber-300 font-bold text-sm">{fmt(simEarnings * currentRate * (1 - feePct))}</p>
                      <p className="text-gray-600 text-[10px]">Gems if exchanged</p>
                    </div>
                  </div>
                </div>

                {/* ROI section */}
                <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/5">
                  <p className="text-gray-400 text-xs font-semibold mb-3">Return on Investment</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-gray-500 text-xs">Rig cost ({simRigCount}×)</p>
                      <p className="font-['Space_Grotesk'] font-black text-xl text-white">{fmt(rigCost)} BC</p>
                    </div>
                    <div className="flex-1 text-center text-gray-700">→</div>
                    <div>
                      <p className="text-gray-500 text-xs">Break-even at</p>
                      <p className="font-['Space_Grotesk'] font-black text-xl text-green-400">{fmt(blocksToROI)} blocks</p>
                      <p className="text-gray-600 text-[10px]">≈ {fmtMs(blocksToROI * blockIntervalMs)}</p>
                    </div>
                    <div className="flex-1 text-center text-gray-700">→</div>
                    <div>
                      <p className="text-gray-500 text-xs">Net after {simBlocks} blocks</p>
                      <p className={`font-['Space_Grotesk'] font-black text-xl ${simEarnings - rigCost >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {simEarnings - rigCost >= 0 ? '+' : ''}{fmt(simEarnings - rigCost)} BC
                      </p>
                    </div>
                  </div>
                  {/* ROI progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                      <span>0</span>
                      <span>ROI at {fmt(blocksToROI)} blocks</span>
                      <span>{simBlocks} blocks</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all ${simEarnings >= rigCost ? 'bg-gradient-to-r from-green-500/60 to-green-400' : 'bg-gradient-to-r from-orange-500/60 to-orange-400'}`}
                        style={{ width: `${Math.min(100, (simBlocks / blocksToROI) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Win probability */}
                <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/5">
                  <p className="text-gray-400 text-xs font-semibold mb-3">Block Win Probability (Finder Bonus)</p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 shrink-0">
                      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#f59e0b" strokeWidth="6"
                          strokeDasharray={`${userShare * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                          strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-amber-400 font-['Space_Grotesk'] font-black text-xs">
                        {(userShare * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex-1 text-xs text-gray-500 space-y-1">
                      <p>Your share of pool hashrate ({userHashrate} GH/s of {fmt(totalHashrate)} GH/s)</p>
                      <p>Expected wins in {simBlocks} blocks: <span className="text-amber-400 font-bold">{(userShare * simBlocks).toFixed(1)}</span></p>
                      <p>Finder BC per win: <span className="text-amber-400 font-bold">{Math.round(blockReward * finderPct)} BC</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB: HISTORY
      ════════════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/8 p-6">
            <SectionHeader icon="📋" title="Save History" sub="Last 15 economy snapshots — click Restore to load a previous configuration" />
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <div className="text-4xl mb-3 opacity-30">📋</div>
                <p className="text-sm">No saves yet. Changes appear here after you click Save Economy.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry, i) => {
                  const ov = entry.overrides
                  const date = new Date(entry.ts)
                  return (
                    <div key={entry.ts} className={`p-5 rounded-xl border ${i === 0 ? 'bg-[#00BFFF]/4 border-[#00BFFF]/15' : 'bg-white/2 border-white/6'} hover:border-white/15 transition-all`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {i === 0 && <span className="text-[9px] font-bold bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/20 px-1.5 py-0.5 rounded-full">LATEST</span>}
                            <span className="text-white text-sm font-semibold">
                              {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                            </span>
                            <span className="text-gray-600 text-xs">by {entry.admin}</span>
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            {entry.overrideCount === 0 ? 'All defaults (reset)' : `${entry.overrideCount} override${entry.overrideCount !== 1 ? 's' : ''} active`}
                          </p>
                        </div>
                        <button onClick={() => restoreHistory(entry)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00BFFF] border border-[#00BFFF]/25 hover:bg-[#00BFFF]/10 transition-all shrink-0">
                          ↩ Restore
                        </button>
                      </div>
                      {entry.overrideCount > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {Object.entries(ov).map(([key, val]) =>
                            val !== undefined ? (
                              <span key={key} className="px-2 py-0.5 rounded-md text-[10px] bg-orange-500/10 border border-orange-500/15 text-orange-300 font-mono">
                                {key}={key.endsWith('PCT') ? `${((val as number)*100).toFixed(0)}%` : key.endsWith('MS') ? fmtMs(val as number) : String(val)}
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Save bar ───────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 mt-6 pt-4 pb-1">
        <div className="glass rounded-2xl border border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4"
          style={{ backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-3">
            {overrideCount > 0 ? (
              <span className="flex items-center gap-1.5 text-xs text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                {overrideCount} unsaved override{overrideCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-gray-600">All settings at defaults</span>
            )}
            {!splitOk && (
              <span className="text-xs text-red-400">⚠ Reward splits invalid (sum={splitSum.toFixed(3)})</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReset(true)}
              className="px-4 py-2 rounded-xl text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
              ↺ Reset All
            </button>
            <button onClick={handleSave} disabled={!splitOk}
              className={`px-6 py-2 rounded-xl text-sm font-bold border transition-all ${
                !splitOk
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed opacity-60'
                  : 'btn-primary text-white'
              }`}>
              💾 Save Economy
            </button>
          </div>
        </div>
      </div>

      {/* ── Reset confirm modal ─────────────────────────────────────────────── */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-orange-500/20 p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-white font-['Space_Grotesk'] font-black text-xl mb-2">Reset Economy?</h3>
            <p className="text-gray-500 text-sm mb-6">
              All {overrideCount} custom override{overrideCount !== 1 ? 's' : ''} will be cleared and every value will revert to its coded default. This takes effect immediately on save.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)}
                className="flex-1 py-3 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={handleReset}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-orange-400 border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 transition-all">
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
