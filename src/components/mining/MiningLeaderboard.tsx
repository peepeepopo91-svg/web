// ─── Global Mining Leaderboard ────────────────────────────────────────────────
// Self-contained: fetches from server, subscribes to SSE for live updates.
// Visible to all visitors — no login required.

import { useState, useEffect, useRef, useCallback } from 'react'
import { getLeaderboard } from '../../server/miningServer'
import type { LeaderboardEntry } from '../../server/miningServer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${+(n / 1_000_000_000).toPrecision(3)}B`
  if (n >= 1_000_000)     return `${+(n / 1_000_000).toPrecision(3)}M`
  if (n >= 1_000)         return `${+(n / 1_000).toPrecision(3)}K`
  return String(Math.floor(n))
}

const MEDAL: Record<number, { emoji: string; color: string; bg: string; border: string }> = {
  1: { emoji: '🥇', color: 'text-yellow-400',  bg: 'bg-yellow-500/8',  border: 'border-yellow-500/20' },
  2: { emoji: '🥈', color: 'text-gray-300',    bg: 'bg-gray-500/8',   border: 'border-gray-500/20'   },
  3: { emoji: '🥉', color: 'text-orange-400',  bg: 'bg-orange-500/8', border: 'border-orange-500/20' },
}

function RankBadge({ rank }: { rank: number }) {
  const m = MEDAL[rank]
  if (m) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-base ${m.bg} border ${m.border}`}>
        {m.emoji}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/3 border border-white/8 text-[11px] font-mono text-gray-500">
      #{rank}
    </span>
  )
}

function PowerBar({ power, max }: { power: number; max: number }) {
  const pct = max > 0 ? (power / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: power > 0
              ? 'linear-gradient(90deg, #00BFFF, #0066FF)'
              : 'transparent',
          }}
        />
      </div>
      <span className="text-[11px] text-gray-500 tabular-nums w-14 text-right">
        {power > 0 ? `${power} GH/s` : '—'}
      </span>
    </div>
  )
}

// Top-tier rig that the user owns (highest hashrate)
function TopRigBadge({ entry }: { entry: LeaderboardEntry }) {
  if (entry.totalRigs === 0) return <span className="text-gray-700 text-xs">—</span>
  // We don't have individual rig info here, just counts — show active/total
  return (
    <span className="text-xs text-gray-400 tabular-nums">
      <span className="text-white font-semibold">{entry.activeRigs}</span>
      <span className="text-gray-600">/{entry.totalRigs}</span>
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MiningLeaderboardProps {
  currentUsername?: string | null
}

export function MiningLeaderboard({ currentUsername }: MiningLeaderboardProps) {
  const [entries,     setEntries]     = useState<LeaderboardEntry[]>([])
  const [loading,     setLoading]     = useState(true)
  const [flashTs,     setFlashTs]     = useState(0)   // triggers pulse animation on update
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLeaderboard = useCallback(async (animate = false) => {
    try {
      const data = await getLeaderboard()
      setEntries(data)
      setLastUpdated(new Date())
      if (animate) setFlashTs(Date.now())
    } catch {
      /* server unreachable — keep current data */
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard().finally(() => setLoading(false))
  }, [fetchLeaderboard])

  // SSE subscription — debounce 2 s to batch rapid updates
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
          fetchLeaderboard(true)
        }, 2_000)
      })

      es.onerror = () => {
        es?.close()
        es = null
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
  }, [fetchLeaderboard])

  // Find special badge recipients
  const maxPower    = Math.max(...entries.map(e => e.miningPower), 0)
  const maxGems     = Math.max(...entries.map(e => e.gems), 0)
  const maxRewards  = Math.max(...entries.map(e => e.blockRewards), 0)

  const powerLeader   = maxPower   > 0 ? entries.find(e => e.miningPower  === maxPower)   : null
  const gemLeader     = maxGems    > 0 ? entries.find(e => e.gems         === maxGems)    : null
  const rewardLeader  = maxRewards > 0 ? entries.find(e => e.blockRewards === maxRewards) : null

  function getBadges(entry: LeaderboardEntry): string[] {
    const badges: string[] = []
    if (powerLeader  && entry.username === powerLeader.username  && entry.rank > 3) badges.push('⚡ Power')
    if (gemLeader    && entry.username === gemLeader.username    && entry.rank > 3) badges.push('💎 Gems')
    if (rewardLeader && entry.username === rewardLeader.username && entry.rank > 3) badges.push('🏆 Earner')
    return badges
  }

  // Flash class that briefly lights up the border when SSE update arrives
  const flashClass = flashTs > 0 ? 'animate-pulse-once' : ''

  return (
    <section className="px-4 pb-10 mt-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-['Space_Grotesk'] font-bold text-xl text-white">
              Global <span className="text-gradient">Leaderboard</span>
            </h2>
            <p className="text-gray-600 text-xs mt-0.5">
              {entries.length === 0 && !loading
                ? 'No miners yet — be the first!'
                : `Top ${entries.length} miner${entries.length !== 1 ? 's' : ''} ranked by BlueCoin balance`}
            </p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] text-gray-700 hidden sm:block">
                updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
              <span className="text-[10px] text-[#00BFFF] font-semibold uppercase tracking-wide">Live</span>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className={`glass rounded-2xl border border-white/8 overflow-hidden ${flashClass}`}>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <span className="w-5 h-5 border-2 border-white/10 border-t-[#00BFFF] rounded-full animate-spin" />
              <span className="text-gray-600 text-sm">Loading leaderboard…</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-4xl opacity-30">⛏️</span>
              <p className="text-gray-500 text-sm font-medium">No miners on the board yet.</p>
              <p className="text-gray-700 text-xs">Log in and start a rig to claim #1!</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[44px_1fr_100px_80px_70px_1fr_90px] gap-2 px-4 py-2.5 border-b border-white/5 bg-white/2">
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-center">Rank</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest">Player</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-right">BlueCoin</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-right hidden sm:block">Gems</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-center hidden md:block">Rigs</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest hidden lg:block">Mining Power</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest text-right hidden md:block">Earned BC</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.04]">
                {entries.map(entry => {
                  const isMe    = currentUsername?.toLowerCase() === entry.username.toLowerCase()
                  const medal   = MEDAL[entry.rank]
                  const badges  = getBadges(entry)

                  return (
                    <div
                      key={entry.username}
                      className={`grid grid-cols-[44px_1fr_100px_80px_70px_1fr_90px] gap-2 items-center px-4 py-3 transition-colors duration-200 ${
                        isMe
                          ? 'bg-[#00BFFF]/5 border-l-2 border-[#00BFFF]/40'
                          : medal
                          ? 'hover:bg-white/[0.02]'
                          : 'hover:bg-white/[0.015]'
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex justify-center">
                        <RankBadge rank={entry.rank} />
                      </div>

                      {/* Player */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-black ${
                          isMe
                            ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
                            : medal
                            ? `${medal.bg} ${medal.color} border ${medal.border}`
                            : 'bg-white/5 text-gray-400 border border-white/8'
                        }`}>
                          {entry.username[0].toUpperCase()}
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
                            {badges.map(b => (
                              <span key={b} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/8 font-medium flex-shrink-0 hidden sm:inline">
                                {b}
                              </span>
                            ))}
                          </div>
                          {entry.activeRigs > 0 && (
                            <span className="text-[9px] text-gray-700 leading-none">
                              {entry.activeRigs} rig{entry.activeRigs !== 1 ? 's' : ''} mining
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BlueCoin balance */}
                      <div className="text-right">
                        <span className={`text-sm font-bold tabular-nums ${isMe ? 'text-[#00BFFF]' : 'text-white'}`}>
                          {formatCompact(entry.balance)}
                        </span>
                        <span className="text-gray-600 text-[10px] ml-1">BC</span>
                      </div>

                      {/* Gems */}
                      <div className="text-right hidden sm:block">
                        <span className="text-sm font-semibold tabular-nums text-purple-300">
                          {formatCompact(Math.floor(entry.gems))}
                        </span>
                        <span className="text-gray-600 text-[10px] ml-1">💎</span>
                      </div>

                      {/* Rigs */}
                      <div className="text-center hidden md:block">
                        <TopRigBadge entry={entry} />
                      </div>

                      {/* Mining power */}
                      <div className="hidden lg:block">
                        <PowerBar power={entry.miningPower} max={maxPower} />
                      </div>

                      {/* Block rewards earned */}
                      <div className="text-right hidden md:block">
                        <span className="text-xs font-semibold tabular-nums text-amber-400">
                          {entry.blockRewards.toLocaleString()}
                        </span>
                        <span className="text-gray-600 text-[10px] ml-1">BC</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer legend */}
              <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01] flex flex-wrap gap-x-5 gap-y-1">
                {[
                  { icon: '💎', label: 'BlueCoin — current balance, primary rank metric' },
                  { icon: '⚡', label: 'Mining Power — active GH/s output' },
                  { icon: '🏆', label: 'Earned BC — total block rewards (last 50 blocks)' },
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
