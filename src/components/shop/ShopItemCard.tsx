import type { ShopItem } from '../../data/shop'
import { RARITY_NAMES, RARITY_COLORS } from '../../data/shop'

interface Props {
  item:      ShopItem
  userGems:  number
  onBuy:     (item: ShopItem) => void
}

function formatGems(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function ShopItemCard({ item, userGems, onBuy }: Props) {
  const canAfford  = userGems >= item.price
  const rarityName = RARITY_NAMES[item.rarity] ?? 'Unknown'
  const rarityColor = RARITY_COLORS[item.rarity] ?? '#9ca3af'

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden group ${
        canAfford
          ? 'border-white/10 hover:border-white/20 hover:shadow-lg'
          : 'border-white/5 opacity-70'
      } bg-[#0D1117]`}
      style={item.featured ? {
        boxShadow: `0 0 0 1px ${rarityColor}30, 0 8px 32px ${rarityColor}15`,
      } : {}}
    >
      {/* Featured badge */}
      {item.featured && (
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: `${rarityColor}20`, color: rarityColor, border: `1px solid ${rarityColor}40` }}
        >
          ★ Featured
        </div>
      )}

      {/* Card body */}
      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Icon + rarity */}
        <div className="flex items-start gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: `${rarityColor}15`, border: `1px solid ${rarityColor}30` }}
          >
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1"
              style={{ background: `${rarityColor}15`, color: rarityColor }}
            >
              {rarityName}
            </div>
            <h3 className="text-white font-bold text-sm leading-tight truncate">{item.name}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-500 text-xs leading-relaxed flex-1 line-clamp-3">
          {item.description}
        </p>

        {/* Price + Buy */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 text-sm">✨</span>
            <span className={`font-black text-sm ${canAfford ? 'text-white' : 'text-gray-600'}`}>
              {formatGems(item.price)}
            </span>
            <span className="text-gray-600 text-[10px]">Gems</span>
          </div>
          <button
            onClick={() => canAfford && onBuy(item)}
            disabled={!canAfford}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              canAfford
                ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/25 hover:border-[#00BFFF]/50 hover:shadow-[0_0_12px_rgba(0,191,255,0.2)] active:scale-95'
                : 'bg-white/3 border border-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            {canAfford ? '🛒 Buy' : '🔒 Locked'}
          </button>
        </div>
      </div>
    </div>
  )
}
