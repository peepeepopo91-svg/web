import type { Match, Team } from '../../data/tournament'
import { MATCH_STATUS_LABEL } from '../../data/tournament'

interface Props {
  match: Match
  teams: Team[]
  onClose: () => void
}

export function MatchDetailModal({ match, teams, onClose }: Props) {
  const t1 = teams.find(t => t.id === match.team1Id)
  const t2 = teams.find(t => t.id === match.team2Id)

  const fields: [string, string][] = [
    ['Match #',     String(match.matchNumber)],
    ['Bracket',     match.bracketSide.replace('_', ' ')],
    ['Round',       String(match.round + 1)],
    ['Status',      MATCH_STATUS_LABEL[match.status]],
    ['Gamemode',    match.gamemode  || '—'],
    ['Arena',       match.arena     || '—'],
    ['Referee',     match.referee   || '—'],
    ['Scheduled',   match.scheduledAt  ? new Date(match.scheduledAt).toLocaleString()  : '—'],
    ['Completed',   match.completedAt  ? new Date(match.completedAt).toLocaleString()  : '—'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <h2 className="font-['Space_Grotesk'] font-bold text-white text-lg">Match Details</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score display */}
          <div className="bg-[#0B0F17] rounded-xl p-6">
            <div className="flex items-center justify-between gap-4">
              <TeamSide team={t1} score={match.score1} winner={match.winnerId === match.team1Id} />
              <div className="text-gray-600 font-bold text-sm uppercase tracking-widest">VS</div>
              <TeamSide team={t2} score={match.score2} winner={match.winnerId === match.team2Id} align="right" />
            </div>
          </div>

          {/* Match info */}
          <div className="grid grid-cols-2 gap-2">
            {fields.map(([label, value]) => (
              <div key={label} className="bg-white/3 rounded-lg px-3 py-2">
                <p className="text-gray-600 text-[10px] uppercase tracking-wider">{label}</p>
                <p className="text-white text-xs font-medium capitalize mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Players */}
          <div className="grid md:grid-cols-2 gap-4">
            {[t1, t2].map((team, idx) => team && (
              <div key={idx} className="bg-white/3 rounded-xl p-4 space-y-2">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{team.name}</p>
                {team.players.map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <img
                      src={`https://mc-heads.net/avatar/${p}/16`}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      className="w-4 h-4 rounded-sm"
                      alt=""
                    />
                    <span className="text-white text-xs">{p}</span>
                    {p === team.captain && <span className="text-[9px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">Captain</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Notes */}
          {match.notes && (
            <div className="bg-[#00BFFF]/5 border border-[#00BFFF]/10 rounded-xl p-4">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Notes</p>
              <p className="text-gray-300 text-sm">{match.notes}</p>
            </div>
          )}

          {/* Replay link */}
          {match.replayLink && (
            <a
              href={match.replayLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-[#00BFFF] font-medium transition-all"
            >
              🎬 View Replay →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamSide({ team, score, winner, align = 'left' }: { team?: Team; score: number; winner: boolean; align?: 'left' | 'right' }) {
  return (
    <div className={`flex-1 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p className={`font-['Space_Grotesk'] font-black text-3xl ${winner ? 'text-[#00BFFF]' : 'text-white'}`}>{score}</p>
      <p className={`text-sm font-semibold mt-1 ${winner ? 'text-white' : 'text-gray-400'}`}>
        {team?.name ?? <span className="italic text-gray-600">TBD</span>}
      </p>
      {winner && <p className="text-[10px] text-[#00BFFF] font-bold mt-0.5 uppercase tracking-wider">Winner ✓</p>}
    </div>
  )
}
