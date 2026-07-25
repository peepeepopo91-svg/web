import { useState } from 'react'
import type { Tournament, Match, Team } from '../../data/tournament'
import { MatchDetailModal } from './MatchDetailModal'

interface Props { tournament: Tournament | null }

export function LiveTournament({ tournament }: Props) {
  const [selected, setSelected] = useState<Match | null>(null)

  if (!tournament || tournament.status !== 'live') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4 opacity-20">🔴</div>
        <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl mb-2">Not Live</h2>
        <p className="text-gray-500">There is no tournament running right now. Check back soon!</p>
      </div>
    )
  }

  const { matches, teams } = tournament
  const liveMatches      = matches.filter(m => m.status === 'live')
  const scheduledMatches = matches.filter(m => m.status === 'scheduled').slice(0, 5)
  const completedCount   = matches.filter(m => m.status === 'completed').length
  const remaining        = matches.filter(m => m.status !== 'completed' && m.status !== 'bye').length

  return (
    <div className="space-y-8">
      {/* Live header */}
      <div className="bg-gradient-to-r from-red-950/50 to-red-900/20 border border-red-500/20 rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl">
          🔴
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Tournament Live</span>
          </div>
          <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl mt-1">{tournament.name}</h2>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="font-['Space_Grotesk'] font-black text-2xl text-white">{completedCount}</p>
            <p className="text-gray-500 text-xs">Completed</p>
          </div>
          <div>
            <p className="font-['Space_Grotesk'] font-black text-2xl text-[#00BFFF]">{remaining}</p>
            <p className="text-gray-500 text-xs">Remaining</p>
          </div>
        </div>
      </div>

      {/* Current live matches */}
      {liveMatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-['Space_Grotesk'] font-bold text-white text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Live Now
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {liveMatches.map(m => (
              <LiveMatchCard key={m.id} match={m} teams={teams} onClick={() => setSelected(m)} />
            ))}
          </div>
        </div>
      )}

      {liveMatches.length === 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-xl p-8 text-center">
          <p className="text-gray-500">No matches are currently live. Check the schedule for upcoming matches.</p>
        </div>
      )}

      {/* Up next */}
      {scheduledMatches.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-['Space_Grotesk'] font-bold text-white text-lg">Up Next</h3>
          <div className="space-y-3">
            {scheduledMatches.map(m => (
              <ScheduledMatchRow key={m.id} match={m} teams={teams} onClick={() => setSelected(m)} />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <MatchDetailModal match={selected} teams={tournament.teams} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function LiveMatchCard({ match, teams, onClick }: { match: Match; teams: Team[]; onClick: () => void }) {
  const t1 = teams.find(t => t.id === match.team1Id)
  const t2 = teams.find(t => t.id === match.team2Id)
  return (
    <button
      onClick={onClick}
      className="w-full bg-gradient-to-br from-red-950/30 to-[#111827] border border-red-500/30 rounded-xl p-5 text-left hover:border-red-500/50 transition-all"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Live</span>
        {match.arena && <span className="text-gray-600 text-xs">· {match.arena}</span>}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <p className="text-white font-bold text-sm truncate">{t1?.name ?? 'TBD'}</p>
          <p className="font-['Space_Grotesk'] font-black text-4xl text-white mt-1">{match.score1}</p>
        </div>
        <div className="text-gray-600 font-bold text-sm px-4">VS</div>
        <div className="text-center flex-1">
          <p className="text-white font-bold text-sm truncate">{t2?.name ?? 'TBD'}</p>
          <p className="font-['Space_Grotesk'] font-black text-4xl text-white mt-1">{match.score2}</p>
        </div>
      </div>
    </button>
  )
}

function ScheduledMatchRow({ match, teams, onClick }: { match: Match; teams: Team[]; onClick: () => void }) {
  const t1 = teams.find(t => t.id === match.team1Id)
  const t2 = teams.find(t => t.id === match.team2Id)
  return (
    <button
      onClick={onClick}
      className="w-full bg-[#111827] border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-center gap-4 transition-all text-left"
    >
      <div className="text-gray-600 text-sm w-8 text-center font-bold">M{match.matchNumber}</div>
      <div className="flex-1 flex items-center gap-3">
        <span className="text-white text-sm font-semibold">{t1?.name ?? 'TBD'}</span>
        <span className="text-gray-600 text-xs">vs</span>
        <span className="text-white text-sm font-semibold">{t2?.name ?? 'TBD'}</span>
      </div>
      {match.scheduledAt && (
        <span className="text-gray-500 text-xs">{new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      )}
      {match.arena && <span className="text-gray-600 text-xs">{match.arena}</span>}
      <span className="text-[#00BFFF] text-xs font-semibold">Scheduled</span>
    </button>
  )
}
