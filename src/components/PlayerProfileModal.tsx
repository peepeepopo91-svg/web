import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Player } from '../data/players'
import { gamemodes as defaultGamemodes } from '../data/gamemodes'
import type { Gamemode } from '../data/gamemodes'
import {
  tierColors,
  getPlayerTotalPoints,
  getAverageTier,
  getAveragePoints,
  getHighestTier,
  getLowestTier,
} from '../data/tiers'

interface PlayerProfileModalProps {
  player: Player
  overallRank?: number
  totalPoints?: number
  overallTier?: string | null
  onClose: () => void
  gamemodes?: Gamemode[]
}

function GamemodeTile({ gm, tier }: { gm: Gamemode; tier?: string | null }) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ranked = tier && tier !== 'None'
  const colors = ranked ? tierColors[tier!] : null

  return (
    <div
      className="group/tile relative flex flex-col items-center gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`relative w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-200 cursor-default
          ${ranked && colors
            ? `${colors.bg} ${colors.border} group-hover/tile:scale-110`
            : 'bg-white/4 border-white/8 opacity-25'
          }`}
        style={ranked && hovered ? { boxShadow: '0 0 18px rgba(0,191,255,0.4)' } : undefined}
      >
        {ranked && (
          <div className={`absolute inset-0 rounded-xl opacity-25 blur-sm ${colors?.bg}`} />
        )}
        {!imgError && gm.icon ? (
          <img
            src={gm.icon}
            alt={gm.label}
            width={26}
            height={26}
            className="w-[26px] h-[26px] object-contain relative z-10"
            style={{
              imageRendering: 'pixelated',
              filter: ranked && hovered ? 'drop-shadow(0 0 6px rgba(0,191,255,0.55))' : 'none',
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-lg relative z-10">{gm.fallback}</span>
        )}
      </div>

      <span className={`text-[11px] font-black tracking-wide uppercase ${colors ? colors.text : 'text-gray-700'}`}>
        {ranked ? tier : '—'}
      </span>

      {/* Hover tooltip */}
      {hovered && ranked && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20">
          <div
            className="relative rounded-xl px-3.5 py-2.5 text-center whitespace-nowrap border shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(8,16,32,0.98) 0%, rgba(0,24,52,0.98) 100%)',
              borderColor: 'rgba(0,191,255,0.28)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,191,255,0.10)',
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/50 to-transparent" />
            <div className="text-white text-xs font-bold">{gm.label}</div>
            {colors && (
              <div className={`text-[11px] font-black mt-1.5 ${colors.text}`}>
                <span className={`px-2 py-0.5 rounded-md border ${colors.bg} ${colors.border}`}>{tier}</span>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 rotate-45 border-r border-b -mt-[5px]"
              style={{ background: 'rgba(0,24,52,0.98)', borderColor: 'rgba(0,191,255,0.28)' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function PlayerProfileModal({
  player, overallRank, totalPoints, overallTier, onClose, gamemodes = defaultGamemodes,
}: PlayerProfileModalProps) {
  const [closing, setClosing] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 200)
  }, [onClose])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKeyDown)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
  }, [handleClose])

  const points    = totalPoints ?? getPlayerTotalPoints(player.ranks)
  const avgTier   = overallTier ?? getAverageTier(player.ranks)
  const avgColors = avgTier ? tierColors[avgTier] : null
  const avgPoints = getAveragePoints(player.ranks)
  const highestTier = getHighestTier(player.ranks)
  const lowestTier  = getLowestTier(player.ranks)
  const rankedCount = Object.values(player.ranks).filter(v => v && v !== 'None').length
  const nameMcUrl   = `https://namemc.com/profile/${encodeURIComponent(player.name)}`

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${
        closing ? 'modal-backdrop-out' : 'modal-backdrop-in'
      }`}
      style={{ background: 'rgba(3,6,15,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} player profile`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl ${
          closing ? 'modal-panel-out' : 'modal-panel-in'
        }`}
        style={{
          background: 'linear-gradient(160deg, rgba(8,14,28,0.99) 0%, rgba(5,10,22,0.99) 100%)',
          borderColor: 'rgba(0,191,255,0.20)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,191,255,0.07), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Top shimmer */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/45 to-transparent" />
        {/* Ambient glow */}
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-80 h-56 bg-[#0044AA]/18 blur-[80px] pointer-events-none rounded-full" />

        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close profile"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center border text-gray-500 hover:text-white hover:border-[#00BFFF]/40 transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="relative px-6 pt-7 pb-6">

          {/* ── Header: avatar left, info right ────────────────────── */}
          <div className="flex items-center gap-5 mb-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-3 rounded-full blur-2xl opacity-35 pointer-events-none"
                style={{ background: 'rgba(0,191,255,0.35)' }} />
              <div
                className="relative w-20 h-20 rounded-2xl p-[2px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,191,255,0.85), rgba(0,70,180,0.5))',
                  boxShadow: '0 0 28px rgba(0,191,255,0.32)',
                }}
              >
                <div className="w-full h-full rounded-[14px] overflow-hidden" style={{ background: '#080E1C' }}>
                  {!imgError ? (
                    <img
                      src={player.head}
                      alt={player.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                  )}
                </div>
              </div>
              {overallRank && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#0057c8,#003a8a)', borderColor: '#00BFFF', boxShadow: '0 0 10px rgba(0,191,255,0.5)' }}
                >
                  #{overallRank}
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h2 className="font-['Space_Grotesk'] font-black text-2xl text-white leading-tight truncate">
                {player.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {avgTier && avgColors && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${avgColors.bg} ${avgColors.text} ${avgColors.border}`}
                    style={{ boxShadow: '0 0 10px rgba(0,191,255,0.18)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {avgTier} Average
                  </span>
                )}
                {player.region && (
                  <span className="text-xs text-gray-600 font-medium">🌍 {player.region}</span>
                )}
              </div>
              <a
                href={nameMcUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 hover:border-[#00BFFF]/35 hover:text-[#00BFFF]"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.45)' }}
              >
                View on NameMC
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
                  <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>

          {/* ── Stats row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {/* Points */}
            <div
              className="rounded-2xl px-4 py-3 border flex flex-col gap-1 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0,100,200,0.15) 0%, rgba(0,50,120,0.09) 100%)',
                borderColor: 'rgba(0,191,255,0.22)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/45 to-transparent" />
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Points</div>
              <div className="font-['Space_Grotesk'] font-black text-xl leading-none text-[#00BFFF]">{points}</div>
              <div className="text-[10px] text-gray-700">total earned</div>
            </div>
            {/* Rank */}
            <div
              className="rounded-2xl px-4 py-3 border flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Rank</div>
              <div className="font-['Space_Grotesk'] font-black text-xl leading-none text-white">
                {overallRank ? `#${overallRank}` : '—'}
              </div>
              <div className="text-[10px] text-gray-700">globally</div>
            </div>
            {/* Avg */}
            <div
              className="rounded-2xl px-4 py-3 border flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Avg / Mode</div>
              <div className="font-['Space_Grotesk'] font-black text-xl leading-none text-white">{avgPoints.toFixed(1)}</div>
              <div className="text-[10px] text-gray-700">{rankedCount} ranked</div>
            </div>
          </div>

          {/* ── Best / Worst ─────────────────────────────────────────── */}
          {(highestTier || lowestTier) && (
            <div
              className="flex items-center justify-center gap-6 mb-4 rounded-xl px-5 py-3 border"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              {highestTier && tierColors[highestTier] && (
                <div className="flex items-center gap-2.5">
                  <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Best</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${tierColors[highestTier].bg} ${tierColors[highestTier].text} ${tierColors[highestTier].border}`}>
                    {highestTier}
                  </span>
                </div>
              )}
              <div className="h-5 w-px bg-white/8" />
              {lowestTier && tierColors[lowestTier] && (
                <div className="flex items-center gap-2.5">
                  <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">Worst</span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${tierColors[lowestTier].bg} ${tierColors[lowestTier].text} ${tierColors[lowestTier].border}`}>
                    {lowestTier}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Tier Placements ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/8" />
              <div className="flex items-center gap-2 text-gray-600">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="opacity-50">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Tier Placements</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="opacity-50">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/8" />
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 justify-items-center">
              {gamemodes.map((gm) => (
                <GamemodeTile key={gm.key} gm={gm} tier={player.ranks[gm.key]} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom edge */}
        <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/7 to-transparent" />
      </div>
    </div>,
    document.body
  )
}
