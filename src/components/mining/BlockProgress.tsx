import { useMining } from '../../context/MiningContext'
import { MINING_CONSTANTS } from '../../data/mining'

function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const DISTRIBUTION = [
  { label: "Finder's Bonus", pct: 25, color: '#F59E0B', textColor: 'text-yellow-400', desc: 'Block solver' },
  { label: 'Equal Split',    pct: 25, color: '#60A5FA', textColor: 'text-blue-400',   desc: 'All miners' },
  { label: 'Hashrate Share', pct: 50, color: '#00BFFF', textColor: 'text-[#00BFFF]',  desc: 'By GH/s power' },
]

export function BlockProgress() {
  const { community, nextBlockIn } = useMining()
  if (!community) return null

  const progress = 1 - nextBlockIn / MINING_CONSTANTS.BLOCK_INTERVAL_MS

  const R = 54
  const C = 2 * Math.PI * R
  const dash = C * (1 - progress)

  return (
    <section className="px-4 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* ── Next Block countdown ─────────────────────────────────── */}
            <div className="flex flex-col items-center justify-center p-8 lg:w-72 border-b lg:border-b-0 lg:border-r border-white/5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4">Next Block</p>

              <div className="relative">
                <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                  <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="64" cy="64" r={R}
                    fill="none"
                    stroke="url(#ringGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={dash}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00BFFF" />
                      <stop offset="100%" stopColor="#0066FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-['Space_Grotesk'] font-black text-2xl text-white tabular-nums">
                    {fmt(nextBlockIn)}
                  </span>
                  <span className="text-[9px] text-gray-600 uppercase tracking-wide mt-0.5">remaining</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[#00BFFF] font-bold text-sm">Block #{community.blockNumber}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{community.totalSolved} solved total</p>
              </div>

              <div className="mt-3 px-4 py-2 rounded-lg bg-[#00BFFF]/8 border border-[#00BFFF]/15 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Block Reward</p>
                <p className="text-[#00BFFF] font-bold text-lg">
                  {MINING_CONSTANTS.BLOCK_REWARD} <span className="text-xs font-normal">BC</span>
                </p>
              </div>
            </div>

            {/* ── Reward Distribution ──────────────────────────────────── */}
            <div className="flex-1 flex flex-col justify-center px-8 py-7">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-5">Reward Distribution</p>

              <div className="space-y-4">
                {DISTRIBUTION.map(d => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: d.color, boxShadow: `0 0 6px ${d.color}80` }}
                        />
                        <span className="text-xs text-gray-300 font-medium">{d.label}</span>
                        <span className="text-[10px] text-gray-600 hidden sm:inline">— {d.desc}</span>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${d.textColor}`}>{d.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${d.pct}%`, background: `linear-gradient(90deg, ${d.color}cc, ${d.color})` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-gray-700 mt-5 leading-relaxed">
                Each block reward is split between the solver, all active miners equally, and miners weighted by hashrate.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
