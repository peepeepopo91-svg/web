// ─── BlueCoin Mining — Types & Constants ──────────────────────────────────────
// db-ready: all interfaces map 1:1 to what a real API/database would return.
// To connect a backend, replace localStorage calls in miningStore.ts with fetch().

export interface RigTier {
  id: string
  name: string
  emoji: string
  hashrate: number        // GH/s
  cost: number            // BlueCoin
  maxDurability: number   // durability points (0 = broken)
  lossPerSecond: number   // durability lost per second while mining
  color: string           // Tailwind text color
  borderColor: string     // Tailwind border color
  glowColor: string       // CSS rgba glow
  description: string
}

export const RIG_TIERS: RigTier[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    emoji: '⛏️',
    hashrate: 2,
    cost: 150,
    maxDurability: 10000,
    lossPerSecond: 10000 / (5.5 * 24 * 3600),
    color: 'text-gray-300',
    borderColor: 'border-gray-500/40',
    glowColor: 'rgba(156,163,175,0.25)',
    description: 'Entry-level hardware. Great for learning the ropes of the mining ecosystem.',
  },
  {
    id: 'advanced',
    name: 'Advanced Rig',
    emoji: '🔧',
    hashrate: 6,
    cost: 400,
    maxDurability: 10000,
    lossPerSecond: 10000 / (6 * 24 * 3600),
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    glowColor: 'rgba(96,165,250,0.3)',
    description: 'Upgraded thermal management and 3× output. The first real investment.',
  },
  {
    id: 'pro',
    name: 'Pro Miner',
    emoji: '⚡',
    hashrate: 15,
    cost: 900,
    maxDurability: 10000,
    lossPerSecond: 10000 / (6.5 * 24 * 3600),
    color: 'text-[#00BFFF]',
    borderColor: 'border-[#00BFFF]/40',
    glowColor: 'rgba(0,191,255,0.3)',
    description: 'Professional-grade rig with enhanced power delivery and cooling.',
  },
  {
    id: 'elite',
    name: 'Elite Station',
    emoji: '💠',
    hashrate: 40,
    cost: 2200,
    maxDurability: 10000,
    lossPerSecond: 10000 / (7 * 24 * 3600),
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    glowColor: 'rgba(167,139,250,0.35)',
    description: 'Enterprise-class station with liquid cooling and redundant power supply.',
  },
  {
    id: 'quantum',
    name: 'Quantum Array',
    emoji: '🔮',
    hashrate: 100,
    cost: 5000,
    maxDurability: 10000,
    lossPerSecond: 10000 / (8 * 24 * 3600),
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500/40',
    glowColor: 'rgba(250,204,21,0.4)',
    description: 'State-of-the-art quantum-accelerated array. Unmatched hashrate output.',
  },
]

export const MINING_CONSTANTS = {
  BLOCK_INTERVAL_MS:   60 * 60 * 1000,   // 60 minutes per community block
  BLOCK_REWARD:        500,               // BlueCoin rewarded per block
  FINDER_BONUS_PCT:    0.25,
  EQUAL_SPLIT_PCT:     0.25,
  HASHRATE_SHARE_PCT:  0.50,
  STARTING_BALANCE:    200,              // BC given to new accounts
  REPAIR_COST_PCT:     0.35,             // fraction of rig cost = full repair price
  SELL_MAX_PCT:        0.75,             // max sell-back at 100% durability
  TICK_INTERVAL_MS:    10_000,           // UI refresh rate
  RENEWAL_DURATION_MS: 12 * 60 * 60 * 1000, // 12-hour mining session
} as const

export const EXCHANGE_CONSTANTS = {
  BASE_RATE:            55,             // Gems per BC (base)
  MIN_RATE:             40,             // Gems per BC (worst for user)
  MAX_RATE:             70,             // Gems per BC (best for user)
  DAILY_TX_LIMIT:       3,              // max exchange transactions per 24-hour window
  FEE_PCT:              0.02,           // 2% transaction fee
  FLUCTUATION_PERIOD_MS: 4 * 60 * 60 * 1000, // 4-hour price cycle
} as const

export type ExchangeDirection = 'bc-to-gems' | 'gems-to-bc'

export type RigStatus = 'idle' | 'mining' | 'broken'

export interface UserRig {
  id: string
  tierId: string
  name: string
  durability: number          // 0–10000
  status: RigStatus
  miningSince: number | null  // timestamp (ms)
  purchasedAt: number
}

export interface MiningReward {
  blockNumber: number
  solvedAt: number
  amount: number
  type: 'finder' | 'equal_split' | 'hashrate_share'
}

export interface User {
  username: string
  createdAt: number
  balance: number            // BlueCoin
  gems: number               // Gems
  rigs: UserRig[]
  rewardHistory: MiningReward[]
  lastCheckedAt: number
  exchangeUsedToday: number  // number of exchange transactions in current 24-h window
  exchangeResetAt: number    // Timestamp when daily limit resets
  miningExpiresAt: number | null  // When the current 12-h session expires (null = never renewed)
  miningRenewedAt: number | null  // Timestamp of last renewal
}

export interface CommunityBlock {
  blockNumber: number
  startedAt: number      // when the current block epoch began
  lastSolvedAt: number   // timestamp of most recent solve
  totalSolved: number
}
