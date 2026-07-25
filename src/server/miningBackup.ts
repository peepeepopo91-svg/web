// ─── Mining Auto-Backup — server-only ────────────────────────────────────────
// Debounced GitHub backup for mining data files.
// Call scheduleBackup() after every write to mining-users.json or
// mining-community.json. It batches changes and pushes once per `debounceMs`.
// Never blocks gameplay — all errors are handled gracefully with backoff retries.

import { readFileSync }               from 'node:fs'
import { statSync }                   from 'node:fs'
import { resolve }                    from 'node:path'
import { createHash }                 from 'node:crypto'
import { spawnSync, SpawnSyncOptions } from 'node:child_process'
import { commitFiles }                from './github'

const DATA_DIR    = resolve('data')
const MAX_RETRIES = 5

const MINING_FILES = [
  { local: 'mining-users.json',     repo: 'data/mining-users.json'     },
  { local: 'mining-community.json', repo: 'data/mining-community.json' },
  { local: 'shop-purchases.json',   repo: 'data/shop-purchases.json'   },
  { local: 'shop-items.json',       repo: 'data/shop-items.json'       },
]

const TOURNAMENT_FILES = [
  { local: 'tournaments.json', repo: 'data/tournaments.json' },
]

// ─── Module-level state ───────────────────────────────────────────────────────

let debounceMs:        number  = 45_000   // configurable; 5 s – 30 min
let debounceTimer:     ReturnType<typeof setTimeout> | null = null
let timerScheduledAt:  number | null = null   // when the current debounce was set
let timerFiresAt:      number | null = null   // absolute timestamp it will fire
let lastCommittedHash: string | null = null
let lastBackupAt:      number | null = null
let lastBackupMessage: string | null = null
let lastBackupError:   string | null = null
let isRunning:         boolean = false
let retryCount:        number  = 0
let totalBackups:      number  = 0
let pendingRetryTimer: ReturnType<typeof setTimeout> | null = null
let backupEnabled:     boolean = true

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(name: string): string {
  try { return readFileSync(resolve(DATA_DIR, name), 'utf8') } catch { return '' }
}

function fileBytes(name: string): number {
  try { return statSync(resolve(DATA_DIR, name)).size } catch { return 0 }
}

/**
 * After the GitHub API commit, advance local git HEAD to match origin/main.
 * Keeps `git status` honest: diagnostics show files as clean right after a
 * backup, and only "modified" once mining writes new data.
 * --mixed so the working tree is never touched.
 */
function syncLocalHead(): void {
  const cwd  = process.cwd()
  const opts: SpawnSyncOptions = { cwd, encoding: 'utf8', timeout: 15_000 }
  spawnSync('git', ['fetch', 'origin', '--quiet'], opts)
  spawnSync('git', ['reset', '--mixed', 'origin/main'], opts)
}

function contentHash(): string {
  return createHash('sha256')
    .update(MINING_FILES.map(f => readFile(f.local)).join('\0'))
    .digest('hex')
}

function shortHash(content: string): string {
  return createHash('sha256').update(content || '').digest('hex').slice(0, 8)
}

// ─── Core backup logic ────────────────────────────────────────────────────────

async function runBackup(): Promise<void> {
  if (isRunning) return

  const hash = contentHash()
  if (hash === lastCommittedHash) return   // nothing changed since last push

  const files = MINING_FILES
    .map(f => ({ path: f.repo, content: readFile(f.local) }))
    .filter(f => f.content.length > 0)

  if (files.length === 0) return

  isRunning = true
  const msg = `[auto] Mining data backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`

  try {
    await commitFiles(files, msg)
    lastCommittedHash = hash
    lastBackupAt      = Date.now()
    lastBackupMessage = msg
    lastBackupError   = null
    retryCount        = 0
    totalBackups     += 1
    // Sync local git HEAD so git status stays clean after backup
    syncLocalHead()
  } catch (e) {
    lastBackupError = e instanceof Error ? e.message : String(e)
    retryCount      = Math.min(retryCount + 1, MAX_RETRIES)
    if (retryCount <= MAX_RETRIES) {
      const delay = Math.min(30_000 * retryCount, 300_000)  // 30 s → 5 min
      if (pendingRetryTimer) clearTimeout(pendingRetryTimer)
      pendingRetryTimer = setTimeout(async () => {
        pendingRetryTimer = null
        await runBackup()
      }, delay)
    }
    // Gameplay continues uninterrupted regardless
  } finally {
    isRunning = false
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// ─── Tournament backup (separate debounce timer) ──────────────────────────────

let tournamentDebounceTimer: ReturnType<typeof setTimeout> | null = null

async function runTournamentBackup(): Promise<void> {
  const files = TOURNAMENT_FILES
    .map(f => ({ path: f.repo, content: readFile(f.local) }))
    .filter(f => f.content.length > 0)
  if (files.length === 0) return
  try {
    await commitFiles(files, `[auto] Tournament data backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`)
    syncLocalHead()
  } catch { /* non-blocking */ }
}

/** Called after every tournament data write. Debounces before pushing. */
export function scheduleTournamentBackup(): void {
  if (!backupEnabled) return
  if (tournamentDebounceTimer) clearTimeout(tournamentDebounceTimer)
  tournamentDebounceTimer = setTimeout(async () => {
    tournamentDebounceTimer = null
    await runTournamentBackup()
  }, debounceMs)
}

/** Called after every mining data write. Debounces before pushing. */
export function scheduleBackup(): void {
  if (!backupEnabled) return
  if (debounceTimer) clearTimeout(debounceTimer)
  timerScheduledAt = Date.now()
  timerFiresAt     = timerScheduledAt + debounceMs
  debounceTimer    = setTimeout(async () => {
    debounceTimer    = null
    timerScheduledAt = null
    timerFiresAt     = null
    await runBackup()
  }, debounceMs)
}

/** Get whether auto-backup is enabled. */
export function getBackupEnabled(): boolean {
  return backupEnabled
}

/** Enable or disable the auto-backup scheduler. */
export function setBackupEnabled(enabled: boolean): void {
  backupEnabled = enabled
  if (!enabled && debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer    = null
    timerScheduledAt = null
    timerFiresAt     = null
  }
}

/** Change the debounce interval (clamped to 5 s – 30 min). */
export function setDebounceMs(ms: number): void {
  debounceMs = Math.max(5_000, Math.min(ms, 30 * 60_000))
}

/**
 * Called after a successful manual git push so the auto-backup doesn't
 * re-push the same content with a redundant commit.
 */
export function markAlreadyCommitted(): void {
  lastCommittedHash = contentHash()
}

/** Flush immediately — skips the debounce. */
export async function flushBackupNow(): Promise<void> {
  if (debounceTimer)      { clearTimeout(debounceTimer);      debounceTimer      = null; timerScheduledAt = null; timerFiresAt = null }
  if (pendingRetryTimer)  { clearTimeout(pendingRetryTimer);  pendingRetryTimer  = null }
  await runBackup()
}

export interface BackupFileInfo {
  name:   string
  repo:   string
  bytes:  number
  exists: boolean
  hash:   string
}

export interface BackupStatus {
  enabled:           boolean
  debounceMs:        number
  hasPendingTimer:   boolean
  timerScheduledAt:  number | null
  timerFiresAt:      number | null
  isRunning:         boolean
  lastBackupAt:      number | null
  lastBackupMessage: string | null
  lastBackupError:   string | null
  retryCount:        number
  totalBackups:      number
  hasRetryPending:   boolean
  files:             BackupFileInfo[]
}

/** Return the full live state of the backup system. */
export function getBackupStatus(): BackupStatus {
  return {
    enabled:           backupEnabled,
    debounceMs,
    hasPendingTimer:   debounceTimer !== null,
    timerScheduledAt,
    timerFiresAt,
    isRunning,
    lastBackupAt,
    lastBackupMessage,
    lastBackupError,
    retryCount,
    totalBackups,
    hasRetryPending:   pendingRetryTimer !== null,
    files: MINING_FILES.map(f => {
      const content = readFile(f.local)
      return {
        name:   f.local,
        repo:   f.repo,
        bytes:  fileBytes(f.local),
        exists: content.length > 0,
        hash:   shortHash(content),
      }
    }),
  }
}

// ─── Graceful shutdown — one final push before the process exits ──────────────

if (typeof process !== 'undefined') {
  const shutdown = async (signal: string) => {
    try { await flushBackupNow() } catch { /* best-effort */ }
    process.exit(signal === 'SIGINT' ? 130 : 0)
  }
  process.once('SIGTERM', () => shutdown('SIGTERM'))
  process.once('SIGINT',  () => shutdown('SIGINT'))
}
