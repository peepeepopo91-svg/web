import { useState, useEffect } from 'react'
import type { Tournament } from '../../data/tournament'
import { MATCH_STATUS_LABEL } from '../../data/tournament'

interface Props { tournament: Tournament | null }

function MatchCountdown({ target }: { target: number }) {
  const [diff, setDiff] = useState(target - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  if (diff <= 0) return <span className="text-green-400 font-bold text-xs">Starting soon</span>
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return (
    <span className="text-[#00BFFF] font-mono text-xs">
      {h > 0 && `${h}h `}{m}m {s}s
    </span>
  )
}

export function TournamentSchedule({ tournament }: Props) {
  if (!tournament) {
    return <EmptyState />
  }

  const { matches, teams } = tournament
  const scheduled = [...matches]
    .filter(m => m.status !== 'bye')
    .sort((a, b) => {
      // Sort by: live first, then scheduled by time, then pending, then completed
      const order = { live: 0, scheduled: 1, pending: 2, completed: 3, bye: 4 }
      const ao = order[a.status] ?? 5
      const bo = order[b.status] ?? 5
      if (ao !== bo) return ao - bo
      return (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0)
    })

  if (scheduled.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4 opacity-20">📅</div>
        <p className="text-gray-500">No matches scheduled yet.</p>
      </div>
    )
  }

  const getTeam = (id: string | null) => teams.find(t => t.id === id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl">{tournament.name} — Schedule</h2>
        <p className="text-gray-500 text-sm mt-0.5">{scheduled.length} match(es) total</p>
      </div>

      <div className="space-y-3">
        {scheduled.map(match => {
          const t1 = getTeam(match.team1Id)
          const t2 = getTeam(match.team2Id)
          const statusColors: Record<string, string> = {
            live:      'border-l-red-400',
            scheduled: 'border-l-[#00BFFF]',
            completed: 'border-l-green-500',
            pending:   'border-l-gray-700',
          }
          return (
            <div
              key={match.id}
              className={`bg-[#111827] border border-white/5 rounded-xl p-4 border-l-4 ${statusColors[match.status] || 'border-l-gray-700'}`}
            >
              <div className="flex flex-wrap items-center gap-4">
                {/* Status */}
                <div className="w-20">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                    match.status === 'live' ? 'bg-red-500/15 text-red-400' :
                    match.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                    match.status === 'scheduled' ? 'bg-[#00BFFF]/10 text-[#00BFFF]' :
                    'bg-white/5 text-gray-600'
                  }`}>
                    {MATCH_STATUS_LABEL[match.status]}
                  </span>
                </div>

                {/* Teams + score */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {t1 && <img src={`https://mc-heads.net/avatar/${t1.captain}/16`} className="w-5 h-5 rounded-sm flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                    <span className={`text-sm font-semibold truncate ${match.winnerId === match.team1Id ? 'text-[#00BFFF]' : 'text-white'}`}>
                      {t1?.name ?? 'TBD'}
                    </span>
                    {match.status === 'completed' && <span className="font-['Space_Grotesk'] font-black text-white">{match.score1}</span>}
                  </div>
                  <span className="text-gray-600 text-xs flex-shrink-0">vs</span>
                  <div className="flex items-center gap-2 min-w-0">
                    {match.status === 'completed' && <span className="font-['Space_Grotesk'] font-black text-white">{match.score2}</span>}
                    <span className={`text-sm font-semibold truncate ${match.winnerId === match.team2Id ? 'text-[#00BFFF]' : 'text-white'}`}>
                      {t2?.name ?? 'TBD'}
                    </span>
                    {t2 && <img src={`https://mc-heads.net/avatar/${t2.captain}/16`} className="w-5 h-5 rounded-sm flex-shrink-0" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                  {match.arena    && <span>{match.arena}</span>}
                  {match.gamemode && <span>{match.gamemode}</span>}
                  {match.scheduledAt && match.status === 'scheduled' && (
                    <div className="flex flex-col items-end gap-0.5">
                      <span>{new Date(match.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <MatchCountdown target={match.scheduledAt} />
                    </div>
                  )}
                  {match.completedAt && match.status === 'completed' && (
                    <span>{new Date(match.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                  <span className="text-gray-700">M{match.matchNumber}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-6xl mb-4 opacity-20">📅</div>
      <p className="text-gray-500">No active tournament.</p>
    </div>
  )
}
