import { RIG_TIERS, MINING_CONSTANTS } from '../../data/mining'
import { getEconomyOverrides } from '../../store/miningStore'

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}

export function HardwareCatalogue() {
  const ov = getEconomyOverrides()
  function get<K extends keyof typeof MINING_CONSTANTS>(key: K, fallback: number): number {
    return (ov as Record<string, unknown>)[key] != null ? Number((ov as Record<string, unknown>)[key]) : fallback
  }

  const blockReward     = get('BLOCK_REWARD',       MINING_CONSTANTS.BLOCK_REWARD)
  const blockIntervalMs = get('BLOCK_INTERVAL_MS',  MINING_CONSTANTS.BLOCK_INTERVAL_MS)
  const finderPct       = get('FINDER_BONUS_PCT',   MINING_CONSTANTS.FINDER_BONUS_PCT)
  const equalPct        = get('EQUAL_SPLIT_PCT',    MINING_CONSTANTS.EQUAL_SPLIT_PCT)
  const hashratePct     = get('HASHRATE_SHARE_PCT', MINING_CONSTANTS.HASHRATE_SHARE_PCT)

  const blocksPerDay = (24 * 60 * 60 * 1000) / blockIntervalMs

  // Reference-pool projection: estimate earnings for each rig tier competing
  // against one of every tier (163 GH/s total, 5 miners). This produces
  // realistically differentiated BC/day values scaled to each rig's hashrate.
  const refPoolHashrate = RIG_TIERS.reduce((s, t) => s + t.hashrate, 0) // 163 GH/s
  const refMinerCount   = RIG_TIERS.length // 5

  function rigAvgBlockEarn(hashrate: number): number {
    const share = hashrate / refPoolHashrate
    return blockReward * finderPct  * share          // finder: prob ∝ hashrate
         + blockReward * equalPct   / refMinerCount  // equal: split evenly
         + blockReward * hashratePct * share          // hashrate share: ∝ hashrate
  }

  return (
    <div className="space-y-5">
      {/* Specs table */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="mb-5">
          <h3 className="font-['Space_Grotesk'] font-bold text-white text-base flex items-center gap-2">
            🖥️ Rig Tier Catalogue
          </h3>
          <p className="text-gray-600 text-xs mt-0.5">All hardware tiers and their specifications</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
                {['Rig', 'Hashrate', 'Cost', 'Lifespan', 'Repair', 'Max Sell', 'Blocks to ROI', 'BC/day (pool est.)'].map(h => (
                  <th key={h} className="text-left py-3 pr-4 text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RIG_TIERS.map(rig => {
                const lifedays   = rig.maxDurability / (rig.lossPerSecond * 86400)
                const repairCost = Math.ceil(rig.cost * MINING_CONSTANTS.REPAIR_COST_PCT)
                const maxSell    = Math.floor(rig.cost * MINING_CONSTANTS.SELL_MAX_PCT)
                const avgEarn    = rigAvgBlockEarn(rig.hashrate)
                const dailyEarn  = avgEarn * blocksPerDay
                const blocksROI  = Math.ceil(rig.cost / (avgEarn || 1))
                return (
                  <tr key={rig.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{rig.emoji}</span>
                        <div>
                          <p className={`font-semibold ${rig.color}`}>{rig.name}</p>
                          <p className="text-gray-700 text-[9px]">{rig.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-['Space_Grotesk'] font-black text-[#00BFFF]">{rig.hashrate}</span>
                      <span className="text-gray-600"> GH/s</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-amber-400">{rig.cost.toLocaleString()}</span>
                      <span className="text-gray-600"> BC</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-white">{lifedays.toFixed(1)}d</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-orange-400">{repairCost.toLocaleString()} BC</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-green-400">{maxSell.toLocaleString()} BC</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-purple-400 font-bold">{blocksROI.toLocaleString()}</span>
                      <span className="text-gray-600"> blocks</span>
                    </td>
                    <td className="py-3">
                      <span className="text-cyan-400 font-bold">{fmt(dailyEarn, 0)}</span>
                      <span className="text-gray-600"> BC</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {RIG_TIERS.map(rig => {
          const lifedays = rig.maxDurability / (rig.lossPerSecond * 86400)
          const daysROI  = (rig.cost / (rigAvgBlockEarn(rig.hashrate) * blocksPerDay)) || 0
          return (
            <div key={rig.id}
              className={`glass rounded-xl p-4 border ${rig.borderColor} text-center`}
              style={{ boxShadow: `0 0 20px ${rig.glowColor}20` }}>
              <span className="text-2xl">{rig.emoji}</span>
              <p className={`font-semibold text-xs mt-1 ${rig.color}`}>{rig.name}</p>
              <p className="font-['Space_Grotesk'] font-black text-xl text-white mt-2">
                {rig.hashrate} <span className="text-gray-600 text-[10px] font-normal">GH/s</span>
              </p>
              <div className="mt-3 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost</span>
                  <span className="text-amber-400 font-bold">{rig.cost.toLocaleString()} BC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lifespan</span>
                  <span className="text-white">{lifedays.toFixed(1)}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ROI</span>
                  <span className="text-purple-400 font-bold">{daysROI.toFixed(1)}d</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
