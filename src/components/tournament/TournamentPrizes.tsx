import type { Tournament } from '../../data/tournament'

interface Props { tournament: Tournament | null }

const PLACEMENT_STYLES = [
  { bg: 'from-yellow-500/20 to-yellow-600/5', border: 'border-yellow-500/30', accent: 'text-yellow-400', glow: 'shadow-yellow-500/10' },
  { bg: 'from-gray-400/15 to-gray-500/5',    border: 'border-gray-400/25',   accent: 'text-gray-300',   glow: 'shadow-gray-400/10'  },
  { bg: 'from-orange-700/20 to-orange-800/5', border: 'border-orange-700/30', accent: 'text-orange-400', glow: 'shadow-orange-700/10' },
]

const REWARD_ICONS: Record<string, string> = {
  coins:      '💰',
  gems:       '💎',
  rank:       '👑',
  crate_keys: '🗝️',
  custom:     '🎁',
}

export function TournamentPrizes({ tournament }: Props) {
  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4 opacity-20">🎁</div>
        <p className="text-gray-500">No active tournament.</p>
      </div>
    )
  }

  const { prizes, name, prizePool } = tournament
  const sorted = [...prizes].sort((a, b) => a.placement - b.placement)

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-['Space_Grotesk'] font-black text-3xl text-white">{name}</h2>
        {prizePool && (
          <p className="text-[#00BFFF] font-semibold text-lg mt-1">Total Prize Pool: {prizePool}</p>
        )}
      </div>

      {/* Top 3 podium */}
      {sorted.length >= 1 && (
        <div className="grid md:grid-cols-3 gap-4">
          {[sorted[0], sorted[1], sorted[2]].map((prize, idx) => {
            if (!prize) return null
            const style = PLACEMENT_STYLES[idx] ?? PLACEMENT_STYLES[2]
            return (
              <div
                key={prize.placement}
                className={`bg-gradient-to-b ${style.bg} border ${style.border} rounded-2xl p-6 text-center space-y-4 shadow-xl ${style.glow} ${idx === 0 ? 'md:order-2' : idx === 1 ? 'md:order-1' : 'md:order-3'}`}
              >
                <div className="text-5xl">{prize.label.split(' ')[0]}</div>
                <div>
                  <p className={`font-['Space_Grotesk'] font-black text-xl ${style.accent}`}>
                    {prize.label.split(' ').slice(1).join(' ')}
                  </p>
                </div>
                <div className="space-y-2">
                  {prize.rewards.map((r, ri) => (
                    <div key={ri} className="bg-black/20 rounded-lg px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span>{REWARD_ICONS[r.type] ?? '🎁'}</span>
                        <span className="text-white text-sm font-medium">{r.label}</span>
                      </div>
                      <span className={`font-['Space_Grotesk'] font-black text-sm ${style.accent}`}>{r.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Additional prizes */}
      {sorted.length > 3 && (
        <div className="space-y-3">
          <h3 className="font-['Space_Grotesk'] font-semibold text-white text-lg">Other Prizes</h3>
          <div className="space-y-3">
            {sorted.slice(3).map(prize => (
              <div key={prize.placement} className="bg-[#111827] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl w-10 text-center">{prize.label.split(' ')[0]}</div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{prize.label.split(' ').slice(1).join(' ')}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {prize.rewards.map(r => `${REWARD_ICONS[r.type]} ${r.amount} ${r.label}`).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prizes.length === 0 && (
        <div className="text-center py-16 text-gray-500">No prizes configured yet.</div>
      )}
    </div>
  )
}
