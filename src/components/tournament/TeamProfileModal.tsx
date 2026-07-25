import type { Team, Match } from '../../data/tournament'

interface Props {
  team: Team
  matches: Match[]
  onClose: () => void
}

export function TeamProfileModal({ team, matches, onClose }: Props) {
  const teamMatches = matches.filter(m =>
    (m.team1Id === team.id || m.team2Id === team.id) && m.status === 'completed'
  )
  const wins   = teamMatches.filter(m => m.winnerId === team.id).length
  const losses = teamMatches.length - wins
  const wr     = teamMatches.length > 0 ? Math.round((wins / teamMatches.length) * 100) : null

  const statusColors: Record<string, string> = {
    approved:     'text-green-400 bg-green-400/10',
    pending:      'text-yellow-400 bg-yellow-400/10',
    rejected:     'text-red-400 bg-red-400/10',
    eliminated:   'text-gray-400 bg-gray-400/10',
    disqualified: 'text-orange-400 bg-orange-400/10',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <h2 className="font-['Space_Grotesk'] font-bold text-white text-lg">Team Profile</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Team header */}
          <div className="flex items-center gap-4">
            <img
              src={`https://mc-heads.net/avatar/${team.captain}/48`}
              className="w-14 h-14 rounded-xl"
              alt={team.captain}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div>
              <h3 className="font-['Space_Grotesk'] font-black text-white text-xl">{team.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColors[team.status] ?? 'text-gray-500 bg-gray-500/10'}`}>
                  {team.status}
                </span>
                <span className="text-gray-600 text-xs">Registered {new Date(team.registeredAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/3 rounded-lg p-3 text-center">
              <p className="font-['Space_Grotesk'] font-black text-xl text-white">{teamMatches.length}</p>
              <p className="text-gray-600 text-xs">Played</p>
            </div>
            <div className="bg-white/3 rounded-lg p-3 text-center">
              <p className="font-['Space_Grotesk'] font-black text-xl text-green-400">{wins}</p>
              <p className="text-gray-600 text-xs">Wins</p>
            </div>
            <div className="bg-white/3 rounded-lg p-3 text-center">
              <p className="font-['Space_Grotesk'] font-black text-xl text-red-400">{losses}</p>
              <p className="text-gray-600 text-xs">Losses</p>
            </div>
          </div>
          {wr !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Win Rate</span>
                <span className="text-[#00BFFF] font-bold">{wr}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#00BFFF] rounded-full" style={{ width: `${wr}%` }} />
              </div>
            </div>
          )}

          {/* Players */}
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-3">Players</p>
            <div className="space-y-2">
              {team.players.map(p => (
                <div key={p} className="flex items-center gap-3 bg-white/3 rounded-lg px-3 py-2">
                  <img
                    src={`https://mc-heads.net/avatar/${p}/20`}
                    className="w-6 h-6 rounded-sm"
                    alt={p}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-white text-sm font-medium">{p}</span>
                  {p === team.captain && (
                    <span className="ml-auto text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Captain</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {team.notes && (
            <div className="bg-white/3 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Notes</p>
              <p className="text-gray-400 text-sm">{team.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
