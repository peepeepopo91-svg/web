import { useState } from 'react'
import { useMining } from '../../context/MiningContext'
import { RIG_TIERS } from '../../data/mining'

export function RigShop() {
  const { user, purchaseRig } = useMining()
  const [buying, setBuying] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleBuy(tierId: string) {
    setBuying(tierId)
    setErrors(e => ({ ...e, [tierId]: '' }))
    const result = await purchaseRig(tierId)
    if (result.error) setErrors(e => ({ ...e, [tierId]: result.error! }))
    setBuying(null)
  }

  const MAX_RIGS = 10
  const totalRigs = user?.rigs.length ?? 0
  const atLimit = totalRigs >= MAX_RIGS

  const ownedCounts = RIG_TIERS.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = user?.rigs.filter(r => r.tierId === t.id).length ?? 0
    return acc
  }, {})

  return (
    <section className="px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-['Space_Grotesk'] font-bold text-xl text-white">
              Rig <span className="text-gradient">Shop</span>
            </h2>
            <p className="text-gray-600 text-xs mt-0.5">Purchase mining hardware to grow your hashrate</p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00BFFF]/8 border border-[#00BFFF]/15">
                <span className="text-[#00BFFF] text-sm font-bold">{Math.floor(user.balance).toLocaleString()}</span>
                <span className="text-gray-500 text-xs">BC available</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${atLimit ? 'bg-red-500/8 border-red-500/25' : 'bg-white/3 border-white/8'}`}>
                <span className={`text-sm font-bold tabular-nums ${atLimit ? 'text-red-400' : 'text-gray-300'}`}>{totalRigs}</span>
                <span className="text-gray-500 text-xs">/ {MAX_RIGS} rigs</span>
              </div>
            </div>
          )}
        </div>

        {atLimit && user && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/6">
            <span className="text-red-400 text-lg shrink-0">⛔</span>
            <p className="text-red-400 text-sm font-semibold">
              You have reached the maximum limit of {MAX_RIGS} mining rigs.
              <span className="block text-red-400/60 text-xs font-normal mt-0.5">Sell an existing rig to purchase a new one.</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {RIG_TIERS.map(tier => {
            const canAfford = (user?.balance ?? 0) >= tier.cost
            const owned = ownedCounts[tier.id]
            const isBuying = buying === tier.id
            const errMsg = errors[tier.id]
            const daysEstimate = (tier.maxDurability / tier.lossPerSecond / 86400).toFixed(1)

            return (
              <div
                key={tier.id}
                className={`relative glass rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-300 group ${tier.borderColor}`}
                style={canAfford && user ? { boxShadow: `0 0 20px ${tier.glowColor}` } : undefined}
              >
                {/* Glow bg */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(ellipse at top, ${tier.glowColor} 0%, transparent 70%)`, opacity: 0.08 }}
                />

                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{tier.emoji}</span>
                  {owned > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20">
                      Owned: {owned}
                    </span>
                  )}
                </div>

                <div>
                  <p className={`font-bold text-sm ${tier.color}`}>{tier.name}</p>
                  <p className="text-gray-600 text-[10px] mt-1 leading-relaxed">{tier.description}</p>
                </div>

                {/* Stats */}
                <div className="space-y-1.5 py-3 border-t border-b border-white/5">
                  {[
                    { label: 'Hashrate', value: `${tier.hashrate} GH/s` },
                    { label: 'Lifespan',  value: `~${daysEstimate} days` },
                    { label: 'Repair',   value: `${Math.round(tier.cost * 0.35)} BC full` },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-600">{s.label}</span>
                      <span className="text-[11px] text-gray-300 font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Price + buy */}
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1 mb-2.5">
                    <span className={`text-xl font-black ${tier.color}`}>{tier.cost.toLocaleString()}</span>
                    <span className="text-gray-500 text-xs">BC</span>
                  </div>

                  {errMsg && <p className="text-red-400 text-[10px] mb-2">⚠ {errMsg}</p>}

                  {!user ? (
                    <div className="w-full py-2 rounded-xl text-[11px] text-center text-gray-600 border border-white/8">
                      Login to purchase
                    </div>
                  ) : atLimit ? (
                    <div className="w-full py-2 rounded-xl text-[11px] text-center text-red-400/60 border border-red-500/15 bg-red-500/4 cursor-not-allowed">
                      Rig limit reached
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(tier.id)}
                      disabled={!canAfford || isBuying}
                      className={`w-full py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
                        canAfford
                          ? 'btn-primary text-white'
                          : 'bg-white/3 text-gray-600 border border-white/8 cursor-not-allowed'
                      }`}
                    >
                      {isBuying ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                          Buying…
                        </span>
                      ) : canAfford ? (
                        'Buy Now'
                      ) : (
                        `Need ${(tier.cost - Math.floor(user.balance)).toLocaleString()} more BC`
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
