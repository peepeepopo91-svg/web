import type { PlayerRanks } from './players'

export interface Gamemode {
  /** Stable data key used on player rank objects and in synced JSON. */
  key: string
  label: string
  /** Path to a PNG icon under /public/icons — swap the file to re-brand, no component changes needed. */
  icon: string
  /** Shown if the PNG fails to load. */
  fallback: string
  /** Icon render size in pixels (applied to the img element). Default: 18. */
  iconSize?: number
}

export const gamemodes: Gamemode[] = [
  { key: 'mace',    label: 'Mace',    icon: '/icons/Mace.png',    fallback: '🔨' },
  { key: 'sword',   label: 'Sword',   icon: '/icons/Sword.png',   fallback: '⚔' },
  { key: 'axe',     label: 'Axe',     icon: '/icons/Axe.png',     fallback: '🪓' },
  { key: 'crystal', label: 'Crystal', icon: '/icons/Crystal.png', fallback: '💎' },
  { key: 'uhc',     label: 'UHC',     icon: '/icons/UHC.png',     fallback: '🏆' },
  { key: 'nethpot', label: 'Nethpot', icon: '/icons/Nethpot.png', fallback: '🧪' },
  { key: 'diapot',  label: 'Diapot',  icon: '/icons/Diapot.png',  fallback: '⚗' },
]
