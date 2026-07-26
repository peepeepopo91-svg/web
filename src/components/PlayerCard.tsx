import { useState } from 'react'
import type { Player } from '../data/players'
import { tierColors, TIER_ORDER } from '../data/tiers'
import { gamemodes as defaultGamemodes } from '../data/gamemodes'
import type { Gamemode } from '../data/gamemodes'
import { PlayerProfileModal } from './PlayerProfileModal'

export { tierColors }
export { TIER_ORDER }

function TierBadge({ tier }: { tier: string }) {
  const colors = tierColors[tier]
  if (!colors) return null
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>
      {tier}
    </span>
  )
}

function GamemodeIcon({ gm, tier }: { gm: Gamemode; tier?: string | null }) {
  const [hovered, setHovered] = useState(false)
  const [iconError, setIconError] = useState(false)
  const ranked = tier && tier !== 'None'
  const colors = ranked ? tierColors[tier!] : null

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 transition-all duration-200 cursor-default
          ${ranked && colors
            ? `${colors.bg} ${colors.border} hover:scale-110`
            : 'bg-white/3 border-white/8 opacity-25'
          }`}
        style={ranked && hovered ? { boxShadow: '0 0 14px rgba(0,191,255,0.4)' } : undefined}
      >
        {!iconError && gm.icon ? (
          <img
            src={gm.icon}
            alt={gm.label}
            width={gm.iconSize ?? 18}
            height={gm.iconSize ?? 18}
            className="object-contain"
            style={{
              width: `${gm.iconSize ?? 18}px`,
              height: `${gm.iconSize ?? 18}px`,
              imageRendering: 'pixelated',
              filter: ranked && hovered ? 'drop-shadow(0 0 4px rgba(0,191,255,0.6))' : 'none',
            }}
            onError={() => setIconError(true)}
          />
        ) : (
          gm.fallback
        )}
      </div>

      {/* Premium hover tooltip */}
      {hovered && ranked && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div
            className="relative rounded-xl px-3.5 py-2.5 text-center whitespace-nowrap border shadow-2xl shadow-black/60"
            style={{
              background: 'linear-gradient(135deg, rgba(8,16,32,0.98) 0%, rgba(0,24,52,0.98) 100%)',
              borderColor: 'rgba(0,191,255,0.28)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,191,255,0.12)',
            }}
          >
            {/* Top shimmer line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/50 to-transparent" />
            <div className="text-white text-xs font-bold leading-none">{gm.label}</div>
            {colors && (
              <div className={`text-[11px] font-black mt-1.5 ${colors.text}`}>
                <span className={`px-2 py-0.5 rounded-md border ${colors.bg} ${colors.border}`}>{tier}</span>
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div
              className="w-2 h-2 rotate-45 border-r border-b -mt-[5px]"
              style={{ background: 'rgba(0,24,52,0.98)', borderColor: 'rgba(0,191,255,0.28)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface PlayerCardProps {
  player: Player
  totalPoints?: number
  overallRank?: number
  overallTier?: string | null
  gamemodes?: Gamemode[]
}

export function PlayerCard({ player, totalPoints, overallRank, overallTier, gamemodes = defaultGamemodes }: PlayerCardProps) {
  const [imgError, setImgError] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const overallColors = overallTier ? tierColors[overallTier] : null

  return (
    <div
      onClick={() => setShowProfile(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowProfile(true)
        }
      }}
      className="player-card glass rounded-2xl border border-white/5 hover:border-[#00BFFF]/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00BFFF]/5 group cursor-pointer"
    >
      {/* Header: avatar + name + score badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative flex-shrink-0">
          {!imgError ? (
            <img
              src={player.head}
              alt={player.name}
              width={44}
              height={44}
              className="rounded-lg ring-2 ring-white/10 group-hover:ring-[#00BFFF]/30 transition-all duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-lg">
              👤
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="font-['Space_Grotesk'] font-semibold text-white text-sm leading-tight truncate">
              {player.name}
            </div>
            {totalPoints !== undefined && (
              <span className="flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20">
                {totalPoints} pts
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {overallRank !== undefined && (
              <span className="text-gray-400 text-xs font-semibold">
                #{overallRank} Overall
              </span>
            )}
            {overallTier && overallColors && overallRank !== undefined && (
              <span className="text-gray-700 text-xs">·</span>
            )}
            {overallTier && overallColors && (
              <span className={`text-xs font-semibold ${overallColors.text}`}>
                {overallTier} Avg
              </span>
            )}
          </div>

          {overallRank === undefined && (
            <div className="text-gray-600 text-xs mt-0.5">
              {Object.values(player.ranks).filter(v => v && v !== 'None').length} gamemodes
            </div>
          )}
        </div>
      </div>

      {/* Gamemode icons */}
      <div className="flex flex-wrap gap-1.5">
        {gamemodes.map((gm) => (
          <GamemodeIcon
            key={gm.key}
            gm={gm}
            tier={player.ranks[gm.key]}
          />
        ))}
      </div>

      {showProfile && (
        <PlayerProfileModal
          player={player}
          totalPoints={totalPoints}
          overallRank={overallRank}
          overallTier={overallTier}
          onClose={() => setShowProfile(false)}
          gamemodes={gamemodes}
        />
      )}
    </div>
  )
}
