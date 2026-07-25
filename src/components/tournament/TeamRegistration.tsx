import { useState } from 'react'
import type { Tournament } from '../../data/tournament'
import { registerTeam } from '../../server/tournamentServer'

interface Props {
  tournament: Tournament
  onClose: () => void
}

export function TeamRegistration({ tournament, onClose }: Props) {
  const requireCaptain = tournament.requireCaptain !== false

  const [teamName, setTeamName]   = useState('')
  const [captain, setCaptain]     = useState('')
  const [players, setPlayers]     = useState<string[]>([''])
  const [submitting, setSubmit]   = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  // When captain system is off, all slots are player slots
  const maxExtraSlots = requireCaptain ? tournament.maxTeamSize - 1 : tournament.maxTeamSize
  const totalPlayers  = requireCaptain
    ? [captain, ...players].filter(p => p.trim()).length
    : players.filter(p => p.trim()).length

  function addPlayer() {
    if (players.length < maxExtraSlots) setPlayers(p => [...p, ''])
  }

  function setPlayer(idx: number, val: string) {
    setPlayers(p => p.map((v, i) => i === idx ? val : v))
  }

  function removePlayer(idx: number) {
    setPlayers(p => p.filter((_, i) => i !== idx))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!teamName.trim()) return setError('Team name is required')
    if (requireCaptain && !captain.trim()) return setError('Captain name is required')

    const allPlayers = requireCaptain
      ? [captain.trim(), ...players.map(p => p.trim()).filter(Boolean)]
      : players.map(p => p.trim()).filter(Boolean)

    if (allPlayers.length < tournament.minTeamSize) {
      return setError(`Minimum team size is ${tournament.minTeamSize} player(s)`)
    }
    if (allPlayers.length > tournament.maxTeamSize) {
      return setError(`Maximum team size is ${tournament.maxTeamSize} player(s)`)
    }

    setSubmit(true)
    try {
      const res = await registerTeam({
        data: {
          tournamentId: tournament.id,
          teamName:     teamName.trim(),
          captain:      requireCaptain ? captain.trim() : '',
          players:      requireCaptain
            ? players.map(p => p.trim()).filter(Boolean)
            : players.map(p => p.trim()).filter(Boolean),
        },
      })
      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || 'Registration failed')
      }
    } catch {
      setError('Server error. Please try again.')
    } finally {
      setSubmit(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div>
            <h2 className="font-['Space_Grotesk'] font-bold text-white text-lg">Register Your Team</h2>
            <p className="text-gray-500 text-xs mt-0.5">{tournament.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <div className="text-5xl">✅</div>
            <h3 className="font-bold text-white text-lg">Registration Submitted!</h3>
            <p className="text-gray-400 text-sm">Your team has been submitted for review. You'll be notified once approved.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl bg-[#00BFFF] text-black font-bold text-sm">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 space-y-5">
            {/* Team name */}
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">Team Name</label>
              <input
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Blue Dynasty"
                maxLength={50}
                className="w-full bg-[#0B0F17] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00BFFF]/50"
              />
            </div>

            {/* Captain (only when requireCaptain is on) */}
            {requireCaptain && (
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                  Captain Username <span className="text-[#00BFFF]">👑</span>
                </label>
                <input
                  value={captain}
                  onChange={e => setCaptain(e.target.value)}
                  placeholder="Minecraft username"
                  maxLength={50}
                  className="w-full bg-[#0B0F17] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00BFFF]/50"
                />
              </div>
            )}

            {/* Players */}
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider">
                {requireCaptain
                  ? `Teammates (${Math.max(0, tournament.minTeamSize - 1)}–${tournament.maxTeamSize - 1})`
                  : `Players (${tournament.minTeamSize}–${tournament.maxTeamSize})`
                }
              </label>
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={p}
                      onChange={e => setPlayer(i, e.target.value)}
                      placeholder={requireCaptain ? `Player ${i + 2} username` : `Player ${i + 1} username`}
                      maxLength={50}
                      className="flex-1 bg-[#0B0F17] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00BFFF]/50"
                    />
                    <button
                      type="button"
                      onClick={() => removePlayer(i)}
                      className="px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {players.length < maxExtraSlots && (
                  <button
                    type="button"
                    onClick={addPlayer}
                    className="w-full py-2 rounded-lg border border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-white/20 text-xs transition-all"
                  >
                    + Add {requireCaptain ? 'Teammate' : 'Player'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#0B0F17] rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2">
              <span>👥</span>
              <span>Total: <strong className="text-white">{totalPlayers}</strong> player(s) · Min {tournament.minTeamSize}, Max {tournament.maxTeamSize}</span>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#00BFFF] hover:bg-[#00BFFF]/80 disabled:opacity-50 text-black font-bold text-sm transition-all"
            >
              {submitting ? 'Submitting…' : 'Submit Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
