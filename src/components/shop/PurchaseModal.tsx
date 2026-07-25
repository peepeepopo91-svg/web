import { useState } from 'react'
import type { ShopItem } from '../../data/shop'
import { RARITY_NAMES, RARITY_COLORS } from '../../data/shop'

interface Props {
  item:     ShopItem | null
  userGems: number
  onConfirm: (item: ShopItem, quantity: number) => Promise<void>
  onClose:   () => void
}

export function PurchaseModal({ item, userGems, onConfirm, onClose }: Props) {
  const [quantity,  setQuantity]  = useState(1)
  const [loading,   setLoading]   = useState(false)

  if (!item) return null

  const totalCost   = item.price * quantity
  const canAfford   = userGems >= totalCost
  const rarityColor = RARITY_COLORS[item.rarity] ?? '#9ca3af'
  const rarityName  = RARITY_NAMES[item.rarity]  ?? 'Unknown'

  async function handleConfirm() {
    if (!canAfford || loading) return
    setLoading(true)
    try {
      await onConfirm(item!, quantity)
    } finally {
      setLoading(false)
      setQuantity(1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0F17] shadow-2xl overflow-hidden">

        {/* Header glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-[60px] pointer-events-none opacity-20"
          style={{ background: rarityColor }}
        />

        {/* Content */}
        <div className="relative p-6 space-y-5">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-gray-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center text-sm"
          >
            ✕
          </button>

          {/* Item info */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: `${rarityColor}15`, border: `1px solid ${rarityColor}30` }}
            >
              {item.icon}
            </div>
            <div>
              <div
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1"
                style={{ background: `${rarityColor}15`, color: rarityColor }}
              >
                {rarityName}
              </div>
              <h3 className="text-white font-black text-lg leading-tight">{item.name}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{item.description.slice(0, 80)}…</p>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all font-bold text-lg flex items-center justify-center"
              >
                −
              </button>
              <span className="flex-1 text-center text-white font-black text-xl">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all font-bold text-lg flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Price per item</span>
              <span className="text-white font-semibold">✨ {item.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantity</span>
              <span className="text-white font-semibold">× {quantity}</span>
            </div>
            <div className="border-t border-white/8 pt-2.5 flex justify-between">
              <span className="text-gray-400 font-semibold">Total cost</span>
              <span className={`font-black text-base ${canAfford ? 'text-[#00BFFF]' : 'text-red-400'}`}>
                ✨ {totalCost.toLocaleString()} Gems
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Your balance</span>
              <span className={`font-semibold ${canAfford ? 'text-gray-400' : 'text-red-500'}`}>
                ✨ {Math.floor(userGems).toLocaleString()} Gems
                {!canAfford && ` (need ${(totalCost - Math.floor(userGems)).toLocaleString()} more)`}
              </span>
            </div>
          </div>

          {/* Info notice */}
          <div className="flex gap-2.5 text-xs text-gray-500 bg-white/3 border border-white/8 rounded-xl p-3">
            <span className="shrink-0 mt-0.5">ℹ️</span>
            <p>Your Gems will be deducted immediately. Staff will process your order and deliver in-game. Track your order in Purchase History.</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canAfford || loading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                canAfford && !loading
                  ? 'bg-[#00BFFF]/20 border border-[#00BFFF]/40 text-[#00BFFF] hover:bg-[#00BFFF]/30 hover:shadow-[0_0_20px_rgba(0,191,255,0.2)]'
                  : 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Processing…
                </>
              ) : canAfford ? '✅ Confirm Purchase' : '🔒 Not Enough Gems'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
