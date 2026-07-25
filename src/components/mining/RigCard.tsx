import { useState } from 'react'
import { useMining } from '../../context/MiningContext'
import { RIG_TIERS, MINING_CONSTANTS } from '../../data/mining'
import type { UserRig } from '../../data/mining'

interface Props { rig: UserRig }

function DurabilityBar({ durability, max }: { durability: number; max: number }) {
  const pct = (durability / max) * 100
  const color = pct > 50 ? '#00BFFF' : pct > 20 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-gray-600 uppercase tracking-wide">Durability</span>
        <span className="text-[11px] font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}80` }}
        />
      </div>
    </div>
  )
}

export function RigCard({ rig }: Props) {
  const { startRig, stopRig, repairUserRig, sellUserRig, user } = useMining()
  const [confirmSell, setConfirmSell] = useState(false)
  const [err, setErr] = useState('')

  const tier = RIG_TIERS.find(t => t.id === rig.tierId)!
  const _durPct = (rig.durability / tier.maxDurability) * 100; void _durPct
  const damage = tier.maxDurability - rig.durability
  const repairCost = Math.ceil((damage / tier.maxDurability) * tier.cost * MINING_CONSTANTS.REPAIR_COST_PCT)
  const salePrice = Math.floor(tier.cost * MINING_CONSTANTS.SELL_MAX_PCT * (rig.durability / tier.maxDurability))
  const isBroken = rig.status === 'broken'
  const isMining = rig.status === 'mining'
  const canAffordRepair = (user?.balance ?? 0) >= repairCost

  function doRepair() {
    const result = repairUserRig(rig.id)
    if (result.error) setErr(result.error)
    else setErr('')
  }

  function doSell() {
    if (!confirmSell) { setConfirmSell(true); return }
    sellUserRig(rig.id)
  }

  const statusConfig = {
    idle:   { label: 'Idle',   dot: 'bg-gray-500',                   badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    mining: { label: 'Mining', dot: 'bg-[#00BFFF] animate-pulse',    badge: 'bg-[#00BFFF]/10 text-[#00BFFF] border-[#00BFFF]/20' },
    broken: { label: 'Broken', dot: 'bg-red-500',                    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }[rig.status]

  return (
    <div
      className={`relative glass rounded-2xl border transition-all duration-300 p-5 flex flex-col gap-4 ${
        isBroken ? 'border-red-500/20' : isMining ? 'border-[#00BFFF]/20' : 'border-white/8'
      }`}
      style={isMining ? { boxShadow: `0 0 20px ${tier.glowColor}` } : undefined}
    >
      {/* Mining pulse overlay */}
      {isMining && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${tier.glowColor} 0%, transparent 70%)`, opacity: 0.15 }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{tier.emoji}</span>
          <div>
            <p className={`font-bold text-sm leading-tight ${tier.color}`}>{tier.name}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{tier.hashrate} GH/s</p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold ${statusConfig.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
      </div>

      {/* Durability */}
      <DurabilityBar durability={rig.durability} max={tier.maxDurability} />

      {/* Error */}
      {err && <p className="text-red-400 text-[11px] bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">⚠ {err}</p>}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto">
        {/* Primary: start/stop/repair */}
        {isBroken ? (
          <button
            onClick={doRepair}
            disabled={!canAffordRepair}
            className="btn-primary w-full py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            🔧 Repair ({repairCost} BC)
          </button>
        ) : isMining ? (
          <button
            onClick={() => stopRig(rig.id)}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
          >
            ⏸ Stop Mining
          </button>
        ) : (
          <button
            onClick={() => startRig(rig.id)}
            className="btn-primary w-full py-2 rounded-xl text-xs font-semibold text-white transition-all"
          >
            ▶ Start Mining
          </button>
        )}

        {/* Secondary row: repair (if not broken) + sell */}
        <div className="flex gap-2">
          {!isBroken && damage > 0 && (
            <button
              onClick={doRepair}
              disabled={!canAffordRepair}
              title={`Repair for ${repairCost} BC`}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold bg-white/3 text-gray-500 border border-white/8 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              🔧 {repairCost} BC
            </button>
          )}
          <button
            onClick={doSell}
            onBlur={() => setTimeout(() => setConfirmSell(false), 200)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
              confirmSell
                ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                : 'bg-white/3 text-gray-500 border-white/8 hover:text-white hover:border-white/20'
            }`}
          >
            {confirmSell ? '⚠ Confirm Sell' : `💰 Sell (${salePrice} BC)`}
          </button>
        </div>
      </div>
    </div>
  )
}
