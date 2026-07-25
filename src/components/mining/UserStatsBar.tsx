import { useMining } from '../../context/MiningContext'
import { RIG_TIERS } from '../../data/mining'

export function UserStatsBar() {
  const { user, logout } = useMining()
  if (!user) return null

  const activeRigs = user.rigs.filter(r => r.status === 'mining')
  const totalHashrate = activeRigs.reduce((sum, r) => {
    const tier = RIG_TIERS.find(t => t.id === r.tierId)!
    return sum + tier.hashrate
  }, 0)

  const stats = [
    { label: 'BlueCoin',    value: Math.floor(user.balance).toLocaleString(), suffix: 'BC',   icon: '💎', glow: 'rgba(0,191,255,0.3)' },
    { label: 'Gems',        value: Math.floor(user.gems ?? 0).toLocaleString(), suffix: '💎',   icon: '✨', glow: 'rgba(167,139,250,0.3)' },
    { label: 'Hashrate',    value: totalHashrate.toString(),                   suffix: 'GH/s', icon: '⚡', glow: 'rgba(250,204,21,0.3)' },
    { label: 'Active Rigs', value: activeRigs.length.toString(),               suffix: `/${user.rigs.length}`, icon: '⛏️', glow: 'rgba(0,191,255,0.2)' },
  ]

  return (
    <div className="px-4 pb-6">
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl border border-white/8 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Username */}
            <div className="flex items-center gap-3 sm:border-r sm:border-white/8 sm:pr-6">
              <div className="w-9 h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-sm font-black text-[#00BFFF]">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-bold">{user.username}</p>
                <p className="text-gray-600 text-[10px] uppercase tracking-wide">Miner</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wide">{s.label}</p>
                    <p className="text-white text-sm font-bold leading-none">
                      {s.value}
                      <span className="text-gray-500 text-[10px] font-normal ml-1">{s.suffix}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="sm:ml-auto px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/5 border border-white/8 hover:border-white/20 transition-all duration-200"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
