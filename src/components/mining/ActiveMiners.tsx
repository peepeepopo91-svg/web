// ─── Active Miners Section ─────────────────────────────────────────────────────
// Shows all miners with live sessions + active rigs. Auto-refreshes via SSE.
// Self-contained: fetches its own data, no auth required.

import { useState, useEffect, useRef, useCallback } from 'react'
import { getActiveMiners } from '../../server/miningServer'
import type { ActiveMinerEntry, ActiveMinersPayload } from '../../server/miningServer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtHashrate(gh: number): string {
  if (gh >= 1000) return `${(gh / 1000).toFixed(1)} TH/s`
  return `${gh} GH/s`
}

function fmtTimeLeft(expiresAt: number | null, now: number): string {
  if (!expiresAt) return '—'
  const ms = expiresAt - now
  if (ms <= 0) return 'Expired'
  const s  = Math.floor(ms / 1000)
  const m  = Math.floor(s / 60)
  const h  = Math.floor(m / 60)
  if (h >= 1) return `${h}h ${m % 60}m`
  if (m >= 1) return `${m}m ${s % 60}s`
  return `${s}s`
}

function sessionUrgency(expiresAt: number | null, now: number): 'ok' | 'warn' | 'critical' {
  if (!expiresAt) return 'critical'
  const h = (expiresAt - now) / 3_600_000
  if (h < 1) return 'critical'
  if (h < 3) return 'warn'
  return 'ok'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NetworkStatPill({ label, value, sub, glow }: {
  label: string; value: string; sub?: string; glow: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-white/8 bg-white/3 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 120%, ${glow}, transparent 70%)` }}
      />
      <span className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">{label}</span>
      <span className="font-['Space_Grotesk'] font-black text-lg text-white tabular-nums leading-none">{value}</span>
      {sub && <span className="text-[9px] text-gray-600 mt-0.5">{sub}</span>}
    </div>
  )
}

function HashrateBar({ share }: { share: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden flex-1 min-w-[60px] max-w-[100px]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, share)}%`,
            background: 'linear-gradient(90deg, #00BFFF, #0066FF)',
            boxShadow: share > 20 ? '0 0 6px rgba(0,191,255,0.5)' : undefined,
          }}
        />
      </div>
      <span className="text-[11px] text-gray-400 tabular-nums w-10 text-right">{share.toFixed(1)}%</span>
    </div>
  )
}

function SessionBadge({ expiresAt, now }: { expiresAt: number | null; now: number }) {
  const urgency = sessionUrgency(expiresAt, now)
  const label   = fmtTimeLeft(expiresAt, now)
  const styles: Record<typeof urgency, string> = {
    ok:       'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warn:     'bg-yellow-500/10  border-yellow-500/20  text-yellow-400',
    critical: 'bg-red-500/10     border-red-500/20     text-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold tabular-nums ${styles[urgency]}`}>
      <span className={`w-1 h-1 rounded-full ${urgency === 'ok' ? 'bg-emerald-400' : urgency === 'warn' ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`} />
      {label}
    </span>
  )
}

function MinerRow({ entry, rank, isMe, now }: {
  entry: ActiveMinerEntry; rank: number; isMe: boolean; now: number
}) {
  const initial = entry.username[0].toUpperCase()

  return (
    <div className={`grid items-center gap-3 px-5 py-3.5 transition-colors duration-200
      grid-cols-[32px_1fr_auto_auto_auto]
      sm:grid-cols-[32px_1fr_90px_auto_90px]
      lg:grid-cols-[32px_1fr_140px_90px_80px_90px]
      ${isMe
        ? 'bg-[#00BFFF]/5 border-l-2 border-[#00BFFF]/50'
        : 'hover:bg-white/[0.02] border-l-2 border-transparent'
      }`}
    >
      {/* Rank number */}
      <div className="flex items-center justify-center">
        <span className="text-[11px] font-mono text-gray-600 tabular-nums">#{rank}</span>
      </div>

      {/* Player */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Avatar with mining pulse */}
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black
            ${isMe
              ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
              : 'bg-white/5 text-gray-300 border border-white/10'
            }`}
          >
            {initial}
          </div>
          {/* Active pulse ring */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0a0f1a] animate-pulse" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-semibold truncate ${isMe ? 'text-[#00BFFF]' : 'text-white'}`}>
              {entry.username}
            </span>
            {isMe && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00BFFF]/15 text-[#00BFFF] font-bold uppercase tracking-wide flex-shrink-0">
                You
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-600 leading-none">
            {entry.activeRigs} rig{entry.activeRigs !== 1 ? 's' : ''} active
            {entry.totalRigs > entry.activeRigs && (
              <span className="text-gray-700"> / {entry.totalRigs} owned</span>
            )}
          </span>
        </div>
      </div>

      {/* Hashrate */}
      <div className="text-right sm:text-right">
        <span className={`text-sm font-bold tabular-nums ${isMe ? 'text-[#00BFFF]' : 'text-white'}`}>
          {fmtHashrate(entry.hashrate)}
        </span>
      </div>

      {/* Network share bar — hidden on small */}
      <div className="hidden lg:block">
        <HashrateBar share={entry.networkSharePct} />
      </div>

      {/* Rig count — hidden on xs */}
      <div className="hidden sm:flex justify-center">
        <span className="text-xs tabular-nums">
          <span className="text-white font-semibold">{entry.activeRigs}</span>
          <span className="text-gray-600">/{entry.totalRigs}</span>
        </span>
      </div>

      {/* Session countdown */}
      <div className="flex justify-end">
        <SessionBadge expiresAt={entry.sessionExpiresAt} now={now} />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ActiveMinersProps {
  currentUsername?: string | null
}

export function ActiveMiners({ currentUsername }: ActiveMinersProps) {
  const [data,        setData]    = useState<ActiveMinersPayload | null>(null)
  const [loading,     setLoading] = useState(true)
  const [now,         setNow]     = useState(Date.now())
  const [flashTs,     setFlashTs] = useState(0)
  const [lastUpdated, setUpdated] = useState<Date | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (animate = false) => {
    try {
      const payload = await getActiveMiners()
      setData(payload)
      setNow(payload.serverNow)
      setUpdated(new Date())
      if (animate) setFlashTs(Date.now())
    } catch { /* server unreachable — keep current */ }
  }, [])

  // Initial load
  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  // 1-second clock tick for session countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(n => n + 1000), 1000)
    return () => clearInterval(id)
  }, [])

  // SSE — debounce 2 s
  useEffect(() => {
    if (typeof window === 'undefined') return
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let active = true

    function connect() {
      if (!active) return
      es = new EventSource('/api/mining-events')
      es.addEventListener('mining_updated', () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null
          fetchData(true)
        }, 2_000)
      })
      es.onerror = () => {
        es?.close(); es = null
        if (active) reconnectTimer = setTimeout(connect, 5_000)
      }
    }
    connect()
    return () => {
      active = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      es?.close()
    }
  }, [fetchData])

  const miners = data?.miners ?? []
  const totalHashrate = data?.totalHashrate ?? 0
  const totalMiners   = data?.totalMiners   ?? 0

  // Flash animation class
  const flashClass = flashTs > 0 ? 'animate-pulse-once' : ''

  return (
    <section className="px-4 pb-10">
      <div className="max-w-6xl mx-auto">

        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between mb-5 flex-col sm:flex-row gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-['Space_Grotesk'] font-bold text-xl text-white">
                Active <span className="text-gradient">Miners</span>
              </h2>
              {/* Live pill */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wide">Live</span>
              </div>
            </div>
            <p className="text-gray-600 text-xs">
              {loading
                ? 'Loading network…'
                : totalMiners === 0
                ? 'No miners active right now'
                : `${totalMiners} miner${totalMiners !== 1 ? 's' : ''} online · ${fmtHashrate(totalHashrate)} total network power`}
            </p>
          </div>

          {lastUpdated && (
            <span className="text-[10px] text-gray-700 hidden sm:block self-start sm:self-auto">
              updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        {/* ── Main card ───────────────────────────────────────────────── */}
        <div
          className={`relative rounded-2xl overflow-hidden border transition-all duration-700 ${flashClass}
            ${miners.length > 0
              ? 'border-[#00BFFF]/20'
              : 'border-white/8'
            }`}
          style={{
            background: 'linear-gradient(145deg, rgba(0,30,50,0.6) 0%, rgba(5,10,20,0.8) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Ambient glow top-right */}
          <div
            className="absolute top-0 right-0 w-64 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at top right, rgba(0,191,255,0.08), transparent 70%)' }}
          />

          {/* ── Network stats bar ──────────────────────────────────────── */}
          {!loading && (
            <div className="px-5 py-4 border-b border-white/5 grid grid-cols-3 gap-3">
              <NetworkStatPill
                label="Network Power"
                value={totalHashrate > 0 ? fmtHashrate(totalHashrate) : '0 GH/s'}
                sub="combined hashrate"
                glow="#00BFFF"
              />
              <NetworkStatPill
                label="Active Miners"
                value={String(totalMiners)}
                sub={totalMiners === 1 ? 'miner online' : 'miners online'}
                glow="#0066FF"
              />
              <NetworkStatPill
                label="Active Rigs"
                value={String(miners.reduce((s, m) => s + m.activeRigs, 0))}
                sub="rigs mining"
                glow="#7C3AED"
              />
            </div>
          )}

          {/* ── Table ─────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <span className="w-5 h-5 border-2 border-white/10 border-t-[#00BFFF] rounded-full animate-spin" />
              <span className="text-gray-600 text-sm">Loading active miners…</span>
            </div>
          ) : miners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-4xl opacity-20">⛏️</span>
              <p className="text-gray-500 text-sm font-medium">No miners active right now.</p>
              <p className="text-gray-700 text-xs">Start your rigs to appear here!</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid items-center gap-3 px-5 py-2.5 border-b border-white/5 bg-white/[0.02]
                grid-cols-[32px_1fr_auto_auto_auto]
                sm:grid-cols-[32px_1fr_90px_auto_90px]
                lg:grid-cols-[32px_1fr_140px_90px_80px_90px]">
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-center">#</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest">Player</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-right">Hashrate</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest hidden lg:block">Network %</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-center hidden sm:block">Rigs</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-right">Session</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.04]">
                {miners.map((entry, i) => (
                  <MinerRow
                    key={entry.username}
                    entry={entry}
                    rank={i + 1}
                    isMe={currentUsername?.toLowerCase() === entry.username.toLowerCase()}
                    now={now}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01] flex flex-wrap gap-x-5 gap-y-1">
                {[
                  { icon: '⚡', label: 'Hashrate — active GH/s contributed to the network' },
                  { icon: '🔗', label: 'Session — time remaining before renewal required' },
                  { icon: '⛏️', label: 'Rigs — active rigs / total owned' },
                ].map(({ icon, label }) => (
                  <span key={label} className="text-[9px] text-gray-700 flex items-center gap-1">
                    <span>{icon}</span>{label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
