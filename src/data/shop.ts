// ─── Shop System — Types & Constants ──────────────────────────────────────────

export type ShopCategory = 'ranks' | 'crate-keys' | 'amethyst-tools'

export type PurchaseStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'rejected'

export interface ShopItem {
  id:             string
  category:       ShopCategory
  name:           string
  description:    string
  price:          number          // Gems
  rarity:         number          // 1–6
  icon:           string          // emoji or image URL
  enabled:        boolean
  featured:       boolean
  purchaseLimit:  number | null   // null = unlimited
  stock:          number | null   // null = unlimited
}

export interface Purchase {
  id:            string           // BT-XXXXXXXXX
  username:      string
  itemId:        string
  itemName:      string
  category:      ShopCategory
  quantity:      number
  price:         number           // gems per unit
  totalCost:     number           // gems total
  status:        PurchaseStatus
  createdAt:     number           // ms timestamp
  updatedAt:     number           // ms timestamp
  completedAt:   number | null
  staffNotes:    string | null    // internal, admin only
  playerNotes:   string | null    // visible to player
  refunded:      boolean
  refundedAt:    number | null
}

export interface ShopPurchasesFile {
  purchases: Purchase[]
}

export const CATEGORY_LABELS: Record<ShopCategory | 'all', string> = {
  all:              'All Items',
  ranks:            'Ranks',
  'crate-keys':     'Crate Keys',
  'amethyst-tools': 'Amethyst Tools',
}

export const CATEGORY_ICONS: Record<ShopCategory | 'all', string> = {
  all:              '🏪',
  ranks:            '👑',
  'crate-keys':     '🗝️',
  'amethyst-tools': '🔮',
}

export const RARITY_NAMES: Record<number, string> = {
  1: 'Common',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary',
  6: 'Mythic',
}

export const RARITY_COLORS: Record<number, string> = {
  1: '#9ca3af',   // gray
  2: '#4ade80',   // green
  3: '#60a5fa',   // blue
  4: '#a855f7',   // purple
  5: '#f59e0b',   // amber
  6: '#f97316',   // orange-red
}

export const STATUS_LABELS: Record<PurchaseStatus, string> = {
  pending:    'Pending',
  processing: 'Processing',
  completed:  'Completed',
  cancelled:  'Cancelled',
  rejected:   'Rejected',
}

export const STATUS_COLORS: Record<PurchaseStatus, string> = {
  pending:    '#f59e0b',
  processing: '#3b82f6',
  completed:  '#22c55e',
  cancelled:  '#6b7280',
  rejected:   '#ef4444',
}
