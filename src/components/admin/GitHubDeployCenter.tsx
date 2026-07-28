// ─── GitHub Deploy Center — Grand Sync & Deployment Dashboard ─────────────────
// One section that handles everything: full repo sync, data publish,
// live site health, commit history, and auto-sync configuration.

import { useState, useEffect, useRef, useReducer, useCallback } from 'react'
import { useSyncState } from '../../store/syncStore'
import {
  getGitHubBridgeStatus,
  pushAllToGitHub,
  pushEverythingToGitHub,
  pullAllFromGitHub,
  fetchCommitHistory,
  fetchSyncHistory,
  restoreToCommit,
  getSyncState,
  getSyncConfig,
  saveSyncConfig,
  pullStaticDataFromGitHub,
  fullSyncFromGitHub,
  getRepoTreeInfo,
  type GitHubBridgeStatus,
  type CommitEntry,
  type SyncHistoryEntry,
  type SyncState,
  type SyncConfig,
  type FullSyncResult,
  type RepoTreeInfo,
} from '../../server/dataFiles'
import {
  getPlayers, getGamemodes, savePlayers, saveGamemodes,
} from '../../store/playersStore'
import { getSiteContent, getEventConfig, saveSiteContent, saveEventConfig } from '../../store/contentStore'
import { getEconomyOverrides, saveEconomyOverrides } from '../../store/miningStore'
import { getHomepageConfig, saveHomepageConfig } from '../../store/homepageStore'
import { getTierTaggerConfig, saveTierTaggerConfig } from '../../store/tierTaggerStore'
import { clearDirty, setLastSync } from '../../store/syncStore'

interface Props { admin: string }

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'deploy' | 'publish' | 'livesite' | 'history' | 'settings'

interface LogLine { ts: string; msg: string; kind: 'info'|'ok'|'warn'|'error'|'step'|'dim' }

function mkLog(msg: string, kind: LogLine['kind'] = 'info'): LogLine {
  return { ts: new Date().toTimeString().slice(0, 8), msg, kind }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  players:      'Tier List',
  gamemodes:    'Gamemodes',
  content:      'Site Content',
  event:        'Event Config',
  economy:      'Economy',
  homepage:     'Homepage',
  'tier-tagger':'Tier Tagger',
}

const INTERVAL_OPTIONS = [
  { label: 'Off',    ms: 0 },
  { label: '1 min',  ms: 60_000 },
  { label: '5 min',  ms: 300_000 },
  { label: '15 min', ms: 900_000 },
  { label: '30 min', ms: 1_800_000 },
  { label: '1 hr',   ms: 3_600_000 },
]

const COMMIT_TEMPLATES = [
  'Updated player rankings',
  'Economy & shop changes',
  'Homepage content update',
  'Tournament update',
  'New features added',
]

const PROTECTED_FILES = [
  { file: 'mining-users.json',     desc: 'Player balances & rigs' },
  { file: 'shop-purchases.json',   desc: 'Purchase history' },
  { file: 'mining-community.json', desc: 'Community mining state' },
  { file: 'mining-access.json',    desc: 'Access control' },
  { file: 'sync-state.json',       desc: 'Sync state tracking' },
  { file: 'credentials.yml',       desc: 'Admin credentials' },
  { file: 'admin.yml',             desc: 'Admin auth config' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 10)  return 'just now'
  if (secs < 60)  return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m ago`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeUntil(iso: string | null | undefined): string {
  if (!iso) return '—'
  const secs = Math.floor((new Date(iso).getTime() - Date.now()) / 1000)
  if (secs <= 0) return 'now'
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

function fmtMs(ms: number): string {
  if (ms === 0)         return 'Off'
  if (ms < 60_000)      return `${ms / 1000}s`
  if (ms < 3_600_000)   return `${ms / 60_000} min`
  return `${ms / 3_600_000} hr`
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function LogEntry({ line }: { line: LogLine }) {
  const color  = { info: 'text-gray-400', ok: 'text-green-400', warn: 'text-amber-400', error: 'text-red-400', step: 'text-[#00BFFF] font-semibold', dim: 'text-gray-600' }[line.kind]
  const prefix = { ok: '✓', error: '✗', warn: '⚠', step: '→', info: ' ', dim: '·' }[line.kind]
  return (
    <div className="flex items-start gap-2 font-mono text-[11px] leading-5">
      <span className="text-gray-700 shrink-0">[{line.ts}]</span>
      <span className={color}>{prefix} {line.msg}</span>
    </div>
  )
}

function OperationLog({ logs, onClear }: { logs: LogLine[]; onClear: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [logs])
  if (logs.length === 0) return null
  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Operation Log</p>
        <button onClick={onClear} className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors">Clear</button>
      </div>
      <div ref={ref} className="p-4 space-y-0.5 max-h-56 overflow-y-auto bg-black/20">
        {logs.map((l, i) => <LogEntry key={i} line={l} />)}
      </div>
    </div>
  )
}

// ─── Status Cards ─────────────────────────────────────────────────────────────

function StatusCards({
  status, syncState, syncConfig,
}: {
  status:     GitHubBridgeStatus | null
  syncState:  SyncState | null
  syncConfig: SyncConfig | null
}) {
  const [, tick] = useReducer(x => x + 1, 0)
  useEffect(() => { const id = setInterval(tick, 10_000); return () => clearInterval(id) }, [])

  const ghCommit    = status?.latestCommit
  const liveSha     = syncState?.lastCommitSha
  const isInSync    = ghCommit && liveSha && (ghCommit.sha === liveSha || ghCommit.sha.startsWith(liveSha?.slice(0, 7) ?? '___'))
  const intervalMs  = syncConfig?.intervalMs ?? 300_000
  const lastTrigger = syncState?.triggeredBy ?? ''
  const wasFullSync = lastTrigger === 'full-sync'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

      {/* GitHub */}
      <div className="glass rounded-2xl border border-white/8 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">GitHub</span>
          {status?.connected
            ? <span className="flex items-center gap-1 text-[11px] text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Connected</span>
            : <span className="flex items-center gap-1 text-[11px] text-red-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Disconnected</span>
          }
        </div>
        {ghCommit ? (
          <>
            <p className="text-white text-sm font-bold font-mono">{ghCommit.shortSha}</p>
            <p className="text-gray-400 text-xs truncate">{ghCommit.message}</p>
            <p className="text-gray-600 text-[10px]">{ghCommit.author} · {timeAgo(ghCommit.date)}</p>
          </>
        ) : (
          <p className="text-gray-600 text-xs">{status?.error ?? 'No commit info'}</p>
        )}
        {status?.connected && <p className="text-gray-700 text-[10px] font-mono">{status.owner}/{status.repo}</p>}
      </div>

      {/* Live Site */}
      <div className="glass rounded-2xl border border-white/8 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Live Site</span>
          {syncState?.lastSyncAt
            ? (syncState.filesFailed === 0
                ? <span className="flex items-center gap-1 text-[11px] text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Healthy</span>
                : <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{syncState.filesFailed} errors</span>)
            : <span className="text-[11px] text-gray-600">No sync yet</span>
          }
        </div>
        {syncState?.lastCommitSha ? (
          <>
            <p className="text-white text-sm font-bold font-mono">{syncState.lastCommitSha.slice(0, 7)}</p>
            <p className="text-gray-400 text-xs truncate">{syncState.lastCommitMessage ?? '—'}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-600 text-[10px]">{timeAgo(syncState.lastSyncAt)}</p>
              {isInSync
                ? <span className="text-[10px] text-green-400">✓ Up to date</span>
                : ghCommit && <span className="text-[10px] text-amber-400">⚠ Behind GitHub</span>
              }
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-xs">Syncs on live site startup</p>
        )}
      </div>

      {/* Last Sync Type */}
      <div className="glass rounded-2xl border border-white/8 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Last Sync</span>
          {wasFullSync
            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/25 font-semibold">Full</span>
            : syncState?.lastSyncAt
            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">Data</span>
            : <span className="text-[10px] text-gray-600">—</span>
          }
        </div>
        {syncState?.lastSyncAt ? (
          <>
            <p className="text-white text-sm font-bold">{timeAgo(syncState.lastSyncAt)}</p>
            <p className="text-gray-400 text-xs">{syncState.filesUpdated} files updated</p>
            <p className="text-gray-600 text-[10px] capitalize">{lastTrigger || '—'}</p>
          </>
        ) : (
          <p className="text-gray-600 text-xs">No sync recorded yet</p>
        )}
      </div>

      {/* Auto-Sync */}
      <div className="glass rounded-2xl border border-white/8 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Auto-Sync</span>
          {intervalMs > 0
            ? <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />Active</span>
            : <span className="text-[11px] text-gray-500 font-semibold">Off</span>
          }
        </div>
        {intervalMs > 0 ? (
          <>
            <p className="text-white text-sm font-bold">Every {fmtMs(intervalMs)}</p>
            {syncState?.nextAutoSyncAt
              ? <p className="text-gray-400 text-xs">Next in {timeUntil(syncState.nextAutoSyncAt)}</p>
              : <p className="text-gray-600 text-xs">Next: on live site</p>
            }
            <p className="text-gray-600 text-[10px]">Live site auto-pulls data</p>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm">Manual only</p>
            <p className="text-gray-600 text-xs">Enable in Settings tab</p>
          </>
        )}
      </div>

    </div>
  )
}

// ─── Deploy Tab ───────────────────────────────────────────────────────────────

type FullSyncPhase = 'idle' | 'scanning' | 'syncing' | 'done' | 'error'

const SYNC_CATEGORIES = [
  { key: 'dist'   as const, icon: '⚡', label: 'dist/',   desc: 'Compiled frontend & SSR bundles', color: 'text-[#00BFFF]',   activeBorder: 'border-[#00BFFF]/40',   activeBg: 'bg-[#00BFFF]/10',   idleBorder: 'border-[#00BFFF]/20',   idleBg: 'bg-[#00BFFF]/5',   glow: 'shadow-[0_0_20px_rgba(0,191,255,0.2)]'  },
  { key: 'public' as const, icon: '🖼', label: 'public/', desc: 'Assets, icons & images',          color: 'text-violet-400',  activeBorder: 'border-violet-500/40',  activeBg: 'bg-violet-500/10',  idleBorder: 'border-violet-500/20',  idleBg: 'bg-violet-500/5',  glow: 'shadow-[0_0_20px_rgba(139,92,246,0.2)]' },
  { key: 'data'   as const, icon: '📄', label: 'data/',   desc: 'Config & content JSON files',     color: 'text-emerald-400', activeBorder: 'border-emerald-500/40', activeBg: 'bg-emerald-500/10', idleBorder: 'border-emerald-500/20', idleBg: 'bg-emerald-500/5', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
  { key: 'src'    as const, icon: '📦', label: 'src/',    desc: 'TypeScript source files',         color: 'text-amber-400',   activeBorder: 'border-amber-500/40',   activeBg: 'bg-amber-500/10',   idleBorder: 'border-amber-500/20',   idleBg: 'bg-amber-500/5',   glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]' },
]

function SyncCategoryCard({
  cat, scannedCount, syncResult, phase,
}: {
  cat: typeof SYNC_CATEGORIES[number]
  scannedCount: number
  syncResult: FullSyncResult | null
  phase: FullSyncPhase
}) {
  const isSyncing  = phase === 'syncing'
  const isDone     = phase === 'done'
  const result     = isDone && syncResult ? syncResult.byCategory[cat.key] : null
  const hasFailure = result && result.failed > 0

  const borderClass = isSyncing
    ? cat.activeBorder
    : isDone && !hasFailure
    ? 'border-green-500/30'
    : isDone && hasFailure
    ? 'border-amber-500/30'
    : cat.idleBorder

  const bgClass = isSyncing
    ? cat.activeBg
    : isDone && !hasFailure
    ? 'bg-green-500/5'
    : isDone && hasFailure
    ? 'bg-amber-500/5'
    : cat.idleBg

  return (
    <div className={`relative flex flex-col gap-1.5 px-3 py-3 rounded-xl border transition-all duration-400 ${borderClass} ${bgClass} ${isSyncing ? cat.glow : ''}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">{cat.icon}</span>
          <p className={`text-xs font-bold font-mono truncate ${cat.color}`}>{cat.label}</p>
        </div>
        {isSyncing && (
          <span className={`text-[10px] font-semibold ${cat.color} flex items-center gap-1 shrink-0`}>
            <span className="inline-block animate-spin leading-none">⟳</span>
          </span>
        )}
        {isDone && !hasFailure && <span className="text-[10px] font-bold text-green-400 shrink-0">✓</span>}
        {isDone &&  hasFailure && <span className="text-[10px] font-bold text-amber-400 shrink-0">⚠</span>}
      </div>

      {/* File count */}
      {(scannedCount > 0 || result) && (
        <p className={`text-[11px] font-semibold ${
          isDone && !hasFailure ? 'text-green-300'
          : isDone &&  hasFailure ? 'text-amber-300'
          : cat.color
        }`}>
          {result
            ? `${result.updated} written${result.failed > 0 ? ` · ${result.failed} ✗` : ''}`
            : `${scannedCount} files`}
        </p>
      )}
      {phase === 'idle' || phase === 'scanning' ? (
        <p className="text-[10px] text-gray-600 truncate">{cat.desc}</p>
      ) : null}
    </div>
  )
}

function TerminalLog({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [lines])
  if (lines.length === 0) return null
  return (
    <div ref={ref} className="font-mono text-[11px] space-y-px max-h-48 overflow-y-auto bg-black/40 rounded-xl p-3 border border-white/6 leading-5">
      {lines.map((l, i) => {
        const isOk   = l.startsWith('✓')
        const isErr  = l.startsWith('✗')
        const isWarn = l.startsWith('⚠')
        const isStep = l.startsWith('→')
        const color  = isOk ? 'text-green-400' : isErr ? 'text-red-400' : isWarn ? 'text-amber-400' : isStep ? 'text-[#00BFFF]' : 'text-gray-600'
        return <div key={i} className={color}>{l}</div>
      })}
    </div>
  )
}

function DeployTab({
  status, syncState, onLog, onRefreshSyncState,
}: {
  status:             GitHubBridgeStatus | null
  syncState:          SyncState | null
  onLog:              (msg: string, kind: LogLine['kind']) => void
  onRefreshSyncState: () => void
}) {
  const [phase,         setPhase]         = useState<FullSyncPhase>('idle')
  const [treeInfo,      setTreeInfo]      = useState<RepoTreeInfo | null>(null)
  const [syncResult,    setSyncResult]    = useState<FullSyncResult | null>(null)
  const [termLines,     setTermLines]     = useState<string[]>([])
  const [elapsed,       setElapsed]       = useState(0)
  const [quickSyncing,  setQuickSyncing]  = useState(false)
  const [quickResult,   setQuickResult]   = useState<{ ok: boolean; files: number } | null>(null)
  const [showProtected, setShowProtected] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connected = !!status?.connected
  const busy      = phase === 'scanning' || phase === 'syncing' || quickSyncing

  function pushLine(line: string) {
    setTermLines(prev => [...prev, line])
  }
  function startTimer() {
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  async function handleFullSync() {
    setPhase('scanning')
    setTreeInfo(null)
    setSyncResult(null)
    setTermLines([])
    startTimer()
    pushLine(`→ Connecting to GitHub…`)

    let tree: RepoTreeInfo
    try {
      tree = await getRepoTreeInfo()
      setTreeInfo(tree)
      if (!tree.ok) {
        pushLine(`✗ Scan failed: ${tree.error ?? 'unknown error'}`)
        stopTimer(); setPhase('error'); return
      }
    } catch (e) {
      pushLine(`✗ ${(e as Error).message}`)
      stopTimer(); setPhase('error'); return
    }

    pushLine(`✓ Repository scanned — ${tree.totalFiles} files queued for download`)
    if (tree.lastCommitSha) pushLine(`→ HEAD ${tree.lastCommitSha.slice(0, 7)} — ${tree.lastCommitMessage ?? ''}`)
    const cats = SYNC_CATEGORIES.filter(c => (tree.byCategory[c.key] ?? 0) > 0)
    if (cats.length) pushLine(`→ ` + cats.map(c => `${c.label}${tree.byCategory[c.key]}`).join('  '))

    await new Promise(r => setTimeout(r, 500))

    setPhase('syncing')
    pushLine(`→ Downloading all ${tree.totalFiles} files in parallel batches…`)

    try {
      const result = await fullSyncFromGitHub()
      result.logs.forEach(l => pushLine(l))
      setSyncResult(result)
      stopTimer()
      setPhase(result.success ? 'done' : 'error')
      if (result.success) onRefreshSyncState()
      result.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→·]\s*/, ''), k)
      })
    } catch (e) {
      const msg = (e as Error).message.replace(/^[A-Z_]+:\s*/, '')
      pushLine(`✗ ${msg}`); stopTimer(); setPhase('error'); onLog(msg, 'error')
    }
  }

  async function handleQuickSync() {
    setQuickSyncing(true)
    setQuickResult(null)
    onLog('Running quick data sync — pulling JSON files from GitHub…', 'step')
    try {
      const result = await pullStaticDataFromGitHub()
      result.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→]\s*/, ''), k)
      })
      setQuickResult({ ok: result.success, files: result.filesUpdated })
      if (result.success) onRefreshSyncState()
    } catch (e) {
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setQuickSyncing(false)
    }
  }

  function handleReset() {
    stopTimer(); setPhase('idle'); setTreeInfo(null); setSyncResult(null); setTermLines([]); setElapsed(0)
  }

  // ── Derived hero card styles ────────────────────────────────────────────────
  const heroBorder = {
    idle:     'border-[#00BFFF]/20',
    scanning: 'border-[#00BFFF]/40 shadow-[0_0_40px_rgba(0,191,255,0.08)]',
    syncing:  'border-[#00BFFF]/55 shadow-[0_0_60px_rgba(0,191,255,0.13)]',
    done:     'border-green-500/40 shadow-[0_0_40px_rgba(74,222,128,0.10)]',
    error:    'border-red-500/35',
  }[phase]

  const iconContent = phase === 'scanning' ? <span className="animate-spin text-xl leading-none">⟳</span>
    : phase === 'syncing' ? <span className="animate-pulse">🚀</span>
    : phase === 'done'    ? <span>✅</span>
    : phase === 'error'   ? <span>❌</span>
    : <span>🚀</span>

  const iconBg = phase === 'scanning' || phase === 'syncing'
    ? 'bg-[#00BFFF]/18 border-[#00BFFF]/45 shadow-[0_0_24px_rgba(0,191,255,0.28)]'
    : phase === 'done'  ? 'bg-green-500/15 border-green-500/40'
    : phase === 'error' ? 'bg-red-500/15 border-red-500/40'
    : 'bg-[#00BFFF]/12 border-[#00BFFF]/25'

  return (
    <div className="space-y-4">

      {/* ── FULL REPO SYNC — Grand animated hero card ─────────────────────── */}
      <div className={`glass rounded-2xl border ${heroBorder} p-6 space-y-5 relative overflow-hidden transition-all duration-500`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#00BFFF]/4 via-transparent to-violet-500/3 pointer-events-none transition-opacity duration-500" style={{ opacity: phase === 'idle' ? 0.5 : 1 }} />

        {/* ── Header row ─────────────────────────────────────────────────── */}
        <div className="relative flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shrink-0 transition-all duration-300 ${iconBg}`}>
            {iconContent}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-bold text-lg">
                {phase === 'idle'     && 'Full Repo Sync'}
                {phase === 'scanning' && 'Scanning Repository…'}
                {phase === 'syncing'  && 'Downloading Files…'}
                {phase === 'done'     && 'Sync Complete '}
                {phase === 'error'    && 'Sync Failed'}
              </p>
              {phase === 'idle' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/25 font-semibold uppercase tracking-wide">Recommended</span>
              )}
              {(phase === 'scanning' || phase === 'syncing') && (
                <span className="text-[11px] text-gray-500 font-mono tabular-nums">{elapsed}s</span>
              )}
              {phase === 'done' && syncResult && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-semibold">
                  {syncResult.filesUpdated} files · {elapsed}s
                </span>
              )}
            </div>

            <p className="text-gray-400 text-sm mt-1">
              {phase === 'idle' && <>Downloads <strong className="text-white">every single file</strong> from GitHub — compiled frontend, assets, data, source code, and all new features. Nothing left behind.</>}
              {phase === 'scanning' && !treeInfo && 'Fetching complete file tree from GitHub…'}
              {phase === 'scanning' &&  treeInfo && <span className="text-[#00BFFF]">Found <strong>{treeInfo.totalFiles}</strong> files — starting download…</span>}
              {phase === 'syncing' && treeInfo  && <>Downloading <strong className="text-white">{treeInfo.totalFiles}</strong> files across {SYNC_CATEGORIES.filter(c => treeInfo.byCategory[c.key] > 0).length} directories…</>}
              {phase === 'done' && syncResult && (
                <span className="text-green-400">
                  ✓ {syncResult.filesUpdated} files written successfully
                  {syncResult.filesFailed  > 0 && <span className="text-amber-400 ml-2">· {syncResult.filesFailed} failed</span>}
                  {syncResult.filesSkipped > 0 && <span className="text-gray-500 ml-2">· {syncResult.filesSkipped} protected</span>}
                </span>
              )}
              {phase === 'error' && <span className="text-red-400">Check the terminal log below for details.</span>}
            </p>

            {/* Commit info pill */}
            {treeInfo?.lastCommitSha && phase !== 'idle' && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-gray-300">{treeInfo.lastCommitSha.slice(0, 7)}</span>
                <span className="text-[11px] text-gray-500 truncate max-w-[240px]">{treeInfo.lastCommitMessage}</span>
                {treeInfo.lastCommitAuthor && <span className="text-[10px] text-gray-700">by {treeInfo.lastCommitAuthor}</span>}
              </div>
            )}
          </div>
        </div>

        {/* ── Category cards grid ─────────────────────────────────────────── */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SYNC_CATEGORIES.map(cat => (
            <SyncCategoryCard
              key={cat.key}
              cat={cat}
              scannedCount={treeInfo?.byCategory[cat.key] ?? 0}
              syncResult={syncResult}
              phase={phase}
            />
          ))}
        </div>

        {/* ── Animated progress bar (syncing) ────────────────────────────── */}
        {phase === 'syncing' && (
          <div className="relative space-y-1.5">
            <div className="h-1 bg-white/6 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00BFFF] via-violet-400 to-emerald-400 animate-pulse" style={{ width: '100%' }} />
            </div>
            <p className="text-[10px] text-gray-600 text-center tracking-wide">Downloading in parallel batches of 8 · please wait…</p>
          </div>
        )}

        {/* ── Done summary bar ────────────────────────────────────────────── */}
        {phase === 'done' && syncResult && (
          <div className="relative flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 rounded-xl bg-green-500/6 border border-green-500/18">
            {SYNC_CATEGORIES.filter(c => (syncResult.byCategory[c.key]?.updated ?? 0) > 0 || (syncResult.byCategory[c.key]?.failed ?? 0) > 0).map(c => (
              <span key={c.key} className="text-[11px] flex items-center gap-1.5">
                <span className={`font-mono font-bold ${c.color}`}>{c.label}</span>
                <span className="text-gray-400">{syncResult.byCategory[c.key].updated} files</span>
                {syncResult.byCategory[c.key].failed > 0 && <span className="text-amber-400">({syncResult.byCategory[c.key].failed} ✗)</span>}
              </span>
            ))}
            {syncResult.lastCommitSha && (
              <span className="text-[11px] text-gray-600 ml-auto font-mono">commit {syncResult.lastCommitSha.slice(0, 7)}</span>
            )}
            {syncResult.truncated && <span className="text-[10px] text-amber-400 w-full">⚠ GitHub tree was truncated — very large repo; some files may have been missed</span>}
          </div>
        )}

        {/* ── Terminal log ────────────────────────────────────────────────── */}
        {termLines.length > 0 && (
          <div className="relative">
            <TerminalLog lines={termLines} />
          </div>
        )}

        {/* ── Action button ───────────────────────────────────────────────── */}
        <div className="relative">
          {(phase === 'scanning' || phase === 'syncing') ? (
            <div className="w-full py-3.5 rounded-xl text-sm font-semibold text-gray-500 border border-white/8 bg-white/3 flex items-center justify-center gap-2 cursor-not-allowed select-none">
              <span className="animate-spin leading-none">⟳</span>
              {phase === 'scanning' ? 'Scanning repository…' : 'Downloading — do not close this page…'}
            </div>
          ) : (
            <button
              onClick={phase === 'idle' ? handleFullSync : handleReset}
              disabled={!connected}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white btn-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {phase === 'done'  ? <>🚀 Sync Again from GitHub</>
              : phase === 'error' ? <>↩ Try Again</>
              : <>🚀 Pull Everything from GitHub</>}
            </button>
          )}
          {!connected && phase === 'idle' && (
            <p className="mt-2 text-center text-xs text-gray-600">Configure your GitHub token in Settings to enable syncing</p>
          )}
        </div>
      </div>

      {/* ── QUICK DATA SYNC ────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-emerald-500/12 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">⚡</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Quick Data Sync</p>
            <p className="text-gray-500 text-xs">Pulls only the JSON data files — faster when no new features were added (players, economy, shop, tournaments, etc.)</p>
          </div>
          <button
            onClick={handleQuickSync}
            disabled={busy || !connected}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            {quickSyncing ? <><span className="animate-spin">⟳</span> Syncing…</> : <>⚡ Quick Sync</>}
          </button>
        </div>
        {quickResult && (
          <div className={`px-3 py-2 rounded-lg text-xs ${quickResult.ok ? 'bg-emerald-500/8 border border-emerald-500/15 text-emerald-400' : 'bg-red-500/8 border border-red-500/15 text-red-400'}`}>
            {quickResult.ok ? `✓ ${quickResult.files} data files updated from GitHub` : '✗ Quick sync failed — check the operation log'}
          </div>
        )}
      </div>

      {/* ── PROTECTED FILES ────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-amber-500/12 overflow-hidden">
        <button
          onClick={() => setShowProtected(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors text-left"
        >
          <span className="text-amber-400">🔒</span>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Always-Protected Files</p>
            <p className="text-gray-600 text-xs">{PROTECTED_FILES.length} files that are NEVER overwritten by any sync</p>
          </div>
          <span className="text-gray-500 text-sm">{showProtected ? '▲' : '▼'}</span>
        </button>
        {showProtected && (
          <div className="px-5 pb-4 pt-1 border-t border-amber-500/8 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROTECTED_FILES.map(f => (
              <div key={f.file} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <span className="text-amber-400/60 text-xs mt-0.5">🛡</span>
                <div>
                  <p className="text-amber-300/80 text-xs font-mono">{f.file}</p>
                  <p className="text-gray-600 text-[10px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── WHEN TO USE WHAT ───────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/6 p-5 space-y-3">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">When to use which sync</p>
        <div className="space-y-2.5 text-xs">
          {[
            { icon: '🚀', title: 'Full Repo Sync',  desc: 'Use when new features, code changes, or new assets were pushed to GitHub. Downloads dist/, public/, src/, and data/ — everything.', color: 'text-[#00BFFF]' },
            { icon: '⚡', title: 'Quick Data Sync', desc: 'Use when only data was changed (player ranks, economy rates, shop items). Much faster — skips dist/ and source files.', color: 'text-emerald-400' },
            { icon: '📤', title: 'Publish',         desc: 'Use to push your admin edits (tier list, homepage, economy) TO GitHub so the live site can pick them up.', color: 'text-amber-400' },
          ].map(r => (
            <div key={r.title} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{r.icon}</span>
              <div>
                <p className={`font-semibold ${r.color}`}>{r.title}</p>
                <p className="text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Publish Tab ──────────────────────────────────────────────────────────────

type PublishPhase = 'idle' | 'pushing' | 'syncing' | 'done' | 'error'

function PublishTab({
  status, onLog, onRefreshStatus, onRefreshSyncState,
}: {
  status:             GitHubBridgeStatus | null
  onLog:              (msg: string, kind: LogLine['kind']) => void
  onRefreshStatus:    () => void
  onRefreshSyncState: () => void
}) {
  const sync        = useSyncState()
  const dirtySet    = sync.dirty
  const dirtyLabels = [...dirtySet].map(s => SECTION_LABELS[s] ?? s)

  const [commitMsg,     setCommitMsg]     = useState('')
  const [phase,         setPhase]         = useState<PublishPhase>('idle')
  const [publishResult, setPublishResult] = useState<{ sha?: string; filesUpdated: number } | null>(null)
  const [errorMsg,      setErrorMsg]      = useState('')
  const [pulling,       setPulling]       = useState(false)
  const [pullDone,      setPullDone]      = useState(false)
  const [pushingAll,    setPushingAll]    = useState(false)
  const [pushAllDone,   setPushAllDone]   = useState(false)
  const [pushCommitMsg, setPushCommitMsg] = useState('')

  const connected = !!status?.connected
  const busy      = phase === 'pushing' || phase === 'syncing' || pulling || pushingAll

  async function handlePublish() {
    setPhase('pushing')
    setPublishResult(null)
    setErrorMsg('')
    onLog('Publishing changes to GitHub…', 'step')
    try {
      const sections = [
        { section: 'players'     as const, jsonData: JSON.stringify(getPlayers()) },
        { section: 'gamemodes'   as const, jsonData: JSON.stringify(getGamemodes()) },
        { section: 'content'     as const, jsonData: JSON.stringify(getSiteContent()) },
        { section: 'event'       as const, jsonData: JSON.stringify(getEventConfig()) },
        { section: 'economy'     as const, jsonData: JSON.stringify(getEconomyOverrides()) },
        { section: 'homepage'    as const, jsonData: JSON.stringify(getHomepageConfig()) },
        { section: 'tier-tagger' as const, jsonData: JSON.stringify(getTierTaggerConfig()) },
      ]
      onLog(`Pushing ${sections.length} data sections…`, 'info')
      const pushResult = await pushAllToGitHub({ data: { sections } })
      pushResult.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→]\s*/, ''), k)
      })
      if (!pushResult.success) { setPhase('error'); setErrorMsg(pushResult.error ?? 'Push failed'); return }
      onLog(`Pushed to GitHub${pushResult.sha ? ` — commit ${pushResult.sha.slice(0, 7)}` : ''}`, 'ok')
      clearDirty()
      if (pushResult.sha) setLastSync(Date.now(), commitMsg || 'Published to GitHub')
      setPhase('syncing')
      onLog('Refreshing live site from GitHub…', 'step')
      const syncResult = await pullStaticDataFromGitHub()
      syncResult.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→]\s*/, ''), k)
      })
      setPublishResult({ sha: pushResult.sha, filesUpdated: syncResult.filesUpdated })
      setPhase('done')
      setCommitMsg('')
      onRefreshStatus()
      onRefreshSyncState()
    } catch (e) {
      setPhase('error')
      const msg = (e as Error).message.replace(/^[A-Z_]+:\s*/, '')
      setErrorMsg(msg)
      onLog(msg, 'error')
    }
  }

  async function handlePullToSession() {
    setPulling(true)
    setPullDone(false)
    onLog('Downloading latest data from GitHub to this session…', 'step')
    try {
      const result = await pullAllFromGitHub()
      let ok = 0
      for (const [section, r] of Object.entries(result.sections)) {
        if (r.pulled) { onLog(`${SECTION_LABELS[section] ?? section} applied`, 'ok'); ok++ }
        else          { onLog(`${SECTION_LABELS[section] ?? section} — ${r.error ?? 'skipped'}`, 'warn') }
      }
      if (ok > 0) {
        const secs = result.sections
        if (secs.players?.content)        savePlayers(JSON.parse(secs.players.content), { silent: true })
        if (secs.gamemodes?.content)      saveGamemodes(JSON.parse(secs.gamemodes.content), { silent: true })
        if (secs.content?.content)        saveSiteContent(JSON.parse(secs.content.content), { silent: true })
        if (secs.event?.content)          saveEventConfig(JSON.parse(secs.event.content), { silent: true })
        if (secs.economy?.content)        saveEconomyOverrides(JSON.parse(secs.economy.content), { silent: true })
        if (secs.homepage?.content)       saveHomepageConfig(JSON.parse(secs.homepage.content), { silent: true })
        if (secs['tier-tagger']?.content) saveTierTaggerConfig(JSON.parse(secs['tier-tagger'].content), { silent: true })
        clearDirty()
        onLog(`${ok} sections applied to this session`, 'ok')
        setPullDone(true)
      } else {
        onLog('Nothing downloaded — check GitHub connection', 'warn')
      }
    } catch (e) {
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setPulling(false)
    }
  }

  async function handlePushAll() {
    setPushingAll(true)
    setPushAllDone(false)
    onLog('Pushing all code + data to GitHub via git…', 'step')
    try {
      const result = await pushEverythingToGitHub({ data: { message: pushCommitMsg.trim() || undefined } })
      result.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→ℹ]\s*/, ''), k)
      })
      if (result.success) { setPushAllDone(true); setPushCommitMsg('') }
    } catch (e) {
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setPushingAll(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Dirty indicator */}
      {dirtySet.size > 0 ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-xs font-semibold">{dirtySet.size} section{dirtySet.size !== 1 ? 's' : ''} have unsaved changes</p>
            <p className="text-amber-500/70 text-[10px]">{dirtyLabels.join(', ')}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/15">
          <span className="text-green-400 text-sm">✓</span>
          <p className="text-green-400/80 text-xs">All changes saved — nothing pending</p>
        </div>
      )}

      {/* Publish data card */}
      <div className="glass rounded-2xl border border-[#00BFFF]/15 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-xl">📤</div>
          <div>
            <p className="text-white font-bold text-base">Publish Data to GitHub</p>
            <p className="text-gray-500 text-xs">Saves all admin data edits to GitHub then refreshes the live site</p>
          </div>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={commitMsg}
            onChange={e => setCommitMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !busy && connected && handlePublish()}
            placeholder="Describe your changes (optional)"
            disabled={busy}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 transition-all disabled:opacity-40"
          />
          <div className="flex flex-wrap gap-1.5">
            {COMMIT_TEMPLATES.map(t => (
              <button key={t} onClick={() => setCommitMsg(t)} disabled={busy}
                className="text-[10px] px-2 py-1 rounded-lg border border-white/8 text-gray-500 hover:border-[#00BFFF]/30 hover:text-[#00BFFF] transition-all disabled:opacity-30">
                {t}
              </button>
            ))}
          </div>
        </div>
        {/* Step indicators */}
        {phase !== 'idle' && (
          <div className="flex items-center gap-0">
            {(['pushing', 'syncing', 'done'] as const).map((step, i) => {
              const isDone   = phase === 'done' || (step === 'pushing' && ['syncing', 'done'].includes(phase))
              const isActive = phase === step && phase !== 'error'
              return (
                <div key={step} className="flex items-center flex-1 min-w-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${isDone ? 'text-green-400' : isActive ? 'text-[#00BFFF]' : 'text-gray-600'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${isDone ? 'bg-green-500/20 border-green-500/40 text-green-400' : isActive ? 'bg-[#00BFFF]/20 border-[#00BFFF]/40 text-[#00BFFF]' : 'bg-white/5 border-white/10 text-gray-600'}`}>
                      {isDone ? '✓' : isActive ? <span className="animate-spin">⟳</span> : i + 1}
                    </span>
                    <span className="hidden sm:block">{{ pushing: 'Sending to GitHub', syncing: 'Refreshing live site', done: 'Published' }[step]}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-green-500/30' : 'bg-white/5'}`} />}
                </div>
              )
            })}
          </div>
        )}
        {phase === 'error' && <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">✗ {errorMsg}</div>}
        {phase === 'done' && publishResult && (
          <div className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs space-y-0.5">
            <p>✓ Published{publishResult.sha ? ` — commit ${publishResult.sha.slice(0, 7)}` : ''}</p>
            <p className="text-green-500/60">{publishResult.filesUpdated} files updated on live site</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={busy || !connected}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white btn-primary disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {phase === 'pushing' ? <><span className="animate-spin">⟳</span> Sending to GitHub…</>
             : phase === 'syncing' ? <><span className="animate-spin">⟳</span> Refreshing live site…</>
             : <>📤 Publish to Live Site</>}
          </button>
          {(phase === 'done' || phase === 'error') && (
            <button onClick={() => { setPhase('idle'); setPublishResult(null); setErrorMsg('') }}
              className="px-4 py-3 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Pull to session */}
      <div className="glass rounded-2xl border border-emerald-500/10 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">↓</div>
            <div>
              <p className="text-white font-semibold text-sm">Pull GitHub → This Session</p>
              <p className="text-gray-600 text-xs">Overwrites your current editor session with latest GitHub data</p>
            </div>
          </div>
          <button onClick={handlePullToSession} disabled={busy || !connected}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 disabled:opacity-40 transition-all">
            {pulling ? <span className="animate-spin inline-block">⟳</span> : '↓ Pull'}
          </button>
        </div>
        {pullDone && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-xs">
            <span className="text-emerald-400">✓ Session updated from GitHub</span>
            <button onClick={() => window.location.reload()} className="text-[#00BFFF] hover:underline">Reload page</button>
          </div>
        )}
      </div>

      {/* Push all code */}
      <div className="glass rounded-2xl border border-orange-500/12 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">📦</div>
          <div>
            <p className="text-white font-bold text-base">Push Code Changes to GitHub</p>
            <p className="text-gray-500 text-xs">Commits and pushes the entire workspace via git — for new features</p>
          </div>
        </div>
        <div className="rounded-xl bg-orange-500/5 border border-orange-500/15 p-3 text-xs text-gray-500">
          <p className="text-orange-300 font-semibold mb-1">⚡ After pushing new code:</p>
          <p>Use <strong className="text-white">Deploy tab → Full Repo Sync</strong> on the live site, or redeploy on Replit to rebuild from the new source.</p>
        </div>
        <input
          type="text"
          value={pushCommitMsg}
          onChange={e => setPushCommitMsg(e.target.value)}
          placeholder="Describe what changed (optional)"
          disabled={pushingAll}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-orange-500/40 transition-all disabled:opacity-40"
        />
        {pushAllDone && <div className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs">✓ Code pushed to GitHub — now run Full Repo Sync on the live site to apply it</div>}
        <button
          onClick={handlePushAll}
          disabled={busy || !connected}
          className="w-full py-3 rounded-xl text-sm font-bold text-white border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {pushingAll ? <><span className="animate-spin">⟳</span> Pushing…</> : <>📦 Push Everything to GitHub</>}
        </button>
      </div>

    </div>
  )
}

// ─── Live Site Tab ────────────────────────────────────────────────────────────

function LiveSiteTab({
  status, syncState, onLog, onRefreshSyncState,
}: {
  status:             GitHubBridgeStatus | null
  syncState:          SyncState | null
  onLog:              (msg: string, kind: LogLine['kind']) => void
  onRefreshSyncState: () => void
}) {
  const [syncing,   setSyncing]   = useState(false)
  const [syncDone,  setSyncDone]  = useState(false)
  const [fullSync,  setFullSync]  = useState(false)
  const [, tick] = useReducer(x => x + 1, 0)
  useEffect(() => { const id = setInterval(tick, 10_000); return () => clearInterval(id) }, [])

  async function handleForceSync(full: boolean) {
    setSyncing(true)
    setSyncDone(false)
    setFullSync(full)
    onLog(full ? 'Forcing full repo sync on live site…' : 'Forcing quick data sync on live site…', 'step')
    try {
      const result = full ? await fullSyncFromGitHub() : await pullStaticDataFromGitHub()
      result.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→·]\s*/, ''), k)
      })
      if (result.success) { setSyncDone(true); onRefreshSyncState() }
    } catch (e) {
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setSyncing(false)
    }
  }

  const syncHistory = Array.isArray((syncState as any)?.history)
    ? ((syncState as any).history as Array<{ at: string; commitSha: string | null; filesUpdated: number; filesFailed: number; triggeredBy: string }>)
    : []

  return (
    <div className="space-y-4">

      {/* Health dashboard */}
      <div className="glass rounded-2xl border border-cyan-500/12 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl">🌐</div>
            <div>
              <p className="text-white font-bold text-base">Live Site Health</p>
              <p className="text-gray-500 text-xs">Published website sync status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleForceSync(false)}
              disabled={syncing}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {syncing && !fullSync ? <><span className="animate-spin">⟳</span> Syncing…</> : <>⚡ Quick Sync</>}
            </button>
            <button
              onClick={() => handleForceSync(true)}
              disabled={syncing}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[#00BFFF] border border-[#00BFFF]/25 bg-[#00BFFF]/8 hover:bg-[#00BFFF]/15 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {syncing && fullSync ? <><span className="animate-spin">⟳</span> Full syncing…</> : <>🚀 Full Sync</>}
            </button>
          </div>
        </div>

        {syncDone && (
          <div className="px-3 py-2 rounded-xl bg-cyan-500/8 border border-cyan-500/20 text-cyan-300 text-xs">
            ✓ Live site refreshed from GitHub — {fullSync ? 'full repo sync complete' : 'data files updated'}
          </div>
        )}

        {syncState?.lastSyncAt ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Last Sync',      value: timeAgo(syncState.lastSyncAt),              sub: syncState.triggeredBy ?? '—' },
              { label: 'Files Updated',  value: String(syncState.filesUpdated),              sub: syncState.filesFailed > 0 ? `${syncState.filesFailed} failed` : 'all ok' },
              { label: 'Commit on Site', value: syncState.lastCommitSha?.slice(0, 7) ?? '—', sub: syncState.lastCommitMessage?.slice(0, 28) ?? '' },
              { label: 'Sync Type',      value: syncState.triggeredBy === 'full-sync' ? 'Full' : 'Data',  sub: (syncState as any).truncated ? '⚠ tree truncated' : 'complete' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white/4 rounded-xl p-3 border border-white/5">
                <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-white text-sm font-bold">{value}</p>
                <p className="text-gray-600 text-[10px] truncate mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/4 rounded-xl p-4 border border-white/5 text-center">
            <p className="text-gray-500 text-sm">No sync data yet</p>
            <p className="text-gray-700 text-xs mt-1">Syncs on live site startup. Use a sync button above to run one now.</p>
          </div>
        )}

        {/* Sync history */}
        {syncHistory.length > 0 && (
          <div>
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-2">Recent Sync History</p>
            <div className="space-y-1">
              {syncHistory.slice(-8).reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/4 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.filesFailed === 0 ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <span className="text-gray-600 shrink-0 tabular-nums">{timeAgo(h.at)}</span>
                  <span className="text-gray-500 font-mono shrink-0">{h.commitSha?.slice(0, 7) ?? '—'}</span>
                  <span className="text-gray-600 shrink-0">{h.filesUpdated} files</span>
                  <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                    h.triggeredBy === 'startup'    ? 'bg-violet-500/15 text-violet-400'  :
                    h.triggeredBy === 'full-sync'  ? 'bg-[#00BFFF]/15 text-[#00BFFF]'   :
                    h.triggeredBy === 'admin' || h.triggeredBy === 'server-fn' ? 'bg-emerald-500/15 text-emerald-400' :
                    'bg-white/5 text-gray-500'
                  }`}>{h.triggeredBy}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* How auto-sync works */}
      <div className="glass rounded-2xl border border-white/6 p-5 space-y-3">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">How auto-sync works on the live site</p>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p><strong className="text-white">Startup sync</strong> — when the live site starts, it pulls data files from GitHub automatically</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p><strong className="text-white">Interval sync</strong> — every 5 min (configurable) it pulls data files again to stay fresh</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p><strong className="text-white">Full sync</strong> — only triggered manually; downloads every file including compiled code for new features</p>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ onLog }: { onLog: (msg: string, kind: LogLine['kind']) => void }) {
  const [history,    setHistory]    = useState<SyncHistoryEntry[]>([])
  const [commits,    setCommits]    = useState<CommitEntry[]>([])
  const [hLoading,   setHLoading]   = useState(true)
  const [cLoading,   setCLoading]   = useState(true)
  const [restoring,  setRestoring]  = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetchSyncHistory().then(h => { setHistory(h ?? []); setHLoading(false) }).catch(() => setHLoading(false))
    fetchCommitHistory().then(c => { setCommits(c ?? []); setCLoading(false) }).catch(() => setCLoading(false))
  }, [])

  async function doRestore(sha: string, msg: string) {
    setConfirming(null)
    setRestoring(sha)
    onLog(`Restoring to commit ${sha.slice(0, 7)}: "${msg}"…`, 'step')
    try {
      const result = await restoreToCommit({ data: { sha } })
      if ((result as any).success) {
        onLog(`Restored to ${sha.slice(0, 7)} successfully`, 'ok')
        fetchCommitHistory().then(c => setCommits(c ?? [])).catch(() => {})
      } else {
        onLog((result as any).error ?? 'Restore failed', 'error')
      }
    } catch (e) {
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="space-y-4">

      {/* Publish history */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-white font-bold text-sm">Publish History</p>
          <p className="text-gray-500 text-xs mt-0.5">Every time you published data from this panel</p>
        </div>
        {hLoading ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm animate-pulse">Loading…</div>
        ) : history.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">No publish history yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {history.slice(0, 20).map(h => (
              <div key={h.id} className="px-5 py-3 hover:bg-white/2 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${h.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-xs font-semibold font-mono">{h.commitHash.slice(0, 7)}</span>
                      <span className="text-gray-400 text-xs truncate">{h.commitMessage}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                      <span>{timeAgo(h.date)}</span>
                      <span>{h.filesChanged.length} files</span>
                      <span>{(h.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${h.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {h.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GitHub commit browser */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">GitHub Commit History</p>
            <p className="text-gray-500 text-xs mt-0.5">Browse and restore any previous commit</p>
          </div>
          <button
            onClick={() => { setCLoading(true); fetchCommitHistory().then(c => { setCommits(c ?? []); setCLoading(false) }).catch(() => setCLoading(false)) }}
            className="text-[10px] text-gray-500 hover:text-white border border-white/8 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all"
          >
            ⟳ Refresh
          </button>
        </div>
        {cLoading ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm animate-pulse">Loading commits…</div>
        ) : commits.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">No commits found — check GitHub connection</div>
        ) : (
          <div className="divide-y divide-white/5">
            {commits.slice(0, 25).map((c, i) => (
              <div key={c.sha} className="px-5 py-3 hover:bg-white/2 transition-colors">
                <div className="flex items-start gap-3">
                  {i === 0
                    ? <span className="mt-1.5 shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20 font-semibold">HEAD</span>
                    : <span className="mt-1 w-2 h-2 rounded-full bg-white/15 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#00BFFF] text-xs font-mono shrink-0">{c.shortSha}</span>
                      <span className="text-white text-xs truncate">{c.message}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-600">
                      <span>{c.author}</span>
                      <span>{timeAgo(c.date)}</span>
                    </div>
                  </div>
                  {confirming === c.sha ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-amber-400">Sure?</span>
                      <button onClick={() => doRestore(c.sha, c.message)} className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">Yes</button>
                      <button onClick={() => setConfirming(null)} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(c.sha)}
                      disabled={!!restoring || i === 0}
                      className="shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg border border-white/8 text-gray-500 hover:border-amber-500/30 hover:text-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {restoring === c.sha ? <span className="animate-spin">⟳</span> : i === 0 ? 'Current' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  syncConfig, onConfigSaved, onLog, status,
}: {
  syncConfig:    SyncConfig | null
  onConfigSaved: (cfg: SyncConfig) => void
  onLog:         (msg: string, kind: LogLine['kind']) => void
  status:        GitHubBridgeStatus | null
}) {
  const [intervalMs,  setIntervalMs]  = useState(syncConfig?.intervalMs  ?? 300_000)
  const [startupSync, setStartupSync] = useState(syncConfig?.startupSync ?? true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)

  useEffect(() => {
    if (syncConfig) { setIntervalMs(syncConfig.intervalMs); setStartupSync(syncConfig.startupSync) }
  }, [syncConfig])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const cfg = await saveSyncConfig({ data: { intervalMs, startupSync } })
      onConfigSaved(cfg)
      setSaved(true)
      onLog(`Auto-sync config saved — every ${fmtMs(intervalMs)}, startup: ${startupSync}`, 'ok')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      onLog((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const connected = !!status?.connected

  return (
    <div className="space-y-4">

      {/* Auto-sync config */}
      <div className="glass rounded-2xl border border-violet-500/12 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl">⚙️</div>
          <div>
            <p className="text-white font-bold text-base">Auto-Sync Settings</p>
            <p className="text-gray-500 text-xs">How often the live site auto-pulls data files from GitHub</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-gray-500 text-xs">Sync interval (data files only — full sync is manual)</label>
          <div className="flex flex-wrap gap-2">
            {INTERVAL_OPTIONS.map(o => (
              <button key={o.ms} onClick={() => setIntervalMs(o.ms)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${intervalMs === o.ms ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/4 border-white/10 text-gray-400 hover:border-violet-500/25 hover:text-violet-300'}`}>
                {o.label}
              </button>
            ))}
          </div>
          {intervalMs === 0 && <p className="text-amber-400/70 text-xs">Auto-sync disabled — live site only updates on server restart or manual sync</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStartupSync(v => !v)}
            className={`w-10 h-6 rounded-full border transition-all relative ${startupSync ? 'bg-violet-500/30 border-violet-500/50' : 'bg-white/5 border-white/15'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full border transition-all ${startupSync ? 'left-4 bg-violet-400 border-violet-500' : 'left-0.5 bg-gray-500 border-gray-600'}`} />
          </button>
          <div>
            <p className="text-white text-sm font-semibold">Sync on server startup</p>
            <p className="text-gray-600 text-xs">Pull latest data when the live site starts</p>
          </div>
        </div>
        {saved && <div className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">✓ Settings saved</div>}
        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 transition-all">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* GitHub connection info */}
      <div className="glass rounded-2xl border border-white/8 p-5 space-y-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">GitHub Connection</p>
        {connected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">Connected</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/4 rounded-lg p-2"><p className="text-gray-600 text-[10px]">Owner</p><p className="text-white font-mono">{status?.owner}</p></div>
              <div className="bg-white/4 rounded-lg p-2"><p className="text-gray-600 text-[10px]">Repo</p><p className="text-white font-mono">{status?.repo}</p></div>
              <div className="bg-white/4 rounded-lg p-2"><p className="text-gray-600 text-[10px]">Branch</p><p className="text-white font-mono">{status?.branch}</p></div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-400 text-xs font-semibold">Disconnected</span>
            </div>
            <p className="text-gray-500 text-xs">{status?.error ?? 'Set your GITHUB_TOKEN to enable syncing'}</p>
          </div>
        )}
      </div>

      {/* Protected files reference */}
      <div className="glass rounded-2xl border border-amber-500/12 p-5 space-y-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">🔒 Protected Files — Never Overwritten</p>
        <p className="text-gray-500 text-xs">These files are excluded from ALL sync operations. Player data, purchases, and credentials are always safe.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROTECTED_FILES.map(f => (
            <div key={f.file} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <span className="text-amber-400/60 text-xs mt-0.5">🛡</span>
              <div>
                <p className="text-amber-300/80 text-xs font-mono">{f.file}</p>
                <p className="text-gray-600 text-[10px]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GitHubDeployCenter({ admin: _admin }: Props) {
  const [tab,        setTab]        = useState<Tab>('deploy')
  const [status,     setStatus]     = useState<GitHubBridgeStatus | null>(null)
  const [syncState,  setSyncState]  = useState<SyncState | null>(null)
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [logs,       setLogs]       = useState<LogLine[]>([])

  const addLog = useCallback((msg: string, kind: LogLine['kind'] = 'info') => {
    setLogs(prev => [...prev, mkLog(msg, kind)])
  }, [])

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const s = await getGitHubBridgeStatus()
      setStatus(s)
    } catch (e) {
      setStatus({ connected: false, owner: '', repo: '', branch: '', error: (e as Error).message, latestCommit: null, sections: [], localIcons: [], remoteIcons: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSyncState  = useCallback(async () => { try { setSyncState(await getSyncState()) } catch {} }, [])
  const loadSyncConfig = useCallback(async () => { try { setSyncConfig(await getSyncConfig()) } catch {} }, [])

  useEffect(() => {
    loadStatus()
    loadSyncState()
    loadSyncConfig()
    const pollId = setInterval(loadSyncState, 30_000)
    return () => clearInterval(pollId)
  }, [])

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'deploy',   label: 'Deploy',    icon: '🚀' },
    { id: 'publish',  label: 'Publish',   icon: '📤' },
    { id: 'livesite', label: 'Live Site', icon: '🌐' },
    { id: 'history',  label: 'History',   icon: '📋' },
    { id: 'settings', label: 'Settings',  icon: '⚙️' },
  ]

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Status bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Status Overview</p>
          <button
            onClick={() => { loadStatus(); loadSyncState() }}
            disabled={loading}
            className="text-[11px] text-gray-500 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            {loading ? <><span className="animate-spin">⟳</span> Refreshing…</> : <>⟳ Refresh</>}
          </button>
        </div>
        <StatusCards status={status} syncState={syncState} syncConfig={syncConfig} />
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 glass rounded-2xl border border-white/8">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t.id ? 'bg-white/10 text-white border border-white/12' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'deploy' && (
        <DeployTab status={status} syncState={syncState} onLog={addLog} onRefreshSyncState={loadSyncState} />
      )}
      {tab === 'publish' && (
        <PublishTab status={status} onLog={addLog} onRefreshStatus={loadStatus} onRefreshSyncState={loadSyncState} />
      )}
      {tab === 'livesite' && (
        <LiveSiteTab status={status} syncState={syncState} onLog={addLog} onRefreshSyncState={loadSyncState} />
      )}
      {tab === 'history' && (
        <HistoryTab onLog={addLog} />
      )}
      {tab === 'settings' && (
        <SettingsTab syncConfig={syncConfig} onConfigSaved={setSyncConfig} onLog={addLog} status={status} />
      )}

      {/* Shared operation log */}
      <OperationLog logs={logs} onClear={() => setLogs([])} />

    </div>
  )
}
