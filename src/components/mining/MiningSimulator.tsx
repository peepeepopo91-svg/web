import { useState } from 'react'
import { RIG_TIERS, MINING_CONSTANTS, EXCHANGE_CONSTANTS } from '../../data/mining'
import { getEconomyOverrides, getExchangeRate } from '../../store/miningStore'

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec })
}
function fmtMs(ms: number) {
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(1)}h`
  if (ms >= 60_000)    return `${Math.round(ms / 60_000)}m`
  return `${Math.round(ms / 1000)}s`
}

export function MiningSimulator() {
  const [simRigTier,  setSimRigTier]  = useState('pro')
  const [simRigCount, setSimRigCount] = useState(3)
  const [simBlocks,   setSimBlocks]   = useState(24)

  const ov  = getEconomyOverrides()
  const now = Date.now()

  function get<K extends keyof typeof MINING_CONSTANTS>(key: K, fallback: number): number {
    return (ov as Record<string, unknown>)[key] != null ? Number((ov as Record<string, unknown>)[key]) : fallback
  }
  function getEx<K extends keyof typeof EXCHANGE_CONSTANTS>(key: K, fallback: number): number {
    return (ov as Record<string, unknown>)[key] != null ? Number((ov as Record<string, unknown>)[key]) : fallback
  }

  const blockReward     = get('BLOCK_REWARD',       MINING_CONSTANTS.BLOCK_REWARD)
  const blockIntervalMs = get('BLOCK_INTERVAL_MS',  MINING_CONSTANTS.BLOCK_INTERVAL_MS)
  const finderPct       = get('FINDER_BONUS_PCT',   MINING_CONSTANTS.FINDER_BONUS_PCT)
  const equalPct        = get('EQUAL_SPLIT_PCT',    MINING_CONSTANTS.EQUAL_SPLIT_PCT)
  const hashratePct     = get('HASHRATE_SHARE_PCT', MINING_CONSTANTS.HASHRATE_SHARE_PCT)
  const feePct          = getEx('FEE_PCT',          EXCHANGE_CONSTANTS.FEE_PCT)

  const currentRate  = getExchangeRate(now)
  const blocksPerDay = (24 * 60 * 60 * 1000) / blockIntervalMs

  const simTier      = RIG_TIERS.find(t => t.id === simRigTier) ?? RIG_TIERS[2]
  const userHashrate = simTier.hashrate * simRigCount

  // Reference-pool projection: user competes against a pool of one of every
  // tier (163 GH/s, 5 miners). More rigs / better tier → higher userShare →
  // higher earnings. Consistent with the Hardware Catalogue formula.
  const refPoolHashrate = RIG_TIERS.reduce((s, t) => s + t.hashrate, 0) // 163 GH/s
  const refMinerCount   = RIG_TIERS.length  // 5
  const totalHashrate   = userHashrate + refPoolHashrate
  const userShare       = userHashrate / totalHashrate
  const avgPerBlock     = blockReward * finderPct  * userShare
                        + blockReward * equalPct   / (refMinerCount + 1)
                        + blockReward * hashratePct * userShare
  const simEarnings   = avgPerBlock * simBlocks
  const simDays       = simBlocks / blocksPerDay
  const rigCost       = simTier.cost * simRigCount
  const blocksToROI   = rigCost / (avgPerBlock || 1)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

      {/* Controls */}
      <div className="lg:col-span-2 space-y-4">
        <div className="glass rounded-2xl border border-white/8 p-6">
          <div className="mb-5">
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-base flex items-center gap-2">
              🧪 Mining Simulator
            </h3>
            <p className="text-gray-600 text-xs mt-0.5">Projected earnings with live economy settings</p>
          </div>
          <div className="space-y-5">
            {/* Rig tier picker */}
            <div>
              <label className="text-gray-400 text-xs font-semibold block mb-2">Rig Tier</label>
              <div className="grid grid-cols-1 gap-2">
                {RIG_TIERS.map(t => (
                  <button key={t.id} onClick={() => setSimRigTier(t.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                      simRigTier === t.id ? `${t.borderColor} bg-white/5` : 'border-white/8 hover:border-white/15'
                    }`}>
                    <span className="text-base">{t.emoji}</span>
                    <div className="flex-1">
                      <p className={`text-xs font-semibold ${simRigTier === t.id ? t.color : 'text-gray-400'}`}>{t.name}</p>
                      <p className="text-gray-700 text-[10px]">{t.hashrate} GH/s · {t.cost.toLocaleString()} BC</p>
                    </div>
                    {simRigTier === t.id && <span className={`text-[10px] font-bold ${t.color}`}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Rig count slider */}
            <div>
              <label className="text-gray-400 text-xs font-semibold block mb-2">
                Number of Rigs: <span className="text-white">{simRigCount}</span>
              </label>
              <input type="range" min={1} max={10} step={1} value={simRigCount}
                onChange={e => setSimRigCount(Number(e.target.value))}
                className="w-full accent-[#00BFFF]" />
              <div className="flex justify-between text-[10px] text-gray-700 mt-1">
                <span>1</span><span>5</span><span>10</span>
              </div>
            </div>

            {/* Blocks slider */}
            <div>
              <label className="text-gray-400 text-xs font-semibold block mb-2">
                Blocks to Simulate: <span className="text-white">{simBlocks}</span>
              </label>
              <input type="range" min={1} max={500} step={1} value={simBlocks}
                onChange={e => setSimBlocks(Number(e.target.value))}
                className="w-full accent-[#00BFFF]" />
              <div className="flex justify-between text-[10px] text-gray-700 mt-1">
                <span>1</span><span>≈{fmt(blocksPerDay, 0)}/day</span><span>500</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-3 space-y-4">
        <div className="glass rounded-2xl border border-[#00BFFF]/15 p-6">
          <div className="mb-5">
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-base flex items-center gap-2">
              📈 Projected Earnings
            </h3>
            <p className="text-gray-600 text-xs mt-0.5">{simRigCount}× {simTier.name} over {simBlocks} blocks</p>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {[
              { label: 'Total Hashrate', value: `${userHashrate} GH/s`,          color: 'text-[#00BFFF]',  sub: `${simRigCount} × ${simTier.hashrate} GH/s` },
              { label: 'Avg Per Block',  value: `${fmt(avgPerBlock, 1)} BC`,       color: 'text-amber-400',  sub: 'expected per block' },
              { label: 'Time Elapsed',   value: fmtMs(simBlocks * blockIntervalMs), color: 'text-green-400', sub: `${simDays.toFixed(1)} days` },
              { label: 'Gems if Exchanged', value: fmt(simEarnings * currentRate * (1 - feePct)), color: 'text-purple-400', sub: `at ${currentRate} Gems/BC` },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-white/3 border border-white/5">
                <p className={`font-['Space_Grotesk'] font-black text-2xl ${s.color}`}>{s.value}</p>
                <p className="text-white text-xs font-semibold mt-1">{s.label}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Big earnings number */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Projected BC Earned</p>
            <p className="font-['Space_Grotesk'] font-black text-5xl text-amber-400">{fmt(simEarnings)}</p>
            <p className="text-gray-500 text-sm mt-1">BlueCoin over {simBlocks} block{simBlocks !== 1 ? 's' : ''}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-amber-300 font-bold text-sm">{fmt(simEarnings / (simDays || 1))}</p>
                <p className="text-gray-600 text-[10px]">BC per day</p>
              </div>
              <div>
                <p className="text-amber-300 font-bold text-sm">{fmt(simEarnings / (simBlocks || 1), 1)}</p>
                <p className="text-gray-600 text-[10px]">BC per block</p>
              </div>
            </div>
          </div>

          {/* Win probability */}
          <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/5">
            <p className="text-gray-400 text-xs font-semibold mb-3">Block Win Probability (Finder Bonus)</p>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#f59e0b" strokeWidth="6"
                    strokeDasharray={`${userShare * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-amber-400 font-['Space_Grotesk'] font-black text-xs">
                  {(userShare * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex-1 text-xs text-gray-500 space-y-1">
                <p>Your share of pool hashrate ({userHashrate} GH/s of {fmt(totalHashrate)} GH/s)</p>
                <p>Expected wins in {simBlocks} blocks: <span className="text-amber-400 font-bold">{(userShare * simBlocks).toFixed(1)}</span></p>
                <p>Finder BC per win: <span className="text-amber-400 font-bold">{Math.round(blockReward * finderPct)} BC</span></p>
              </div>
            </div>
          </div>

          {/* ROI section */}
          <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/5">
            <p className="text-gray-400 text-xs font-semibold mb-3">Return on Investment</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-gray-500 text-xs">Rig cost ({simRigCount}×)</p>
                <p className="font-['Space_Grotesk'] font-black text-xl text-white">{fmt(rigCost)} BC</p>
              </div>
              <div className="flex-1 text-center text-gray-700">→</div>
              <div>
                <p className="text-gray-500 text-xs">Break-even at</p>
                <p className="font-['Space_Grotesk'] font-black text-xl text-green-400">{fmt(blocksToROI)} blocks</p>
                <p className="text-gray-600 text-[10px]">≈ {fmtMs(blocksToROI * blockIntervalMs)}</p>
              </div>
              <div className="flex-1 text-center text-gray-700">→</div>
              <div>
                <p className="text-gray-500 text-xs">Net after {simBlocks} blocks</p>
                <p className={`font-['Space_Grotesk'] font-black text-xl ${simEarnings - rigCost >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {simEarnings - rigCost >= 0 ? '+' : ''}{fmt(simEarnings - rigCost)} BC
                </p>
              </div>
            </div>
            {/* ROI progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                <span>0</span>
                <span>ROI at {fmt(blocksToROI)} blocks</span>
                <span>{simBlocks} blocks</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${simEarnings >= rigCost ? 'bg-gradient-to-r from-green-500/60 to-green-400' : 'bg-gradient-to-r from-orange-500/60 to-orange-400'}`}
                  style={{ width: `${Math.min(100, (simBlocks / blocksToROI) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
