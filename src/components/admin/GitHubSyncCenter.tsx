// ─── GitHub Sync Center ───────────────────────────────────────────────────────
// Professional GitHub synchronization dashboard.
// The ONLY way the admin panel commits data to GitHub.

import { useState, useEffect, useRef, useCallback } from 'react'
import { AdminPaginator } from './AdminPaginator'

const SYNC_HISTORY_PAGE_SIZE = 10
import { useSyncState, getDirty } from '../../store/syncStore'
import { getPlayers, getGamemodes } from '../../store/playersStore'
import { getSiteContent, getEventConfig } from '../../store/contentStore'
import { getEconomyOverrides } from '../../store/miningStore'
import { getHomepageConfig } from '../../store/homepageStore'
import { getTierTaggerConfig } from '../../store/tierTaggerStore'
import { clearDirty, setLastSync } from '../../store/syncStore'
import {
  fetchRepoStatus,
  checkGitHubConnection,
  fetchCommitHistory,
  restoreToCommit,
  fetchSyncHistory,
  flushStoresToDisk,
  compareLocalToRemote,
  pullRemoteFiles,
  getGitDiagnostics,
  fixGitDivergence,
  getTokenInfo,
  testGitHubToken,
  saveGitHubToken,
  clearGitHubToken,
  getBackupStatusFn,
  setAutoBackupEnabled,
  setBackupDebounce,
  triggerBackupNow,
  type BackupStatus,
  type ConnectionChecks,
  type CommitEntry,
  type SyncHistoryEntry,
  type GitDiagnostics,
  type TokenInfo,
  type TokenTestResult,
} from '../../server/dataFiles'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RepoStatus {
  connected: boolean
  branch: string
  latestCommit: { message: string; sha: string; date: string } | null
}

interface LogLine {
  ts:   string
  msg:  string
  kind: 'info' | 'ok' | 'warn' | 'error' | 'step' | 'dim'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoOrMs: string | number): string {
  const ms   = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime()
  const secs = Math.floor((Date.now() - ms) / 1000)
  if (secs < 10)  return 'just now'
  if (secs < 60)  return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m ago`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function hms(): string {
  return new Date().toTimeString().slice(0, 8)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const SECTION_LABELS: Record<string, string> = {
  players:   'Tier List (players.json)',
  gamemodes: 'Gamemodes (gamemodes.json)',
  content:   'Homepage Content (content.json)',
  event:     'Event Config (event.json)',
  economy:   'Economy Settings (economy.json)',
}

// ─── Terminal log line ────────────────────────────────────────────────────────

function LogEntry({ line }: { line: LogLine }) {
  const color = {
    info:  'text-gray-400',
    ok:    'text-green-400',
    warn:  'text-amber-400',
    error: 'text-red-400',
    step:  'text-[#00BFFF] font-semibold',
    dim:   'text-gray-700',
  }[line.kind]
  return (
    <div className="flex items-start gap-2 font-mono text-[11px] leading-5">
      <span className="text-gray-700 shrink-0">[{line.ts}]</span>
      <span className={color}>{line.msg}</span>
    </div>
  )
}


// ─── Auto-Backup Panel ────────────────────────────────────────────────────────

const DEBOUNCE_PRESETS = [
  { label: '15 s',  ms: 15_000   },
  { label: '30 s',  ms: 30_000   },
  { label: '45 s',  ms: 45_000   },
  { label: '2 min', ms: 120_000  },
  { label: '5 min', ms: 300_000  },
  { label: '10 min',ms: 600_000  },
]

function fmtDebounce(ms: number): string {
  if (ms < 60_000) return `${ms / 1000} s`
  return `${ms / 60_000} min`
}

function fmtBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`
  if (n >= 1_024)     return `${(n / 1_024).toFixed(1)} KB`
  return `${n} B`
}

function fmtCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000)
  if (s <= 0) return 'firing…'
  if (s < 60)  return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

function AutoBackupPanel() {
  const [status,        setStatus]        = useState<BackupStatus | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [toggling,      setToggling]      = useState(false)
  const [backing,       setBacking]       = useState(false)
  const [backupLog,     setBackupLog]     = useState<string | null>(null)
  const [backupOk,      setBackupOk]      = useState<boolean | null>(null)
  const [setDebouncing, setSetDebouncing] = useState(false)
  const [countdown,     setCountdown]     = useState<number | null>(null)
  const [recentBackups, setRecentBackups] = useState<CommitEntry[]>([])
  const [historyLoading,setHistoryLoading]= useState(false)
  const [showCustom,    setShowCustom]    = useState(false)
  const [customSecs,    setCustomSecs]    = useState('')

  const statusRef = useRef<BackupStatus | null>(null)
  statusRef.current = status

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const s = await getBackupStatusFn()
      setStatus(s)
    } catch { /* swallow — server may be reloading */ }
    finally { if (!quiet) setLoading(false) }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const commits = await fetchCommitHistory()
      setRecentBackups(commits.filter(c => c.message.startsWith('[auto]')).slice(0, 5))
    } catch { /* ignore */ }
    finally { setHistoryLoading(false) }
  }, [])

  // Initial load + 10-second poll
  useEffect(() => {
    refresh()
    loadHistory()
    const poll = setInterval(() => refresh(true), 10_000)
    return () => clearInterval(poll)
  }, [refresh, loadHistory])

  // 500 ms countdown ticker — reads statusRef so no dep on status
  useEffect(() => {
    const tick = setInterval(() => {
      const s = statusRef.current
      if (s?.timerFiresAt) {
        setCountdown(Math.max(0, s.timerFiresAt - Date.now()))
      } else {
        setCountdown(null)
      }
    }, 500)
    return () => clearInterval(tick)
  }, [])

  async function toggleEnabled() {
    if (!status) return
    setToggling(true)
    try {
      const s = await setAutoBackupEnabled({ data: { enabled: !status.enabled } })
      setStatus(s)
    } catch { /* ignore */ }
    finally { setToggling(false) }
  }

  async function backupNow() {
    setBacking(true)
    setBackupLog(null)
    setBackupOk(null)
    try {
      const result = await triggerBackupNow()
      setStatus(result.status)
      setBackupLog(result.message)
      setBackupOk(result.ok)
      if (result.ok) loadHistory()
    } catch (e) {
      setBackupLog(e instanceof Error ? e.message : 'Unknown error')
      setBackupOk(false)
    } finally {
      setBacking(false)
    }
  }

  async function changeDebounce(ms: number) {
    setSetDebouncing(true)
    try {
      const s = await setBackupDebounce({ data: { ms } })
      setStatus(s)
      setShowCustom(false)
      setCustomSecs('')
    } catch { /* ignore */ }
    finally { setSetDebouncing(false) }
  }

  const on      = status?.enabled === true
  const pending = status?.hasPendingTimer === true
  const progress = (status?.timerFiresAt && status?.debounceMs && countdown !== null)
    ? Math.max(0, Math.min(100, (1 - countdown / status.debounceMs) * 100))
    : null

  return (
    <div className={`glass rounded-2xl border overflow-hidden transition-colors ${
      status?.lastBackupError ? 'border-red-500/20' :
      on ? 'border-white/8' : 'border-white/5'
    }`}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 flex-wrap">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          loading                  ? 'bg-gray-600 animate-pulse' :
          status?.isRunning        ? 'bg-blue-400 animate-pulse' :
          status?.lastBackupError  ? 'bg-red-400 animate-pulse'  :
          on && pending            ? 'bg-amber-400 animate-pulse' :
          on                       ? 'bg-green-400' : 'bg-gray-600'
        }`} />
        <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Mining Auto-Backup</h3>
        <span className="text-gray-600 text-[10px]">
          {loading && !status ? '— loading…' : status
            ? `debounce: ${fmtDebounce(status.debounceMs)} · ${status.files.length} files`
            : ''}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={backupNow}
            disabled={backing || loading || !status}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#00BFFF] border border-[#00BFFF]/25 bg-[#00BFFF]/8 hover:bg-[#00BFFF]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {backing
              ? <><span className="w-2.5 h-2.5 border-2 border-[#00BFFF]/30 border-t-[#00BFFF] rounded-full animate-spin" />Pushing…</>
              : '⚡ Backup Now'}
          </button>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold ${on ? 'text-green-400' : 'text-gray-600'}`}>
              {toggling ? '…' : on ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={toggleEnabled}
              disabled={toggling || !status}
              aria-label={on ? 'Disable auto-backup' : 'Enable auto-backup'}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus:outline-none disabled:opacity-40 ${
                on ? 'border-green-500 bg-green-500/20' : 'border-white/15 bg-white/5'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full shadow transition-transform duration-200 mt-px ${
                on ? 'translate-x-4 bg-green-400' : 'translate-x-0.5 bg-gray-500'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {status && (
        <div className="px-6 py-5 space-y-5">

          {/* ── Stats grid ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Last Backup</p>
              <p className={`text-sm font-bold ${status.lastBackupAt ? 'text-green-400' : 'text-gray-600'}`}>
                {status.lastBackupAt ? timeAgo(status.lastBackupAt) : '—'}
              </p>
              <p className="text-[10px] text-gray-700 mt-0.5 truncate">
                {status.lastBackupAt
                  ? new Date(status.lastBackupAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'None this session'}
              </p>
            </div>

            <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Next Backup</p>
              <p className={`text-sm font-bold font-mono ${pending ? 'text-amber-400' : 'text-gray-600'}`}>
                {pending && countdown !== null ? fmtCountdown(countdown) : '—'}
              </p>
              <p className="text-[10px] text-gray-700 mt-0.5">
                {pending ? 'timer running' : on ? 'idle — waiting for write' : 'disabled'}
              </p>
            </div>

            <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Session Commits</p>
              <p className={`text-sm font-bold ${status.totalBackups > 0 ? 'text-[#00BFFF]' : 'text-gray-600'}`}>
                {status.totalBackups}
              </p>
              <p className="text-[10px] text-gray-700 mt-0.5">since last restart</p>
            </div>

            <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">Retry Queue</p>
              <p className={`text-sm font-bold ${
                status.retryCount > 0 ? 'text-amber-400' :
                status.hasRetryPending ? 'text-amber-400' : 'text-green-400'
              }`}>
                {status.retryCount > 0 ? `${status.retryCount} / 5` : '0'}
              </p>
              <p className="text-[10px] text-gray-700 mt-0.5">
                {status.hasRetryPending ? 'retry pending…' : status.retryCount > 0 ? 'retrying' : 'clear'}
              </p>
            </div>
          </div>

          {/* ── Pending timer progress bar ─────────────────────────────────────── */}
          {pending && progress !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">
                  Debounce timer — fires in {countdown !== null ? fmtCountdown(countdown) : '…'}
                </span>
                <span className="text-amber-400 font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-700">
                Timer resets on every mining write. Commit fires {fmtDebounce(status.debounceMs)} after the <em>last</em> change.
              </p>
            </div>
          )}

          {/* ── Running indicator ─────────────────────────────────────────────── */}
          {status.isRunning && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
              <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0" />
              <span className="text-blue-400 text-[11px] font-medium">Backup in progress — committing to GitHub…</span>
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────────────────── */}
          {status.lastBackupError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 space-y-1">
              <p className="text-red-400 text-xs font-bold">✗ Last backup failed</p>
              <p className="text-red-400/80 text-[11px] font-mono break-all">{status.lastBackupError}</p>
              {status.retryCount > 0 && (
                <p className="text-gray-600 text-[10px]">
                  Auto-retrying ({status.retryCount}/5) with exponential backoff (30 s → 5 min).
                </p>
              )}
            </div>
          )}

          {/* ── Backup Now result ────────────────────────────────────────────── */}
          {backupLog && (
            <div className={`rounded-xl border px-4 py-3 flex items-start gap-2 ${
              backupOk === true  ? 'border-green-500/20 bg-green-500/5' :
              backupOk === false ? 'border-red-500/20   bg-red-500/5'   :
                                   'border-white/8      bg-black/20'
            }`}>
              <span className={backupOk === true ? 'text-green-400' : backupOk === false ? 'text-red-400' : 'text-gray-400'}>
                {backupOk === true ? '✓' : backupOk === false ? '✗' : '·'}
              </span>
              <span className={`text-[11px] font-mono break-all ${
                backupOk === true ? 'text-green-400' : backupOk === false ? 'text-red-400' : 'text-gray-400'
              }`}>{backupLog}</span>
            </div>
          )}

          {/* ── Debounce interval ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-widest text-gray-600">Debounce Interval</p>
              <p className="text-[10px] text-gray-700">
                current: <span className="text-gray-400 font-mono">{fmtDebounce(status.debounceMs)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEBOUNCE_PRESETS.map(p => (
                <button
                  key={p.ms}
                  onClick={() => changeDebounce(p.ms)}
                  disabled={setDebouncing}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all disabled:opacity-40 ${
                    status.debounceMs === p.ms
                      ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/40 text-[#00BFFF]'
                      : 'bg-white/3 border border-white/8 text-gray-400 hover:border-white/20 hover:text-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setShowCustom(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  showCustom
                    ? 'bg-white/8 border border-white/20 text-gray-200'
                    : 'bg-white/3 border border-white/8 text-gray-500 hover:border-white/20 hover:text-gray-300'
                }`}
              >
                custom…
              </button>
            </div>
            {showCustom && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={1800}
                  placeholder="seconds  (5 – 1800)"
                  value={customSecs}
                  onChange={e => setCustomSecs(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-white/25"
                />
                <button
                  onClick={() => {
                    const s = parseInt(customSecs, 10)
                    if (!isNaN(s) && s >= 5 && s <= 1800) changeDebounce(s * 1_000)
                  }}
                  disabled={setDebouncing || !customSecs}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#00BFFF] border border-[#00BFFF]/25 bg-[#00BFFF]/8 hover:bg-[#00BFFF]/15 transition-all disabled:opacity-40"
                >
                  Set
                </button>
              </div>
            )}
          </div>

          {/* ── Backed-up files ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-gray-600">Tracked Files</p>
            <div className="rounded-xl border border-white/5 bg-black/20 divide-y divide-white/4">
              {status.files.map(f => (
                <div key={f.name} className="px-4 py-2.5 flex items-center gap-3 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.exists ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="font-mono text-[11px] text-gray-300 flex-1 truncate">{f.name}</span>
                  <span className="font-mono text-[10px] text-gray-600 shrink-0 tabular-nums">{fmtBytes(f.bytes)}</span>
                  <span className="font-mono text-[10px] text-gray-700 shrink-0 hidden sm:block">{f.hash}</span>
                  <span className="font-mono text-[10px] text-[#00BFFF]/40 shrink-0 truncate hidden md:block max-w-[180px]">
                    → {f.repo}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Last committed message ────────────────────────────────────────── */}
          {status.lastBackupMessage && (
            <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-black/20">
              <span className="text-green-400 text-[10px] shrink-0 font-bold mt-px">✓</span>
              <span className="text-[10px] font-mono text-gray-500 break-all">{status.lastBackupMessage}</span>
            </div>
          )}

          {/* ── Recent auto-backup commits ────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-widest text-gray-600">
                Recent Auto-Backup Commits
              </p>
              <button
                onClick={loadHistory}
                disabled={historyLoading}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-40"
              >
                {historyLoading ? '↻ loading…' : '↻ refresh'}
              </button>
            </div>

            {recentBackups.length > 0 ? (
              <div className="rounded-xl border border-white/5 bg-black/20 divide-y divide-white/4">
                {recentBackups.map(c => (
                  <div key={c.shortSha} className="px-4 py-2.5 flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[10px] text-[#00BFFF] shrink-0">{c.shortSha}</span>
                    <span className="text-[11px] text-gray-400 flex-1 truncate">
                      {c.message.replace('[auto] ', '')}
                    </span>
                    <span className="text-[10px] text-gray-600 shrink-0 tabular-nums">{timeAgo(c.date)}</span>
                  </div>
                ))}
              </div>
            ) : historyLoading ? (
              <div className="px-4 py-4 text-center text-gray-700 text-[11px] animate-pulse">
                Loading commit history…
              </div>
            ) : (
              <div className="px-4 py-4 rounded-xl border border-white/5 bg-black/20 text-center text-gray-700 text-[11px]">
                No auto-backup commits found in recent history.
              </div>
            )}
          </div>

        </div>
      )}

      {loading && !status && (
        <div className="px-6 py-8 text-center text-gray-600 text-sm animate-pulse">
          Loading backup status…
        </div>
      )}
    </div>
  )
}

// ─── Git Diagnostics Panel ────────────────────────────────────────────────────

function GitDiagnosticsPanel() {
  const [diag,    setDiag]    = useState<GitDiagnostics | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing,  setFixing]  = useState(false)
  const [fixLog,  setFixLog]  = useState<string[]>([])
  const [fixOk,   setFixOk]   = useState<boolean | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      const d = await getGitDiagnostics()
      setDiag(d)
    } catch (e) {
      setDiag(null)
    } finally {
      setLoading(false)
    }
  }

  async function runFix() {
    setFixing(true)
    setFixLog([])
    setFixOk(null)
    try {
      // ── Step 1: flush any in-memory changes to disk before git sync ──────────
      const dirty = getDirty()
      if (dirty.size > 0) {
        const sectionData: Record<string, () => unknown> = {
          players:       getPlayers,
          gamemodes:     getGamemodes,
          content:       getSiteContent,
          event:         getEventConfig,
          economy:       getEconomyOverrides,
          homepage:      getHomepageConfig,
          'tier-tagger': getTierTaggerConfig,
        }
        setFixLog([
          `→ Flushing ${dirty.size} in-memory section(s) to disk…`,
          ...[...dirty].map(s => `  · ${SECTION_LABELS[s as keyof typeof SECTION_LABELS] ?? s}`),
        ])
        const sections = [...dirty].map(section => ({
          section: section as 'players' | 'gamemodes' | 'content' | 'event' | 'economy' | 'homepage' | 'tier-tagger',
          jsonData: JSON.stringify(sectionData[section](), null, 2),
        }))
        const flushResult = await flushStoresToDisk({ data: { sections } })
        setFixLog(prev => [...prev, `✓ Wrote ${flushResult.written.length} file(s) to disk`])
      }

      // ── Step 2: full git sync (fetch → commit → rebase → push) ──────────────
      setFixLog(prev => [...prev, '→ Running git sync (fetch → commit → rebase → push)…'])
      const result = await fixGitDivergence()
      setFixLog(prev => [...prev, ...result.logs])
      setFixOk(result.success)
      if (result.success) {
        clearDirty()
        setLastSync(Date.now(), `Git sync · ${new Date().toLocaleDateString()}`)
        await refresh()
      }
    } catch (e) {
      // Surface the actual error — not just "NetworkError when attempting to fetch resource"
      const raw = e instanceof Error ? e.message : String(e)
      const isNetwork = raw.toLowerCase().includes('networkerror') || raw.toLowerCase().includes('fetch')
      setFixLog(prev => [...prev,
        isNetwork
          ? '✗ Network error: The server function request failed.'
          : `✗ Error: ${raw}`,
        isNetwork
          ? '  This usually means the server took too long and the connection was dropped.'
          : '',
        isNetwork
          ? '  Try clicking Refresh first, then retry the push.'
          : '',
        `  Raw: ${raw}`,
      ].filter(Boolean))
      setFixOk(false)
    } finally {
      setFixing(false)
      setTimeout(() => logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50)
    }
  }

  useEffect(() => { refresh() }, [])

  if (!diag && !loading) return null

  const hasIssue      = diag && (diag.isDiverged || diag.behind > 0 || diag.ahead > 0 || diag.totalPending > 0)
  const jsonAllOk     = diag?.jsonChecks.every(j => j.ok) ?? true
  const conflictFiles = diag?.jsonChecks.filter(j => !j.ok) ?? []

  return (
    <div className={`glass rounded-2xl border overflow-hidden ${
      !jsonAllOk
        ? 'border-red-500/25'
        : hasIssue
          ? 'border-amber-500/20'
          : 'border-white/8'
    }`}>
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          !jsonAllOk ? 'bg-red-400 animate-pulse' :
          hasIssue   ? 'bg-amber-400 animate-pulse' :
          diag       ? 'bg-green-400' : 'bg-gray-600'
        }`} />
        <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Git Diagnostics</h3>
        <span className="text-gray-600 text-[10px] ml-0.5">
          {loading ? '— refreshing…' : diag ? `branch: ${diag.branch} · ${diag.headSha}` : ''}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {loading && <span className="text-gray-600 text-xs animate-pulse">Fetching…</span>}
          <button
            onClick={refresh}
            disabled={loading || fixing}
            className="px-3 py-1.5 rounded-lg text-[10px] text-gray-500 border border-white/8 hover:border-white/15 hover:text-gray-300 transition-all disabled:opacity-40"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {diag && (
        <div className="px-6 py-4 space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                label: 'Commits ahead',
                value: diag.ahead.toString(),
                color: diag.ahead > 0 ? 'text-amber-400' : 'text-green-400',
                hint: diag.ahead > 0 ? 'local commits not pushed' : 'synced',
              },
              {
                label: 'Commits behind',
                value: diag.behind.toString(),
                color: diag.behind > 0 ? 'text-red-400' : 'text-green-400',
                hint: diag.behind > 0 ? 'remote commits not in local' : 'synced',
              },
              {
                label: 'Pending files',
                value: diag.totalPending.toString(),
                color: diag.totalPending > 0 ? 'text-amber-400' : 'text-green-400',
                hint: `${diag.modified}M · ${diag.deleted}D · ${diag.untracked}U`,
              },
              {
                label: 'JSON health',
                value: jsonAllOk ? '✓ All valid' : `✗ ${conflictFiles.length} issue(s)`,
                color: jsonAllOk ? 'text-green-400' : 'text-red-400',
                hint: jsonAllOk ? '5 data files OK' : conflictFiles.map(f => f.file).join(', '),
              },
            ].map(stat => (
              <div key={stat.label} className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
                <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-gray-700 mt-0.5 truncate">{stat.hint}</p>
              </div>
            ))}
          </div>

          {/* JSON check detail */}
          {!jsonAllOk && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/4 px-4 py-3 space-y-1.5">
              <p className="text-red-400 text-xs font-bold mb-2">⚠ Data file issues detected — push blocked until resolved</p>
              {conflictFiles.map(f => (
                <div key={f.file} className="flex items-start gap-2">
                  <span className="text-red-400 text-[10px] font-bold shrink-0">✗</span>
                  <div>
                    <span className="text-gray-300 text-[11px] font-mono">{f.file}</span>
                    {f.error && <span className="text-red-400/70 text-[10px] ml-2">{f.error}</span>}
                  </div>
                </div>
              ))}
              <p className="text-gray-600 text-[10px] mt-1">Use the "Repair Data" button in the Tier List section, then push again.</p>
            </div>
          )}

          {/* Pending files list */}
          {diag.statusLines.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-black/30 px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-2">Working tree — {diag.statusLines.length} file(s)</p>
              <div className="space-y-0.5 max-h-28 overflow-y-auto">
                {diag.statusLines.map((line, i) => {
                  const code  = line.slice(0, 2)
                  const file  = line.slice(3)
                  const color = code.includes('M') ? 'text-amber-400' :
                                code.includes('D') ? 'text-red-400' :
                                code.startsWith('?') ? 'text-gray-500' : 'text-green-400'
                  return (
                    <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                      <span className={`shrink-0 font-bold ${color}`}>{code}</span>
                      <span className="text-gray-400 truncate">{file}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Divergence alert + fix button */}
          {(diag.isDiverged || diag.behind > 0) && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/4 px-4 py-3">
              <p className="text-amber-400 text-xs font-bold mb-1">
                {diag.isDiverged
                  ? `⚠ Diverged — ${diag.ahead} local commit(s) + ${diag.behind} remote commit(s) not integrated`
                  : `⚠ ${diag.behind} remote commit(s) not in local history`
                }
              </p>
              <p className="text-gray-500 text-[11px] mb-3 leading-relaxed">
                {diag.isDiverged
                  ? 'Local and remote have diverged. Click "Fix Divergence" to auto-rebase local onto remote, resolve data file conflicts (remote version wins), and push.'
                  : 'Remote has commits your local git doesn\'t have. Click "Fix" to rebase and sync.'
                }
              </p>
              <button
                onClick={runFix}
                disabled={fixing || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fixing
                  ? <><span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> Fixing…</>
                  : '⚡ Fix Divergence (auto-rebase + push)'
                }
              </button>
            </div>
          )}

          {/* Only ahead — offer push */}
          {diag.ahead > 0 && diag.behind === 0 && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/4 px-4 py-3 space-y-3">
              {/* Status headline */}
              <div>
                <p className="text-[#00BFFF] text-xs font-bold mb-1">
                  ↑ {diag.ahead} local commit(s) ready to push
                </p>
                <p className="text-gray-500 text-[11px]">
                  Local is ahead of remote — no divergence, push is safe.
                </p>
              </div>

              {/* Push diagnostics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Commits to push', value: diag.ahead.toString(),          color: 'text-[#00BFFF]' },
                  { label: 'Commits behind',  value: '0',                             color: 'text-green-400' },
                  { label: 'Modified files',  value: diag.modified.toString(),        color: diag.modified  > 0 ? 'text-amber-400' : 'text-green-400' },
                  { label: 'Untracked files', value: diag.untracked.toString(),       color: diag.untracked > 0 ? 'text-gray-400'  : 'text-green-400' },
                ].map(s => (
                  <div key={s.label} className="bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-center">
                    <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-0.5">{s.label}</p>
                    <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Uncommitted changes notice */}
              {diag.totalPending > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/6 px-3 py-2 space-y-1">
                  <p className="text-amber-400 text-[11px] font-semibold">
                    ⚠ {diag.totalPending} uncommitted file(s) detected
                  </p>
                  <p className="text-gray-500 text-[10px] leading-relaxed">
                    These will be <strong className="text-gray-300">auto-committed</strong> before pushing.
                    Untracked files in <code className="text-gray-400">data/backups/</code> are ignored via .gitignore.
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 pt-0.5">
                    {diag.modified  > 0 && <span className="text-amber-400/80 text-[10px] font-mono">M ×{diag.modified} modified</span>}
                    {diag.untracked > 0 && <span className="text-gray-500    text-[10px] font-mono">? ×{diag.untracked} untracked (will be added)</span>}
                    {diag.deleted   > 0 && <span className="text-red-400/80  text-[10px] font-mono">D ×{diag.deleted} deleted</span>}
                  </div>
                </div>
              )}

              {/* GitHub connection status */}
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <span className="text-green-400 font-bold">✓</span>
                <span>GitHub token configured</span>
                <span className="mx-1 text-gray-700">·</span>
                <span className="text-green-400 font-bold">✓</span>
                <span>Repository: peepeepopo91-svg/rupa</span>
                <span className="mx-1 text-gray-700">·</span>
                <span className="text-green-400 font-bold">✓</span>
                <span>Branch: {diag.branch}</span>
              </div>

              <button
                onClick={runFix}
                disabled={fixing || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-[#00BFFF] border border-[#00BFFF]/25 bg-[#00BFFF]/8 hover:bg-[#00BFFF]/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fixing
                  ? <><span className="w-3 h-3 border-2 border-[#00BFFF]/30 border-t-[#00BFFF] rounded-full animate-spin" /> Pushing…</>
                  : `↑ Push ${diag.ahead} Commit${diag.ahead !== 1 ? 's' : ''} to GitHub`
                }
              </button>
            </div>
          )}

          {/* Uncommitted changes only — nothing ahead or behind */}
          {diag.totalPending > 0 && diag.ahead === 0 && diag.behind === 0 && !diag.isDiverged && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/4 px-4 py-3 space-y-3">
              <div>
                <p className="text-amber-400 text-xs font-bold mb-1">
                  ⚠ {diag.totalPending} uncommitted file(s) in working tree
                </p>
                <p className="text-gray-500 text-[11px] leading-relaxed">
                  These files were written to disk (e.g. credentials.yml, mining-users.json) but not yet committed.
                  Click below to commit and push them to GitHub.
                </p>
              </div>

              <div className="space-y-0.5">
                {diag.statusLines.map((line, i) => {
                  const code  = line.slice(0, 2)
                  const file  = line.slice(3)
                  const color = code.includes('M') ? 'text-amber-400' :
                                code.includes('D') ? 'text-red-400' :
                                code.startsWith('?') ? 'text-gray-500' : 'text-green-400'
                  return (
                    <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                      <span className={`shrink-0 font-bold ${color}`}>{code}</span>
                      <span className="text-gray-400 truncate">{file}</span>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={runFix}
                disabled={fixing || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fixing
                  ? <><span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> Committing & pushing…</>
                  : '↑ Commit & Push to GitHub'
                }
              </button>
            </div>
          )}

          {/* Fix output log */}
          {fixLog.length > 0 && (
            <div
              ref={logRef}
              className={`rounded-xl border px-4 py-3 space-y-1 max-h-48 overflow-y-auto ${
                fixOk === false
                  ? 'border-red-500/20 bg-red-500/4'
                  : fixOk === true
                    ? 'border-green-500/20 bg-green-500/4'
                    : 'border-white/8 bg-black/30'
              }`}
            >
              <p className={`text-[9px] uppercase tracking-widest mb-2 ${
                fixOk === false ? 'text-red-500' : fixOk === true ? 'text-green-500' : 'text-gray-600'
              }`}>
                {fixOk === true ? '✓ Fix completed' : fixOk === false ? '✗ Fix failed' : 'Fix output'}
              </p>
              {fixLog.map((line, i) => {
                const color = line.startsWith('✓') ? 'text-green-400' :
                              line.startsWith('✗') ? 'text-red-400' :
                              line.startsWith('→') ? 'text-[#00BFFF]' :
                              line.startsWith('  ') ? 'text-gray-600' :
                              'text-gray-400'
                return (
                  <div key={i} className={`font-mono text-[10px] leading-5 ${color}`}>{line}</div>
                )
              })}
            </div>
          )}

          {/* All good */}
          {!hasIssue && jsonAllOk && diag.totalPending === 0 && (
            <p className="text-green-400 text-sm text-center py-1">✓ Local git is fully synchronized with origin/main</p>
          )}

          {diag.fetchError && (
            <p className="text-amber-400/60 text-[10px] font-mono">Fetch warning: {diag.fetchError}</p>
          )}
        </div>
      )}

      {loading && !diag && (
        <div className="px-6 py-8 text-center text-gray-600 text-sm animate-pulse">
          Running git fetch + status…
        </div>
      )}
    </div>
  )
}

// ─── Advanced Git Panel ───────────────────────────────────────────────────────

function AdvancedGitPanel() {
  const [log, setLog]         = useState<LogLine[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  function push(msg: string, kind: LogLine['kind'] = 'info') {
    const line = { ts: hms(), msg, kind }
    setLog(prev => [...prev, line])
    setTimeout(() => logRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 30)
  }

  async function runOp(op: string, fn: () => Promise<void>) {
    setRunning(op)
    setLog([])
    try {
      await fn()
    } finally {
      setRunning(null)
    }
  }

  const ops = [
    {
      label: 'Fetch',
      icon: '⬇',
      id: 'fetch',
      description: 'Check for new remote commits',
      action: () => runOp('fetch', async () => {
        push('Fetching origin…', 'step')
        const commits = await fetchCommitHistory()
        const top = commits[0]
        push(`Remote HEAD: ${top.shortSha} — "${top.message}"`, 'ok')
        push(`Author: ${top.author} · ${fmtDate(top.date)}`, 'dim')
        push(`${commits.length} commits total on branch main`, 'info')
      }),
    },
    {
      label: 'Pull',
      icon: '⬇⬇',
      id: 'pull',
      description: 'Download remote files to disk',
      action: () => runOp('pull', async () => {
        push('Pulling remote files to local disk…', 'step')
        const result = await pullRemoteFiles()
        result.pulled.forEach(f => push(`  ✓ Pulled ${f}`, 'ok'))
        push(`Pull complete — ${result.pulled.length} file(s) updated`, 'ok')
      }),
    },
    {
      label: 'Status',
      icon: '📊',
      id: 'status',
      description: 'Compare local files to remote',
      action: () => runOp('status', async () => {
        push('Checking repository status…', 'step')
        const cmp = await compareLocalToRemote()
        push(`Branch: main  Repository: peepeepopo91-svg/rupa`, 'info')
        push('', 'dim')
        cmp.forEach(c => {
          if (c.isSame) push(`  = ${c.file} (up to date)`, 'dim')
          else          push(`  M ${c.file} (modified — local differs from remote)`, 'warn')
        })
        const dirty = cmp.filter(c => !c.isSame)
        push('', 'dim')
        push(dirty.length === 0
          ? 'Working tree clean. Nothing to push.'
          : `${dirty.length} file(s) modified — use "Push Changes" to sync.`,
        dirty.length === 0 ? 'ok' : 'warn')
      }),
    },
    {
      label: 'View Log',
      icon: '📜',
      id: 'log',
      description: 'Show last 10 commits',
      action: () => runOp('log', async () => {
        push('Fetching commit log…', 'step')
        const commits = await fetchCommitHistory()
        push(`Commit log for peepeepopo91-svg/rupa@main:`, 'info')
        push('', 'dim')
        commits.slice(0, 10).forEach(c => {
          push(`${c.shortSha}  ${c.message.slice(0, 55).padEnd(55)}  ${fmtDate(c.date)}`, 'info')
        })
      }),
    },
    {
      label: 'View Diff',
      icon: '🔀',
      id: 'diff',
      description: 'Show local vs remote differences',
      action: () => runOp('diff', async () => {
        push('Comparing local to remote…', 'step')
        const cmp = await compareLocalToRemote()
        const changed = cmp.filter(c => !c.isSame)
        if (changed.length === 0) {
          push('No differences — local matches remote exactly.', 'ok')
          return
        }
        changed.forEach(c => {
          push(`--- remote/${c.repoPath}  (${c.remoteBytes} bytes)`, 'dim')
          push(`+++ local/${c.file}  (${c.localBytes} bytes)`, 'ok')
          const delta = c.localBytes - c.remoteBytes
          push(`  Size delta: ${delta > 0 ? '+' : ''}${delta} bytes`, 'info')
        })
        push(`${changed.length} file(s) differ from remote.`, 'warn')
      }),
    },
    {
      label: 'Reset (soft)',
      icon: '↺',
      id: 'reset-soft',
      description: 'Pull remote files to disk (keeps local changes flagged as dirty)',
      confirm: 'This will overwrite your local data files with the remote versions. Your localStorage edits may differ. Proceed?',
      action: () => runOp('reset-soft', async () => {
        push('Soft reset: pulling remote files to disk…', 'step')
        const result = await pullRemoteFiles()
        result.pulled.forEach(f => push(`  ✓ Restored ${f} from remote`, 'ok'))
        push('Soft reset complete. Local files now match remote.', 'ok')
        push('Reload the admin panel to re-sync UI state.', 'info')
      }),
    },
    {
      label: 'Reset (mixed)',
      icon: '↺↺',
      id: 'reset-mixed',
      description: 'Pull remote + clear all pending changes',
      confirm: 'This will overwrite local data files with remote content AND clear all pending (dirty) changes. Any unsaved local edits will be lost. Proceed?',
      action: () => runOp('reset-mixed', async () => {
        push('Mixed reset: pulling remote files and clearing pending changes…', 'step')
        const result = await pullRemoteFiles()
        result.pulled.forEach(f => push(`  ✓ Restored ${f} from remote`, 'ok'))
        clearDirty()
        push('All pending changes cleared.', 'ok')
        push('Mixed reset complete. Reload the page to refresh UI state.', 'ok')
      }),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {ops.map(op => (
          <button
            key={op.id}
            disabled={running !== null}
            onClick={() => {
              if (op.confirm) { setShowConfirm(op.id); return }
              op.action()
            }}
            className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              running === op.id
                ? 'border-[#00BFFF]/30 bg-[#00BFFF]/5 text-[#00BFFF]'
                : 'border-white/8 bg-white/1 hover:border-white/15 hover:bg-white/3 text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{op.icon}</span>
              {running === op.id && <span className="w-3 h-3 border-2 border-[#00BFFF]/30 border-t-[#00BFFF] rounded-full animate-spin" />}
            </div>
            <span className="text-xs font-bold">{op.label}</span>
            <span className="text-[10px] text-gray-600 leading-tight">{op.description}</span>
          </button>
        ))}
      </div>

      {/* Terminal output */}
      {log.length > 0 && (
        <div
          ref={logRef}
          className="h-48 overflow-y-auto bg-black/50 border border-white/6 rounded-xl p-3 space-y-0.5"
        >
          {log.map((l, i) => <LogEntry key={i} line={l} />)}
          {running && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-gray-600">
              <span className="animate-pulse">▌</span>
            </div>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-amber-500/20 p-6 max-w-sm w-full">
            <h3 className="text-amber-400 font-bold mb-3">⚠ Confirm Operation</h3>
            <p className="text-gray-300 text-sm mb-5 leading-relaxed">
              {ops.find(o => o.id === showConfirm)?.confirm}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5">
                Cancel
              </button>
              <button
                onClick={() => {
                  const op = ops.find(o => o.id === showConfirm)
                  setShowConfirm(null)
                  op?.action()
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-amber-400 border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rollback Panel ───────────────────────────────────────────────────────────

function RollbackPanel({ commits }: { commits: CommitEntry[] }) {
  const [restoring, setRestoring] = useState<string | null>(null)
  const [preview,   setPreview]   = useState<string | null>(null)
  const [done,      setDone]      = useState<string | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  async function handleRestore(sha: string) {
    setRestoring(sha)
    setError(null)
    try {
      const result = await restoreToCommit({ data: { sha } })
      setDone(result.shortSha)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="space-y-2">
      {done && (
        <div className="px-4 py-3 rounded-xl bg-green-500/8 border border-green-500/20 text-green-400 text-sm">
          ✓ Restored — new commit <span className="font-mono font-bold">{done}</span> created on main.
          Pull the latest changes to update local files.
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm">
          ✗ Restore failed: {error}
        </div>
      )}

      <div className="divide-y divide-white/5 rounded-xl border border-white/8 overflow-hidden">
        {commits.slice(0, 20).map(c => (
          <div key={c.sha} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors">
            <span className="font-mono text-[#00BFFF] text-xs shrink-0">{c.shortSha}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{c.message}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{c.author} · {fmtDate(c.date)}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => setPreview(preview === c.sha ? null : c.sha)}
                className="px-2.5 py-1 rounded-lg text-[10px] text-gray-400 border border-white/10 hover:bg-white/5 transition-all"
              >
                Preview
              </button>
              <button
                disabled={!!restoring}
                onClick={() => handleRestore(c.sha)}
                className="px-2.5 py-1 rounded-lg text-[10px] text-amber-400 border border-amber-500/20 hover:bg-amber-500/8 disabled:opacity-40 transition-all"
              >
                {restoring === c.sha ? '…' : 'Restore'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="px-4 py-3 rounded-xl bg-white/2 border border-white/8 text-xs font-mono text-gray-400">
          <p className="text-gray-600 mb-1 uppercase tracking-widest text-[9px]">Preview: {preview.slice(0, 7)}</p>
          <p>Restore will create a <strong className="text-white">new commit</strong> on branch main that points to</p>
          <p>the file tree of commit <span className="text-[#00BFFF]">{preview.slice(0, 7)}</span>.</p>
          <p>This does not rewrite history — it is safe to do at any time.</p>
          <button onClick={() => setPreview(null)} className="mt-2 text-gray-600 hover:text-gray-400">✕ Close</button>
        </div>
      )}
    </div>
  )
}

// ─── Sync History Panel ───────────────────────────────────────────────────────

function SyncHistoryPanel({ history }: { history: SyncHistoryEntry[] }) {
  const [page, setPage] = useState(1)
  const totalPages  = Math.max(1, Math.ceil(history.length / SYNC_HISTORY_PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pagedHistory = history.slice((safePage - 1) * SYNC_HISTORY_PAGE_SIZE, safePage * SYNC_HISTORY_PAGE_SIZE)

  if (history.length === 0) {
    return <p className="text-gray-600 text-sm py-4 text-center">No sync history yet. Push to GitHub to create your first entry.</p>
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/8 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[110px_80px_1fr_140px_70px_80px] gap-2 px-4 py-2 border-b border-white/5 text-[9px] text-gray-600 uppercase tracking-widest">
          <span>Date</span>
          <span>Commit</span>
          <span>Message</span>
          <span>Files</span>
          <span>Status</span>
          <span>Duration</span>
        </div>
        <div className="divide-y divide-white/5">
          {pagedHistory.map(h => (
            <div key={h.id} className="grid sm:grid-cols-[110px_80px_1fr_140px_70px_80px] gap-2 px-4 py-3 items-center">
              <span className="text-[10px] text-gray-500">{fmtDate(h.date)}</span>
              <span className="font-mono text-[#00BFFF] text-[10px]">{h.commitHash.slice(0, 7)}</span>
              <span className="text-gray-300 text-[11px] truncate">{h.commitMessage}</span>
              <span className="text-gray-600 text-[10px] truncate">{h.filesChanged.join(', ')}</span>
              <span className={`text-[10px] font-bold ${h.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {h.status === 'success' ? '✓ OK' : '✗ Fail'}
              </span>
              <span className="text-gray-600 text-[10px]">{(h.durationMs / 1000).toFixed(1)}s</span>
            </div>
          ))}
        </div>
      </div>

      <AdminPaginator
        page={safePage}
        totalPages={totalPages}
        totalItems={history.length}
        pageSize={SYNC_HISTORY_PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}

// ─── Token Manager Panel ──────────────────────────────────────────────────────

function TokenManagerPanel() {
  const [info,      setInfo]      = useState<TokenInfo | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [input,     setInput]     = useState('')
  const [show,      setShow]      = useState(false)
  const [testing,   setTesting]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [clearing,  setClearing]  = useState(false)
  const [testResult, setTestResult] = useState<TokenTestResult | null>(null)
  const [saveMsg,   setSaveMsg]   = useState<string | null>(null)
  const [clearMsg,  setClearMsg]  = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  async function refresh() {
    setLoading(true)
    try { setInfo(await getTokenInfo()) } catch { setInfo(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  // Reset derivative state when the input changes
  function handleInput(v: string) {
    setInput(v)
    setTestResult(null)
    setSaveMsg(null)
    setClearMsg(null)
  }

  async function handleTest() {
    if (!input.trim()) return
    setTesting(true)
    setTestResult(null)
    try { setTestResult(await testGitHubToken({ data: { token: input.trim() } })) }
    catch (e) { setTestResult({ valid: false, error: e instanceof Error ? e.message : 'Error', username: null, avatarUrl: null, name: null, scopes: null, hasRepoScope: false, rateLimit: null }) }
    finally { setTesting(false) }
  }

  async function handleSave() {
    if (!input.trim()) return
    setSaving(true)
    setSaveMsg(null)
    try {
      await saveGitHubToken({ data: { token: input.trim() } })
      setSaveMsg('✓ Token saved — active immediately and persists across restarts.')
      setInput('')
      setTestResult(null)
      await refresh()
    } catch (e) {
      setSaveMsg(`✗ Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally { setSaving(false) }
  }

  async function handleClear() {
    setClearing(true)
    setClearMsg(null)
    setConfirmClear(false)
    try {
      const r = await clearGitHubToken()
      if (r.wasInFile) {
        setClearMsg('✓ Token removed from credentials.yml.')
      } else {
        setClearMsg('ℹ Token was set via Replit Secret (environment variable) — it cannot be removed here. Remove it from the Replit Secrets panel instead.')
      }
      await refresh()
    } catch (e) {
      setClearMsg(`✗ Clear failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally { setClearing(false) }
  }

  const canSave = !!input.trim() && (testResult?.valid === true)
  const canTest = !!input.trim() && !testing

  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        <span className="text-base">🔑</span>
        <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Token Management</h3>
        <span className="text-gray-600 text-[10px] ml-0.5">Manage your GitHub Personal Access Token</span>
        <div className="ml-auto flex items-center gap-2">
          {loading && <span className="text-gray-600 text-xs animate-pulse">Loading…</span>}
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-[10px] text-gray-500 border border-white/8 hover:border-white/15 hover:text-gray-300 transition-all disabled:opacity-40"
          >↻ Refresh</button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* ── Current token status card ─────────────────────────────────────── */}
        <div className={`rounded-xl border px-4 py-4 space-y-3 ${
          !info || !info.configured ? 'border-red-500/20 bg-red-500/4'
          : info.invalid            ? 'border-amber-500/20 bg-amber-500/4'
          :                           'border-green-500/15 bg-green-500/3'
        }`}>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status dot + label */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                !info || !info.configured ? 'bg-red-400 animate-pulse'
                : info.invalid            ? 'bg-amber-400 animate-pulse'
                :                           'bg-green-400'
              }`} />
              <span className={`text-sm font-bold ${
                !info || !info.configured ? 'text-red-400'
                : info.invalid            ? 'text-amber-400'
                :                           'text-green-400'
              }`}>
                {loading ? '…'
                  : !info || !info.configured ? 'Not configured'
                  : info.invalid              ? 'Token invalid'
                  :                             'Configured ✓'}
              </span>
            </div>

            {/* Source badge */}
            {info?.source && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                info.source === 'env'
                  ? 'text-purple-400 border-purple-500/25 bg-purple-500/8'
                  : 'text-[#00BFFF] border-[#00BFFF]/25 bg-[#00BFFF]/8'
              }`}>
                {info.source === 'env' ? '⚙ Replit Secret' : '📄 Panel (credentials.yml)'}
              </span>
            )}

            {/* Masked token */}
            {info?.maskedToken && (
              <span className="font-mono text-[11px] text-gray-500 bg-white/3 border border-white/8 rounded px-2 py-0.5">
                {info.maskedToken}
              </span>
            )}
          </div>

          {/* User info row */}
          {info?.valid && info.username && (
            <div className="flex items-center gap-3 flex-wrap">
              {info.avatarUrl && (
                <img src={info.avatarUrl} alt="" className="w-7 h-7 rounded-full border border-white/10" />
              )}
              <div>
                <span className="text-white text-sm font-semibold">@{info.username}</span>
                {info.name && <span className="text-gray-500 text-xs ml-2">{info.name}</span>}
              </div>
              {info.rateLimit && (
                <span className="text-gray-500 text-[10px] ml-auto">
                  API: {info.rateLimit.remaining.toLocaleString()} / {info.rateLimit.limit.toLocaleString()} calls left
                </span>
              )}
            </div>
          )}

          {/* Scopes */}
          {info?.valid && info.scopes && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-600 text-[10px] uppercase tracking-widest">Scopes</span>
              {info.scopes.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                  s === 'repo'
                    ? 'text-green-400 border-green-500/25 bg-green-500/8'
                    : 'text-gray-400 border-white/8 bg-white/3'
                }`}>{s}</span>
              ))}
              {!info.hasRepoScope && (
                <span className="text-amber-400 text-[10px]">⚠ Missing <code className="font-mono">repo</code> scope — push will fail</span>
              )}
            </div>
          )}

          {/* Invalid / not configured messages */}
          {info?.invalid && (
            <p className="text-amber-400 text-xs">Token is set but GitHub rejected it — it may be expired or revoked. Enter a new token below.</p>
          )}
          {!loading && info && !info.configured && (
            <p className="text-gray-500 text-xs">No token found. Enter your GitHub Personal Access Token below to enable sync.</p>
          )}
        </div>

        {/* ── How to create a token (shown when not configured or invalid) ─── */}
        {(!info?.configured || info?.invalid) && !loading && (
          <div className="rounded-xl border border-white/6 bg-white/1 px-4 py-3 space-y-1.5">
            <p className="text-gray-400 text-xs font-semibold">How to get a token</p>
            <ol className="text-gray-500 text-[11px] leading-relaxed list-decimal list-inside space-y-0.5">
              <li>Go to <span className="text-[#00BFFF] font-mono">github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)</span></li>
              <li>Click <span className="text-white font-semibold">Generate new token (classic)</span></li>
              <li>Check the <span className="text-green-400 font-mono font-bold">repo</span> scope (required for push)</li>
              <li>Copy the token and paste it below</li>
            </ol>
          </div>
        )}

        {/* ── Update / set token form ───────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
            {info?.configured ? 'Replace Token' : 'Set Token'}
          </p>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={show ? 'text' : 'password'}
                value={input}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canTest) handleTest() }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 transition-colors pr-16"
                spellCheck={false}
                autoComplete="off"
              />
              <button
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-1"
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleTest}
              disabled={!canTest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-300 border border-white/12 bg-white/3 hover:bg-white/6 hover:border-white/20 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {testing
                ? <><span className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-300 rounded-full animate-spin" />Testing…</>
                : '🔍 Test Token'}
            </button>

            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              title={!testResult?.valid ? 'Test the token first' : ''}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white border border-[#00BFFF]/30 bg-[#00BFFF]/10 hover:bg-[#00BFFF]/18 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
            >
              {saving
                ? <><span className="w-3 h-3 border-2 border-[#00BFFF]/30 border-t-[#00BFFF] rounded-full animate-spin" />Saving…</>
                : '💾 Save Token'}
            </button>

            {info?.configured && (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={clearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/12 transition-all disabled:opacity-35 disabled:cursor-not-allowed ml-auto"
              >
                {clearing
                  ? <><span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />Clearing…</>
                  : '🗑 Clear Token'}
              </button>
            )}
          </div>

          {/* Save hint */}
          {input.trim() && !testResult && (
            <p className="text-gray-600 text-[10px]">Test the token first — Save unlocks after a successful test.</p>
          )}
        </div>

        {/* ── Test result ───────────────────────────────────────────────────── */}
        {testResult && (
          <div className={`rounded-xl border px-4 py-3 space-y-2 ${
            testResult.valid ? 'border-green-500/20 bg-green-500/4' : 'border-red-500/20 bg-red-500/4'
          }`}>
            {testResult.valid ? (
              <>
                <div className="flex items-center gap-2">
                  {testResult.avatarUrl && (
                    <img src={testResult.avatarUrl} alt="" className="w-6 h-6 rounded-full border border-white/10" />
                  )}
                  <span className="text-green-400 text-sm font-bold">✓ Token valid</span>
                  <span className="text-gray-300 text-xs">@{testResult.username}</span>
                  {testResult.name && <span className="text-gray-500 text-xs">{testResult.name}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {testResult.rateLimit && (
                    <span className="text-gray-500 text-[10px]">
                      {testResult.rateLimit.remaining.toLocaleString()} / {testResult.rateLimit.limit.toLocaleString()} API calls remaining
                    </span>
                  )}
                  {testResult.scopes && (
                    <span className="text-gray-600 text-[10px]">
                      Scopes: <span className="text-gray-400 font-mono">{testResult.scopes || '(none)'}</span>
                    </span>
                  )}
                </div>
                {!testResult.hasRepoScope && (
                  <p className="text-amber-400 text-[11px] font-semibold">
                    ⚠ This token is missing the <code className="font-mono">repo</code> scope — it won't be able to push commits. Regenerate with the <code className="font-mono">repo</code> checkbox enabled.
                  </p>
                )}
                <p className="text-green-400/70 text-[10px]">↑ Click Save Token to apply.</p>
              </>
            ) : (
              <div>
                <p className="text-red-400 text-sm font-bold">✗ Token invalid</p>
                {testResult.error && <p className="text-red-400/70 text-[11px] mt-1">{testResult.error}</p>}
              </div>
            )}
          </div>
        )}

        {/* ── Save / clear feedback ─────────────────────────────────────────── */}
        {saveMsg && (
          <div className={`rounded-xl border px-4 py-2.5 text-[11px] ${
            saveMsg.startsWith('✓')
              ? 'border-green-500/20 bg-green-500/4 text-green-400'
              : 'border-red-500/20 bg-red-500/4 text-red-400'
          }`}>{saveMsg}</div>
        )}
        {clearMsg && (
          <div className={`rounded-xl border px-4 py-2.5 text-[11px] ${
            clearMsg.startsWith('✓')
              ? 'border-green-500/20 bg-green-500/4 text-green-400'
              : clearMsg.startsWith('ℹ')
              ? 'border-blue-500/20 bg-blue-500/4 text-blue-300'
              : 'border-red-500/20 bg-red-500/4 text-red-400'
          }`}>{clearMsg}</div>
        )}

        {/* ── Security note ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/5 bg-white/1 px-4 py-3">
          <p className="text-gray-600 text-[10px] leading-relaxed">
            <span className="text-gray-500 font-semibold">Security: </span>
            Tokens saved here are stored in <span className="font-mono text-gray-400">credentials.yml</span> on the server filesystem and never sent to the browser.
            For maximum security, set <span className="font-mono text-gray-400">GITHUB_TOKEN</span> as a Replit Secret instead — environment variables always take precedence over the panel-saved token.
          </p>
        </div>
      </div>

      {/* ── Confirm clear dialog ──────────────────────────────────────────────── */}
      {confirmClear && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-red-500/20 p-6 max-w-sm w-full">
            <h3 className="text-red-400 font-bold mb-3">Remove GitHub Token?</h3>
            <p className="text-gray-300 text-sm mb-5 leading-relaxed">
              This will remove the token from <span className="font-mono text-gray-200">credentials.yml</span>.
              GitHub sync features will stop working until a new token is set.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5">
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/25 bg-red-500/8 hover:bg-red-500/15"
              >
                Remove Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GitHubSyncCenter({ admin: _admin }: { admin: string }) {
  const sync = useSyncState()

  const [repoStatus,  setRepoStatus]  = useState<RepoStatus | null>(null)
  const [connChecks,  setConnChecks]  = useState<ConnectionChecks | null>(null)
  const [commits,     setCommits]     = useState<CommitEntry[]>([])
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([])
  const [, setTick]                   = useState(0)

  const [loadingStatus, setLoadingStatus] = useState(true)
  const [historyOpen,   setHistoryOpen]   = useState(false)
  const [rollbackOpen,  setRollbackOpen]  = useState(false)
  const [advancedOpen,  setAdvancedOpen]  = useState(false)
  const [syncing,       setSyncing]       = useState(false)
  const [syncLog,       setSyncLog]       = useState<string[]>([])
  const [syncOk,        setSyncOk]        = useState<boolean | null>(null)
  const syncLogRef = useRef<HTMLDivElement>(null)

  // Refresh "X ago" every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const refresh = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const [status, conn, hist] = await Promise.all([
        fetchRepoStatus(),
        checkGitHubConnection(),
        fetchSyncHistory(),
      ])
      setRepoStatus(status as RepoStatus)
      setConnChecks(conn)
      setSyncHistory(hist)
    } catch { /* ignore */ }
    finally { setLoadingStatus(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function loadCommits() {
    try {
      const c = await fetchCommitHistory()
      setCommits(c)
    } catch { /* */ }
  }

  useEffect(() => {
    if (rollbackOpen && commits.length === 0) loadCommits()
  }, [rollbackOpen])

  async function runSync() {
    setSyncing(true)
    setSyncLog([])
    setSyncOk(null)
    try {
      const dirty = getDirty()
      if (dirty.size > 0) {
        const sectionData: Record<string, () => unknown> = {
          players:       getPlayers,
          gamemodes:     getGamemodes,
          content:       getSiteContent,
          event:         getEventConfig,
          economy:       getEconomyOverrides,
          homepage:      getHomepageConfig,
          'tier-tagger': getTierTaggerConfig,
        }
        setSyncLog([
          `→ Flushing ${dirty.size} section(s) to disk…`,
          ...[...dirty].map(s => `  · ${SECTION_LABELS[s as keyof typeof SECTION_LABELS] ?? s}`),
        ])
        const sections = [...dirty].map(section => ({
          section: section as 'players' | 'gamemodes' | 'content' | 'event' | 'economy' | 'homepage' | 'tier-tagger',
          jsonData: JSON.stringify(sectionData[section](), null, 2),
        }))
        const flushResult = await flushStoresToDisk({ data: { sections } })
        setSyncLog(prev => [...prev, `✓ Wrote ${flushResult.written.length} file(s) to disk`])
      }
      setSyncLog(prev => [...prev, '→ Running git sync (fetch → commit → rebase → push)…'])
      const result = await fixGitDivergence()
      setSyncLog(prev => [...prev, ...result.logs])
      setSyncOk(result.success)
      if (result.success) {
        clearDirty()
        setLastSync(Date.now(), `Git sync · ${new Date().toLocaleDateString()}`)
        await refresh()
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      setSyncLog(prev => [...prev, `✗ Error: ${raw}`])
      setSyncOk(false)
    } finally {
      setSyncing(false)
      setTimeout(() => syncLogRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50)
    }
  }

  const dirtyList = [...sync.dirty]
  const isDirty   = sync.isDirty

  // Health calculation
  const healthOk = connChecks
    ? connChecks.tokenExists && connChecks.repoExists && connChecks.branchExists && !isDirty
    : null

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Status Dashboard ────────────────────────────────────────────────── */}
      <div className="relative glass rounded-2xl border border-white/8 overflow-hidden">

        {/* Top prismatic accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00BFFF] to-[#7C3AED]/60 pointer-events-none" />
        {/* Subtle inner glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#00BFFF]/3 to-transparent pointer-events-none" />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative px-6 pt-6 pb-5 flex items-start gap-4">

          {/* Icon block */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00BFFF]/15 to-[#7C3AED]/10 border border-[#00BFFF]/25 flex items-center justify-center shadow-lg shadow-[#00BFFF]/5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[#00BFFF]">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.742 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </div>
            {/* Live health badge */}
            <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0B0F17] ${
              loadingStatus ? 'bg-gray-600' :
              healthOk === true  ? 'bg-green-400' :
              healthOk === false ? 'bg-amber-400 animate-pulse' :
              'bg-gray-600'
            }`} />
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-lg leading-tight tracking-tight">
              Sync Dashboard
            </h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/4 border border-white/8 text-[10px] font-mono text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF]/60" />
                peepeepopo91-svg/rupa
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/8 border border-purple-500/15 text-[10px] font-mono text-purple-400">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
                {repoStatus?.branch ?? 'main'}
              </span>
              {!loadingStatus && healthOk === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/8 border border-green-500/15 text-[10px] text-green-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Healthy
                </span>
              )}
              {!loadingStatus && healthOk === false && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/8 border border-amber-500/15 text-[10px] text-amber-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Attention needed
                </span>
              )}
            </div>
          </div>

          {/* Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            {loadingStatus && <span className="text-gray-600 text-[10px] animate-pulse">Refreshing…</span>}
            <button
              onClick={refresh}
              disabled={loadingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-gray-500 border border-white/8 hover:border-[#00BFFF]/30 hover:text-[#00BFFF] hover:bg-[#00BFFF]/5 transition-all disabled:opacity-40"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={loadingStatus ? 'animate-spin' : ''}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats grid ──────────────────────────────────────────────────── */}
        <div className="border-t border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y divide-white/4 sm:divide-y-0 sm:divide-x sm:divide-white/4">

            {/* Row 1 */}
            <SyncStatCell
              label="Repository"
              value="peepeepopo91-svg/rupa"
              valueClass="text-gray-200 text-[11px]"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00BFFF]">
                  <path d="M3 3h6l2 4-3 2a12 12 0 0 0 7 7l2-3 4 2v6a1 1 0 0 1-1 1C9.716 21.5 2.5 14.284 2 4a1 1 0 0 1 1-1z"/>
                </svg>
              }
              iconBg="bg-[#00BFFF]/8 border-[#00BFFF]/15"
            />
            <SyncStatCell
              label="Branch"
              value={repoStatus?.branch ?? 'main'}
              valueClass="text-purple-400 font-mono"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                  <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                  <path d="M18 9a9 9 0 0 1-9 9"/>
                </svg>
              }
              iconBg="bg-purple-500/8 border-purple-500/15"
            />
            <SyncStatCell
              label="Latest Commit"
              value={loadingStatus ? '…' : (repoStatus?.latestCommit?.sha ?? '—')}
              valueClass="text-[#00BFFF] font-mono text-[11px]"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00BFFF]">
                  <circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>
                </svg>
              }
              iconBg="bg-[#00BFFF]/8 border-[#00BFFF]/15"
            />
            <SyncStatCell
              label="Last Sync"
              value={sync.lastSyncAt ? timeAgo(sync.lastSyncAt) : '—'}
              valueClass={sync.lastSyncAt ? 'text-[#00BFFF]' : 'text-gray-600'}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              }
              iconBg="bg-sky-500/8 border-sky-500/15"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y divide-white/4 sm:divide-y-0 sm:divide-x sm:divide-white/4 border-t border-white/4">

            {/* Row 2 */}
            <SyncStatCell
              label="GitHub User"
              value={loadingStatus ? '…' : (connChecks?.username ? `@${connChecks.username}` : '—')}
              valueClass="text-gray-300 text-[11px]"
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              }
              iconBg="bg-white/5 border-white/10"
            />
            <SyncStatCell
              label="Token Status"
              value={loadingStatus ? '…' : (connChecks?.tokenExists ? 'Configured ✓' : 'Missing ✗')}
              valueClass={connChecks?.tokenExists ? 'text-green-400' : 'text-red-400'}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={connChecks?.tokenExists ? 'text-green-400' : 'text-red-400'}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              }
              iconBg={connChecks?.tokenExists ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'}
              statusDot={connChecks?.tokenExists ? 'green' : connChecks?.tokenExists === false ? 'red' : undefined}
            />
            <SyncStatCell
              label="Remote Status"
              value={loadingStatus ? '…' : (repoStatus?.connected ? 'Reachable ✓' : 'Unreachable ✗')}
              valueClass={repoStatus?.connected ? 'text-green-400' : 'text-red-400'}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={repoStatus?.connected ? 'text-green-400' : 'text-red-400'}>
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              }
              iconBg={repoStatus?.connected ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'}
              statusDot={repoStatus?.connected ? 'green' : repoStatus?.connected === false ? 'red' : undefined}
            />
            <SyncStatCell
              label="Sync Health"
              value={loadingStatus ? '…' : healthOk === true ? 'Healthy ✓' : healthOk === false ? 'Attention' : '—'}
              valueClass={healthOk === true ? 'text-green-400' : healthOk === false ? 'text-amber-400' : 'text-gray-600'}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={healthOk === true ? 'text-green-400' : healthOk === false ? 'text-amber-400' : 'text-gray-500'}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              }
              iconBg={healthOk === true ? 'bg-green-500/8 border-green-500/20' : healthOk === false ? 'bg-amber-500/8 border-amber-500/20' : 'bg-white/5 border-white/10'}
              statusDot={healthOk === true ? 'green' : healthOk === false ? 'amber' : undefined}
              pulse={healthOk === false}
            />
          </div>
        </div>

        {/* ── Latest commit strip ──────────────────────────────────────────── */}
        {repoStatus?.latestCommit?.message && (
          <div className="border-t border-white/5 bg-black/25 px-6 py-3 flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#00BFFF]/60">
                <circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>
              </svg>
              <span className="text-[9px] uppercase tracking-widest text-gray-600 font-medium">Latest commit</span>
            </div>
            <div className="w-px h-3 bg-white/8 shrink-0" />
            <span className="text-[11px] font-mono text-gray-400 truncate flex-1">{repoStatus.latestCommit.message}</span>
            {repoStatus.latestCommit.date && (
              <span className="text-[10px] text-gray-700 tabular-nums shrink-0">{timeAgo(repoStatus.latestCommit.date)}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Local Changes ────────────────────────────────────────────────────── */}
      <div className={`glass rounded-2xl border overflow-hidden ${isDirty ? 'border-amber-500/20' : 'border-white/8'}`}>
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isDirty ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
          <h3 className="font-['Space_Grotesk'] font-semibold text-white text-sm">Local Changes</h3>
          <span className={`ml-auto text-xs font-bold ${isDirty ? 'text-amber-400' : 'text-green-400'}`}>
            {isDirty ? `${dirtyList.length} section${dirtyList.length !== 1 ? 's' : ''} modified` : 'All sections committed'}
          </span>
        </div>
        <div className="px-6 py-4 space-y-4">
          {isDirty ? (
            <>
              <div className="space-y-1.5">
                {dirtyList.map(s => (
                  <div key={s} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 shrink-0" />
                    <span className="text-gray-300 text-sm">{SECTION_LABELS[s] ?? s}</span>
                    <span className="text-amber-500/60 text-[10px] uppercase tracking-widest ml-auto">modified</span>
                  </div>
                ))}
              </div>

              <button
                onClick={runSync}
                disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/35 hover:from-amber-500/30 hover:to-amber-600/30 hover:border-amber-500/55 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {syncing
                  ? <><span className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> Syncing to GitHub…</>
                  : '↑ Commit & Push to GitHub'
                }
              </button>

              {syncLog.length > 0 && (
                <div
                  ref={syncLogRef}
                  className={`rounded-xl border px-4 py-3 space-y-1 max-h-48 overflow-y-auto ${
                    syncOk === false ? 'border-red-500/20 bg-red-500/4' :
                    syncOk === true  ? 'border-green-500/20 bg-green-500/4' :
                                       'border-white/8 bg-black/30'
                  }`}
                >
                  <p className={`text-[9px] uppercase tracking-widest mb-2 ${
                    syncOk === false ? 'text-red-500' : syncOk === true ? 'text-green-500' : 'text-gray-600'
                  }`}>
                    {syncOk === true ? '✓ Sync complete' : syncOk === false ? '✗ Sync failed' : 'Sync output'}
                  </p>
                  {syncLog.map((line, i) => {
                    const color = line.startsWith('✓') ? 'text-green-400' :
                                  line.startsWith('✗') ? 'text-red-400' :
                                  line.startsWith('→') ? 'text-[#00BFFF]' :
                                  line.startsWith('  ') ? 'text-gray-600' :
                                  'text-gray-400'
                    return <div key={i} className={`font-mono text-[10px] leading-5 ${color}`}>{line}</div>
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-600 text-sm">No pending changes. Repository is synchronized.</p>
          )}
        </div>
      </div>

      {/* ── Git Diagnostics ──────────────────────────────────────────────────── */}
      <GitDiagnosticsPanel />

      {/* ── Auto-Backup ──────────────────────────────────────────────────────── */}
      <AutoBackupPanel />

      {/* ── Token Management ──────────────────────────────────────────────────── */}
      <TokenManagerPanel />

      {/* ── Sync History ──────────────────────────────────────────────────────── */}
      <CollapsibleSection
        title="Sync History"
        subtitle={`${syncHistory.length} sync${syncHistory.length !== 1 ? 's' : ''} recorded`}
        icon="📋"
        open={historyOpen}
        onToggle={() => setHistoryOpen(v => !v)}
      >
        <SyncHistoryPanel history={syncHistory} />
      </CollapsibleSection>

      {/* ── Rollback ──────────────────────────────────────────────────────────── */}
      <CollapsibleSection
        title="Rollback"
        subtitle="Restore any previous commit (creates a new commit — history is preserved)"
        icon="↺"
        open={rollbackOpen}
        onToggle={() => setRollbackOpen(v => !v)}
        accent="amber"
      >
        {commits.length === 0
          ? <p className="text-gray-600 text-sm py-2">Loading commit history…</p>
          : <RollbackPanel commits={commits} />
        }
      </CollapsibleSection>

      {/* ── Advanced Git ──────────────────────────────────────────────────────── */}
      <CollapsibleSection
        title="Advanced Git"
        subtitle="Manual fetch, pull, status, log, diff, and reset operations"
        icon="⚙"
        open={advancedOpen}
        onToggle={() => setAdvancedOpen(v => !v)}
      >
        <AdvancedGitPanel />
      </CollapsibleSection>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SyncStatCell({ label, value, valueClass, icon, iconBg, statusDot, pulse }: {
  label: string
  value: string
  valueClass: string
  icon: React.ReactNode
  iconBg: string
  statusDot?: 'green' | 'amber' | 'red'
  pulse?: boolean
}) {
  return (
    <div className="group relative bg-[#070B12] hover:bg-[#0A0F18] transition-colors px-5 py-4">
      {/* Hover left accent */}
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[#00BFFF] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-3">
        {/* Icon badge */}
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-1">{label}</p>
          <div className="flex items-center gap-1.5">
            {statusDot && (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                statusDot === 'green' ? 'bg-green-400' :
                statusDot === 'amber' ? 'bg-amber-400' : 'bg-red-400'
              } ${pulse ? 'animate-pulse' : ''}`} />
            )}
            <p className={`text-sm font-bold truncate ${valueClass}`}>{value}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollapsibleSection({
  title, subtitle, icon, open, onToggle, accent = 'blue', children,
}: {
  title: string; subtitle: string; icon: string
  open: boolean; onToggle: () => void; accent?: 'blue' | 'amber'
  children: React.ReactNode
}) {
  const accentClass = accent === 'amber' ? 'border-amber-500/15' : 'border-white/8'
  return (
    <div className={`glass rounded-2xl border ${accentClass} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-white/2 transition-colors"
      >
        <span className="text-base">{icon}</span>
        <div className="flex-1 text-left">
          <p className="font-['Space_Grotesk'] font-bold text-white text-sm">{title}</p>
          <p className="text-gray-600 text-[11px] mt-0.5">{subtitle}</p>
        </div>
        <span className="text-gray-600 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-white/5 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}
