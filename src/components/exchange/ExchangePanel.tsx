import { useState, useMemo, useEffect } from 'react'
import { useMining } from '../../context/MiningContext'
import { EXCHANGE_CONSTANTS } from '../../data/mining'
import { getEconomyOverrides } from '../../store/miningStore'
import type { ExchangeDirection } from '../../data/mining'

// ─── Rate wave math (mirrors miningStore.getExchangeRate) ────────────────────

function buildWavePoints(now: number, baseRate: number, minRate: number, maxRate: number, points = 96): number[] {
  const { FLUCTUATION_PERIOD_MS } = EXCHANGE_CONSTANTS
  const step = FLUCTUATION_PERIOD_MS / points
  const amplitude = (maxRate - minRate) / 2
  // points[0] = 4 h ago, points[95] = now — so the rightmost dot matches currentRate exactly
  return Array.from({ length: points }, (_, i) => {
    const tMs = now - (points - 1 - i) * step
    const t   = ((tMs % FLUCTUATION_PERIOD_MS) + FLUCTUATION_PERIOD_MS) % FLUCTUATION_PERIOD_MS / FLUCTUATION_PERIOD_MS
    const wave = Math.sin(2 * Math.PI * t) * 0.65 + Math.sin(2 * Math.PI * t * 2.7 + 1.2) * 0.35
    return Math.round(baseRate + wave * amplitude)
  })
}

// ─── Rate Chart — exact copy of EconomyManager RateChart ─────────────────────

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
  const curX  = scaleX(points.length - 1)
  const curY  = scaleY(current)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="exchRateGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00BFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#exchRateGrad)" />
      <line x1={PAD} y1={baseY} x2={W - PAD} y2={baseY}
        stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={PAD} y1={scaleY(min)} x2={W - PAD} y2={scaleY(min)}
        stroke="#ef4444" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 4" />
      <line x1={PAD} y1={scaleY(max)} x2={W - PAD} y2={scaleY(max)}
        stroke="#22c55e" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 4" />
      <path d={d} fill="none" stroke="#00BFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={curX} cy={curY} r="5" fill="#00BFFF" />
      <circle cx={curX} cy={curY} r="9" fill="#00BFFF" fillOpacity="0.2" />
    </svg>
  )
}

// ─── Daily Limit Badge ────────────────────────────────────────────────────────

function TxLimitBadge({ used, limit }: { used: number; limit: number }) {
  const remaining = limit - used
  const exhausted = remaining <= 0
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${exhausted ? 'bg-red-500/8 border-red-500/20' : 'bg-[#00BFFF]/5 border-[#00BFFF]/15'}`}>
      <div className="flex-1">
        <p className={`text-[10px] uppercase tracking-widest font-semibold ${exhausted ? 'text-red-400' : 'text-gray-500'}`}>
          Daily Exchanges Remaining
        </p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className={`font-black text-2xl font-['Space_Grotesk'] ${exhausted ? 'text-red-400' : 'text-white'}`}>
            {remaining}
          </span>
          <span className="text-gray-600 text-sm">/ {limit}</span>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: limit }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < remaining
                ? 'bg-[#00BFFF] shadow-[0_0_6px_rgba(0,191,255,0.8)]'
                : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function ExchangePanel() {
  const { user, currentRate, exchange } = useMining()
  const [direction, setDirection]   = useState<ExchangeDirection>('bc-to-gems')
  const [inputValue, setInputValue] = useState('')
  const [lastTx, setLastTx]         = useState<{ gained: number; fee: number; direction: ExchangeDirection; at: number } | null>(null)
  const [txError, setTxError]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [now, setNow] = useState(0) // 0 on SSR, real time after mount

  // Read economy overrides (refresh on mount)
  const ov = getEconomyOverrides()
  const minRate  = ov.MIN_RATE        ?? EXCHANGE_CONSTANTS.MIN_RATE
  const maxRate  = ov.MAX_RATE        ?? EXCHANGE_CONSTANTS.MAX_RATE
  const baseRate = ov.BASE_RATE       ?? EXCHANGE_CONSTANTS.BASE_RATE
  const feePct   = ov.FEE_PCT         ?? EXCHANGE_CONSTANTS.FEE_PCT
  const txLimit  = ov.DAILY_TX_LIMIT  ?? EXCHANGE_CONSTANTS.DAILY_TX_LIMIT

  // Tick every second — only runs client-side, avoiding SSR mismatch
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Full 4-hour wave — 96 points, recomputed every second
  const wavePoints = useMemo(
    () => now > 0 ? buildWavePoints(now, baseRate, minRate, maxRate) : Array(96).fill(baseRate),
    [now, baseRate, minRate, maxRate],
  )
  const prevRate  = wavePoints.length > 1 ? wavePoints[1] : currentRate
  const _trendUp  = currentRate >= prevRate; void _trendUp
  const deviation = currentRate - baseRate

  // Parse input
  const amount = parseFloat(inputValue) || 0

  // Compute preview amounts
  const isBC2Gems = direction === 'bc-to-gems'
  const gross     = isBC2Gems ? amount * currentRate : amount / currentRate
  const fee       = gross * feePct
  const net       = gross - fee

  // Daily tx limit — floor to integer (migrating old decimal shard-amount values)
  const txUsed      = Math.floor(user?.exchangeUsedToday ?? 0)
  const txRemaining = txLimit - txUsed
  const txExhausted = txRemaining <= 0

  const timeToReset = user ? Math.max(0, user.exchangeResetAt - Date.now()) : 0
  const resetHours  = Math.floor(timeToReset / 3_600_000)
  const resetMins   = Math.floor((timeToReset % 3_600_000) / 60_000)

  // Max amounts
  const maxBC   = Math.floor(user?.balance ?? 0)
  const maxGems = Math.floor(user?.gems ?? 0)

  function switchDirection(d: ExchangeDirection) {
    setDirection(d)
    setInputValue('')
    setTxError('')
    setLastTx(null)
  }

  async function handleExchange() {
    if (!amount || amount <= 0) return
    setTxError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 350))
    const result = exchange(amount, direction)
    if (result.error) {
      setTxError(result.error)
    } else {
      setLastTx({ gained: result.gained, fee: result.feePaid, direction, at: Date.now() })
      setInputValue('')
    }
    setLoading(false)
  }

  const canSubmit = !!user && amount > 0 && !loading && !txExhausted &&
    (isBC2Gems ? amount <= maxBC : amount <= maxGems)

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16 space-y-6">

      {/* ── Rate card — matches EconomyManager overview exactly ───────────── */}
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
              {' '}({deviation >= 0 ? '+' : ''}{deviation})
            </div>
          </div>
        </div>
        <RateChart
          points={wavePoints}
          min={minRate}
          max={maxRate}
          base={baseRate}
          current={currentRate}
        />
        <p className="text-gray-700 text-[10px] mt-1 text-center">Full 4-hour wave cycle — current position at right</p>

        {/* Exchange-specific stats row */}
        <div className="grid grid-cols-3 gap-px mt-4 pt-4 border-t border-white/6 -mx-6 px-0">
          {[
            { label: 'Fee',         value: `${(feePct * 100).toFixed(0)}%`, color: 'text-pink-400'   },
            { label: 'Daily Limit', value: `${txLimit} trades`,                                  color: 'text-purple-400' },
            { label: 'Remaining',   value: `${txRemaining} / ${txLimit}`,                        color: txRemaining > 0 ? 'text-[#00BFFF]' : 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="py-2 text-center">
              <p className={`font-['Space_Grotesk'] font-black text-base ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-gray-600 uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Converter ─────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/8 p-6">

        {/* Direction toggle */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex rounded-xl border border-white/8 overflow-hidden bg-white/2 p-0.5 gap-0.5 flex-1">
            {(['bc-to-gems', 'gems-to-bc'] as ExchangeDirection[]).map(d => (
              <button
                key={d}
                onClick={() => switchDirection(d)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  direction === d
                    ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/25'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {d === 'bc-to-gems' ? '💎 BC → Gems' : '💰 Gems → BC'}
              </button>
            ))}
          </div>
          {/* Inline rate reminder */}
          <span className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">
            1 BC = <span className="text-[#00BFFF] font-semibold">{currentRate} 💎</span>
          </span>
        </div>

        {/* Daily limit badge */}
        <div className="mb-5">
          <TxLimitBadge used={txUsed} limit={txLimit} />
          {user && txRemaining > 0 && (
            <p className="text-[10px] text-gray-700 mt-1.5 text-right">
              Resets in {resetHours}h {resetMins}m
            </p>
          )}
        </div>

        {/* Input / Output grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Input */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-2">
              You Pay ({isBC2Gems ? 'BlueCoin' : 'Gems'})
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setTxError('') }}
                placeholder="0"
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/50 rounded-xl px-4 py-3 pr-16 text-white text-sm outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-semibold">
                {isBC2Gems ? 'BC' : '💎'}
              </span>
            </div>
            {user && (
              <div className="flex gap-1.5 mt-1.5">
                {[25, 50, 100, 'Max'].map(v => {
                  const maxVal = isBC2Gems ? maxBC : maxGems
                  const val = v === 'Max' ? maxVal : Math.min(v as number, maxVal)
                  return (
                    <button
                      key={v}
                      onClick={() => setInputValue(String(val))}
                      className="px-2 py-0.5 rounded text-[9px] text-gray-500 bg-white/3 border border-white/8 hover:text-white hover:border-white/20 transition-all"
                    >
                      {v === 'Max' ? `Max (${maxVal})` : `${v}`}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Output preview */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wide mb-2">
              You Receive ({isBC2Gems ? 'Gems' : 'BlueCoin'})
            </label>
            <div className="w-full bg-white/2 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className={`text-sm font-bold ${net > 0 ? 'text-[#00BFFF]' : 'text-gray-600'}`}>
                {net > 0 ? net.toFixed(2) : '0'}
              </span>
              <span className="text-[10px] text-gray-500 font-semibold">
                {isBC2Gems ? '💎 Gems' : 'BC'}
              </span>
            </div>
            {amount > 0 && (
              <div className="mt-1.5 space-y-0.5">
                <p className="text-[10px] text-gray-600">Gross: {gross.toFixed(2)} {isBC2Gems ? '💎' : 'BC'}</p>
                <p className="text-[10px] text-gray-700">Fee (2%): −{fee.toFixed(2)} {isBC2Gems ? '💎' : 'BC'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Conversion preview row */}
        {amount > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/15 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {isBC2Gems ? `1 BC = ${currentRate} 💎` : `${currentRate} 💎 = 1 BC`}
            </span>
            <span className="text-xs text-gray-400">
              {isBC2Gems
                ? `${amount} BC → ${net.toFixed(2)} 💎`
                : `${amount} 💎 → ${net.toFixed(2)} BC`
              }
            </span>
          </div>
        )}

        {txExhausted && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/8 border border-red-500/20 flex items-center gap-2">
            <span className="text-red-400 text-sm">🔒</span>
            <div>
              <p className="text-red-400 text-xs font-semibold">Exchange limit reached</p>
              <p className="text-red-400/60 text-[10px] mt-0.5">
                You have used all {txLimit} exchanges today. Resets in {resetHours}h {resetMins}m.
              </p>
            </div>
          </div>
        )}

        {txError && (
          <p className="mb-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            ⚠ {txError}
          </p>
        )}

        {lastTx && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/8 border border-green-500/20 flex items-center justify-between">
            <span className="text-green-400 text-xs">✓ Exchange complete</span>
            <span className="text-xs text-gray-400">
              +{Math.floor(lastTx.gained).toLocaleString()} {lastTx.direction === 'bc-to-gems' ? '💎 Gems' : 'BC'} received
            </span>
          </div>
        )}

        {!user ? (
          <div className="w-full py-3 rounded-xl text-sm text-center text-gray-600 border border-white/8">
            Log in to exchange
          </div>
        ) : (
          <button
            onClick={handleExchange}
            disabled={!canSubmit}
            className="btn-primary w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing…
              </span>
            ) : isBC2Gems ? (
              `Exchange ${amount || 0} BC → ${net > 0 ? net.toFixed(2) : '0'} 💎 Gems`
            ) : (
              `Exchange ${amount || 0} 💎 → ${net > 0 ? net.toFixed(2) : '0'} BC`
            )}
          </button>
        )}
      </div>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <h3 className="font-semibold text-sm text-white mb-4">How the Exchange Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: '📈',
              title: 'Dynamic Rate',
              body: `The rate fluctuates between ${minRate}–${maxRate} Gems/BC using two overlapping wave cycles, stabilizing around ${baseRate} Gems/BC base.`,
            },
            {
              icon: '⚖️',
              title: 'Trading Fee',
              body: `A ${(feePct * 100).toFixed(0)}% transaction fee is deducted from the output. This helps stabilize the market and maintain reserve liquidity.`,
            },
            {
              icon: '🔒',
              title: 'Daily Limit',
              body: `Each account can perform up to ${txLimit} exchange transactions per 24-hour window, in either direction. The limit resets automatically.`,
            },
          ].map(item => (
            <div key={item.title} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <p className="text-xs font-semibold text-gray-300">{item.title}</p>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
