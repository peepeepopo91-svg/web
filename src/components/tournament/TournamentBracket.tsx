import { useState, useEffect, useRef } from 'react'
import type { Tournament, Match, Team, BracketThemeId } from '../../data/tournament'
import { MATCH_STATUS_LABEL } from '../../data/tournament'
import { MatchDetailModal } from './MatchDetailModal'
import { toJpeg } from 'html-to-image'

interface Props { tournament: Tournament | null }

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_W   = 172
const CARD_H   = 86
const CONN_W   = 40
const SLOT_H   = 108
const LABEL_H  = 24
const LABEL_MB = 8
const OUTER_PAD = 24

const colHeight = (n: number) => n * SLOT_H
const matchCY   = (i: number, total: number, colH: number) => (colH / total) * i + (colH / total) / 2
const matchTop  = (i: number, total: number, colH: number) => (colH / total) * i + ((colH / total) - CARD_H) / 2

// ─── Theme system ─────────────────────────────────────────────────────────────
type ThemeId = BracketThemeId

interface BracketTheme {
  id: ThemeId
  name: string
  icon: string
  // Container
  containerBg: string
  containerBorder: string
  // Card
  cardBg: string
  cardBgLive: string
  cardBorderNormal: string
  cardBorderLive: string
  cardBorderDone: string
  cardShadowLive: string
  cardRadius: number
  // Teams
  winnerColor: string
  loserColor: string
  tbdColor: string
  winnerScoreColor: string
  loserScoreColor: string
  // Divider
  dividerColor: string
  // Status
  statusLive: string
  statusDone: string
  statusPending: string
  liveBarGrad: string
  // Connectors
  connColor: string
  connColorFaint: string
  connDot: string
  // Round labels
  labelBg: string
  labelBorder: string
  labelColor: string
  // Finals emblem
  finalsRingBg: string
  finalsRingBorder: string
  // Theme pill selector
  pillActive: string
  pillText: string
}

const THEMES: BracketTheme[] = [
  {
    id: 'esports', name: 'Esports', icon: '⚔️',
    containerBg: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(245,158,11,.05) 0%, rgba(14,21,34,.92) 55%, rgba(9,13,21,.97) 100%)',
    containerBorder: 'rgba(245,158,11,.08)',
    cardBg: 'linear-gradient(135deg,rgba(14,21,34,.97),rgba(9,13,21,.99))',
    cardBgLive: 'linear-gradient(135deg,rgba(30,8,8,.97),rgba(18,5,5,.99))',
    cardBorderNormal: 'rgba(255,255,255,.08)',
    cardBorderLive: 'rgba(239,68,68,.45)',
    cardBorderDone: 'rgba(34,197,94,.25)',
    cardShadowLive: '0 0 18px rgba(239,68,68,.18)',
    cardRadius: 10,
    winnerColor: '#86efac', loserColor: 'rgba(255,255,255,.5)', tbdColor: 'rgba(255,255,255,.2)',
    winnerScoreColor: '#4ade80', loserScoreColor: 'rgba(255,255,255,.18)',
    dividerColor: 'rgba(255,255,255,.05)',
    statusLive: '#ef4444', statusDone: 'rgba(34,197,94,.75)', statusPending: 'rgba(255,255,255,.18)',
    liveBarGrad: 'linear-gradient(90deg,transparent,#ef4444,transparent)',
    connColor: 'rgba(245,158,11,.38)', connColorFaint: 'rgba(245,158,11,.18)', connDot: 'rgba(245,158,11,.6)',
    labelBg: 'rgba(245,158,11,.08)', labelBorder: 'rgba(245,158,11,.22)', labelColor: 'rgba(245,158,11,.85)',
    finalsRingBg: 'radial-gradient(circle,rgba(245,158,11,.14) 0%,transparent 100%)',
    finalsRingBorder: 'rgba(245,158,11,.28)',
    pillActive: 'rgba(245,158,11,.18)', pillText: 'rgba(245,158,11,.9)',
  },
  {
    id: 'blue', name: 'Blue Network', icon: '🌐',
    containerBg: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,191,255,.05) 0%, rgba(11,15,23,.92) 55%, rgba(7,10,17,.97) 100%)',
    containerBorder: 'rgba(0,191,255,.1)',
    cardBg: 'linear-gradient(135deg,rgba(11,18,30,.97),rgba(7,11,20,.99))',
    cardBgLive: 'linear-gradient(135deg,rgba(28,8,8,.97),rgba(18,5,5,.99))',
    cardBorderNormal: 'rgba(0,191,255,.1)',
    cardBorderLive: 'rgba(239,68,68,.45)',
    cardBorderDone: 'rgba(34,197,94,.25)',
    cardShadowLive: '0 0 18px rgba(239,68,68,.18)',
    cardRadius: 10,
    winnerColor: '#7dd3fc', loserColor: 'rgba(255,255,255,.5)', tbdColor: 'rgba(255,255,255,.2)',
    winnerScoreColor: '#00bfff', loserScoreColor: 'rgba(255,255,255,.18)',
    dividerColor: 'rgba(0,191,255,.06)',
    statusLive: '#ef4444', statusDone: 'rgba(34,197,94,.75)', statusPending: 'rgba(255,255,255,.18)',
    liveBarGrad: 'linear-gradient(90deg,transparent,#ef4444,transparent)',
    connColor: 'rgba(0,191,255,.35)', connColorFaint: 'rgba(0,191,255,.12)', connDot: 'rgba(0,191,255,.65)',
    labelBg: 'rgba(0,191,255,.07)', labelBorder: 'rgba(0,191,255,.2)', labelColor: 'rgba(0,191,255,.85)',
    finalsRingBg: 'radial-gradient(circle,rgba(0,191,255,.12) 0%,transparent 100%)',
    finalsRingBorder: 'rgba(0,191,255,.3)',
    pillActive: 'rgba(0,191,255,.15)', pillText: '#00bfff',
  },
  {
    id: 'neon', name: 'Neon', icon: '⚡',
    containerBg: 'linear-gradient(180deg,rgba(5,6,10,.99) 0%,rgba(3,4,8,1) 100%)',
    containerBorder: 'rgba(0,255,200,.08)',
    cardBg: 'linear-gradient(135deg,rgba(5,12,25,.98),rgba(3,8,18,.99))',
    cardBgLive: 'linear-gradient(135deg,rgba(18,3,28,.97),rgba(12,2,20,.99))',
    cardBorderNormal: 'rgba(0,255,200,.14)',
    cardBorderLive: 'rgba(255,50,180,.55)',
    cardBorderDone: 'rgba(0,255,120,.3)',
    cardShadowLive: '0 0 20px rgba(255,50,180,.2)',
    cardRadius: 8,
    winnerColor: '#00ff88', loserColor: 'rgba(200,220,255,.5)', tbdColor: 'rgba(100,150,200,.22)',
    winnerScoreColor: '#00ff88', loserScoreColor: 'rgba(100,150,200,.18)',
    dividerColor: 'rgba(0,255,200,.06)',
    statusLive: '#ff32b4', statusDone: 'rgba(0,255,120,.75)', statusPending: 'rgba(100,150,200,.25)',
    liveBarGrad: 'linear-gradient(90deg,transparent,#ff32b4,transparent)',
    connColor: 'rgba(0,255,200,.42)', connColorFaint: 'rgba(0,255,200,.15)', connDot: 'rgba(0,255,200,.75)',
    labelBg: 'rgba(0,255,200,.06)', labelBorder: 'rgba(0,255,200,.22)', labelColor: 'rgba(0,255,200,.9)',
    finalsRingBg: 'radial-gradient(circle,rgba(0,255,200,.1) 0%,transparent 100%)',
    finalsRingBorder: 'rgba(0,255,200,.3)',
    pillActive: 'rgba(0,255,200,.12)', pillText: 'rgba(0,255,200,.95)',
  },
  {
    id: 'championship', name: 'Championship', icon: '🏆',
    containerBg: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(212,175,55,.04) 0%, rgba(10,9,6,.93) 55%, rgba(7,6,3,.98) 100%)',
    containerBorder: 'rgba(212,175,55,.1)',
    cardBg: 'linear-gradient(135deg,rgba(20,16,8,.97),rgba(13,10,4,.99))',
    cardBgLive: 'linear-gradient(135deg,rgba(30,8,6,.97),rgba(20,5,4,.99))',
    cardBorderNormal: 'rgba(212,175,55,.12)',
    cardBorderLive: 'rgba(239,68,68,.4)',
    cardBorderDone: 'rgba(212,175,55,.35)',
    cardShadowLive: '0 0 18px rgba(239,68,68,.18)',
    cardRadius: 6,
    winnerColor: '#ffd700', loserColor: 'rgba(212,175,55,.55)', tbdColor: 'rgba(212,175,55,.2)',
    winnerScoreColor: '#ffd700', loserScoreColor: 'rgba(212,175,55,.18)',
    dividerColor: 'rgba(212,175,55,.07)',
    statusLive: '#ef4444', statusDone: 'rgba(212,175,55,.8)', statusPending: 'rgba(212,175,55,.22)',
    liveBarGrad: 'linear-gradient(90deg,transparent,#ef4444,transparent)',
    connColor: 'rgba(212,175,55,.4)', connColorFaint: 'rgba(212,175,55,.15)', connDot: 'rgba(212,175,55,.65)',
    labelBg: 'rgba(212,175,55,.08)', labelBorder: 'rgba(212,175,55,.25)', labelColor: 'rgba(212,175,55,.88)',
    finalsRingBg: 'radial-gradient(circle,rgba(212,175,55,.14) 0%,transparent 100%)',
    finalsRingBorder: 'rgba(212,175,55,.3)',
    pillActive: 'rgba(212,175,55,.15)', pillText: 'rgba(212,175,55,.9)',
  },
  {
    id: 'minimal', name: 'Minimal', icon: '◻',
    containerBg: '#0d1117',
    containerBorder: '#21262d',
    cardBg: '#161b22',
    cardBgLive: '#1c1014',
    cardBorderNormal: '#30363d',
    cardBorderLive: 'rgba(239,68,68,.5)',
    cardBorderDone: 'rgba(63,185,80,.4)',
    cardShadowLive: '0 0 12px rgba(239,68,68,.12)',
    cardRadius: 8,
    winnerColor: '#3fb950', loserColor: '#8b949e', tbdColor: '#484f58',
    winnerScoreColor: '#3fb950', loserScoreColor: '#484f58',
    dividerColor: '#21262d',
    statusLive: '#f85149', statusDone: '#3fb950', statusPending: '#484f58',
    liveBarGrad: 'linear-gradient(90deg,transparent,#f85149,transparent)',
    connColor: '#30363d', connColorFaint: '#21262d', connDot: '#58a6ff',
    labelBg: 'rgba(88,166,255,.07)', labelBorder: 'rgba(88,166,255,.2)', labelColor: '#58a6ff',
    finalsRingBg: 'radial-gradient(circle,rgba(88,166,255,.1) 0%,transparent 100%)',
    finalsRingBorder: 'rgba(88,166,255,.3)',
    pillActive: 'rgba(88,166,255,.15)', pillText: '#58a6ff',
  },
]

function getTheme(id: ThemeId): BracketTheme { return THEMES.find(t => t.id === id) ?? THEMES[0] }

// ─── Auto-scale hook ──────────────────────────────────────────────────────────
function useAutoScale(naturalW: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW] = useState(9999)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = naturalW > 0 ? Math.min(1, (containerW - OUTER_PAD * 2) / naturalW) : 1
  return { containerRef, scale, containerW }
}

// ─── Team row ─────────────────────────────────────────────────────────────────
function TeamRow({ team, score, winner, rtl, theme }: {
  team?: Team; score: number; winner: boolean; rtl: boolean; theme: BracketTheme
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5,
      flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0,
        flexDirection: rtl ? 'row-reverse' : 'row' }}>
        <img
          src={`https://mc-heads.net/avatar/${team?.captain ?? 'Steve'}/14`}
          alt=""
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0.1' }}
          style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0,
            filter: winner
              ? 'drop-shadow(0 0 5px rgba(34,197,94,.7)) drop-shadow(0 0 2px rgba(34,197,94,.4))'
              : team
                ? 'drop-shadow(0 0 3px rgba(0,191,255,.35)) brightness(1.05)'
                : 'opacity(.25)' }}
        />
        {team ? (
          <span style={{
            fontSize: 10.5, fontWeight: winner ? 700 : 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 88,
            background: winner
              ? 'linear-gradient(90deg, #22c55e, #86efac)'
              : 'linear-gradient(90deg, #00BFFF, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: "'Space Grotesk',sans-serif",
            letterSpacing: '0.01em',
          }}>
            {winner ? '👑 ' : ''}{team.name}
          </span>
        ) : (
          <span style={{
            fontSize: 10.5, fontWeight: 400, fontStyle: 'italic',
            maxWidth: 112, color: theme.tbdColor,
            fontFamily: "'Space Grotesk',sans-serif",
          }}>TBD</span>
        )}
      </div>
      <span style={{ fontSize: 14, fontWeight: 900, flexShrink: 0, minWidth: 18, textAlign: 'right',
        color: winner ? theme.winnerScoreColor : theme.loserScoreColor,
        fontFamily: "'Space Grotesk',sans-serif",
        textShadow: winner ? `0 0 10px ${theme.winnerScoreColor}55` : 'none',
      }}>{score}</span>
    </div>
  )
}

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ match, teams, onClick, rtl = false, theme }: {
  match: Match; teams: Team[]; onClick: () => void; rtl?: boolean
  theme: BracketTheme
}) {
  const [hover, setHover] = useState(false)

  const t1   = teams.find(t => t.id === match.team1Id)
  const t2   = teams.find(t => t.id === match.team2Id)
  const live = match.status === 'live'
  const done = match.status === 'completed'

  const borderColor = live ? theme.cardBorderLive : done ? theme.cardBorderDone : theme.cardBorderNormal
  const shadow = [
    live ? theme.cardShadowLive : '',
    hover ? `0 4px 20px rgba(0,0,0,.4)` : '',
  ].filter(Boolean).join(', ')

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: CARD_W, display: 'block', textAlign: 'left', cursor: 'pointer',
        background: live ? theme.cardBgLive : theme.cardBg,
        border: `1.5px solid ${hover ? borderColor.replace(/[\d.]+\)$/, s => String(Math.min(1, parseFloat(s) * 2) + ')')) : borderColor}`,
        borderRadius: theme.cardRadius, padding: '7px 9px',
        boxShadow: shadow, transition: 'all .18s ease',
        position: 'relative', overflow: 'hidden',
        transform: hover ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Live top bar */}
      {live && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: theme.liveBarGrad,
          animation: 'bt-pbar 2s ease-in-out infinite' }} />
      )}

      <TeamRow team={t1} score={match.score1} winner={match.winnerId !== null && match.winnerId === match.team1Id} rtl={rtl} theme={theme} />

      <div style={{ height: 1, background: theme.dividerColor, margin: '5px 0' }} />

      <TeamRow team={t2} score={match.score2} winner={match.winnerId !== null && match.winnerId === match.team2Id} rtl={rtl} theme={theme} />

      {/* Status row */}
      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.07em',
          color: live ? theme.statusLive : done ? theme.statusDone : theme.statusPending }}>
          {live ? '● LIVE' : MATCH_STATUS_LABEL[match.status].toUpperCase()}
        </span>
      </div>
    </button>
  )
}

// ─── Round column ─────────────────────────────────────────────────────────────
function RoundColumn({ name, matches, teams, onSelect, rtl = false, colH, theme, showLabel }: {
  name: string; matches: Match[]; teams: Team[]; onSelect: (m: Match) => void
  rtl?: boolean; colH: number; theme: BracketTheme; showLabel: boolean
}) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ position: 'relative', width: CARD_W, height: colH + LABEL_H + LABEL_MB }}>
        {showLabel && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ padding: '2px 10px', height: LABEL_H, display: 'flex', alignItems: 'center',
              background: theme.labelBg, border: `1px solid ${theme.labelBorder}`,
              borderRadius: 20, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
              color: theme.labelColor, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {name}
            </div>
          </div>
        )}
        {matches.map((m, i) => (
          <div key={m.id} style={{ position: 'absolute',
            top: matchTop(i, matches.length, colH) + LABEL_H + LABEL_MB, left: 0 }}>
            <MatchCard match={m} teams={teams} onClick={() => onSelect(m)}
              rtl={rtl} theme={theme} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Connector SVG ────────────────────────────────────────────────────────────
function Connector({ leftCount, rightCount, colH, offsetTop, theme, connId }: {
  leftCount: number; rightCount: number; colH: number; offsetTop: number
  theme: BracketTheme; connId: string
}) {
  if (!leftCount || !rightCount) return null
  const W   = CONN_W
  const lCY = (i: number) => matchCY(i, leftCount, colH)
  const rCY = (i: number) => matchCY(i, rightCount, colH)
  const filterId = `bt-glow-${connId}`
  const segs: React.ReactNode[] = []

  if (leftCount === rightCount) {
    for (let i = 0; i < leftCount; i++) segs.push(
      <g key={i}>
        <line x1={0} y1={lCY(i)} x2={W} y2={rCY(i)} stroke={theme.connColor} strokeWidth="1.4" />
        <circle cx={0} cy={lCY(i)} r={2} fill={theme.connDot} />
        <circle cx={W} cy={rCY(i)} r={2} fill={theme.connDot} />
      </g>
    )
  } else if (leftCount > rightCount) {
    for (let ri = 0; ri < rightCount; ri++) {
      const li1 = ri * 2, li2 = ri * 2 + 1
      if (li2 >= leftCount) {
        segs.push(<line key={`s${ri}`} x1={0} y1={lCY(li1)} x2={W} y2={rCY(ri)}
          stroke={theme.connColor} strokeWidth="1.4" />)
        continue
      }
      const midX = W * 0.55, midY = (lCY(li1) + lCY(li2)) / 2
      segs.push(
        <g key={ri}>
          <line x1={0}    y1={lCY(li1)} x2={midX} y2={lCY(li1)} stroke={theme.connColor} strokeWidth="1.4" />
          <line x1={0}    y1={lCY(li2)} x2={midX} y2={lCY(li2)} stroke={theme.connColor} strokeWidth="1.4" />
          <line x1={midX} y1={lCY(li1)} x2={midX} y2={lCY(li2)} stroke={theme.connColorFaint} strokeWidth="1.4" />
          <line x1={midX} y1={midY}     x2={W}    y2={rCY(ri)}   stroke={theme.connColor} strokeWidth="1.4" />
          <circle cx={midX} cy={midY}   r={2.5} fill={theme.connDot} />
          <circle cx={0}    cy={lCY(li1)} r={1.6} fill={theme.connDot} style={{opacity:.6}} />
          <circle cx={0}    cy={lCY(li2)} r={1.6} fill={theme.connDot} style={{opacity:.6}} />
        </g>
      )
    }
  } else {
    for (let li = 0; li < leftCount; li++) {
      const ri1 = li * 2, ri2 = li * 2 + 1
      if (ri2 >= rightCount) {
        segs.push(<line key={`s${li}`} x1={0} y1={lCY(li)} x2={W} y2={rCY(ri1)}
          stroke={theme.connColor} strokeWidth="1.4" />)
        continue
      }
      const midX = W * 0.45, midY = (rCY(ri1) + rCY(ri2)) / 2
      segs.push(
        <g key={li}>
          <line x1={W}    y1={rCY(ri1)} x2={midX} y2={rCY(ri1)} stroke={theme.connColor} strokeWidth="1.4" />
          <line x1={W}    y1={rCY(ri2)} x2={midX} y2={rCY(ri2)} stroke={theme.connColor} strokeWidth="1.4" />
          <line x1={midX} y1={rCY(ri1)} x2={midX} y2={rCY(ri2)} stroke={theme.connColorFaint} strokeWidth="1.4" />
          <line x1={midX} y1={midY}     x2={0}    y2={lCY(li)}  stroke={theme.connColor} strokeWidth="1.4" />
          <circle cx={midX} cy={midY}   r={2.5} fill={theme.connDot} />
          <circle cx={W}    cy={rCY(ri1)} r={1.6} fill={theme.connDot} style={{opacity:.6}} />
          <circle cx={W}    cy={rCY(ri2)} r={1.6} fill={theme.connDot} style={{opacity:.6}} />
        </g>
      )
    }
  }

  return (
    <svg width={W} height={colH} style={{ flexShrink: 0, overflow: 'visible', marginTop: offsetTop }}>
      <defs>
        <filter id={filterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.8" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>{segs}</g>
    </svg>
  )
}

// ─── Finals column ────────────────────────────────────────────────────────────
function FinalsColumn({ match, teams, onSelect, colH, theme }: {
  match: Match; teams: Team[]; onSelect: () => void; colH: number; theme: BracketTheme
}) {
  const cardTop = matchTop(0, 1, colH)
  const lblTop  = cardTop - LABEL_H - LABEL_MB - 4
  const emblTop = lblTop - 48 - 6
  const wrapH   = colH + LABEL_H + LABEL_MB

  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ position: 'relative', width: CARD_W + 16, height: wrapH }}>
        {/* Trophy emblem */}
        <div style={{ position: 'absolute', top: emblTop + LABEL_H + LABEL_MB,
          left: '50%', transform: 'translateX(-50%)',
          width: 44, height: 44, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,.14) 0%, transparent 100%)',
          border: '1px solid rgba(245,158,11,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          🏆
        </div>

        {/* Finals label */}
        <div style={{ position: 'absolute', top: lblTop + LABEL_H + LABEL_MB + 4,
          left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ padding: '2px 10px', height: LABEL_H, display: 'flex', alignItems: 'center',
            background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
            borderRadius: 20, fontSize: 8, fontWeight: 700, letterSpacing: '0.13em',
            color: 'rgba(245,158,11,.8)', textTransform: 'uppercase' }}>
            Finals
          </div>
        </div>

        {/* Card */}
        <div style={{ position: 'absolute', top: cardTop + LABEL_H + LABEL_MB, left: 8 }}>
          <MatchCard match={match} teams={teams} onClick={onSelect} theme={theme} />
        </div>
      </div>
    </div>
  )
}

// ─── Main bracket (guard layer) ───────────────────────────────────────────────
export function TournamentBracket({ tournament }: Props) {
  if (!tournament)         return <EmptyState msg="No active tournament." />
  if (!tournament.bracket) return <EmptyState msg="Bracket has not been generated yet." />
  const rounds = tournament.bracket.rounds
  if (!rounds.length)      return <EmptyState msg="Bracket has no rounds." />
  return <BracketView tournament={tournament} />
}

// ─── Inner bracket view — all hooks live here ─────────────────────────────────
function BracketView({ tournament }: { tournament: Tournament }) {
  const [selected, setSelected]   = useState<Match | null>(null)
  const [exporting, setExporting] = useState(false)
  const bracketRef                = useRef<HTMLDivElement>(null)

  async function handleExport() {
    if (!bracketRef.current || exporting) return
    setExporting(true)
    try {
      // Temporarily force natural size so the capture is full-res
      const el = bracketRef.current
      const prevTransform = el.style.transform
      const prevWidth     = el.style.width
      el.style.transform  = 'none'
      el.style.width      = 'max-content'

      const dataUrl = await toJpeg(el, {
        quality: 0.96,
        pixelRatio: 2,
        backgroundColor: '#09080d',
        cacheBust: true,
      })

      el.style.transform = prevTransform
      el.style.width     = prevWidth

      const a      = document.createElement('a')
      a.href       = dataUrl
      a.download   = `${tournament.name.replace(/\s+/g, '-').toLowerCase()}-bracket.jpg`
      a.click()
    } catch (err) {
      console.error('Bracket export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // Read display settings saved by admin (public viewers never see controls)
  const display     = tournament.bracketDisplay
  const themeId: ThemeId = display?.theme ?? 'esports'
  const scaleMode   = display?.scaleMode ?? 'auto'
  const manualScale = Math.max(0.3, Math.min(2, display?.manualScale ?? 1))

  const theme = getTheme(themeId)

  const { bracket, matches, teams } = tournament
  const rounds = bracket!.rounds

  const getMs = (ids: string[]) =>
    ids.map(id => matches.find(m => m.id === id))
      .filter((m): m is Match => !!m)

  const finalsRound   = rounds[rounds.length - 1]
  const bracketRounds = rounds.slice(0, rounds.length - 1)
  const finalsMatch   = getMs(finalsRound.matchIds)[0]

  const leftCols = bracketRounds.map(r => {
    const ms = getMs(r.matchIds)
    return { name: r.name, matches: ms.slice(0, Math.ceil(ms.length / 2)) }
  })
  const rightColsOuter = bracketRounds.map(r => {
    const ms = getMs(r.matchIds)
    return { name: r.name, matches: ms.slice(Math.ceil(ms.length / 2)) }
  })
  const rightCols = [...rightColsOuter].reverse()

  const maxMatches  = Math.max(...leftCols.map(c => c.matches.length), ...rightCols.map(c => c.matches.length), 1)
  const colH        = colHeight(maxMatches)
  const connOffTop  = LABEL_H + LABEL_MB

  // Natural width: each left col + connector, finals col, each right col + connector
  const leftW   = leftCols.length * (CARD_W + CONN_W)
  const rightW  = rightCols.length * (CONN_W + CARD_W)
  const finalsW = CARD_W + 16
  const naturalW = leftW + finalsW + rightW + 24 // 12px container padding each side

  const naturalH = colH + LABEL_H + LABEL_MB + 16 // 16px top/bottom padding in bracket

  // Always call the hook (Rules of Hooks) — only used when scaleMode === 'auto'
  const { containerRef, scale: autoScale } = useAutoScale(naturalW)

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── Download button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: exporting ? 'not-allowed' : 'pointer',
            opacity: exporting ? 0.6 : 1,
            transition: 'all 0.15s',
            background: 'linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(0,102,255,0.07) 100%)',
            border: '1px solid rgba(0,191,255,0.3)',
            color: '#00BFFF',
            boxShadow: '0 0 18px rgba(0,191,255,0.08)',
          }}
          onMouseEnter={e => {
            if (!exporting) {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,191,255,0.2) 0%, rgba(0,102,255,0.12) 100%)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(0,191,255,0.18)'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,191,255,0.5)'
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(0,102,255,0.07) 100%)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 18px rgba(0,191,255,0.08)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,191,255,0.3)'
          }}
        >
          {exporting ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Exporting…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Bracket
            </>
          )}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Bracket inner content (shared between auto/manual rendering) ── */}
      {(() => {
        const bracketContent = (
          <div
            ref={bracketRef}
            style={{ borderRadius: 14, padding: '14px 12px',
              background: theme.containerBg,
              border: `1px solid ${theme.containerBorder}`,
              transition: 'background .3s, border-color .3s',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>

              {/* LEFT SIDE */}
              {leftCols.map((col, ci) => {
                const nextCount = ci < leftCols.length - 1 ? leftCols[ci + 1].matches.length : 1
                return (
                  <div key={`l${ci}`} style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <RoundColumn name={col.name} matches={col.matches} teams={teams}
                      onSelect={setSelected} rtl={false} colH={colH}
                      theme={theme} showLabel={false} />
                    <Connector leftCount={col.matches.length} rightCount={nextCount}
                      colH={colH} offsetTop={connOffTop} theme={theme} connId={`l${ci}`} />
                  </div>
                )
              })}

              {/* FINALS */}
              {finalsMatch
                ? <FinalsColumn match={finalsMatch} teams={teams}
                    onSelect={() => setSelected(finalsMatch)} colH={colH} theme={theme} />
                : <div style={{ width: CARD_W + 16, height: colH + LABEL_H + LABEL_MB,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,.12)', fontSize: 11 }}>Finals TBD</div>
              }

              {/* RIGHT SIDE */}
              {rightCols.map((col, ci) => {
                const leftCount = ci === 0 ? 1 : rightCols[ci - 1].matches.length
                return (
                  <div key={`r${ci}`} style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Connector leftCount={leftCount} rightCount={col.matches.length}
                      colH={colH} offsetTop={connOffTop} theme={theme} connId={`r${ci}`} />
                    <RoundColumn name={col.name} matches={col.matches} teams={teams}
                      onSelect={setSelected} rtl={true} colH={colH}
                      theme={theme} showLabel={false} />
                  </div>
                )
              })}

            </div>
          </div>
        )

        if (scaleMode === 'auto') {
          // ── Auto mode: shrink-to-fit via CSS transform, no scrollbar ──
          return (
            <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
              <div style={{
                width: naturalW,
                transformOrigin: 'top center',
                transform: `scale(${autoScale})`,
                marginBottom: `${(autoScale - 1) * naturalH}px`,
                marginLeft: `max(0px, calc(50% - ${naturalW / 2}px))`,
              }}>
                {bracketContent}
              </div>
            </div>
          )
        } else {
          // ── Manual mode: fixed scale set by admin, horizontal scroll if wider than viewport ──
          return (
            <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
              <div style={{
                width: naturalW * manualScale,
                height: naturalH * manualScale,
                position: 'relative',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  transformOrigin: 'top left',
                  transform: `scale(${manualScale})`,
                  width: naturalW,
                }}>
                  {bracketContent}
                </div>
              </div>
            </div>
          )
        }
      })()}

      {/* Match detail modal */}
      {selected && (
        <MatchDetailModal match={selected} teams={tournament.teams} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 14, opacity: .1 }}>⚔️</div>
      <p style={{ color: 'rgba(255,255,255,.28)', margin: 0, fontSize: 14 }}>{msg}</p>
    </div>
  )
}

// ─── Keyframes ────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes bt-pbar { 0%,100%{opacity:.35} 50%{opacity:1} }
`
