import { useState } from 'react'
import type { Tournament } from '../../data/tournament'
import { STATUS_LABEL, STATUS_COLOR } from '../../data/tournament'
import { TournamentBracket }  from './TournamentBracket'
import { TournamentStats }    from './TournamentStats'

interface Props { archives: Tournament[] }

export function TournamentArchive({ archives }: Props) {
  const [selected, setSelected] = useState<Tournament | null>(null)
  const [view, setView]         = useState<'list' | 'bracket' | 'stats'>('list')
  const [page, setPage]         = useState(1)
  const PER_PAGE = 10

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setSelected(null); setView('list') }}
            className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Back to Archive
          </button>
          <div className="h-4 w-px bg-white/10" />
          <h2 className="font-['Space_Grotesk'] font-bold text-white">{selected.name}</h2>
        </div>

        <div className="flex gap-2">
          {(['list', 'bracket', 'stats'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                view === v
                  ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
                  : 'text-gray-500 hover:text-white border border-white/5'
              }`}
            >
              {v === 'list' ? 'Overview' : v}
            </button>
          ))}
        </div>

        {view === 'list'    && <ArchiveDetail tournament={selected} />}
        {view === 'bracket' && <TournamentBracket tournament={selected} />}
        {view === 'stats'   && <TournamentStats tournament={selected} />}
      </div>
    )
  }

  if (archives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="text-6xl mb-4 opacity-20">🗃️</div>
        <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl mb-2">No Archived Tournaments</h2>
        <p className="text-gray-500">Completed tournaments will appear here.</p>
      </div>
    )
  }

  const sorted = [...archives].sort((a, b) => b.createdAt - a.createdAt)
  const total  = sorted.length
  const pages  = Math.ceil(total / PER_PAGE)
  const paged  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-['Space_Grotesk'] font-bold text-white text-xl">Tournament Archive</h2>
        <p className="text-gray-500 text-sm mt-0.5">{total} tournament(s) on record</p>
      </div>

      <div className="space-y-4">
        {paged.map(t => {
          const winner     = getWinner(t)
          const approvedCt = t.teams.filter(tm => tm.status === 'approved').length
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full bg-[#111827] border border-white/5 hover:border-white/15 rounded-xl p-5 text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-2xl flex-shrink-0">
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-['Space_Grotesk'] font-bold text-white group-hover:text-[#00BFFF] transition-colors">
                      {t.name}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    {t.startDate     && <span>📅 {new Date(t.startDate).toLocaleDateString()}</span>}
                    <span>👥 {approvedCt} teams</span>
                    <span>🎮 {t.matches.filter(m => m.status === 'completed').length} matches</span>
                    {t.gamemode && <span>⚔️ {t.gamemode}</span>}
                    {winner && <span className="text-yellow-400 font-semibold">🥇 {winner}</span>}
                  </div>
                  {t.description && (
                    <p className="text-gray-600 text-xs mt-2 truncate">{t.description}</p>
                  )}
                </div>
                <span className="text-gray-600 group-hover:text-[#00BFFF] transition-colors flex-shrink-0">→</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-500 hover:text-white disabled:opacity-30">← Prev</button>
          <span className="px-3 py-1.5 text-xs text-gray-500">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-500 hover:text-white disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  )
}

function getWinner(t: Tournament): string | null {
  if (!t.bracket) return null
  const lastRound = t.bracket.rounds[t.bracket.rounds.length - 1]
  if (!lastRound) return null
  const finalMatchId = lastRound.matchIds[0]
  const finalMatch   = t.matches.find(m => m.id === finalMatchId)
  if (!finalMatch?.winnerId) return null
  return t.teams.find(tm => tm.id === finalMatch.winnerId)?.name ?? null
}

function ArchiveDetail({ tournament: t }: { tournament: Tournament }) {
  const winner        = getWinner(t)
  const runnerUp      = getRunnerUp(t)
  const approvedTeams = t.teams.filter(tm => tm.status === 'approved')
  const totalPlayers  = approvedTeams.reduce((n, tm) => n + tm.players.length, 0)
  const completed     = t.matches.filter(m => m.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Teams',    value: approvedTeams.length, icon: '👥' },
          { label: 'Players',  value: totalPlayers,         icon: '⚔️' },
          { label: 'Matches',  value: completed,            icon: '🎮' },
          { label: 'Gamemode', value: t.gamemode || '—',    icon: '🎯' },
        ].map(c => (
          <div key={c.label} className="bg-[#111827] border border-white/5 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="font-['Space_Grotesk'] font-bold text-white text-xl">{c.value}</div>
            <div className="text-gray-500 text-xs">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Winners */}
      {(winner || runnerUp) && (
        <div className="bg-gradient-to-br from-yellow-950/30 to-[#111827] border border-yellow-500/20 rounded-xl p-6 space-y-4">
          <h3 className="font-['Space_Grotesk'] font-bold text-white text-lg">Final Results</h3>
          <div className="space-y-3">
            {winner   && <ResultRow icon="🥇" label="Champion"  name={winner} />}
            {runnerUp && <ResultRow icon="🥈" label="Runner-up" name={runnerUp} />}
          </div>
        </div>
      )}

      {/* Prizes */}
      {t.prizes.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-3">
          <h3 className="font-['Space_Grotesk'] font-semibold text-white">Prize Distribution</h3>
          {t.prizes.map(p => (
            <div key={p.placement} className="flex items-center gap-3 text-sm">
              <span>{p.label.split(' ')[0]}</span>
              <span className="text-white font-medium">{p.label.split(' ').slice(1).join(' ')}</span>
              <span className="text-gray-500">— {p.rewards.map(r => `${r.amount} ${r.label}`).join(' + ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getRunnerUp(t: Tournament): string | null {
  if (!t.bracket) return null
  const lastRound = t.bracket.rounds[t.bracket.rounds.length - 1]
  const finalMatch = t.matches.find(m => m.id === lastRound?.matchIds[0])
  if (!finalMatch?.winnerId) return null
  const loserId = finalMatch.team1Id === finalMatch.winnerId ? finalMatch.team2Id : finalMatch.team1Id
  return t.teams.find(tm => tm.id === loserId)?.name ?? null
}

function ResultRow({ icon, label, name }: { icon: string; label: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-white font-bold">{name}</p>
      </div>
    </div>
  )
}
