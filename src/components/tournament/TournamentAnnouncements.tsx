import type { Tournament } from '../../data/tournament'

interface Props { tournament: Tournament | null }

const TYPE_STYLES = {
  info:    { border: 'border-[#00BFFF]/20', bg: 'bg-[#00BFFF]/5', icon: 'ℹ️',  accent: 'text-[#00BFFF]' },
  warning: { border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', icon: '⚠️', accent: 'text-yellow-400' },
  success: { border: 'border-green-500/20',  bg: 'bg-green-500/5',  icon: '✅', accent: 'text-green-400'  },
}

export function TournamentAnnouncements({ tournament }: Props) {
  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4 opacity-20">📣</div>
        <p className="text-gray-500">No active tournament.</p>
      </div>
    )
  }

  const { announcements, name } = tournament

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl">{name} — Announcements</h2>
        <p className="text-gray-500 text-sm mt-0.5">{announcements.length} announcement(s)</p>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4 opacity-20">📣</div>
          <p className="text-gray-500">No announcements yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, i) => {
            const style = TYPE_STYLES[ann.type] ?? TYPE_STYLES.info
            return (
              <div
                key={ann.id}
                className={`border ${style.border} ${style.bg} rounded-xl p-5 space-y-2 ${i === 0 ? 'ring-1 ring-white/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-['Space_Grotesk'] font-bold text-white text-base`}>{ann.title}</h3>
                      {i === 0 && (
                        <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-gray-400">Latest</span>
                      )}
                    </div>
                    {ann.body && (
                      <p className="text-gray-400 text-sm mt-2 leading-relaxed">{ann.body}</p>
                    )}
                    <p className="text-gray-600 text-xs mt-2">{new Date(ann.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
