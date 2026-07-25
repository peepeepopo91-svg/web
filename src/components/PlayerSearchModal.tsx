import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, X, ArrowRight, Zap } from 'lucide-react'
import playersData from '../../data/players.json'
import { tierColors, TIER_ORDER } from './PlayerCard'

type Player = {
  name: string
  ranks: Record<string, string>
  avatar?: string
  bio?: string
  tags?: string[]
}

type RankEntry = { mode: string; tier: string }

const MODE_LABELS: Record<string, string> = {
  sword: 'Sword',
  crystal: 'Crystal',
  axe: 'Axe',
  mace: 'Mace',
  uhc: 'UHC',
  nethpot: 'Nethpot',
  diapot: 'Diapot',
}

function getBestRank(ranks: Record<string, string>): RankEntry | null {
  let best: RankEntry | null = null
  let bestIdx = Infinity
  for (const [mode, tier] of Object.entries(ranks)) {
    if (!tier || tier === 'NONE' || tier === 'None') continue
    const idx = TIER_ORDER.indexOf(tier)
    if (idx !== -1 && idx < bestIdx) {
      bestIdx = idx
      best = { mode: MODE_LABELS[mode] ?? mode, tier }
    }
  }
  return best
}

function getTopRanks(ranks: Record<string, string>): RankEntry[] {
  return Object.entries(ranks)
    .filter(([, t]) => t && t !== 'NONE' && t !== 'None')
    .sort((a, b) => TIER_ORDER.indexOf(a[1]) - TIER_ORDER.indexOf(b[1]))
    .slice(0, 3)
    .map(([mode, tier]) => ({ mode: MODE_LABELS[mode] ?? mode, tier }))
}

interface Props {
  open: boolean
  onClose: () => void
}

export function PlayerSearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const players = playersData as Player[]

  const results = query.trim().length === 0
    ? players.slice(0, 8)
    : players
        .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)

  const handleClose = useCallback(() => {
    setQuery('')
    setSelected(0)
    onClose()
  }, [onClose])

  const goToPlayer = useCallback((name: string) => {
    navigate({ to: '/rankings', search: { q: name } } as any)
    handleClose()
  }, [navigate, handleClose])

  const goToSearch = useCallback(() => {
    if (query.trim()) {
      navigate({ to: '/rankings', search: { q: query.trim() } } as any)
      handleClose()
    }
  }, [query, navigate, handleClose])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelected(0)
    }
  }, [open])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { handleClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selected]) goToPlayer(results[selected].name)
        else goToSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selected, handleClose, goToPlayer, goToSearch])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  // Reset selection when results change
  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,6,15,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(5, 12, 28, 0.97)',
          border: '1px solid rgba(0, 160, 255, 0.18)',
          boxShadow: '0 0 60px rgba(0, 120, 255, 0.12), 0 25px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
          <Search size={16} className="text-[#00BFFF] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player..."
            className="flex-1 bg-transparent text-white text-[15px] placeholder-white/25 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={14} />
            </button>
          )}
          <button
            onClick={handleClose}
            className="text-[10px] text-white/25 border border-white/10 rounded px-1.5 py-0.5 font-mono hover:text-white/50 hover:border-white/20 transition-all ml-1"
          >
            ESC
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-white/30 text-sm">No players found for "<span className="text-white/50">{query}</span>"</p>
            </div>
          ) : (
            <>
              {!query && (
                <div className="px-4 py-1.5 mb-1">
                  <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Top Players</span>
                </div>
              )}
              {results.map((player, i) => {
                const best = getBestRank(player.ranks)
                const topRanks = getTopRanks(player.ranks)
                const colors = best ? tierColors[best.tier] : null
                const isSelected = i === selected

                return (
                  <button
                    key={player.name}
                    onClick={() => goToPlayer(player.name)}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      isSelected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Avatar / Initial */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black"
                      style={{
                        background: best && colors
                          ? `${(colors as any).glow ?? 'rgba(0,100,255,0.15)'}`
                          : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${best && colors ? (colors as any).borderHex ?? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)'}`,
                        color: best && colors ? (colors as any).hex ?? '#00BFFF' : '#555',
                      }}
                    >
                      {player.name[0]?.toUpperCase()}
                    </div>

                    {/* Name + tiers */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-[13px] font-semibold truncate">{player.name}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {topRanks.map(({ mode, tier }) => {
                          const tc = tierColors[tier]
                          return (
                            <span
                              key={mode}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${tc.bg} ${tc.text} ${tc.border}`}
                            >
                              {tier} <span className="opacity-50 font-normal">{mode}</span>
                            </span>
                          )
                        })}
                        {topRanks.length === 0 && (
                          <span className="text-[10px] text-white/20">No ranks</span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={12} className={`flex-shrink-0 transition-opacity ${isSelected ? 'text-[#00BFFF] opacity-100' : 'text-white/20 opacity-0'}`} />
                  </button>
                )
              })}

              {/* View all */}
              {query.trim() && (
                <button
                  onClick={goToSearch}
                  className="w-full flex items-center gap-2 px-4 py-2.5 mt-1 border-t border-white/[0.06] text-[#00BFFF]/70 hover:text-[#00BFFF] text-[12px] font-medium transition-colors hover:bg-white/[0.03]"
                >
                  <Zap size={12} />
                  View all results for "<span className="font-bold">{query}</span>"
                  <ArrowRight size={11} className="ml-auto" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/[0.04] flex items-center gap-3 text-[10px] text-white/20">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
            {players.length} players
          </span>
        </div>
      </div>
    </div>
  )
}
