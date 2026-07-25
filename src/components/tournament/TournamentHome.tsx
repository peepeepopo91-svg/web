import { useState, useEffect } from 'react'
import type { Tournament } from '../../data/tournament'
import { STATUS_LABEL, STATUS_COLOR } from '../../data/tournament'

interface Props {
  active: Tournament | null
  onRegisterClick?: () => void
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown({ target, label }: { target: number; label: string }) {
  const [diff, setDiff] = useState(target - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])

  if (diff <= 0) return null

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 text-center">{label}</p>
      <div className="flex gap-2 justify-center">
        {([['D', d], ['H', h], ['M', m], ['S', s]] as [string, number][]).map(([unit, val]) => (
          <div key={unit} className="flex flex-col items-center">
            <div
              className="relative w-14 h-14 flex items-center justify-center rounded-xl font-black text-2xl tabular-nums font-['Space_Grotesk'] text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(0,102,255,0.06) 100%)',
                border: '1px solid rgba(0,191,255,0.25)',
                boxShadow: '0 0 18px rgba(0,191,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {String(val).padStart(2, '0')}
            </div>
            <span className="text-[9px] text-white/25 uppercase tracking-widest mt-1.5">{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Prize medal colours ──────────────────────────────────────────────────────

const PLACEMENT_STYLES: Record<number, { glow: string; border: string; bg: string; text: string; label: string }> = {
  1: { glow: 'rgba(255,196,0,0.15)',  border: 'rgba(255,196,0,0.35)',  bg: 'rgba(255,196,0,0.07)',  text: '#FFD700', label: '1ST' },
  2: { glow: 'rgba(192,192,192,0.12)', border: 'rgba(192,192,192,0.3)', bg: 'rgba(192,192,192,0.05)', text: '#C0C0C0', label: '2ND' },
  3: { glow: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.3)',  bg: 'rgba(205,127,50,0.06)',  text: '#CD7F32', label: '3RD' },
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TournamentHome({ active, onRegisterClick: _onRegisterClick }: Props) {
  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(0,191,255,0.08), rgba(0,102,255,0.04))',
            border: '1px solid rgba(0,191,255,0.15)',
          }}
        >
          🏆
        </div>
        <h2 className="font-['Space_Grotesk'] font-bold text-2xl text-white mb-3">No Active Tournament</h2>
        <p className="text-white/30 max-w-md text-sm leading-relaxed">
          There are currently no active tournaments. Check the Announcements tab or come back soon.
        </p>
      </div>
    )
  }

  const approvedTeams = active.teams.filter(t => t.status === 'approved')
  const totalPlayers  = approvedTeams.reduce((n, t) => n + t.players.length, 0)
  const canRegister   = active.status === 'registration_open' || active.status === 'live'
  const deadline      = active.registrationDeadline
  const start         = active.startDate

  const statCards = [
    { label: 'Teams',      value: approvedTeams.length,  icon: '👥', accent: '#00BFFF' },
    { label: 'Players',    value: totalPlayers,          icon: '⚔️', accent: '#0099FF' },
    { label: 'Gamemode',   value: active.gamemode || '—', icon: '🎮', accent: '#00BFFF' },
    {
      label: 'Team Size',
      value: active.maxTeamSize === active.minTeamSize
        ? `${active.maxTeamSize}v${active.maxTeamSize}`
        : `${active.minTeamSize}–${active.maxTeamSize}`,
      icon: '🧩',
      accent: '#0099FF',
    },
  ]

  return (
    <div className="space-y-5">

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #080D18 0%, #0D1525 50%, #080D18 100%)',
          border: '1px solid rgba(0,191,255,0.15)',
          boxShadow: '0 0 60px rgba(0,191,255,0.06), 0 32px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Banner image layer */}
        {active.banner && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${active.banner})`, opacity: 0.08 }}
          />
        )}

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,191,255,0.1) 0%, transparent 70%)' }}
        />

        {/* Top shimmer line */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)' }}
        />

        <div className="relative px-8 md:px-14 py-12 text-center space-y-6">

          {/* Status pill */}
          <div className="flex justify-center">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${STATUS_COLOR[active.status]}`}>
              {active.status === 'live' && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
                </span>
              )}
              {STATUS_LABEL[active.status]}
            </div>
          </div>

          {/* Tournament name */}
          <div className="space-y-3">
            <h2
              className="font-['Space_Grotesk'] font-black text-3xl md:text-5xl text-white leading-tight tracking-tight"
            >
              {active.name}
            </h2>
            {active.description && (
              <p className="text-white/35 max-w-lg mx-auto text-sm leading-relaxed">
                {active.description}
              </p>
            )}
          </div>

          {/* Countdown(s) */}
          {deadline && canRegister && (
            <Countdown target={deadline} label="Registration closes in" />
          )}
          {start && (active.status === 'upcoming' || canRegister || active.status === 'registration_closed') && (
            <Countdown target={start} label="Tournament starts in" />
          )}

          {/* Server IP copy button */}
          {active.serverIp && (
            <div className="flex justify-center pt-1">
              <button
                onClick={() => navigator.clipboard.writeText(active.serverIp)}
                className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-mono font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,191,255,0.08)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,191,255,0.3)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {active.serverIp}
              </button>
            </div>
          )}
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-20 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(8,13,24,0.6), transparent)' }}
        />
      </div>

      {/* ── Stat row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(c => (
          <div
            key={c.label}
            className="relative rounded-xl p-5 text-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(0,191,255,0.05) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(0,191,255,0.12)',
            }}
          >
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)' }}
            />
            <div className="text-xl mb-2">{c.icon}</div>
            <div
              className="font-['Space_Grotesk'] font-black text-xl"
              style={{ color: c.accent }}
            >
              {c.value}
            </div>
            <div className="text-white/30 text-[10px] uppercase tracking-widest mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Details + Prizes ──────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Tournament details */}
        <div
          className="rounded-xl p-6 space-y-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <h3
            className="text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ background: 'linear-gradient(90deg,#00BFFF,#0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            Tournament Details
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Status',       value: STATUS_LABEL[active.status] },
              { label: 'Gamemode',     value: active.gamemode  || '—' },
              { label: 'Server IP',    value: active.serverIp  || '—' },
              {
                label: 'Team Size',
                value: active.maxTeamSize === active.minTeamSize
                  ? `${active.maxTeamSize} players`
                  : `${active.minTeamSize}–${active.maxTeamSize} players`,
              },
              { label: 'Prize Pool',   value: active.prizePool || '—' },
              ...(deadline ? [{ label: 'Reg. Deadline', value: new Date(deadline).toLocaleString() }] : []),
              ...(start    ? [{ label: 'Start Date',    value: new Date(start).toLocaleString()    }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-white/30 text-xs shrink-0">{label}</span>
                <div className="flex-1 border-b border-dashed border-white/[0.06]" />
                <span className="text-white text-xs font-semibold shrink-0">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prize podium */}
        <div
          className="rounded-xl p-6 space-y-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <h3
            className="text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ background: 'linear-gradient(90deg,#00BFFF,#0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            Top Prizes
          </h3>

          {active.prizes.length === 0 ? (
            <p className="text-white/20 text-xs">Prizes will be announced soon.</p>
          ) : (
            <div className="space-y-2.5">
              {active.prizes.slice(0, 3).map(prize => {
                const s = PLACEMENT_STYLES[prize.placement] ?? PLACEMENT_STYLES[3]
                const parts = prize.label.split(' ')
                const emoji = parts[0]
                const name  = parts.slice(1).join(' ')
                return (
                  <div
                    key={prize.placement}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      boxShadow: `0 0 20px ${s.glow}`,
                    }}
                  >
                    <span
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black"
                      style={{ background: `${s.text}18`, color: s.text, border: `1px solid ${s.border}` }}
                    >
                      {s.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">{emoji} {name}</p>
                      <p className="text-white/35 text-[10px] mt-0.5 truncate">
                        {prize.rewards.map(r => `${r.amount} ${r.label}`).join(' + ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Competing teams ───────────────────────────────────────────────── */}
      {approvedTeams.length > 0 && (
        <div
          className="rounded-xl p-6 space-y-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3
              className="text-[10px] uppercase tracking-[0.2em] font-bold"
              style={{ background: 'linear-gradient(90deg,#00BFFF,#0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              Competing Teams
            </h3>
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.2)', color: '#00BFFF' }}
            >
              {approvedTeams.length}
            </span>
          </div>

          {/* Team cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {approvedTeams.map((team, idx) => (
              <div
                key={team.id}
                className="group rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,191,255,0.04) 0%, rgba(0,0,0,0) 100%)',
                  border: '1px solid rgba(0,191,255,0.1)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,191,255,0.28)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 32px rgba(0,191,255,0.08)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,191,255,0.1)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'
                }}
              >
                {/* Top shimmer */}
                <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.35), transparent)' }} />

                {/* Team header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,191,255,0.2), rgba(0,102,255,0.12))',
                      border: '1px solid rgba(0,191,255,0.3)',
                      color: '#00BFFF',
                      textShadow: '0 0 12px rgba(0,191,255,0.6)',
                    }}
                  >
                    {team.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{team.name}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">
                      {team.players.length} player{team.players.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {/* Rank badge */}
                  <span
                    className="text-[9px] font-black tabular-nums shrink-0 px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.15)', color: 'rgba(0,191,255,0.5)' }}
                  >
                    #{idx + 1}
                  </span>
                </div>

                {/* Divider */}
                <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

                {/* Player list */}
                <div className="px-4 py-3 space-y-1.5">
                  {team.players.length === 0 ? (
                    <p className="text-white/20 text-[11px] italic">No players listed</p>
                  ) : (
                    team.players.map((player, pi) => (
                      <div key={pi} className="flex items-center gap-2">
                        <img
                          src={`https://mc-heads.net/avatar/${encodeURIComponent(typeof player === 'string' ? player : (player as { name?: string }).name ?? '')}/16`}
                          alt=""
                          width={16}
                          height={16}
                          className="w-4 h-4 rounded shrink-0"
                          style={{ imageRendering: 'pixelated' }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                        <span className="text-white/70 text-[11px] font-medium truncate">
                          {typeof player === 'string' ? player : (player as { name?: string }).name ?? '—'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
