// ─── Players Store — DB-Ready Layer ───────────────────────────────────────────
// Manages player data in localStorage, seeded from static data.
// Changes are tracked via syncStore so the admin can commit them to GitHub.

import type { Player, Region } from '../data/players'
import defaultPlayers from '../data/players'
import { markDirty } from './syncStore'

const PLAYERS_KEY = 'bn_admin_players'
const GAMEMODES_KEY = 'bn_admin_gamemodes'

function safeGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ─── Players ──────────────────────────────────────────────────────────────────

export function getPlayers(): Player[] {
  const stored = safeGet<Player[]>(PLAYERS_KEY)
  return stored ?? defaultPlayers
}

export function savePlayers(players: Player[], opts?: { silent?: boolean }) {
  safeSet(PLAYERS_KEY, players)
  if (!opts?.silent) markDirty('players')
}

export function addPlayer(player: Player): void {
  const players = getPlayers()
  players.push(player)
  savePlayers(players)
}

export function updatePlayer(name: string, updated: Player): void {
  const players = getPlayers()
  const idx = players.findIndex(p => p.name === name)
  if (idx !== -1) {
    players[idx] = updated
    savePlayers(players)
  }
}

export function deletePlayer(name: string): void {
  savePlayers(getPlayers().filter(p => p.name !== name))
}

export function importPlayers(players: Player[]): void {
  savePlayers(players) // marks dirty via savePlayers
}

export function resetPlayers(): void {
  safeSet(PLAYERS_KEY, defaultPlayers)
  markDirty('players')
}

export function exportPlayersJSON(): string {
  return JSON.stringify(getPlayers(), null, 2)
}

// ─── Gamemode Overrides ───────────────────────────────────────────────────────

import type { Gamemode } from '../data/gamemodes'
import { gamemodes as defaultGamemodes } from '../data/gamemodes'

export function getGamemodes(): Gamemode[] {
  const stored = safeGet<Gamemode[]>(GAMEMODES_KEY)
  return stored ?? defaultGamemodes
}

export function saveGamemodes(gamemodes: Gamemode[], opts?: { silent?: boolean }) {
  safeSet(GAMEMODES_KEY, gamemodes)
  if (!opts?.silent) markDirty('gamemodes')
}

export function resetGamemodes(): void {
  safeSet(GAMEMODES_KEY, defaultGamemodes)
  markDirty('gamemodes')
}

export { type Player, type Region }
