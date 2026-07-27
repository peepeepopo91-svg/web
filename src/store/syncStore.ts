// ─── GitHub Sync — Global Dirty State ────────────────────────────────────────
// Module-level pub/sub so any component can track unsaved changes without
// prop-drilling or React context overhead. Auto-save has been removed.

import { useEffect, useState } from 'react'

export type DirtySection = 'players' | 'gamemodes' | 'content' | 'event' | 'economy' | 'homepage' | 'tier-tagger'

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

// ─── Module-level state ───────────────────────────────────────────────────────

let dirtySet:   Set<DirtySection> = new Set()
let isSaving:   boolean           = false
let saveStatus: SaveStatus        = 'idle'
let saveError:  string | null     = null
let lastSyncAt: number | null     = null
let lastSyncMsg: string | null    = null

// ─── Listeners ────────────────────────────────────────────────────────────────

let listeners: Array<() => void> = []

function notify() {
  for (const fn of listeners) fn()
}

// ─── Dirty tracking ───────────────────────────────────────────────────────────

/** Mark a section as having unsaved changes. No-op during SSR. */
export function markDirty(section: DirtySection) {
  if (typeof window === 'undefined') return
  dirtySet.add(section)
  notify()
}

/** Clear all dirty flags (after a full save). */
export function clearDirty() {
  dirtySet.clear()
  notify()
}

/** Clear a single section's dirty flag (after per-section save). */
export function clearSectionDirty(section: DirtySection) {
  dirtySet.delete(section)
  notify()
}

export function getDirty(): Set<DirtySection> { return new Set(dirtySet) }
export function isDirty(): boolean             { return dirtySet.size > 0 }

// ─── Save status (used by AdminLayout header indicator) ───────────────────────

export function setIsSaving(v: boolean) {
  isSaving = v
  notify()
}

export function setSaveStatus(status: SaveStatus, error?: string) {
  saveStatus = status
  saveError  = error ?? null
  notify()
}

export function setLastSync(at: number, message: string) {
  lastSyncAt  = at
  lastSyncMsg = message
  notify()
}

// ─── React hook ───────────────────────────────────────────────────────────────

export interface SyncStateSnapshot {
  dirty:       Set<DirtySection>
  isDirty:     boolean
  isSaving:    boolean
  saveStatus:  SaveStatus
  saveError:   string | null
  lastSyncAt:  number | null
  lastSyncMsg: string | null
}

function snapshot(): SyncStateSnapshot {
  return {
    dirty:       getDirty(),
    isDirty:     isDirty(),
    isSaving,
    saveStatus,
    saveError,
    lastSyncAt,
    lastSyncMsg,
  }
}

export function subscribe(fn: () => void): () => void {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

/** Re-renders whenever any sync state changes. */
export function useSyncState(): SyncStateSnapshot {
  const [state, setState] = useState<SyncStateSnapshot>(snapshot)
  useEffect(() => subscribe(() => setState(snapshot())), [])
  return state
}
