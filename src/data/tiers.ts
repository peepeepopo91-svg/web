import type { PlayerRanks } from './players'

export const TIER_ORDER = [
  'HT1', 'LT1',
  'HT2', 'LT2',
  'HT3', 'LT3',
  'HT4', 'LT4',
  'HT5', 'LT5',
] as const

export type Tier = typeof TIER_ORDER[number]

export const TIER_POINTS: Record<string, number> = {
  HT1: 10,
  LT1: 9,
  HT2: 8,
  LT2: 7,
  HT3: 6,
  LT3: 5,
  HT4: 4,
  LT4: 3,
  HT5: 2,
  LT5: 1,
}

export const tierColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  HT1: { bg: 'bg-[#00BFFF]/15', text: 'text-[#00BFFF]',   border: 'border-[#00BFFF]/40',   glow: 'shadow-[#00BFFF]/30' },
  LT1: { bg: 'bg-[#00E5FF]/15', text: 'text-[#00E5FF]',   border: 'border-[#00E5FF]/40',   glow: 'shadow-[#00E5FF]/30' },
  HT2: { bg: 'bg-sky-300/15',   text: 'text-sky-300',     border: 'border-sky-300/40',     glow: 'shadow-sky-300/30'   },
  LT2: { bg: 'bg-teal-400/15',  text: 'text-teal-400',    border: 'border-teal-400/40',    glow: 'shadow-teal-400/30'  },
  HT3: { bg: 'bg-emerald-400/15', text: 'text-emerald-400', border: 'border-emerald-400/40', glow: 'shadow-emerald-400/30' },
  LT3: { bg: 'bg-yellow-400/15', text: 'text-yellow-400', border: 'border-yellow-400/40',  glow: 'shadow-yellow-400/30' },
  HT4: { bg: 'bg-orange-400/15', text: 'text-orange-400', border: 'border-orange-400/40',  glow: 'shadow-orange-400/30' },
  LT4: { bg: 'bg-orange-600/15', text: 'text-orange-600', border: 'border-orange-600/40',  glow: 'shadow-orange-600/30' },
  HT5: { bg: 'bg-red-500/15',   text: 'text-red-500',    border: 'border-red-500/40',     glow: 'shadow-red-500/30'   },
  LT5: { bg: 'bg-red-800/15',   text: 'text-red-800',    border: 'border-red-800/40',     glow: 'shadow-red-800/30'   },
}

export function getTierPoints(tier: string): number {
  return TIER_POINTS[tier] ?? 0
}

/** True only for actual tier strings (HT1–LT5). Excludes null, undefined, and "None". */
export function isRanked(tier?: string | null): tier is string {
  return !!tier && tier !== 'None'
}

export function tierSortValue(tier?: string | null): number {
  if (!tier || tier === 'None') return 999
  const idx = TIER_ORDER.indexOf(tier as Tier)
  return idx === -1 ? 999 : idx
}

export function getPlayerTotalPoints(ranks: PlayerRanks): number {
  return Object.values(ranks)
    .filter(isRanked)
    .reduce((sum, tier) => sum + getTierPoints(tier), 0)
}

export function getPlayerHTCount(ranks: PlayerRanks): number {
  return Object.values(ranks)
    .filter(isRanked)
    .filter((t) => t.startsWith('HT'))
    .length
}

export function getAveragePoints(ranks: PlayerRanks): number {
  const ranked = Object.values(ranks).filter(isRanked)
  if (ranked.length === 0) return 0
  return getPlayerTotalPoints(ranks) / ranked.length
}

/** Best tier a player holds, i.e. lowest index in TIER_ORDER (HT1 is best). */
export function getHighestTier(ranks: PlayerRanks): string | null {
  const ranked = Object.values(ranks).filter(isRanked)
  if (ranked.length === 0) return null
  return ranked.reduce((best, t) => (tierSortValue(t) < tierSortValue(best) ? t : best))
}

/** Weakest tier a player holds, i.e. highest index in TIER_ORDER (LT5 is worst). */
export function getLowestTier(ranks: PlayerRanks): string | null {
  const ranked = Object.values(ranks).filter(isRanked)
  if (ranked.length === 0) return null
  return ranked.reduce((worst, t) => (tierSortValue(t) > tierSortValue(worst) ? t : worst))
}

export function getAverageTier(ranks: PlayerRanks): string | null {
  const ranked = Object.values(ranks).filter(isRanked)
  if (ranked.length === 0) return null
  const avg = ranked.reduce((sum, t) => sum + getTierPoints(t), 0) / ranked.length
  if (avg >= 9.5) return 'HT1'
  if (avg >= 8.5) return 'LT1'
  if (avg >= 7.5) return 'HT2'
  if (avg >= 6.5) return 'LT2'
  if (avg >= 5.5) return 'HT3'
  if (avg >= 4.5) return 'LT3'
  if (avg >= 3.5) return 'HT4'
  if (avg >= 2.5) return 'LT4'
  if (avg >= 1.5) return 'HT5'
  return 'LT5'
}

export interface RankedPlayer {
  rank: number
  totalPoints: number
  overallTier: string | null
}

export function computeRankings(
  players: Array<{ name: string; ranks: PlayerRanks }>
): Map<string, RankedPlayer> {
  const scored = players.map((p) => ({
    name: p.name,
    totalPoints: getPlayerTotalPoints(p.ranks),
    htCount: getPlayerHTCount(p.ranks),
    overallTier: getAverageTier(p.ranks),
  }))

  scored.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.htCount !== a.htCount) return b.htCount - a.htCount
    return a.name.localeCompare(b.name)
  })

  const map = new Map<string, RankedPlayer>()
  scored.forEach((p, i) => {
    map.set(p.name, { rank: i + 1, totalPoints: p.totalPoints, overallTier: p.overallTier })
  })
  return map
}
