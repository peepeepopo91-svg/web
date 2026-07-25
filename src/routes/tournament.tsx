import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { getTournamentData } from '../server/tournamentServer'
import type { TournamentsFile, Tournament } from '../data/tournament'
import { TournamentHome }          from '../components/tournament/TournamentHome'
import { TournamentBracket }       from '../components/tournament/TournamentBracket'
import { TournamentSchedule }      from '../components/tournament/TournamentSchedule'
import { TournamentRules }         from '../components/tournament/TournamentRules'
import { TournamentPrizes }        from '../components/tournament/TournamentPrizes'
import { TournamentStats }         from '../components/tournament/TournamentStats'
import { TournamentArchive }       from '../components/tournament/TournamentArchive'
import { TournamentAnnouncements } from '../components/tournament/TournamentAnnouncements'
import { LiveTournament }          from '../components/tournament/LiveTournament'
import { TeamRegistration }        from '../components/tournament/TeamRegistration'
import { Navbar }                  from '../components/Navbar'
import { STATUS_COLOR, STATUS_LABEL } from '../data/tournament'

export const Route = createFileRoute('/tournament')({
  component: TournamentPage,
})

type Tab = 'home' | 'bracket' | 'schedule' | 'live' | 'prizes' | 'rules' | 'stats' | 'archive' | 'announcements'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home',          label: 'Home',          icon: '🏆' },
  { id: 'bracket',       label: 'Bracket',       icon: '⚔️' },
  { id: 'schedule',      label: 'Schedule',      icon: '📅' },
  { id: 'live',          label: 'Live',          icon: '🔴' },
  { id: 'prizes',        label: 'Prizes',        icon: '🎁' },
  { id: 'rules',         label: 'Rules',         icon: '📜' },
  { id: 'stats',         label: 'Statistics',    icon: '📊' },
  { id: 'announcements', label: 'Announcements', icon: '📣' },
  { id: 'archive',       label: 'Archive',       icon: '🗃️' },
]

function TournamentPage() {
  const [tab, setTab]         = useState<Tab>('home')
  const [data, setData]       = useState<TournamentsFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReg, setShowReg] = useState(false)
  const esRef                 = useRef<EventSource | null>(null)

  async function load() {
    try {
      const d = await getTournamentData()
      setData(d)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const es = new EventSource('/api/tournament-events')
    esRef.current = es
    es.addEventListener('tournament_updated', () => load())
    return () => es.close()
  }, [])

  const active: Tournament | null =
    data?.activeTournamentId
      ? (data.tournaments.find(t => t.id === data.activeTournamentId) ?? null)
      : null

  const archives = data?.tournaments.filter(t => t.status === 'archived' || t.status === 'completed') ?? []
  const canRegister = active?.status === 'registration_open'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-white/10 border-t-[#00BFFF] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      {/* Page hero */}
      <section className="relative pt-8 pb-10 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/15 to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-5 tracking-wide uppercase">
            {active?.status === 'live'
              ? <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              : <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
            }
            {active ? `${STATUS_LABEL[active.status]} · ${active.name}` : 'Tournament Hub'}
          </div>

          <h1 className="font-black text-4xl sm:text-5xl text-white mb-3">
            Blue Network <span className="text-gradient">Tournaments</span>
          </h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">
            Register your team, track live brackets, and compete for glory on the Blue Network.
          </p>

          {/* Active tournament status strip */}
          {active && (
            <div className="mt-6 inline-flex items-center gap-3 flex-wrap justify-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${STATUS_COLOR[active.status]}`}>
                {active.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                {STATUS_LABEL[active.status]}
              </span>
              {active.prizePool && (
                <span className="text-gray-500 text-xs">🏆 Prize Pool: <span className="text-white font-semibold">{active.prizePool}</span></span>
              )}
              {active.gamemode && (
                <span className="text-gray-500 text-xs">🎮 <span className="text-white font-semibold">{active.gamemode}</span></span>
              )}
            </div>
          )}

          {/* CTA — shown whenever there's an active tournament */}
          {active && (() => {
            if (active.status === 'live') return (
              <div className="mt-8">
                <button
                  onClick={() => setTab('bracket')}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                    boxShadow: '0 0 32px rgba(220,38,38,0.4), 0 4px 16px rgba(0,0,0,0.4)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 48px rgba(220,38,38,0.6), 0 4px 20px rgba(0,0,0,0.5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 32px rgba(220,38,38,0.4), 0 4px 16px rgba(0,0,0,0.4)' }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-300" />
                  </span>
                  Watch Now
                  <span className="opacity-70">→</span>
                </button>
                <p className="text-gray-600 text-xs mt-2">Tournament is live — follow the bracket in real time</p>
              </div>
            )
            if (canRegister) return (
              <div className="mt-8">
                <button
                  onClick={() => setShowReg(true)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#00BFFF] hover:bg-[#00BFFF]/85 text-black font-bold text-sm transition-all shadow-lg shadow-[#00BFFF]/25 hover:scale-105 hover:shadow-[#00BFFF]/40"
                >
                  ⚔️ Register Your Team
                  <span className="opacity-70">→</span>
                </button>
                <p className="text-gray-600 text-xs mt-2">Registrations are open — spots are limited</p>
              </div>
            )
            if (active.status === 'upcoming') return (
              <div className="mt-8">
                <div className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm cursor-default">
                  🔔 Registration Opening Soon
                </div>
                <p className="text-gray-600 text-xs mt-2">Stay tuned — watch the Announcements tab for updates</p>
              </div>
            )
            if (active.status === 'registration_closed') return (
              <div className="mt-8">
                <div className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 text-gray-500 font-bold text-sm cursor-default">
                  🚫 Registration Closed
                </div>
                <p className="text-gray-600 text-xs mt-2">The bracket is set — follow the matches in the Bracket tab</p>
              </div>
            )
            return null
          })()}
        </div>
      </section>

      {/* Tab bar */}
      <div className="sticky top-16 z-30 bg-[#0B0F17]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === t.id
                    ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
                {t.id === 'live' && active?.status === 'live' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'home'          && <TournamentHome          active={active} onRegisterClick={canRegister ? () => setShowReg(true) : undefined} />}
        {tab === 'bracket'       && <TournamentBracket       tournament={active} />}
        {tab === 'schedule'      && <TournamentSchedule      tournament={active} />}
        {tab === 'live'          && <LiveTournament          tournament={active} />}
        {tab === 'prizes'        && <TournamentPrizes        tournament={active} />}
        {tab === 'rules'         && <TournamentRules         tournament={active} />}
        {tab === 'stats'         && <TournamentStats         tournament={active} />}
        {tab === 'announcements' && <TournamentAnnouncements tournament={active} />}
        {tab === 'archive'       && <TournamentArchive       archives={archives} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
        Blue Tiers · Tournament Hub · All results are final
      </footer>

      {/* Registration modal — lives here so any tab can open it */}
      {showReg && active && (
        <TeamRegistration tournament={active} onClose={() => setShowReg(false)} />
      )}
    </div>
  )
}
