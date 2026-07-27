// ─── Publish Center — Premium GitHub Sync Dashboard ──────────────────────────
// One place to manage everything: publish changes, monitor the live site,
// browse history, and configure auto-sync.

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
  type GitHubBridgeStatus,
  type CommitEntry,
  type SyncHistoryEntry,
  type SyncState,
  type SyncConfig,
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
]

type Tab = 'publish' | 'livesite' | 'history' | 'settings'

type PublishPhase =
  | 'idle'
  | 'pushing'
  | 'syncing'
  | 'done'
  | 'error'

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
  if (secs <= 0)  return 'now'
  if (secs < 60)  return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

function fmtMs(ms: number): string {
  if (ms === 0) return 'Off'
  if (ms < 60_000) return `${ms / 1000}s`
  if (ms < 3_600_000) return `${ms / 60_000} min`
  return `${ms / 3_600_000} hr`
}

function fmtBytes(n: number): string {
  if (!n) return '—'
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

interface LogLine { ts: string; msg: string; kind: 'info'|'ok'|'warn'|'error'|'step'|'dim' }

function mkLog(msg: string, kind: LogLine['kind'] = 'info'): LogLine {
  return { ts: new Date().toTimeString().slice(0, 8), msg, kind }
}

function LogEntry({ line }: { line: LogLine }) {
  const color = { info: 'text-gray-400', ok: 'text-green-400', warn: 'text-amber-400', error: 'text-red-400', step: 'text-[#00BFFF] font-semibold', dim: 'text-gray-600' }[line.kind]
  const prefix = { ok: '✓', error: '✗', warn: '⚠', step: '→', info: ' ', dim: '·' }[line.kind]
  return (
    <div className="flex items-start gap-2 font-mono text-[11px] leading-5">
      <span className="text-gray-700 shrink-0">[{line.ts}]</span>
      <span className={color}>{prefix} {line.msg}</span>
    </div>
  )
}

// ─── Status Cards (top bar) ───────────────────────────────────────────────────

function StatusCards({
  status, syncState, syncConfig,
}: {
  status:     GitHubBridgeStatus | null
  syncState:  SyncState | null
  syncConfig: SyncConfig | null
}) {
  const [, tick] = useReducer(x => x + 1, 0)
  useEffect(() => { const id = setInterval(tick, 10_000); return () => clearInterval(id) }, [])

  const ghCommit   = status?.latestCommit
  const liveSha    = syncState?.lastSyncAt ? syncState.lastCommitSha : null
  const isInSync   = ghCommit && liveSha && ghCommit.sha.startsWith(liveSha?.slice(0, 7) ?? '___') || (ghCommit?.sha === liveSha)
  const intervalMs = syncConfig?.intervalMs ?? 300_000

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

      {/* GitHub */}
      <div className="glass rounded-2xl border border-white/8 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">GitHub</span>
          {status?.connected
            ? <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Connected</span>
            : <span className="flex items-center gap-1.5 text-[11px] text-red-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Disconnected</span>
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
        {status?.connected && <p className="text-gray-700 text-[10px] font-mono">{status.owner}/{status.repo} · {status.branch}</p>}
      </div>

      {/* Live Site */}
      <div className="glass rounded-2xl border border-white/8 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Live Site</span>
          {syncState?.lastSyncAt
            ? (syncState.filesFailed === 0
                ? <span className="flex items-center gap-1.5 text-[11px] text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Healthy</span>
                : <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{syncState.filesFailed} errors</span>)
            : <span className="text-[11px] text-gray-600">No data yet</span>
          }
        </div>
        {syncState?.lastCommitSha ? (
          <>
            <p className="text-white text-sm font-bold font-mono">{syncState.lastCommitSha.slice(0, 7)}</p>
            <p className="text-gray-400 text-xs truncate">{syncState.lastCommitMessage ?? 'No message'}</p>
            <div className="flex items-center gap-2">
              <p className="text-gray-600 text-[10px]">Synced {timeAgo(syncState.lastSyncAt)}</p>
              {isInSync
                ? <span className="text-[10px] text-green-400">✓ Up to date</span>
                : ghCommit && <span className="text-[10px] text-amber-400">⚠ Behind GitHub</span>
              }
            </div>
          </>
        ) : (
          <p className="text-gray-600 text-xs">Syncs on published site startup</p>
        )}
      </div>

      {/* Auto-Sync */}
      <div className="glass rounded-2xl border border-white/8 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Auto-Sync</span>
          {intervalMs > 0
            ? <span className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />Active</span>
            : <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-gray-600" />Disabled</span>
          }
        </div>
        {intervalMs > 0 ? (
          <>
            <p className="text-white text-sm font-bold">Every {fmtMs(intervalMs)}</p>
            {syncState?.nextAutoSyncAt
              ? <p className="text-gray-400 text-xs">Next pull in {timeUntil(syncState.nextAutoSyncAt)}</p>
              : <p className="text-gray-600 text-xs">Next: on published site</p>
            }
            <p className="text-gray-600 text-[10px]">Live site pulls GitHub automatically</p>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm">Manual only</p>
            <p className="text-gray-600 text-xs">Enable in Settings</p>
          </>
        )}
      </div>

    </div>
  )
}

// ─── Publish Tab ──────────────────────────────────────────────────────────────

function PublishTab({
  status,
  onLog,
  onRefreshStatus,
  onRefreshSyncState,
}: {
  status:             GitHubBridgeStatus | null
  onLog:              (msg: string, kind: LogLine['kind']) => void
  onRefreshStatus:    () => void
  onRefreshSyncState: () => void
}) {
  const sync        = useSyncState()
  const dirtySet    = sync.dirty
  const dirtyLabels = [...dirtySet].map(s => SECTION_LABELS[s] ?? s)

  const [commitMsg,    setCommitMsg]    = useState('')
  const [phase,        setPhase]        = useState<PublishPhase>('idle')
  const [publishResult, setPublishResult] = useState<{ sha?: string; filesUpdated: number } | null>(null)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [pulling,      setPulling]      = useState(false)
  const [pullDone,     setPullDone]     = useState(false)

  const connected = !!status?.connected

  async function handlePublish() {
    setPhase('pushing')
    setPublishResult(null)
    setErrorMsg('')
    onLog('Publishing changes to GitHub…', 'step')

    try {
      // Gather all session data
      const sections = [
        { section: 'players'     as const, jsonData: JSON.stringify(getPlayers()) },
        { section: 'gamemodes'   as const, jsonData: JSON.stringify(getGamemodes()) },
        { section: 'content'     as const, jsonData: JSON.stringify(getSiteContent()) },
        { section: 'event'       as const, jsonData: JSON.stringify(getEventConfig()) },
        { section: 'economy'     as const, jsonData: JSON.stringify(getEconomyOverrides()) },
        { section: 'homepage'    as const, jsonData: JSON.stringify(getHomepageConfig()) },
        { section: 'tier-tagger' as const, jsonData: JSON.stringify(getTierTaggerConfig()) },
      ]

      onLog(`Pushing ${sections.length} data sections to GitHub…`, 'info')
      const pushResult = await pushAllToGitHub({ data: { sections } })

      pushResult.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→]\s*/, ''), k)
      })

      if (!pushResult.success) {
        setPhase('error')
        setErrorMsg(pushResult.error ?? 'Push to GitHub failed')
        return
      }

      onLog(`Pushed to GitHub${pushResult.sha ? ` — commit ${pushResult.sha.slice(0, 7)}` : ''}`, 'ok')
      clearDirty()
      if (pushResult.sha) setLastSync(Date.now(), commitMsg || 'Published to GitHub')

      // Now force the live site to refresh
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
      setErrorMsg((e as Error).message.replace(/^[A-Z_]+:\s*/, ''))
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
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
        const name = SECTION_LABELS[section] ?? section
        if (r.pulled) {
          onLog(`${name} applied`, 'ok'); ok++
        } else {
          onLog(`${name} — ${r.error ?? 'skipped'}`, 'warn')
        }
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

  const busy = phase === 'pushing' || phase === 'syncing' || pulling

  return (
    <div className="space-y-4">

      {/* Dirty indicator */}
      {dirtySet.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-amber-300 text-xs font-semibold">
              {dirtySet.size} section{dirtySet.size !== 1 ? 's' : ''} have unsaved changes
            </p>
            <p className="text-amber-500/70 text-[10px] mt-0.5">{dirtyLabels.join(', ')}</p>
          </div>
          <span className="text-amber-500/60 text-[10px] shrink-0">Publish to save them</span>
        </div>
      )}
      {dirtySet.size === 0 && phase === 'idle' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/15">
          <span className="text-green-400 text-sm">✓</span>
          <p className="text-green-400/80 text-xs">All changes are saved — nothing pending</p>
        </div>
      )}

      {/* Publish card */}
      <div className="glass rounded-2xl border border-[#00BFFF]/15 p-5 space-y-4">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-xl">🚀</div>
          <div>
            <p className="text-white font-bold text-base">Publish to Live Site</p>
            <p className="text-gray-500 text-xs">Saves all data to GitHub and immediately refreshes the live site</p>
          </div>
        </div>

        {/* Commit message */}
        <div className="space-y-2">
          <label className="text-gray-500 text-xs">Describe your changes <span className="text-gray-700">(optional)</span></label>
          <input
            type="text"
            value={commitMsg}
            onChange={e => setCommitMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !busy && connected && handlePublish()}
            placeholder="e.g. Updated player rankings and economy settings"
            disabled={busy}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 focus:bg-white/8 transition-all disabled:opacity-40"
          />
          {/* Quick templates */}
          <div className="flex flex-wrap gap-1.5">
            {COMMIT_TEMPLATES.map(t => (
              <button
                key={t}
                onClick={() => setCommitMsg(t)}
                disabled={busy}
                className="text-[10px] px-2 py-1 rounded-lg border border-white/8 text-gray-500 hover:border-[#00BFFF]/30 hover:text-[#00BFFF] transition-all disabled:opacity-30"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Step progress */}
        {(phase !== 'idle') && (
          <div className="flex items-center gap-0">
            {(['pushing', 'syncing', 'done'] as const).map((step, i) => {
              const isActive  = phase === step
              const phasesDone: string[] = ['done', 'syncing']
              const isDone = phase === 'done' || (step === 'pushing' && phasesDone.includes(phase))
              const isError   = phase === 'error'
              const stepLabel = { pushing: 'Sending to GitHub', syncing: 'Refreshing live site', done: 'Published' }[step]
              return (
                <div key={step} className="flex items-center flex-1 min-w-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isDone && !isError ? 'text-green-400' : isActive && !isError ? 'text-[#00BFFF]' : 'text-gray-600'
                  }`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                      isDone && !isError ? 'bg-green-500/20 border-green-500/40 text-green-400' :
                      isActive && !isError ? 'bg-[#00BFFF]/20 border-[#00BFFF]/40 text-[#00BFFF]' :
                      'bg-white/5 border-white/10 text-gray-600'
                    }`}>
                      {isDone && !isError ? '✓' : isActive && !isError ? <span className="animate-spin">⟳</span> : i + 1}
                    </span>
                    <span className="hidden sm:block">{stepLabel}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-green-500/30' : 'bg-white/5'}`} />}
                </div>
              )
            })}
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            ✗ {errorMsg}
          </div>
        )}

        {/* Success */}
        {phase === 'done' && publishResult && (
          <div className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs space-y-0.5">
            <p>✓ Published successfully{publishResult.sha ? ` — commit ${publishResult.sha.slice(0, 7)}` : ''}</p>
            <p className="text-green-500/60">{publishResult.filesUpdated} files updated on live site</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={busy || !connected}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white btn-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {phase === 'pushing' ? <><span className="animate-spin">⟳</span> Sending to GitHub…</>
             : phase === 'syncing' ? <><span className="animate-spin">⟳</span> Refreshing live site…</>
             : <>🚀 Publish to Live Site</>}
          </button>
          {(phase === 'done' || phase === 'error') && (
            <button
              onClick={() => { setPhase('idle'); setPublishResult(null); setErrorMsg('') }}
              className="px-4 py-3 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
            >
              Reset
            </button>
          )}
        </div>

        {!connected && (
          <p className="text-center text-xs text-gray-600">Configure your GitHub token in Settings to enable publishing</p>
        )}
      </div>

      {/* Get from GitHub */}
      <div className="glass rounded-2xl border border-emerald-500/10 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-base">↓</div>
            <div>
              <p className="text-white font-semibold text-sm">Pull from GitHub to this session</p>
              <p className="text-gray-600 text-xs">Overwrites your current session with the latest GitHub data</p>
            </div>
          </div>
          <button
            onClick={handlePullToSession}
            disabled={busy || !connected}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
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
  const [syncing, setSyncing]   = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleForceSync() {
    setSyncing(true)
    setSyncDone(false)
    onLog('Forcing live site refresh from GitHub…', 'step')
    try {
      const result = await pullStaticDataFromGitHub()
      result.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        onLog(l.replace(/^[✓✗⚠→]\s*/, ''), k)
      })
      if (result.success) { setSyncDone(true); onRefreshSyncState() }
    } catch (e) {
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setSyncing(false)
    }
  }

  const [, tick] = useReducer(x => x + 1, 0)
  useEffect(() => { const id = setInterval(tick, 10_000); return () => clearInterval(id) }, [])

  const syncHistory = Array.isArray((syncState as any)?.history) ? ((syncState as any).history as Array<{
    at: string; commitSha: string | null; filesUpdated: number; filesFailed: number; triggeredBy: string
  }>) : []

  return (
    <div className="space-y-4">

      {/* Health dashboard */}
      <div className="glass rounded-2xl border border-cyan-500/12 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl">🌐</div>
            <div>
              <p className="text-white font-bold text-base">Live Site Status</p>
              <p className="text-gray-500 text-xs">Published website auto-sync health</p>
            </div>
          </div>
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-cyan-400 border border-cyan-500/25 bg-cyan-500/8 hover:bg-cyan-500/15 disabled:opacity-40 transition-all flex items-center gap-2"
          >
            {syncing ? <><span className="animate-spin">⟳</span> Syncing…</> : <>🔄 Force Refresh Now</>}
          </button>
        </div>

        {syncDone && (
          <div className="px-3 py-2 rounded-xl bg-cyan-500/8 border border-cyan-500/20 text-cyan-300 text-xs">
            ✓ Live site refreshed from GitHub
          </div>
        )}

        {syncState?.lastSyncAt ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Last Sync',     value: timeAgo(syncState.lastSyncAt),                  sub: syncState.triggeredBy ?? '—' },
              { label: 'Files Updated', value: String(syncState.filesUpdated),                  sub: syncState.filesFailed > 0 ? `${syncState.filesFailed} failed` : 'all ok' },
              { label: 'Running Commit',value: syncState.lastCommitSha?.slice(0, 7) ?? '—',     sub: syncState.lastCommitMessage?.slice(0, 28) ?? '' },
              { label: 'Icons Synced',  value: String(syncState.iconsUpdated ?? 0),             sub: 'public/icons/' },
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
            <p className="text-gray-700 text-xs mt-1">This shows once the published site runs its first auto-sync. Use Force Refresh Now to test.</p>
          </div>
        )}

        {/* Auto-sync history (from server.mjs) */}
        {syncHistory.length > 0 && (
          <div>
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-2">Recent Auto-Syncs (server-side)</p>
            <div className="space-y-1">
              {syncHistory.slice(-5).reverse().map((h, i) => (
                <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/4 last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.filesFailed === 0 ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <span className="text-gray-600 shrink-0">{timeAgo(h.at)}</span>
                  <span className="text-gray-500 font-mono shrink-0">{h.commitSha?.slice(0, 7) ?? '—'}</span>
                  <span className="text-gray-600 shrink-0">{h.filesUpdated} files</span>
                  <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                    h.triggeredBy === 'startup' ? 'bg-violet-500/15 text-violet-400' :
                    h.triggeredBy === 'admin' || h.triggeredBy === 'server-fn' ? 'bg-[#00BFFF]/15 text-[#00BFFF]' :
                    'bg-white/5 text-gray-500'
                  }`}>{h.triggeredBy}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Protected data */}
      <div className="glass rounded-2xl border border-amber-500/12 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">🔒</span>
          <p className="text-white font-semibold text-sm">Always-Protected Player Data</p>
        </div>
        <p className="text-gray-500 text-xs">These files are <strong className="text-amber-300">NEVER</strong> overwritten by any GitHub sync. Player balances, purchases, and progress are always safe.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROTECTED_FILES.map(f => (
            <div key={f.file} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/12">
              <span className="text-amber-400/60 mt-0.5 text-xs">🛡</span>
              <div>
                <p className="text-amber-300/80 text-xs font-mono">{f.file}</p>
                <p className="text-gray-600 text-[10px]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File comparison */}
      {status?.sections && status.sections.length > 0 && (
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/2 transition-colors"
          >
            <div>
              <p className="text-white font-semibold text-sm">File Comparison — Local vs GitHub</p>
              <p className="text-gray-600 text-xs mt-0.5">
                {status.sections.filter(s => s.isSame).length} in sync · {status.sections.filter(s => !s.isSame).length} different
              </p>
            </div>
            <span className="text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <>
              <div className="grid grid-cols-[1fr_80px_80px_110px] gap-3 px-4 py-2 bg-white/2 border-t border-white/5">
                {['File', 'Local', 'GitHub', 'Status'].map(h => (
                  <span key={h} className={`text-[10px] text-gray-600 uppercase tracking-widest ${h !== 'File' ? 'text-right' : ''}`}>{h}</span>
                ))}
              </div>
              {status.sections.map(s => {
                const name = SECTION_LABELS[s.section] ?? s.section
                const match = s.localExists && s.remoteExists && s.isSame
                const diff  = s.localExists && s.remoteExists && !s.isSame
                return (
                  <div key={s.section} className="grid grid-cols-[1fr_80px_80px_110px] items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/2">
                    <div>
                      <p className="text-white text-sm font-semibold">{name}</p>
                      <p className="text-gray-700 text-[10px] font-mono">{s.file}</p>
                    </div>
                    <p className={`text-xs font-mono text-right ${s.localExists ? 'text-gray-400' : 'text-gray-700'}`}>{s.localExists ? fmtBytes(s.localBytes) : '—'}</p>
                    <p className={`text-xs font-mono text-right ${s.remoteExists ? 'text-gray-400' : 'text-gray-700'}`}>{s.remoteExists ? fmtBytes(s.remoteBytes) : '—'}</p>
                    <div className="flex justify-end">
                      {match ? <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">✓ In sync</span>
                       : diff ? <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">⚠ Different</span>
                       : s.localExists ? <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Local only</span>
                       : <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">GitHub only</span>
                      }
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ onLog }: { onLog: (msg: string, kind: LogLine['kind']) => void }) {
  const [history,  setHistory]  = useState<SyncHistoryEntry[]>([])
  const [commits,  setCommits]  = useState<CommitEntry[]>([])
  const [hLoading, setHLoading] = useState(true)
  const [cLoading, setCLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
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

      {/* Sync history from sync-history.json */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-white font-bold text-sm">Publish History</p>
          <p className="text-gray-500 text-xs mt-0.5">Every time you published changes from this panel</p>
        </div>
        {hLoading ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm animate-pulse">Loading history…</div>
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
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-gray-600 text-[10px]">{timeAgo(h.date)}</span>
                      <span className="text-gray-600 text-[10px]">{h.filesChanged.length} files</span>
                      <span className="text-gray-600 text-[10px]">{(h.durationMs / 1000).toFixed(1)}s</span>
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
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-white font-bold text-sm">GitHub Commit History</p>
          <p className="text-gray-500 text-xs mt-0.5">Browse and restore any previous commit</p>
        </div>
        {cLoading ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm animate-pulse">Loading commits…</div>
        ) : commits.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">No commits found — check GitHub connection</div>
        ) : (
          <div className="divide-y divide-white/5">
            {commits.slice(0, 20).map((c, i) => (
              <div key={c.sha} className="px-5 py-3 hover:bg-white/2 transition-colors">
                <div className="flex items-start gap-3">
                  {i === 0 && <span className="mt-1.5 shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 border border-green-500/20 font-semibold">HEAD</span>}
                  {i !== 0 && <span className="mt-1 w-2 h-2 rounded-full bg-white/15 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#00BFFF] text-xs font-mono shrink-0">{c.shortSha}</span>
                      <span className="text-white text-xs truncate">{c.message}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-gray-600 text-[10px]">{c.author}</span>
                      <span className="text-gray-600 text-[10px]">{timeAgo(c.date)}</span>
                    </div>
                  </div>
                  {/* Restore button */}
                  {confirming === c.sha ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-amber-400">Sure?</span>
                      <button onClick={() => doRestore(c.sha, c.message)} className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30">Yes, restore</button>
                      <button onClick={() => setConfirming(null)} className="text-[10px] px-2 py-1 rounded bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10">Cancel</button>
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
  syncConfig:     SyncConfig | null
  onConfigSaved:  (cfg: SyncConfig) => void
  onLog:          (msg: string, kind: LogLine['kind']) => void
  status:         GitHubBridgeStatus | null
}) {
  const [intervalMs,   setIntervalMs]   = useState(syncConfig?.intervalMs  ?? 300_000)
  const [startupSync,  setStartupSync]  = useState(syncConfig?.startupSync ?? true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)

  const [commitMsg,    setCommitMsg]    = useState('')
  const [pushingAll,   setPushingAll]   = useState(false)
  const [pushAllDone,  setPushAllDone]  = useState(false)

  useEffect(() => {
    if (syncConfig) { setIntervalMs(syncConfig.intervalMs); setStartupSync(syncConfig.startupSync) }
  }, [syncConfig])

  async function handleSaveConfig() {
    setSaving(true)
    setSaved(false)
    try {
      const cfg = await saveSyncConfig({ data: { intervalMs, startupSync } })
      onConfigSaved(cfg)
      setSaved(true)
      onLog(`Auto-sync config saved — interval: ${fmtMs(intervalMs)}, startup: ${startupSync}`, 'ok')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      onLog((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handlePushAll() {
    setPushingAll(true)
    setPushAllDone(false)
    onLog('Pushing all code + data to GitHub…', 'step')
    try {
      const result = await pushEverythingToGitHub({ data: { message: commitMsg.trim() || undefined } })
      result.logs.forEach(l => {
        const k: LogLine['kind'] = l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : l.startsWith('ℹ') ? 'info' : 'dim'
        onLog(l.replace(/^[✓✗⚠→ℹ]\s*/, ''), k)
      })
      if (result.success) { setPushAllDone(true); setCommitMsg('') }
    } catch (e) {
      onLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setPushingAll(false)
    }
  }

  const connected = !!status?.connected

  return (
    <div className="space-y-4">

      {/* Auto-Sync Configuration */}
      <div className="glass rounded-2xl border border-violet-500/12 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl">⚙️</div>
          <div>
            <p className="text-white font-bold text-base">Auto-Sync Settings</p>
            <p className="text-gray-500 text-xs">How often the live site pulls from GitHub automatically</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-gray-500 text-xs">Sync interval</label>
          <div className="flex flex-wrap gap-2">
            {INTERVAL_OPTIONS.map(o => (
              <button
                key={o.ms}
                onClick={() => setIntervalMs(o.ms)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  intervalMs === o.ms
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                    : 'bg-white/4 border-white/10 text-gray-400 hover:border-violet-500/25 hover:text-violet-300'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {intervalMs === 0 && (
            <p className="text-amber-400/70 text-xs">Auto-sync disabled — live site only updates when you use Force Refresh or on server restart</p>
          )}
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
            <p className="text-gray-600 text-xs">Pull latest data from GitHub when the live site starts</p>
          </div>
        </div>

        {saved && <div className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">✓ Settings saved</div>}

        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 transition-all"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* How it works info */}
      <div className="glass rounded-2xl border border-white/6 p-5 space-y-3">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">How the system works</p>
        <div className="space-y-3 text-xs text-gray-500">
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div><p className="text-white font-semibold mb-0.5">Edit data here</p><p>Make changes in any admin section (players, economy, shop, etc.)</p></div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div><p className="text-white font-semibold mb-0.5">Publish</p><p>Click <strong className="text-white">Publish to Live Site</strong> — data goes to GitHub, live site refreshes instantly</p></div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div><p className="text-white font-semibold mb-0.5">Auto keeps it fresh</p><p>Even without clicking Publish, the live site pulls GitHub every {fmtMs(intervalMs || 300_000)}</p></div>
          </div>
        </div>
      </div>

      {/* Push Everything (code deploy) */}
      <div className="glass rounded-2xl border border-orange-500/12 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">📦</div>
          <div>
            <p className="text-white font-bold text-base">Push Code Changes to GitHub</p>
            <p className="text-gray-500 text-xs">For when you add new features or code — pushes everything via git</p>
          </div>
        </div>

        <div className="rounded-xl bg-orange-500/5 border border-orange-500/15 p-3 text-xs text-gray-500">
          <p className="text-orange-300 font-semibold mb-1">⚡ After pushing new code:</p>
          <p>Go to <strong className="text-white">Replit → Deploy → Redeploy</strong> to rebuild and publish the new features. Data changes don't need a redeploy — only code.</p>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={commitMsg}
            onChange={e => setCommitMsg(e.target.value)}
            placeholder="Describe what code you changed (optional)"
            disabled={pushingAll}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-orange-500/40 transition-all disabled:opacity-40"
          />
        </div>

        {pushAllDone && <div className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs">✓ Code pushed to GitHub — now redeploy on Replit to go live</div>}

        <button
          onClick={handlePushAll}
          disabled={pushingAll || !connected}
          className="w-full py-3 rounded-xl text-sm font-bold text-white border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {pushingAll ? <><span className="animate-spin">⟳</span> Pushing…</> : <>📦 Push Everything to GitHub</>}
        </button>
      </div>

    </div>
  )
}

// ─── Operation Log ────────────────────────────────────────────────────────────

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
      <div ref={ref} className="p-4 space-y-0.5 max-h-52 overflow-y-auto bg-black/20">
        {logs.map((l, i) => <LogEntry key={i} line={l} />)}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GitHubBridge({ admin: _admin }: Props) {
  const [tab,        setTab]        = useState<Tab>('publish')
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

  const loadSyncState = useCallback(async () => {
    try { const s = await getSyncState(); setSyncState(s) } catch {}
  }, [])

  const loadSyncConfig = useCallback(async () => {
    try { const c = await getSyncConfig(); setSyncConfig(c) } catch {}
  }, [])

  useEffect(() => {
    loadStatus()
    loadSyncState()
    loadSyncConfig()
    const pollId = setInterval(loadSyncState, 30_000)
    return () => clearInterval(pollId)
  }, [])

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'publish',  label: 'Publish',   icon: '🚀' },
    { id: 'livesite', label: 'Live Site', icon: '🌐' },
    { id: 'history',  label: 'History',   icon: '📋' },
    { id: 'settings', label: 'Settings',  icon: '⚙️' },
  ]

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Status cards + refresh */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Status Overview</p>
          <button
            onClick={() => { loadStatus(); loadSyncState() }}
            disabled={loading}
            className="text-[11px] text-gray-500 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          >
            {loading ? '⟳ Refreshing…' : '⟳ Refresh'}
          </button>
        </div>
        <StatusCards status={status} syncState={syncState} syncConfig={syncConfig} />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 glass rounded-2xl border border-white/8">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-white/10 text-white border border-white/12'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'publish' && (
        <PublishTab
          status={status}
          onLog={addLog}
          onRefreshStatus={loadStatus}
          onRefreshSyncState={loadSyncState}
        />
      )}
      {tab === 'livesite' && (
        <LiveSiteTab
          status={status}
          syncState={syncState}
          onLog={addLog}
          onRefreshSyncState={loadSyncState}
        />
      )}
      {tab === 'history' && (
        <HistoryTab onLog={addLog} />
      )}
      {tab === 'settings' && (
        <SettingsTab
          syncConfig={syncConfig}
          onConfigSaved={setSyncConfig}
          onLog={addLog}
          status={status}
        />
      )}

      {/* Shared operation log */}
      <OperationLog logs={logs} onClear={() => setLogs([])} />

    </div>
  )
}
