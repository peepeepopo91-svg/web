import { useState, useEffect } from 'react'
import type { Tournament, Team, Match, Prize, Reward, TournamentsFile, TournamentStatus } from '../../data/tournament'
import { STATUS_LABEL, MATCH_STATUS_LABEL, DEFAULT_PRIZES, DEFAULT_RULES } from '../../data/tournament'
import {
  getTournamentData, createTournament, updateTournament, deleteTournament,
  setActiveTournament, archiveTournament, duplicateTournament,
  updateTeamStatus, removeTeam, addTeamManually, bulkUpdateTeamStatus,
  updateMatch,
  updatePrizes, updateRules,
  addAnnouncement, deleteAnnouncement,
} from '../../server/tournamentServer'
import { AdminPaginator } from './AdminPaginator'
import { AdminBracketEditor } from './AdminBracketEditor'

// ─── Tab config ───────────────────────────────────────────────────────────────

type TTab = 'overview' | 'manage' | 'registration' | 'teams' | 'bracket' | 'matches' | 'prizes' | 'rules' | 'announcements'

const TTABS: { id: TTab; label: string; icon: string; badge?: (d: TournamentsFile | null, active: Tournament | null) => number | null }[] = [
  { id: 'overview',      label: 'Command Center', icon: '⚡' },
  { id: 'manage',        label: 'Tournaments',    icon: '🏆' },
  { id: 'registration',  label: 'Registration',   icon: '📋', badge: (_, a) => a ? a.teams.filter(t => t.status === 'pending').length || null : null },
  { id: 'teams',         label: 'Teams',          icon: '👥', badge: (_, a) => a ? a.teams.length || null : null },
  { id: 'bracket',       label: 'Bracket',        icon: '⚔️' },
  { id: 'matches',       label: 'Matches',        icon: '🎮', badge: (_, a) => a ? a.matches.filter(m => m.status === 'live').length || null : null },
  { id: 'prizes',        label: 'Prizes',         icon: '🎁' },
  { id: 'rules',         label: 'Rules',          icon: '📜' },
  { id: 'announcements', label: 'Announcements',  icon: '📣' },
]

interface Props { admin: string }

// ─── Main component ───────────────────────────────────────────────────────────

export function TournamentManager({ admin }: Props) {
  const [tab, setTab]      = useState<TTab>('overview')
  const [data, setData]    = useState<TournamentsFile | null>(null)
  const [loading, setLoad] = useState(true)
  const [toast, setToast]  = useState<{ text: string; ok: boolean } | null>(null)

  async function load() {
    try { setData(await getTournamentData()) } catch {}
    finally { setLoad(false) }
  }

  useEffect(() => { load() }, [])

  function flash(text: string, ok = true) {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const active = data?.activeTournamentId
    ? (data.tournaments.find(t => t.id === data.activeTournamentId) ?? null)
    : null

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Loading Tournament System…</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold backdrop-blur-sm transition-all animate-in slide-in-from-top-2 ${
          toast.ok
            ? 'bg-green-500/15 border-green-500/25 text-green-300'
            : 'bg-red-500/15 border-red-500/25 text-red-300'
        }`}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          {toast.text}
        </div>
      )}

      {/* Header bar */}
      <TournamentHeader active={active} data={data} flash={flash} reload={load} />

      {/* Tab navigation */}
      <div className="flex gap-1 flex-wrap mt-6 mb-5 bg-[#0a0e18] border border-white/5 rounded-2xl p-1.5">
        {TTABS.map(t => {
          const badge = t.badge?.(data, active)
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex-1 justify-center ${
                tab === t.id
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/25 shadow-lg shadow-amber-500/5'
                  : 'text-gray-600 hover:text-gray-300 hover:bg-white/4 border border-transparent'
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {badge != null && badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center min-w-[18px] px-1">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[500px]">
        {tab === 'overview'      && <TOverview data={data} active={active} setTab={setTab} flash={flash} reload={load} />}
        {tab === 'manage'        && <TTournaments data={data} active={active} flash={flash} reload={load} />}
        {tab === 'registration'  && <TRegistration active={active} flash={flash} reload={load} />}
        {tab === 'teams'         && <TTeams active={active} flash={flash} reload={load} />}
        {tab === 'bracket'       && <AdminBracketEditor active={active} flash={flash} reload={load} />}
        {tab === 'matches'       && <TMatches active={active} flash={flash} reload={load} />}
        {tab === 'prizes'        && <TPrizes active={active} flash={flash} reload={load} />}
        {tab === 'rules'         && <TRules active={active} flash={flash} reload={load} />}
        {tab === 'announcements' && <TAnnouncements active={active} admin={admin} flash={flash} reload={load} />}
      </div>
    </div>
  )
}

// ─── Tournament Header ────────────────────────────────────────────────────────

function TournamentHeader({ active, data, flash, reload }: { active: Tournament | null; data: TournamentsFile | null; flash: F; reload: R }) {
  const [toggling, setToggling] = useState(false)

  async function quickToggleReg() {
    if (!active) return
    setToggling(true)
    try {
      const newStatus = active.status === 'registration_open' ? 'registration_closed' : 'registration_open'
      await updateTournament({ data: { ...active, status: newStatus } })
      flash(`Registration ${newStatus === 'registration_open' ? 'opened' : 'closed'}`, true)
      reload()
    } catch { flash('Failed to toggle registration', false) }
    finally { setToggling(false) }
  }

  const regOpen = active?.status === 'registration_open'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-[#0d1117] via-[#0d1117] to-[#0f0c03]">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/3 via-transparent to-amber-600/3 pointer-events-none" />
      <div className="absolute top-0 left-0 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative px-6 py-5 flex items-center gap-5">
        {/* Trophy icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
          <span className="text-2xl">🏆</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-amber-500/70 font-bold">Tournament Control Center</p>
            {active && (
              <StatusPill status={active.status} />
            )}
          </div>
          <h2 className="font-['Space_Grotesk'] font-black text-xl text-white truncate">
            {active?.name ?? 'No Active Tournament'}
          </h2>
          {active && (
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              {active.gamemode && <span>⚔️ {active.gamemode}</span>}
              {active.serverIp && <span>🖥 {active.serverIp}</span>}
              {active.teams.length > 0 && <span>👥 {active.teams.filter(t => t.status === 'approved').length} / {active.teams.length} teams</span>}
              {data && <span className="text-gray-700">·</span>}
              {data && <span>{data.tournaments.length} total tournament(s)</span>}
            </div>
          )}
        </div>

        {/* Quick registration toggle */}
        {active && (active.status === 'registration_open' || active.status === 'registration_closed' || active.status === 'upcoming' || active.status === 'live') && (
          <button
            onClick={quickToggleReg}
            disabled={toggling}
            className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-xl border font-bold text-sm transition-all disabled:opacity-60 ${
              regOpen
                ? 'bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/20'
                : 'bg-green-500/10 border-green-500/25 text-green-300 hover:bg-green-500/20'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${regOpen ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
            {toggling ? 'Updating…' : regOpen ? 'Close Registration' : 'Open Registration'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Overview / Command Center ────────────────────────────────────────────────

type F = (text: string, ok?: boolean) => void
type R = () => void | Promise<void>

function TOverview({ data, active, setTab, flash, reload }: { data: TournamentsFile | null; active: Tournament | null; setTab: (t: TTab) => void; flash: F; reload: R }) {
  const all           = data?.tournaments ?? []
  const approved      = active?.teams.filter(t => t.status === 'approved') ?? []
  const pending       = active?.teams.filter(t => t.status === 'pending') ?? []
  const totalPlayers  = approved.reduce((n, t) => n + t.players.length, 0)
  const liveMatches   = active?.matches.filter(m => m.status === 'live') ?? []
  const completedM    = active?.matches.filter(m => m.status === 'completed').length ?? 0
  const totalM        = active?.matches.filter(m => m.status !== 'bye').length ?? 0
  const progress      = totalM > 0 ? Math.round((completedM / totalM) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Status workflow */}
      {active && <StatusWorkflow tournament={active} flash={flash} reload={reload} />}

      {!active && (
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0a0e18] p-10 text-center">
          <div className="text-6xl mb-4 opacity-20">🏆</div>
          <p className="text-white font-bold text-lg mb-2">No Active Tournament</p>
          <p className="text-gray-500 text-sm mb-5">Create a tournament and set it as active to get started.</p>
          <button onClick={() => setTab('manage')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20">
            Create Tournament →
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tournaments', value: all.length, icon: '🏆', sub: `${all.filter(t => t.status === 'completed' || t.status === 'archived').length} completed`, color: 'amber' },
          { label: 'Approved Teams',    value: approved.length, icon: '✅', sub: `${totalPlayers} players total`, color: 'green' },
          { label: 'Pending Review',    value: pending.length, icon: '⏳', sub: pending.length > 0 ? 'Needs attention' : 'All clear', color: pending.length > 0 ? 'yellow' : 'gray', onClick: () => pending.length > 0 && setTab('registration') },
          { label: 'Live Matches',      value: liveMatches.length, icon: '🔴', sub: `${completedM}/${totalM} completed`, color: liveMatches.length > 0 ? 'red' : 'gray' },
        ].map(c => (
          <div
            key={c.label}
            onClick={c.onClick}
            className={`relative overflow-hidden bg-[#0a0e18] border rounded-2xl p-5 transition-all ${c.onClick ? 'cursor-pointer hover:scale-[1.02]' : ''} ${
              c.color === 'amber' ? 'border-amber-500/15' :
              c.color === 'green' ? 'border-green-500/15' :
              c.color === 'yellow' ? 'border-yellow-500/25 shadow-lg shadow-yellow-500/5' :
              c.color === 'red' ? 'border-red-500/25 shadow-lg shadow-red-500/5' :
              'border-white/5'
            }`}
          >
            <div className="text-2xl mb-3">{c.icon}</div>
            <div className="font-['Space_Grotesk'] font-black text-3xl text-white mb-0.5">{c.value}</div>
            <div className="text-gray-500 text-xs font-semibold">{c.label}</div>
            <div className="text-gray-700 text-[10px] mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Match progress */}
      {active && totalM > 0 && (
        <div className="bg-[#0a0e18] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white font-bold text-sm">Tournament Progress</p>
            <p className="text-amber-400 font-black text-lg">{progress}%</p>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Completed: {completedM}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />Live: {liveMatches.length}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-600" />Remaining: {totalM - completedM - liveMatches.length}</span>
          </div>
        </div>
      )}

      {/* Live matches */}
      {liveMatches.length > 0 && active && (
        <div className="bg-[#0a0e18] border border-red-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Live Right Now</p>
          </div>
          <div className="grid gap-2">
            {liveMatches.slice(0, 4).map(m => {
              const t1 = active.teams.find(t => t.id === m.team1Id)
              const t2 = active.teams.find(t => t.id === m.team2Id)
              return (
                <div key={m.id} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3">
                  <span className="text-xs text-gray-500 font-bold w-6">M{m.matchNumber}</span>
                  <span className="text-white text-sm font-semibold flex-1 truncate">{t1?.name ?? 'TBD'}</span>
                  <span className="text-amber-400 font-black text-sm">{m.score1} — {m.score2}</span>
                  <span className="text-white text-sm font-semibold flex-1 truncate text-right">{t2?.name ?? 'TBD'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending registrations quick action */}
      {pending.length > 0 && active && (
        <div className="bg-[#0a0e18] border border-yellow-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">{pending.length} Team(s) Awaiting Review</p>
            </div>
            <button onClick={() => setTab('registration')} className="text-xs text-amber-400 hover:text-amber-300 font-semibold">
              Review All →
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pending.slice(0, 8).map(t => (
              <span key={t.id} className="text-white text-xs bg-white/5 border border-white/8 px-3 py-1.5 rounded-lg">{t.name}</span>
            ))}
            {pending.length > 8 && <span className="text-gray-500 text-xs px-3 py-1.5">+{pending.length - 8} more</span>}
          </div>
        </div>
      )}

      {/* Recent announcements */}
      {active && active.announcements.length > 0 && (
        <div className="bg-[#0a0e18] border border-white/5 rounded-2xl p-5 space-y-3">
          <p className="text-white font-bold text-sm">Recent Announcements</p>
          <div className="space-y-2">
            {active.announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/5">
                <span>{{ info: 'ℹ️', warning: '⚠️', success: '✅' }[ann.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{ann.title}</p>
                  <p className="text-gray-600 text-[10px]">{timeAgo(ann.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Status Workflow Stepper ──────────────────────────────────────────────────

function StatusWorkflow({ tournament, flash, reload }: { tournament: Tournament; flash: F; reload: R }) {
  const [loading, setLoading] = useState(false)
  const steps: { status: TournamentStatus; label: string; icon: string }[] = [
    { status: 'upcoming',            label: 'Upcoming',      icon: '📅' },
    { status: 'registration_open',   label: 'Registration',  icon: '📋' },
    { status: 'registration_closed', label: 'Reg. Closed',   icon: '🔒' },
    { status: 'live',                label: 'Live',          icon: '🔴' },
    { status: 'completed',           label: 'Completed',     icon: '🏁' },
  ]
  const ORDER: TournamentStatus[] = ['upcoming','registration_open','registration_closed','live','completed','archived']
  const currentIdx = ORDER.indexOf(tournament.status)

  async function goTo(status: TournamentStatus) {
    setLoading(true)
    try {
      await updateTournament({ data: { ...tournament, status } })
      flash(`Status → ${STATUS_LABEL[status]}`)
      reload()
    } catch { flash('Update failed', false) }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-[#0a0e18] border border-white/5 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white font-bold text-sm">Tournament Status Flow</p>
        <StatusPill status={tournament.status} />
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const stepIdx   = ORDER.indexOf(step.status)
          const done      = stepIdx < currentIdx
          const active    = step.status === tournament.status
          const reachable = !loading

          return (
            <div key={step.status} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => reachable && goTo(step.status)}
                disabled={loading || active}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  active
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/10'
                    : done
                    ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/15'
                    : 'bg-white/3 border-white/8 text-gray-500 hover:text-white hover:border-white/20 disabled:opacity-40'
                }`}
              >
                <span>{step.icon}</span>
                <span className="hidden sm:inline">{step.label}</span>
                {done && <span className="text-green-400">✓</span>}
              </button>
              {i < steps.length - 1 && (
                <span className="text-gray-700 text-xs px-0.5">→</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Registration Control Center ─────────────────────────────────────────────

function TRegistration({ active, flash, reload }: { active: Tournament | null; flash: F; reload: R }) {
  const [toggling, setToggling] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [savingDL, setSavingDL] = useState(false)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!active) return <NoActiveTournament />

  const regOpen    = active.status === 'registration_open'
  const pending    = active.teams.filter(t => t.status === 'pending')
  const approved   = active.teams.filter(t => t.status === 'approved')
  const rejected   = active.teams.filter(t => t.status === 'rejected')
  const totalReg   = active.teams.length
  const deadline_  = active.registrationDeadline
  const deadlineMs = deadline_ ? deadline_ - now : null
  const isExpired  = deadlineMs != null && deadlineMs <= 0

  async function toggleRegistration() {
    setToggling(true)
    try {
      const newStatus = regOpen ? 'registration_closed' : 'registration_open'
      await updateTournament({ data: { ...active, status: newStatus } as any })
      flash(`Registration ${newStatus === 'registration_open' ? 'opened ✓' : 'closed'}`, true)
      reload()
    } catch { flash('Failed to update registration', false) }
    finally { setToggling(false) }
  }

  async function saveDeadline() {
    setSavingDL(true)
    try {
      const dl = deadline ? new Date(deadline).getTime() : null
      await updateTournament({ data: { ...active, registrationDeadline: dl } as any })
      flash('Deadline saved')
      reload()
    } catch { flash('Error', false) }
    finally { setSavingDL(false) }
  }

  async function approveAll() {
    if (pending.length === 0) return
    if (!confirm(`Approve all ${pending.length} pending team(s)?`)) return
    await bulkUpdateTeamStatus({ data: { tournamentId: active!.id, teamIds: pending.map(t => t.id), status: 'approved', notes: '' } })
    flash(`${pending.length} teams approved`)
    reload()
  }

  async function rejectAll() {
    if (pending.length === 0) return
    if (!confirm(`Reject all ${pending.length} pending team(s)?`)) return
    await bulkUpdateTeamStatus({ data: { tournamentId: active!.id, teamIds: pending.map(t => t.id), status: 'rejected', notes: '' } })
    flash(`${pending.length} teams rejected`)
    reload()
  }

  function fmtCountdown(ms: number): string {
    if (ms <= 0) return 'Expired'
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ${h % 24}h`
    if (h > 0) return `${h}h ${m % 60}m`
    if (m > 0) return `${m}m ${s % 60}s`
    return `${s}s`
  }

  function toDatetimeLocal(ts: number | null | undefined) {
    if (!ts) return ''
    return new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  return (
    <div className="space-y-6">
      {/* Main toggle */}
      <div className={`relative overflow-hidden rounded-2xl border p-8 text-center transition-all ${
        regOpen
          ? 'border-green-500/30 bg-gradient-to-b from-green-500/8 to-transparent'
          : 'border-white/8 bg-[#0a0e18]'
      }`}>
        {regOpen && (
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 via-transparent to-green-500/3 pointer-events-none" />
        )}
        <div className="relative space-y-4">
          <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mx-auto text-3xl transition-all ${
            regOpen
              ? 'border-green-400/50 bg-green-500/10 shadow-lg shadow-green-500/20'
              : 'border-white/10 bg-white/3'
          }`}>
            {regOpen ? '📋' : '🔒'}
          </div>
          <div>
            <p className={`font-['Space_Grotesk'] font-black text-2xl ${regOpen ? 'text-green-300' : 'text-gray-400'}`}>
              Registration is {regOpen ? 'OPEN' : 'CLOSED'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {regOpen
                ? 'Teams can register on the public tournament page.'
                : 'Teams cannot register right now.'
              }
            </p>
          </div>
          <button
            onClick={toggleRegistration}
            disabled={toggling}
            className={`inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-60 shadow-xl ${
              regOpen
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-red-500/20'
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 shadow-green-500/20'
            }`}
          >
            {toggling ? (
              <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
            ) : regOpen ? (
              <><span>🔒</span> Close Registration</>
            ) : (
              <><span>📋</span> Open Registration</>
            )}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Registered', value: totalReg,        color: 'text-white',        bg: 'bg-white/3 border-white/8' },
          { label: 'Pending Review',   value: pending.length,  color: 'text-yellow-300',   bg: pending.length > 0 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/3 border-white/8' },
          { label: 'Approved',         value: approved.length, color: 'text-green-300',    bg: 'bg-green-500/5 border-green-500/15' },
          { label: 'Rejected',         value: rejected.length, color: 'text-red-300',      bg: rejected.length > 0 ? 'bg-red-500/5 border-red-500/15' : 'bg-white/3 border-white/8' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4 text-center`}>
            <div className={`font-black text-2xl ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Deadline */}
      <div className="bg-[#0a0e18] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-white font-bold text-sm">Registration Deadline</p>
            <p className="text-gray-500 text-xs mt-0.5">Set when registration automatically closes</p>
          </div>
          {deadline_ && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${
              isExpired
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              ⏱ {isExpired ? 'Expired' : fmtCountdown(deadlineMs!)}
            </div>
          )}
        </div>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-40">
            <input
              type="datetime-local"
              defaultValue={toDatetimeLocal(deadline_)}
              onChange={e => setDeadline(e.target.value)}
              className="w-full bg-[#070b12] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40"
            />
          </div>
          <button onClick={saveDeadline} disabled={savingDL} className="px-5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all disabled:opacity-50">
            {savingDL ? 'Saving…' : 'Set Deadline'}
          </button>
          {deadline_ && (
            <button onClick={async () => { await updateTournament({ data: { ...active, registrationDeadline: null } }); flash('Deadline cleared'); reload() }} className="px-5 py-2.5 rounded-xl border border-white/8 text-gray-500 text-xs font-bold hover:text-red-400 transition-all">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {pending.length > 0 && (
        <div className="bg-[#0a0e18] border border-yellow-500/15 rounded-2xl p-5 space-y-4">
          <p className="text-yellow-300 font-bold text-sm">⚡ Bulk Actions — {pending.length} pending team(s)</p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={approveAll} className="px-5 py-2.5 rounded-xl bg-green-500/15 border border-green-500/25 text-green-300 text-xs font-bold hover:bg-green-500/25 transition-all">
              ✓ Approve All {pending.length}
            </button>
            <button onClick={rejectAll} className="px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/15 transition-all">
              ✕ Reject All {pending.length}
            </button>
          </div>
          <div className="grid gap-2">
            {pending.map(team => (
              <PendingTeamRow key={team.id} team={team} tournamentId={active.id} requireCaptain={active.requireCaptain !== false} flash={flash} reload={reload} />
            ))}
          </div>
        </div>
      )}

      {/* Manual team add */}
      <div className="bg-[#0a0e18] border border-white/5 rounded-2xl overflow-hidden">
        <button onClick={() => setShowAddTeam(!showAddTeam)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-white/2 transition-colors">
          <span className="text-amber-400 text-lg">➕</span>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-sm">Manually Add Team</p>
            <p className="text-gray-500 text-xs">Admin bypass — add a team regardless of registration status</p>
          </div>
          <span className="text-gray-600">{showAddTeam ? '▲' : '▼'}</span>
        </button>
        {showAddTeam && (
          <div className="border-t border-white/5 px-5 pb-5 pt-4">
            <AddTeamForm tournamentId={active.id} requireCaptain={active.requireCaptain !== false} flash={flash} reload={reload} onDone={() => setShowAddTeam(false)} />
          </div>
        )}
      </div>
    </div>
  )
}

function PendingTeamRow({ team, tournamentId, requireCaptain, flash, reload }: { team: Team; tournamentId: string; requireCaptain: boolean; flash: F; reload: R }) {
  const [acting, setActing] = useState(false)

  async function act(status: Team['status']) {
    setActing(true)
    try {
      await updateTeamStatus({ data: { tournamentId, teamId: team.id, status, notes: '' } })
      flash(`${team.name} ${status}`)
      reload()
    } finally { setActing(false) }
  }

  return (
    <div className="flex items-center gap-3 bg-yellow-500/3 border border-yellow-500/10 rounded-xl px-4 py-3">
      {requireCaptain && team.captain && (
        <img src={`https://mc-heads.net/avatar/${team.captain}/32`} className="w-8 h-8 rounded-lg flex-shrink-0" alt="" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">{team.name}</p>
        <p className="text-gray-500 text-xs">
          {requireCaptain && team.captain ? `Captain: ${team.captain} · ` : ''}{team.players.length} player(s) · {timeAgo(team.registeredAt)}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => act('approved')} disabled={acting} className="px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/20 text-green-300 text-[10px] font-bold hover:bg-green-500/25 transition-all disabled:opacity-50">Approve</button>
        <button onClick={() => act('rejected')} disabled={acting} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15 text-red-400 text-[10px] font-bold hover:bg-red-500/15 transition-all disabled:opacity-50">Reject</button>
      </div>
    </div>
  )
}

function AddTeamForm({ tournamentId, requireCaptain, flash, reload, onDone }: { tournamentId: string; requireCaptain: boolean; flash: F; reload: R; onDone: () => void }) {
  const [name, setName]       = useState('')
  const [captain, setCaptain] = useState('')
  const [players, setPlayers] = useState<string[]>([''])
  const [status, setStatus]   = useState<Team['status']>('approved')
  const [saving, setSaving]   = useState(false)

  async function save() {
    if (!name.trim()) return flash('Team name is required', false)
    if (requireCaptain && !captain.trim()) return flash('Captain name is required', false)
    setSaving(true)
    try {
      const res = await addTeamManually({ data: { tournamentId, teamName: name.trim(), captain: captain.trim(), players: players.map(p => p.trim()).filter(Boolean), status, notes: 'Added by admin' } })
      if (res.success) { flash(`Team "${name}" added`); setName(''); setCaptain(''); setPlayers(['']); reload(); onDone() }
      else flash(res.error ?? 'Error', false)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${requireCaptain ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <GField label="Team Name" value={name} onChange={setName} placeholder="e.g. Blue Dynasty" />
        {requireCaptain && (
          <GField label="Captain" value={captain} onChange={setCaptain} placeholder="Minecraft username" />
        )}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40">
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Additional Players</label>
        <div className="space-y-2">
          {players.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p} onChange={e => setPlayers(ps => ps.map((v, j) => j === i ? e.target.value : v))} placeholder={`Player ${i + 2}`} className="flex-1 bg-[#070b12] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/40 placeholder-gray-700" />
              <button onClick={() => setPlayers(ps => ps.filter((_, j) => j !== i))} className="px-2 text-gray-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
          <button onClick={() => setPlayers(p => [...p, ''])} className="text-xs text-amber-400 hover:text-amber-300">+ Add Player</button>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20">
          {saving ? 'Adding…' : '➕ Add Team'}
        </button>
        <button onClick={onDone} className="px-6 py-2.5 rounded-xl border border-white/8 text-gray-500 text-xs font-bold hover:text-white transition-all">Cancel</button>
      </div>
    </div>
  )
}

// ─── Tournaments CRUD ─────────────────────────────────────────────────────────

function TTournaments({ data, active, flash, reload }: { data: TournamentsFile | null; active: Tournament | null; flash: F; reload: R }) {
  const [editing, setEditing] = useState<Partial<Tournament> | false>(false)
  const [saving, setSaving]   = useState(false)
  const [page, setPage]       = useState(1)
  const PER_PAGE = 8

  const all    = data?.tournaments ?? []
  const sorted = [...all].sort((a, b) => b.createdAt - a.createdAt)
  const paged  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pages  = Math.ceil(all.length / PER_PAGE)

  async function save() {
    if (editing === false) return
    if (!editing.name?.trim()) return flash('Tournament name is required', false)
    setSaving(true)
    try {
      if ('id' in editing && editing.id) {
        await updateTournament({ data: editing as any })
        flash('Tournament updated')
      } else {
        await createTournament({ data: editing as any })
        flash('Tournament created ✓')
      }
      setEditing(false); reload()
    } catch { flash('Error saving', false) }
    finally { setSaving(false) }
  }

  async function doDelete(id: string) {
    if (!confirm('Delete this tournament? This cannot be undone.')) return
    await deleteTournament({ data: { id } })
    flash('Deleted'); reload()
  }

  async function setActive(id: string | null) {
    await setActiveTournament({ data: { id } })
    flash(id ? 'Set as active ✓' : 'Active cleared'); reload()
  }

  async function doArchive(id: string) {
    await archiveTournament({ data: { id } })
    flash('Archived'); reload()
  }

  async function doDuplicate(id: string) {
    await duplicateTournament({ data: { id } })
    flash('Duplicated ✓'); reload()
  }

  if (editing !== false) {
    return <TournamentForm editing={editing} setEditing={setEditing} save={save} saving={saving} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{all.length} tournament(s)</p>
        <button
          onClick={() => setEditing({ name: '', description: '', banner: '', status: 'upcoming', gamemode: '', serverIp: '', maxTeamSize: 2, minTeamSize: 2, requireCaptain: true, registrationDeadline: null, startDate: null, prizePool: '' })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/15"
        >
          + New Tournament
        </button>
      </div>

      {all.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-5xl mb-4 opacity-20">🏆</div>
          <p>No tournaments yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map(t => (
            <div key={t.id} className={`bg-[#0a0e18] border rounded-2xl p-5 transition-all hover:border-white/10 ${active?.id === t.id ? 'border-amber-500/25 shadow-lg shadow-amber-500/5' : 'border-white/5'}`}>
              {/* Banner strip */}
              {t.banner && (
                <div className="h-12 rounded-xl overflow-hidden mb-4 -mx-1">
                  <img src={t.banner} className="w-full h-full object-cover" alt="" onError={e => (e.target as HTMLImageElement).parentElement!.style.display = 'none'} />
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <p className="text-white font-bold">{t.name}</p>
                    {active?.id === t.id && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/30">Active</span>}
                    <StatusPill status={t.status} />
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600">
                    {t.gamemode && <span>⚔️ {t.gamemode}</span>}
                    <span>👥 {t.teams.filter(tm => tm.status === 'approved').length} teams</span>
                    <span>🎮 {t.matches.filter(m => m.status === 'completed').length}/{t.matches.filter(m => m.status !== 'bye').length} matches</span>
                    <span className="text-gray-700">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
                  {/* Quick status */}
                  {t.status === 'upcoming'            && <QBtn label="Open Reg." onClick={async () => { await updateTournament({ data: { ...t, status: 'registration_open' } }); flash('Registration opened'); reload() }} color="green" />}
                  {t.status === 'registration_open'   && <QBtn label="Close Reg." onClick={async () => { await updateTournament({ data: { ...t, status: 'registration_closed' } }); flash('Registration closed'); reload() }} color="yellow" />}
                  {t.status === 'registration_closed' && <QBtn label="Go Live" onClick={async () => { await updateTournament({ data: { ...t, status: 'live' } }); flash('Tournament is LIVE'); reload() }} color="red" />}
                  {t.status === 'live'                && <QBtn label="Complete" onClick={async () => { await updateTournament({ data: { ...t, status: 'completed' } }); flash('Completed'); reload() }} color="gray" />}

                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <QBtn label={active?.id === t.id ? 'Deactivate' : 'Set Active'} onClick={() => setActive(active?.id === t.id ? null : t.id)} color="blue" />
                    <QBtn label="Edit" onClick={() => setEditing(t)} color="gray" />
                    <QBtn label="Dup." onClick={() => doDuplicate(t.id)} color="gray" />
                    {t.status !== 'archived' && <QBtn label="Archive" onClick={() => doArchive(t.id)} color="yellow" />}
                    <QBtn label="Delete" onClick={() => doDelete(t.id)} color="red" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && <AdminPaginator page={page} totalPages={pages} totalItems={all.length} pageSize={PER_PAGE} onPageChange={setPage} />}
    </div>
  )
}

function TournamentForm({ editing, setEditing, save, saving }: { editing: Partial<Tournament>; setEditing: (t: Partial<Tournament> | false) => void; save: () => void; saving: boolean }) {
  const set = (k: string, v: any) => setEditing({ ...(editing as Partial<Tournament>), [k]: v })
  const toL = (ts: number | null | undefined) => ts ? new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
  const frL = (s: string) => s ? new Date(s).getTime() : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-white text-sm">← Back</button>
        <h3 className="font-['Space_Grotesk'] font-bold text-white text-lg">{'id' in editing && editing.id ? 'Edit Tournament' : 'New Tournament'}</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <GField label="Tournament Name *" value={editing.name ?? ''} onChange={v => set('name', v)} placeholder="e.g. Blue Network PvP World Cup" />
        <GField label="Gamemode" value={editing.gamemode ?? ''} onChange={v => set('gamemode', v)} placeholder="e.g. Crystal PvP" />
        <GField label="Server IP" value={editing.serverIp ?? ''} onChange={v => set('serverIp', v)} placeholder="play.example.com" />
        <GField label="Prize Pool" value={editing.prizePool ?? ''} onChange={v => set('prizePool', v)} placeholder="e.g. 50,000 BlueCoins" />
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Status</label>
          <select value={editing.status ?? 'upcoming'} onChange={e => set('status', e.target.value)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40">
            {(['upcoming','registration_open','registration_closed','live','completed','archived'] as const).map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Min Team Size</label>
            <input type="number" min={1} max={50} value={editing.minTeamSize ?? 2} onChange={e => set('minTeamSize', +e.target.value)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Max Team Size</label>
            <input type="number" min={1} max={50} value={editing.maxTeamSize ?? 2} onChange={e => set('maxTeamSize', +e.target.value)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Registration Deadline</label>
          <input type="datetime-local" value={toL(editing.registrationDeadline)} onChange={e => set('registrationDeadline', frL(e.target.value))} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Start Date</label>
          <input type="datetime-local" value={toL(editing.startDate)} onChange={e => set('startDate', frL(e.target.value))} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40" />
        </div>
        <div className="md:col-span-2">
          <GField label="Banner URL" value={editing.banner ?? ''} onChange={v => set('banner', v)} placeholder="https://i.imgur.com/..." />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Description</label>
          <textarea value={editing.description ?? ''} onChange={e => set('description', e.target.value)} rows={3} placeholder="Tournament description…" className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-amber-500/40 placeholder-gray-700" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2 font-semibold">Registration Options</label>
          <label className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer select-none transition-all ${editing.requireCaptain !== false ? 'bg-amber-500/8 border-amber-500/25' : 'bg-white/3 border-white/8'}`}>
            <div
              onClick={() => set('requireCaptain', !(editing.requireCaptain !== false))}
              className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 cursor-pointer ${editing.requireCaptain !== false ? 'bg-amber-500' : 'bg-white/15'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${editing.requireCaptain !== false ? 'left-5' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Captain System</p>
              <p className="text-gray-500 text-xs">{editing.requireCaptain !== false ? 'On — players must designate a captain when registering' : 'Off — all team members are equal, no captain required'}</p>
            </div>
          </label>
        </div>
      </div>
      {editing.banner && (
        <div className="h-24 rounded-xl overflow-hidden border border-white/5">
          <img src={editing.banner} className="w-full h-full object-cover" alt="" onError={e => (e.target as HTMLImageElement).parentElement!.style.display = 'none'} />
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20">
          {saving ? 'Saving…' : 'Save Tournament'}
        </button>
        <button onClick={() => setEditing(false)} className="px-6 py-3 rounded-xl border border-white/8 text-gray-500 font-bold text-sm hover:text-white transition-all">Cancel</button>
      </div>
    </div>
  )
}

// ─── Teams management ─────────────────────────────────────────────────────────

function TTeams({ active, flash, reload }: { active: Tournament | null; flash: F; reload: R }) {
  const [filter, setFilter]     = useState<string>('approved')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage]         = useState(1)
  const PER_PAGE = 12

  if (!active) return <NoActiveTournament />

  const teams = active.teams
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.captain ?? '').toLowerCase().includes(search.toLowerCase()))
  const paged  = teams.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pages  = Math.ceil(teams.length / PER_PAGE)

  const statusCounts = ['all','pending','approved','rejected','eliminated','disqualified'].reduce((acc, s) => {
    acc[s] = s === 'all' ? active.teams.length : active.teams.filter(t => t.status === s).length
    return acc
  }, {} as Record<string, number>)

  function toggleSelect(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll() { setSelected(new Set(paged.map(t => t.id))) }
  function clearSel()  { setSelected(new Set()) }

  async function bulkAction(status: Team['status']) {
    if (selected.size === 0) return
    await bulkUpdateTeamStatus({ data: { tournamentId: active!.id, teamIds: [...selected], status, notes: '' } })
    flash(`${selected.size} teams → ${status}`)
    setSelected(new Set())
    reload()
  }

  async function doRemove(teamId: string) {
    if (!confirm('Remove this team?')) return
    await removeTeam({ data: { tournamentId: active!.id, teamId } })
    flash('Team removed'); reload()
  }

  async function setStatus(teamId: string, status: Team['status']) {
    await updateTeamStatus({ data: { tournamentId: active!.id, teamId, status, notes: '' } })
    flash(`Status updated`); reload()
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search teams…"
            className="w-full bg-[#0a0e18] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40 placeholder-gray-600"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all','pending','approved','rejected','eliminated'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); setSelected(new Set()) }} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${filter === f ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'border-white/8 text-gray-600 hover:text-gray-300'}`}>
              {f} {statusCounts[f] > 0 ? `(${statusCounts[f]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex-wrap">
          <span className="text-amber-300 text-xs font-bold">{selected.size} selected</span>
          <button onClick={() => bulkAction('approved')} className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-[10px] font-bold hover:bg-green-500/30 transition-all">✓ Approve All</button>
          <button onClick={() => bulkAction('rejected')} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/15 transition-all">✕ Reject All</button>
          <button onClick={() => bulkAction('eliminated')} className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold hover:bg-yellow-500/15 transition-all">⚡ Eliminate All</button>
          <button onClick={clearSel} className="ml-auto text-gray-500 text-xs hover:text-white">Clear</button>
        </div>
      )}

      {/* Select all */}
      {paged.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <button onClick={selected.size === paged.length ? clearSel : selectAll} className="hover:text-gray-300 transition-colors">
            {selected.size === paged.length ? '☑ Deselect all' : '☐ Select all on page'}
          </button>
          <span>·</span>
          <span>{teams.length} team(s) shown</span>
        </div>
      )}

      {paged.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3 opacity-20">👥</div>
          <p>No teams match your filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map(team => (
            <div key={team.id} className={`bg-[#0a0e18] border rounded-xl p-4 flex items-center gap-4 transition-all hover:border-white/10 ${selected.has(team.id) ? 'border-amber-500/25 bg-amber-500/3' : 'border-white/5'}`}>
              <input type="checkbox" checked={selected.has(team.id)} onChange={() => toggleSelect(team.id)} className="w-4 h-4 rounded accent-amber-400 flex-shrink-0" />
              {active.requireCaptain !== false && team.captain && (
                <img src={`https://mc-heads.net/avatar/${team.captain}/32`} className="w-10 h-10 rounded-lg flex-shrink-0" alt="" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-bold text-sm">{team.name}</p>
                  <TeamStatusBadge status={team.status} />
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  {active.requireCaptain !== false && team.captain
                    ? <><span>👑 {team.captain}</span>{team.players.length > 1 && <span className="ml-2 text-gray-600">· {team.players.slice(1).join(', ')}</span>}</>
                    : <span className="text-gray-600">{team.players.join(', ')}</span>
                  }
                </p>
                <p className="text-gray-700 text-[10px] mt-0.5">{timeAgo(team.registeredAt)}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                {team.status !== 'approved'   && <QBtn label="✓ Approve"  onClick={() => setStatus(team.id, 'approved')}  color="green" />}
                {team.status !== 'rejected'   && <QBtn label="✕ Reject"   onClick={() => setStatus(team.id, 'rejected')}  color="red" />}
                {team.status !== 'eliminated' && <QBtn label="⚡ Elim."   onClick={() => setStatus(team.id, 'eliminated')} color="yellow" />}
                <QBtn label="🗑" onClick={() => doRemove(team.id)} color="red" />
              </div>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && <AdminPaginator page={page} totalPages={pages} totalItems={teams.length} pageSize={PER_PAGE} onPageChange={setPage} />}
    </div>
  )
}

// ─── Match management ─────────────────────────────────────────────────────────

function TMatches({ active, flash, reload }: { active: Tournament | null; flash: F; reload: R }) {
  const [editing, setEditing] = useState<Match | null>(null)
  const [saving, setSaving]   = useState(false)
  const [filter, setFilter]   = useState<string>('all')

  if (!active) return <NoActiveTournament />

  const matches = [...active.matches]
    .filter(m => m.status !== 'bye')
    .filter(m => filter === 'all' || m.status === filter)
    .sort((a, b) => a.matchNumber - b.matchNumber)

  const counts = ['all','scheduled','live','completed','pending'].reduce((acc, s) => {
    acc[s] = s === 'all' ? active.matches.filter(m => m.status !== 'bye').length : active.matches.filter(m => m.status === s).length
    return acc
  }, {} as Record<string, number>)

  const getTeam = (id: string | null) => active.teams.find(t => t.id === id)

  async function save(m: Match) {
    setSaving(true)
    try {
      const res = await updateMatch({ data: { tournamentId: active!.id, matchId: m.id, score1: m.score1, score2: m.score2, winnerId: m.winnerId, status: m.status as 'live' | 'completed' | 'pending' | 'scheduled', scheduledAt: m.scheduledAt, arena: m.arena, gamemode: m.gamemode, referee: m.referee, notes: m.notes, replayLink: m.replayLink } })
      if (res.success) { flash('Match updated ✓'); setEditing(null); reload() }
      else flash(res.error ?? 'Error', false)
    } finally { setSaving(false) }
  }

  if (editing) {
    return <MatchEditor match={editing} teams={active.teams} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
  }

  // Group by round
  const byRound: Record<number, Match[]> = {}
  for (const m of matches) {
    if (!byRound[m.round]) byRound[m.round] = []
    byRound[m.round].push(m)
  }
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all','live','scheduled','pending','completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${filter === f ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'border-white/8 text-gray-600 hover:text-gray-300'} ${f === 'live' && counts[f] > 0 ? 'animate-pulse' : ''}`}>
            {f === 'live' && counts[f] > 0 ? '🔴 ' : ''}{f} {counts[f] > 0 ? `(${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-5xl mb-3 opacity-20">🎮</div>
          <p>No matches yet. Generate a bracket first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {rounds.map(r => {
            const roundName = active.bracket?.rounds[r]?.name ?? `Round ${r + 1}`
            const rMatches  = byRound[r] ?? []
            return (
              <div key={r} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-amber-400/70 text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-amber-500/15 rounded-full bg-amber-500/5">{roundName}</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <div className="space-y-2">
                  {rMatches.map(m => {
                    const t1 = getTeam(m.team1Id)
                    const t2 = getTeam(m.team2Id)
                    return (
                      <div key={m.id} className={`bg-[#0a0e18] border rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-white/10 transition-all ${
                        m.status === 'live' ? 'border-red-500/30 shadow-lg shadow-red-500/5' :
                        m.status === 'completed' ? 'border-green-500/15' :
                        'border-white/5'
                      }`}>
                        <span className="text-gray-600 text-xs font-bold w-7 flex-shrink-0">M{m.matchNumber}</span>
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <span className={`text-sm font-bold truncate flex-1 ${m.winnerId === m.team1Id ? 'text-green-300' : 'text-white'}`}>{t1?.name ?? 'TBD'}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`font-black text-sm min-w-5 text-right ${m.winnerId === m.team1Id ? 'text-green-300' : 'text-gray-400'}`}>{m.score1}</span>
                            <span className="text-gray-700 text-xs">—</span>
                            <span className={`font-black text-sm min-w-5 ${m.winnerId === m.team2Id ? 'text-green-300' : 'text-gray-400'}`}>{m.score2}</span>
                          </div>
                          <span className={`text-sm font-bold truncate flex-1 text-right ${m.winnerId === m.team2Id ? 'text-green-300' : 'text-white'}`}>{t2?.name ?? 'TBD'}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider ${
                            m.status === 'live'      ? 'bg-red-500/15 text-red-400 animate-pulse' :
                            m.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                            m.status === 'scheduled' ? 'bg-[#00BFFF]/10 text-[#00BFFF]' :
                            'bg-white/5 text-gray-600'
                          }`}>{MATCH_STATUS_LABEL[m.status]}</span>
                          {m.arena && <span className="text-gray-700 text-xs hidden md:inline">{m.arena}</span>}
                          <button onClick={() => setEditing(m)} className="px-3 py-1.5 rounded-lg border border-white/8 text-gray-500 text-[10px] font-bold hover:text-white hover:border-white/20 transition-all">Edit</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MatchEditor({ match: init, teams, onSave, onCancel, saving }: { match: Match; teams: Team[]; onSave: (m: Match) => void; onCancel: () => void; saving: boolean }) {
  const [m, setM] = useState<Match>({ ...init })
  const set = (k: keyof Match, v: any) => setM(prev => ({ ...prev, [k]: v }))
  const toL = (ts: number | null) => ts ? new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
  const t1  = teams.find(t => t.id === m.team1Id)
  const t2  = teams.find(t => t.id === m.team2Id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="text-gray-500 hover:text-white text-sm">← Back</button>
        <h3 className="font-['Space_Grotesk'] font-bold text-white">Edit Match #{m.matchNumber}</h3>
      </div>

      {/* Score display */}
      <div className="bg-[#070b12] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center flex-1">
            <p className="text-gray-500 text-xs mb-2">{t1?.name ?? 'Team 1'}</p>
            <input type="number" min={0} value={m.score1} onChange={e => set('score1', +e.target.value)} className="w-24 bg-[#0a0e18] border border-white/10 rounded-xl px-3 py-3 text-white text-2xl font-black text-center focus:outline-none focus:border-amber-500/40" />
          </div>
          <div className="text-gray-600 font-black text-2xl">VS</div>
          <div className="text-center flex-1">
            <p className="text-gray-500 text-xs mb-2">{t2?.name ?? 'Team 2'}</p>
            <input type="number" min={0} value={m.score2} onChange={e => set('score2', +e.target.value)} className="w-24 bg-[#0a0e18] border border-white/10 rounded-xl px-3 py-3 text-white text-2xl font-black text-center focus:outline-none focus:border-amber-500/40" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Status</label>
          <select value={m.status} onChange={e => set('status', e.target.value)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40">
            {(['pending','scheduled','live','completed'] as const).map(s => <option key={s} value={s}>{MATCH_STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Winner</label>
          <select value={m.winnerId ?? ''} onChange={e => set('winnerId', e.target.value || null)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40">
            <option value="">No winner yet</option>
            {t1 && <option value={t1.id}>{t1.name}</option>}
            {t2 && <option value={t2.id}>{t2.name}</option>}
          </select>
        </div>
        <GField label="Arena" value={m.arena} onChange={v => set('arena', v)} placeholder="Arena name" />
        <GField label="Gamemode" value={m.gamemode} onChange={v => set('gamemode', v)} placeholder="e.g. Crystal PvP" />
        <GField label="Referee" value={m.referee} onChange={v => set('referee', v)} placeholder="Staff username" />
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Scheduled At</label>
          <input type="datetime-local" value={toL(m.scheduledAt)} onChange={e => set('scheduledAt', e.target.value ? new Date(e.target.value).getTime() : null)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40" />
        </div>
        <div className="md:col-span-2">
          <GField label="Replay Link" value={m.replayLink} onChange={v => set('replayLink', v)} placeholder="https://…" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Notes</label>
          <textarea value={m.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-amber-500/40" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(m)} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20">
          {saving ? 'Saving…' : 'Save Match'}
        </button>
        <button onClick={onCancel} className="px-6 py-3 rounded-xl border border-white/8 text-gray-500 font-bold text-sm hover:text-white transition-all">Cancel</button>
      </div>
    </div>
  )
}

// ─── Prizes ───────────────────────────────────────────────────────────────────

function TPrizes({ active, flash, reload }: { active: Tournament | null; flash: F; reload: R }) {
  const [prizes, setPrizes] = useState<Prize[]>(active?.prizes ?? DEFAULT_PRIZES)
  const [saving, setSaving] = useState(false)
  const REWARD_TYPES = ['coins','gems','rank','crate_keys','custom'] as const
  const ICONS = ['🥇','🥈','🥉','🏅','🎖']

  if (!active) return <NoActiveTournament />

  function addPlacement() {
    const n = prizes.length + 1
    setPrizes(p => [...p, { placement: n, label: `${ICONS[n - 1] ?? '🎖'} ${ordinal(n)} Place`, rewards: [{ type: 'coins', label: 'BlueCoin', amount: '' }] }])
  }

  const setReward = (pi: number, ri: number, k: keyof Reward, v: string) =>
    setPrizes(p => p.map((pr, i) => i === pi ? { ...pr, rewards: pr.rewards.map((r, j) => j === ri ? { ...r, [k]: v } : r) } : pr))
  const setPrize = (pi: number, k: keyof Prize, v: any) =>
    setPrizes(p => p.map((pr, i) => i === pi ? { ...pr, [k]: v } : pr))

  async function save() {
    setSaving(true)
    try { await updatePrizes({ data: { tournamentId: active!.id, prizes } }); flash('Prizes saved ✓'); reload() }
    catch { flash('Error', false) }
    finally { setSaving(false) }
  }

  const REWARD_ICONS: Record<string, string> = { coins: '💰', gems: '💎', rank: '🏅', crate_keys: '🗝', custom: '✨' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">{prizes.length} placement(s)</p>
        <div className="flex gap-3">
          <button onClick={addPlacement} className="px-4 py-2 rounded-xl border border-white/8 text-gray-400 text-xs font-bold hover:text-white transition-all">+ Add Placement</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/15">
            {saving ? 'Saving…' : '💾 Save Prizes'}
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {prizes.map((prize, pi) => (
          <div key={pi} className={`bg-[#0a0e18] border rounded-2xl p-5 space-y-4 ${pi === 0 ? 'border-amber-500/20' : pi === 1 ? 'border-gray-400/15' : pi === 2 ? 'border-amber-700/15' : 'border-white/5'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ICONS[pi] ?? '🎖'}</span>
              <input value={prize.label} onChange={e => setPrize(pi, 'label', e.target.value)} placeholder="e.g. 🥇 First Place" className="flex-1 bg-[#070b12] border border-white/8 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-amber-500/40" />
              <button onClick={() => setPrizes(p => p.filter((_, i) => i !== pi))} className="text-gray-600 hover:text-red-400 transition-colors text-xs px-2">✕ Remove</button>
            </div>
            <div className="space-y-2">
              {prize.rewards.map((r, ri) => (
                <div key={ri} className="flex gap-2 items-end flex-wrap bg-white/2 border border-white/5 rounded-xl p-3">
                  <span className="text-lg">{REWARD_ICONS[r.type]}</span>
                  <div>
                    <label className="block text-[9px] text-gray-600 mb-1">Type</label>
                    <select value={r.type} onChange={e => setReward(pi, ri, 'type', e.target.value)} className="bg-[#070b12] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                      {REWARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-24">
                    <label className="block text-[9px] text-gray-600 mb-1">Label</label>
                    <input value={r.label} onChange={e => setReward(pi, ri, 'label', e.target.value)} placeholder="BlueCoin" className="w-full bg-[#070b12] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                  </div>
                  <div className="flex-1 min-w-24">
                    <label className="block text-[9px] text-gray-600 mb-1">Amount</label>
                    <input value={r.amount} onChange={e => setReward(pi, ri, 'amount', e.target.value)} placeholder="10,000" className="w-full bg-[#070b12] border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none" />
                  </div>
                  <button onClick={() => setPrizes(p => p.map((pr, i) => i === pi ? { ...pr, rewards: pr.rewards.filter((_, j) => j !== ri) } : pr))} className="text-gray-600 hover:text-red-400 text-xs pb-0.5">✕</button>
                </div>
              ))}
              <button onClick={() => setPrizes(p => p.map((pr, i) => i === pi ? { ...pr, rewards: [...pr.rewards, { type: 'coins', label: '', amount: '' }] } : pr))} className="text-xs text-amber-400 hover:text-amber-300">+ Add Reward</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Rules ────────────────────────────────────────────────────────────────────

function TRules({ active, flash, reload }: { active: Tournament | null; flash: F; reload: R }) {
  const [rules, setRules] = useState(active?.rules ?? DEFAULT_RULES)
  const [saving, setSaving] = useState(false)
  if (!active) return <NoActiveTournament />

  const setField = (k: keyof typeof rules, v: any) => setRules(r => ({ ...r, [k]: v }))
  const setList  = (k: keyof typeof rules, idx: number, v: string) => setRules(r => ({ ...r, [k]: (r[k] as string[]).map((x, i) => i === idx ? v : x) }))
  const addItem  = (k: keyof typeof rules) => setRules(r => ({ ...r, [k]: [...(r[k] as string[]), ''] }))
  const remItem  = (k: keyof typeof rules, idx: number) => setRules(r => ({ ...r, [k]: (r[k] as string[]).filter((_, i) => i !== idx) }))

  async function save() {
    setSaving(true)
    try { await updateRules({ data: { tournamentId: active!.id, ...rules } }); flash('Rules saved ✓'); reload() }
    catch { flash('Error', false) }
    finally { setSaving(false) }
  }

  const ListField = ({ label, field, icon }: { label: string; field: 'allowedMods' | 'allowedClients' | 'bannedMods' | 'custom'; icon: string }) => (
    <div className="bg-[#0a0e18] border border-white/5 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-white font-bold text-sm">{label}</p>
      </div>
      <div className="space-y-2">
        {rules[field].map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item} onChange={e => setList(field, i, e.target.value)} className="flex-1 bg-[#070b12] border border-white/8 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/40" />
            <button onClick={() => remItem(field, i)} className="px-2 text-gray-600 hover:text-red-400 transition-colors">✕</button>
          </div>
        ))}
        <button onClick={() => addItem(field)} className="text-xs text-amber-400 hover:text-amber-300">+ Add</button>
      </div>
    </div>
  )

  const TextareaF = ({ label, field, icon }: { label: string; field: 'replayRequirements' | 'disconnectRules' | 'staffDecisions'; icon: string }) => (
    <div className="bg-[#0a0e18] border border-white/5 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-white font-bold text-sm">{label}</p>
      </div>
      <textarea value={rules[field]} onChange={e => setField(field, e.target.value)} rows={3} className="w-full bg-[#070b12] border border-white/8 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-amber-500/40" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <ListField label="Allowed Mods" field="allowedMods" icon="✅" />
        <ListField label="Allowed Clients" field="allowedClients" icon="🖥" />
        <ListField label="Banned Modifications" field="bannedMods" icon="🚫" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <TextareaF label="Replay Requirements" field="replayRequirements" icon="🎬" />
        <TextareaF label="Disconnect Rules" field="disconnectRules" icon="⚡" />
        <TextareaF label="Staff Decisions" field="staffDecisions" icon="⚖️" />
      </div>
      <ListField label="Custom Rules" field="custom" icon="📝" />
      <button onClick={save} disabled={saving} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20">
        {saving ? 'Saving…' : '💾 Save Rules'}
      </button>
    </div>
  )
}

// ─── Announcements ────────────────────────────────────────────────────────────

function TAnnouncements({ active, flash, reload }: { active: Tournament | null; admin?: string; flash: F; reload: R }) {
  const [title, setTitle]  = useState('')
  const [body, setBody]    = useState('')
  const [type, setType]    = useState<'info' | 'warning' | 'success'>('info')
  const [posting, setPost] = useState(false)
  const [page, setPage]    = useState(1)
  const PER_PAGE = 8

  if (!active) return <NoActiveTournament />

  const anns  = active.announcements
  const paged = anns.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const pages = Math.ceil(anns.length / PER_PAGE)

  async function post() {
    if (!title.trim()) return flash('Title is required', false)
    setPost(true)
    try {
      await addAnnouncement({ data: { tournamentId: active!.id, title: title.trim(), body: body.trim(), type } })
      flash('Announcement posted ✓')
      setTitle(''); setBody('')
      reload()
    } catch { flash('Error', false) }
    finally { setPost(false) }
  }

  async function doDelete(annId: string) {
    await deleteAnnouncement({ data: { tournamentId: active!.id, announcementId: annId } })
    flash('Deleted'); reload()
  }

  const TYPE_CONFIG = {
    info:    { icon: 'ℹ️', bg: 'bg-[#00BFFF]/5 border-[#00BFFF]/15', text: 'text-[#00BFFF]' },
    warning: { icon: '⚠️', bg: 'bg-yellow-500/5 border-yellow-500/15', text: 'text-yellow-400' },
    success: { icon: '✅', bg: 'bg-green-500/5 border-green-500/15',   text: 'text-green-400' },
  }

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="bg-[#0a0e18] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base">📣</div>
          <p className="text-white font-bold">Post Announcement</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <GField label="Title *" value={title} onChange={setTitle} placeholder="e.g. Brackets Released! Get ready to compete." />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/40">
              <option value="info">ℹ️ Info</option>
              <option value="warning">⚠️ Warning</option>
              <option value="success">✅ Success</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">Body (optional)</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Additional details…" className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-amber-500/40 placeholder-gray-700" />
        </div>
        <button onClick={post} disabled={posting} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/15">
          {posting ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Posting…</> : <>📣 Post Announcement</>}
        </button>
      </div>

      {/* List */}
      {anns.length === 0 ? (
        <div className="text-center py-12 text-gray-600">No announcements yet.</div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">{anns.length} announcement(s)</p>
          {paged.map(ann => {
            const cfg = TYPE_CONFIG[ann.type]
            return (
              <div key={ann.id} className={`flex items-start gap-4 ${cfg.bg} border rounded-2xl px-5 py-4`}>
                <span className="text-xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${cfg.text}`}>{ann.title}</p>
                  {ann.body && <p className="text-gray-400 text-xs mt-1 leading-relaxed">{ann.body}</p>}
                  <p className="text-gray-700 text-[10px] mt-2">{timeAgo(ann.createdAt)}</p>
                </div>
                <button onClick={() => doDelete(ann.id)} className="text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0 mt-0.5 px-2 py-1 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/15">Delete</button>
              </div>
            )
          })}
          {pages > 1 && <AdminPaginator page={page} totalPages={pages} totalItems={anns.length} pageSize={PER_PAGE} onPageChange={setPage} />}
        </div>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function GField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      {label && <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-semibold">{label}</label>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#070b12] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-amber-500/40 transition-colors" />
    </div>
  )
}

function QBtn({ label, onClick, color }: { label: string; onClick: () => void; color: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }) {
  const c = {
    green:  'text-green-300 border-green-500/25 hover:bg-green-500/15',
    red:    'text-red-400 border-red-500/20 hover:bg-red-500/10',
    yellow: 'text-yellow-300 border-yellow-500/20 hover:bg-yellow-500/10',
    blue:   'text-[#00BFFF] border-[#00BFFF]/20 hover:bg-[#00BFFF]/10',
    gray:   'text-gray-500 border-white/8 hover:text-white hover:border-white/20',
  }[color]
  return (
    <button onClick={onClick} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${c}`}>{label}</button>
  )
}

function StatusPill({ status }: { status: TournamentStatus }) {
  const cfg: Record<TournamentStatus, { label: string; cls: string }> = {
    upcoming:            { label: 'Upcoming',      cls: 'bg-blue-500/10 border-blue-500/25 text-blue-400' },
    registration_open:   { label: 'Reg. Open',     cls: 'bg-green-500/10 border-green-500/25 text-green-400' },
    registration_closed: { label: 'Reg. Closed',   cls: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400' },
    live:                { label: 'LIVE',           cls: 'bg-red-500/10 border-red-500/25 text-red-400' },
    completed:           { label: 'Completed',      cls: 'bg-gray-500/10 border-gray-500/20 text-gray-400' },
    archived:            { label: 'Archived',       cls: 'bg-gray-700/10 border-gray-700/20 text-gray-600' },
  }
  const { label, cls } = cfg[status]
  return <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${cls} ${status === 'live' ? 'animate-pulse' : ''}`}>{label}</span>
}

function TeamStatusBadge({ status }: { status: Team['status'] }) {
  const colors: Record<string, string> = {
    approved:     'text-green-300 bg-green-500/10 border-green-500/20',
    pending:      'text-yellow-300 bg-yellow-500/10 border-yellow-500/20',
    rejected:     'text-red-400 bg-red-500/10 border-red-500/15',
    eliminated:   'text-gray-400 bg-gray-500/10 border-gray-500/15',
    disqualified: 'text-orange-400 bg-orange-500/10 border-orange-500/15',
  }
  return <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${colors[status] ?? ''}`}>{status}</span>
}

function NoActiveTournament() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="text-6xl mb-5 opacity-15">🏆</div>
      <p className="text-gray-400 font-semibold text-base mb-2">No Active Tournament</p>
      <p className="text-gray-600 text-sm">Go to the Tournaments tab and set one as active first.</p>
    </div>
  )
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ordinal(n: number): string {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
