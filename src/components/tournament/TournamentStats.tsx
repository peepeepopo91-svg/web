import type { Tournament } from '../../data/tournament'

interface Props { tournament: Tournament | null }

export function TournamentStats({ tournament }: Props) {
  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4 opacity-20">📊</div>
        <p className="text-gray-500">No active tournament.</p>
      </div>
    )
  }

  const { matches, teams } = tournament
  const totalMatches     = matches.filter(m => m.status !== 'bye').length
  const completedMatches = matches.filter(m => m.status === 'completed').length
  const liveMatches      = matches.filter(m => m.status === 'live').length
  const remainingMatches = matches.filter(m => m.status === 'scheduled' || m.status === 'pending').length
  const approvedTeams    = teams.filter(t => t.status === 'approved').length
  const totalPlayers     = teams.filter(t => t.status === 'approved').reduce((n, t) => n + t.players.length, 0)
  const pct              = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

  const stats = [
    { label: 'Approved Teams',      value: approvedTeams,    icon: '👥', color: 'text-[#00BFFF]' },
    { label: 'Total Players',       value: totalPlayers,     icon: '⚔️', color: 'text-purple-400' },
    { label: 'Total Matches',       value: totalMatches,     icon: '🎮', color: 'text-white' },
    { label: 'Completed',           value: completedMatches, icon: '✅', color: 'text-green-400'  },
    { label: 'Remaining',           value: remainingMatches, icon: '⏳', color: 'text-yellow-400' },
    { label: 'Live Now',            value: liveMatches,      icon: '🔴', color: 'text-red-400'    },
  ]

  // Win rate leader board (top teams by record)
  const teamStats = teams
    .filter(t => t.status === 'approved' || t.status === 'eliminated')
    .map(team => {
      const teamMatches = matches.filter(m =>
        (m.team1Id === team.id || m.team2Id === team.id) && m.status === 'completed'
      )
      const wins   = teamMatches.filter(m => m.winnerId === team.id).length
      const losses = teamMatches.length - wins
      const wr     = teamMatches.length > 0 ? Math.round((wins / teamMatches.length) * 100) : null
      return { team, wins, losses, played: teamMatches.length, wr }
    })
    .sort((a, b) => b.wins - a.wins || (b.wr ?? 0) - (a.wr ?? 0))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl">{tournament.name} — Statistics</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-[#111827] border border-white/5 rounded-xl p-5 text-center">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`font-['Space_Grotesk'] font-black text-3xl ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-white font-semibold text-sm">Tournament Progress</p>
          <span className="font-['Space_Grotesk'] font-black text-xl text-[#00BFFF]">{pct}%</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00BFFF] to-[#0066FF] rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-gray-600 text-xs">{completedMatches} of {totalMatches} matches completed</p>
      </div>

      {/* Team standings */}
      {teamStats.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-['Space_Grotesk'] font-semibold text-white text-lg">Team Standings</h3>
          <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-gray-600 text-[11px] uppercase tracking-wider">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Team</th>
                  <th className="text-center px-3 py-3">Played</th>
                  <th className="text-center px-3 py-3">W</th>
                  <th className="text-center px-3 py-3">L</th>
                  <th className="text-center px-3 py-3">Win %</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map(({ team, wins, losses, played, wr }, i) => (
                  <tr key={team.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-sm font-bold">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img src={`https://mc-heads.net/avatar/${team.captain}/16`} className="w-5 h-5 rounded-sm" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <span className="text-white text-sm font-semibold">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-400 text-sm">{played}</td>
                    <td className="px-3 py-3 text-center text-green-400 text-sm font-bold">{wins}</td>
                    <td className="px-3 py-3 text-center text-red-400 text-sm font-bold">{losses}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-['Space_Grotesk'] font-bold text-sm ${wr !== null ? (wr >= 50 ? 'text-[#00BFFF]' : 'text-gray-400') : 'text-gray-600'}`}>
                        {wr !== null ? `${wr}%` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
