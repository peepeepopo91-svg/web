// ─── GitHub Bridge — Two-Way Sync Panel ─────────────────────────────────────
// One place to send data to GitHub or get data from GitHub.
// Works in both the dev environment and on the published live website.

import { useState, useEffect, useRef, useReducer } from 'react'
import {
  getGitHubBridgeStatus,
  pullAllFromGitHub,
  pushAllToGitHub,
  pushEverythingToGitHub,
  getSyncState,
  pullStaticDataFromGitHub,
  type GitHubBridgeStatus,
  type BridgeSectionStatus,
  type SyncState,
} from '../../server/dataFiles'
import { getPlayers, getGamemodes, savePlayers, saveGamemodes } from '../../store/playersStore'
import { getSiteContent, getEventConfig, saveSiteContent, saveEventConfig } from '../../store/contentStore'
import { getEconomyOverrides, saveEconomyOverrides } from '../../store/miningStore'
import { getHomepageConfig, saveHomepageConfig } from '../../store/homepageStore'
import { getTierTaggerConfig, saveTierTaggerConfig } from '../../store/tierTaggerStore'
import { clearDirty } from '../../store/syncStore'

interface Props { admin: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 10)  return 'just now'
  if (secs < 60)  return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m ago`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeUntil(iso: string): string {
  const secs = Math.floor((new Date(iso).getTime() - Date.now()) / 1000)
  if (secs <= 0)  return 'now'
  if (secs < 60)  return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60)  return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}

function fmtBytes(n: number): string {
  if (n === 0) return '—'
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(1)} KB`
}

const SECTION_NAMES: Record<string, string> = {
  players:      'Tier List',
  gamemodes:    'Gamemodes',
  content:      'Site Content',
  event:        'Event Config',
  economy:      'Economy',
  homepage:     'Homepage CMS',
  'tier-tagger':'Tier Tagger',
}

// ── Log line component ────────────────────────────────────────────────────────

interface LogLine { ts: string; msg: string; kind: 'info'|'ok'|'warn'|'error'|'step'|'dim' }

function mkLog(msg: string, kind: LogLine['kind'] = 'info'): LogLine {
  return { ts: new Date().toTimeString().slice(0, 8), msg, kind }
}

function LogEntry({ line }: { line: LogLine }) {
  const color = {
    info:  'text-gray-400',
    ok:    'text-green-400',
    warn:  'text-amber-400',
    error: 'text-red-400',
    step:  'text-[#00BFFF] font-semibold',
    dim:   'text-gray-600',
  }[line.kind]
  const prefix = { ok: '✓', error: '✗', warn: '⚠', step: '→', info: ' ', dim: ' ' }[line.kind]
  return (
    <div className="flex items-start gap-2 font-mono text-[11px] leading-5">
      <span className="text-gray-700 shrink-0">[{line.ts}]</span>
      <span className={color}>{prefix} {line.msg}</span>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
      ok
        ? 'bg-green-500/10 border-green-500/20 text-green-400'
        : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      {label}
    </span>
  )
}

// ── File row ──────────────────────────────────────────────────────────────────

function FileRow({ s }: { s: BridgeSectionStatus }) {
  const name  = SECTION_NAMES[s.section] ?? s.section
  const match = s.localExists && s.remoteExists && s.isSame
  const diff  = s.localExists && s.remoteExists && !s.isSame
  const localOnly  = s.localExists  && !s.remoteExists
  const remoteOnly = !s.localExists && s.remoteExists
  const missing    = !s.localExists && !s.remoteExists

  return (
    <div className="grid grid-cols-[1fr_80px_80px_120px] items-center gap-3 px-4 py-3 hover:bg-white/2 transition-colors border-b border-white/5 last:border-0">
      <div>
        <p className="text-white text-sm font-semibold">{name}</p>
        <p className="text-gray-600 text-xs font-mono">{s.file}</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-mono ${s.localExists ? 'text-gray-300' : 'text-gray-700'}`}>
          {s.localExists ? fmtBytes(s.localBytes) : 'none'}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-mono ${s.remoteExists ? 'text-gray-300' : 'text-gray-700'}`}>
          {s.remoteExists ? fmtBytes(s.remoteBytes) : 'none'}
        </p>
      </div>
      <div className="flex justify-end">
        {match      && <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">✓ In sync</span>}
        {diff       && <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">⚠ Different</span>}
        {localOnly  && <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Local only</span>}
        {remoteOnly && <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">GitHub only</span>}
        {missing    && <span className="text-xs px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-500 border border-gray-500/20">Missing</span>}
      </div>
    </div>
  )
}

// ── Live Site Sync Status card ────────────────────────────────────────────────

function LiveSyncCard({
  syncState,
  forceSyncing,
  forceSyncDone,
  onForceSync,
}: {
  syncState:     SyncState | null
  forceSyncing:  boolean
  forceSyncDone: boolean
  onForceSync:   () => void
}) {
  // Refresh relative times every 10 seconds
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const id = setInterval(forceUpdate, 10_000)
    return () => clearInterval(id)
  }, [])

  const hasSync   = !!syncState?.lastSyncAt
  const isHealthy = hasSync && (syncState?.filesFailed ?? 0) === 0

  return (
    <div className="glass rounded-2xl border border-cyan-500/15 p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl">
            🌐
          </div>
          <div>
            <p className="text-white font-bold text-base">Live Site Auto-Sync</p>
            <p className="text-gray-500 text-xs">
              The published website pulls data from GitHub automatically
            </p>
          </div>
        </div>
        {hasSync && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            isHealthy
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isHealthy ? 'bg-green-400' : 'bg-amber-400'}`} />
            {isHealthy ? 'Healthy' : `${syncState.filesFailed} file${syncState.filesFailed !== 1 ? 's' : ''} failed`}
          </span>
        )}
      </div>

      {/* Sync stats grid */}
      {hasSync && syncState ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/4 rounded-xl p-3 border border-white/5">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Last Synced</p>
            <p className="text-white text-sm font-semibold">{timeAgo(syncState.lastSyncAt!)}</p>
            <p className="text-gray-600 text-[10px] font-mono mt-0.5">
              {syncState.triggeredBy === 'startup' ? 'on startup' : syncState.triggeredBy === 'admin' || syncState.triggeredBy === 'server-fn' ? 'manual' : 'auto'}
            </p>
          </div>
          <div className="bg-white/4 rounded-xl p-3 border border-white/5">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Files Updated</p>
            <p className="text-white text-sm font-semibold">{syncState.filesUpdated}</p>
            <p className="text-gray-600 text-[10px] mt-0.5">
              {syncState.filesFailed > 0 ? <span className="text-amber-400">{syncState.filesFailed} failed</span> : 'all ok'}
              {syncState.iconsUpdated > 0 ? ` · ${syncState.iconsUpdated} icons` : ''}
            </p>
          </div>
          <div className="bg-white/4 rounded-xl p-3 border border-white/5">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">GitHub Commit</p>
            <p className="text-white text-sm font-semibold font-mono">
              {syncState.lastCommitSha ? syncState.lastCommitSha.slice(0, 7) : '—'}
            </p>
            <p className="text-gray-600 text-[10px] mt-0.5 truncate">
              {syncState.lastCommitMessage ?? 'unknown'}
            </p>
          </div>
          <div className="bg-white/4 rounded-xl p-3 border border-white/5">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Next Auto-Sync</p>
            {syncState.nextAutoSyncAt ? (
              <>
                <p className="text-white text-sm font-semibold">
                  {new Date(syncState.nextAutoSyncAt) > new Date() ? `in ${timeUntil(syncState.nextAutoSyncAt)}` : 'soon'}
                </p>
                <p className="text-gray-600 text-[10px] mt-0.5">every 5 min</p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-sm">—</p>
                <p className="text-gray-700 text-[10px] mt-0.5">managed by server</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/4 rounded-xl p-4 border border-white/5 text-center">
          <p className="text-gray-500 text-sm">No sync data yet</p>
          <p className="text-gray-700 text-xs mt-1">
            This appears on the published live site after its first GitHub sync.
            In dev, use "Force Refresh Now" to test.
          </p>
        </div>
      )}

      {/* What's protected */}
      <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
        <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-widest mb-2">🔒 Player data is ALWAYS protected</p>
        <div className="flex flex-wrap gap-1.5">
          {['mining-users.json', 'shop-purchases.json', 'mining-community.json', 'mining-access.json'].map(f => (
            <span key={f} className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/15">
              {f}
            </span>
          ))}
        </div>
        <p className="text-amber-500/70 text-[10px] mt-2">
          These files are NEVER overwritten by GitHub sync — player balances, rigs, and purchases are safe.
        </p>
      </div>

      {/* Force sync button */}
      {forceSyncDone && (
        <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs">
          ✓ Sync complete — live site data is now up to date
        </div>
      )}

      <button
        onClick={onForceSync}
        disabled={forceSyncing}
        className="w-full py-3 rounded-xl text-sm font-bold text-white border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {forceSyncing
          ? <><span className="animate-spin">⟳</span> Syncing from GitHub…</>
          : <>🔄 Force Refresh Now</>
        }
      </button>

      <p className="text-center text-gray-700 text-[10px]">
        Pulls the latest data from GitHub into this server right now — same as the automatic sync, just immediate.
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GitHubBridge({ admin: _admin }: Props) {
  const [status, setStatus]   = useState<GitHubBridgeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [logs, setLogs]             = useState<LogLine[]>([])
  const [pullDone, setPullDone]     = useState(false)
  const [pushDone, setPushDone]     = useState(false)
  const [pushAllDone, setPushAllDone] = useState(false)
  const [pushingAll, setPushingAll] = useState(false)
  const [commitMsg, setCommitMsg]   = useState('')

  // Live sync state
  const [syncState, setSyncState]       = useState<SyncState | null>(null)
  const [forceSyncing, setForceSyncing] = useState(false)
  const [forceSyncDone, setForceSyncDone] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadStatus()
    loadSyncState()
    // Poll sync state every 30 seconds so the "next sync" countdown refreshes
    const pollId = setInterval(loadSyncState, 30_000)
    return () => clearInterval(pollId)
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  async function loadStatus() {
    setLoading(true)
    try {
      const s = await getGitHubBridgeStatus()
      setStatus(s)
    } catch (e) {
      setStatus({
        connected: false, owner: '', repo: '', branch: '',
        error: (e as Error).message, latestCommit: null, sections: [], localIcons: [], remoteIcons: [],
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadSyncState() {
    try {
      const s = await getSyncState()
      setSyncState(s)
    } catch { /* not critical */ }
  }

  function addLog(msg: string, kind: LogLine['kind'] = 'info') {
    setLogs(prev => [...prev, mkLog(msg, kind)])
  }

  // ─── FORCE SYNC — pull static data from GitHub into this server now ───────

  async function handleForceSync() {
    setForceSyncing(true)
    setForceSyncDone(false)
    setLogs([])
    addLog('Pulling static data from GitHub into this server…', 'step')
    try {
      const result = await pullStaticDataFromGitHub()
      result.logs.forEach(l => {
        const kind: LogLine['kind'] =
          l.startsWith('✓') ? 'ok'
          : l.startsWith('✗') ? 'error'
          : l.startsWith('⚠') ? 'warn'
          : l.startsWith('→') ? 'step'
          : 'dim'
        addLog(l.replace(/^[✓✗⚠→]\s*/, ''), kind)
      })
      if (result.success) {
        setForceSyncDone(true)
        await loadSyncState()
      } else {
        addLog(result.error ?? 'Sync failed', 'error')
      }
    } catch (e) {
      addLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setForceSyncing(false)
    }
  }

  // ─── PUSH EVERYTHING — code + data + icons via git ───────────────────────

  async function handlePushAll() {
    setPushingAll(true)
    setPushAllDone(false)
    setLogs([])
    addLog('Collecting all changes (code + data + icons)…', 'step')
    try {
      const result = await pushEverythingToGitHub({ data: { message: commitMsg.trim() || undefined } })
      result.logs.forEach(l => {
        const kind: LogLine['kind'] =
          l.startsWith('✓') ? 'ok'
          : l.startsWith('✗') ? 'error'
          : l.startsWith('⚠') ? 'warn'
          : l.startsWith('→') ? 'step'
          : l.startsWith('ℹ') ? 'info'
          : 'dim'
        addLog(l.replace(/^[✓✗⚠→ℹ]\s*/, ''), kind)
      })
      if (result.success) {
        setPushAllDone(true)
        setCommitMsg('')
        await loadStatus()
      }
    } catch (e) {
      addLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setPushingAll(false)
    }
  }

  // ─── PUSH — send local data to GitHub ────────────────────────────────────

  async function handlePush() {
    setPushing(true)
    setPushDone(false)
    setLogs([])
    addLog('Collecting your current data…', 'step')

    const sections = [
      { section: 'players'     as const, jsonData: JSON.stringify(getPlayers()) },
      { section: 'gamemodes'   as const, jsonData: JSON.stringify(getGamemodes()) },
      { section: 'content'     as const, jsonData: JSON.stringify(getSiteContent()) },
      { section: 'event'       as const, jsonData: JSON.stringify(getEventConfig()) },
      { section: 'economy'     as const, jsonData: JSON.stringify(getEconomyOverrides()) },
      { section: 'homepage'    as const, jsonData: JSON.stringify(getHomepageConfig()) },
      { section: 'tier-tagger' as const, jsonData: JSON.stringify(getTierTaggerConfig()) },
    ]
    addLog(`${sections.length} data sections ready`, 'dim')

    try {
      addLog('Sending everything to GitHub…', 'step')
      const result = await pushAllToGitHub({ data: { sections } })

      result.logs.forEach(l => {
        const kind: LogLine['kind'] =
          l.startsWith('✓') ? 'ok' : l.startsWith('✗') ? 'error' : l.startsWith('⚠') ? 'warn' : l.startsWith('→') ? 'step' : 'dim'
        addLog(l.replace(/^[✓✗⚠→]\s*/, ''), kind)
      })

      if (result.success) {
        addLog(`All done${result.sha ? ` — commit ${result.sha.slice(0, 7)}` : ''}`, 'ok')
        setPushDone(true)
        await loadStatus()
      } else {
        addLog(result.error ?? 'Push failed — see details above', 'error')
      }
    } catch (e) {
      addLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setPushing(false)
    }
  }

  // ─── PULL — get data from GitHub and apply it here ───────────────────────

  async function handlePull() {
    setPulling(true)
    setPullDone(false)
    setLogs([])
    addLog('Connecting to GitHub…', 'step')

    try {
      addLog('Downloading all data from GitHub…', 'step')
      const result = await pullAllFromGitHub()

      let ok = 0, fail = 0

      for (const [section, r] of Object.entries(result.sections)) {
        const name = SECTION_NAMES[section] ?? section
        if (r.pulled) {
          addLog(`${name} downloaded (${fmtBytes(r.bytes ?? 0)})`, 'ok')
          ok++
        } else {
          addLog(`${name} — ${r.error ?? 'skipped'}`, 'warn')
          fail++
        }
      }

      if (result.iconsPulled.length > 0) {
        addLog(`${result.iconsPulled.length} icon file${result.iconsPulled.length !== 1 ? 's' : ''} downloaded`, 'ok')
        result.iconsPulled.forEach(n => addLog(`  ${n}`, 'dim'))
      }
      if (result.iconsSkipped.length > 0) {
        addLog(`${result.iconsSkipped.length} icon file${result.iconsSkipped.length !== 1 ? 's' : ''} could not be downloaded`, 'warn')
      }

      if (ok === 0) {
        addLog('Nothing was downloaded — check your GitHub token and connection', 'error')
        setPulling(false)
        return
      }

      addLog('Applying data to this session…', 'step')

      const secs = result.sections
      try {
        if (secs.players?.content)    savePlayers(JSON.parse(secs.players.content), { silent: true })
        if (secs.gamemodes?.content)  saveGamemodes(JSON.parse(secs.gamemodes.content), { silent: true })
        if (secs.content?.content)    saveSiteContent(JSON.parse(secs.content.content), { silent: true })
        if (secs.event?.content)      saveEventConfig(JSON.parse(secs.event.content), { silent: true })
        if (secs.economy?.content)    saveEconomyOverrides(JSON.parse(secs.economy.content), { silent: true })
        if (secs.homepage?.content)   saveHomepageConfig(JSON.parse(secs.homepage.content), { silent: true })
        if (secs['tier-tagger']?.content) saveTierTaggerConfig(JSON.parse(secs['tier-tagger'].content), { silent: true })
        clearDirty()
        addLog('All stores updated', 'ok')
      } catch (e) {
        addLog(`Store update error: ${(e as Error).message.slice(0, 80)}`, 'warn')
      }

      addLog(`Done — ${ok} section${ok !== 1 ? 's' : ''} applied${fail > 0 ? `, ${fail} skipped` : ''}`, 'ok')
      setPullDone(true)
      await loadStatus()

    } catch (e) {
      addLog((e as Error).message.replace(/^[A-Z_]+:\s*/, ''), 'error')
    } finally {
      setPulling(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const allInSync = status?.sections.every(s => s.isSame) && status.connected
  const anyBusy   = pushing || pulling || pushingAll || forceSyncing

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── How the whole system works ─────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/8 p-5 space-y-4">
        <p className="text-white font-bold text-sm">How This System Works</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 text-xs">

          {/* Step 1 */}
          <div className="flex flex-col gap-1 p-4 bg-white/3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-[#00BFFF]/20 border border-[#00BFFF]/30 text-[#00BFFF] text-[10px] font-bold flex items-center justify-center">1</span>
              <p className="text-white font-semibold">You work here</p>
            </div>
            <p className="text-gray-500">Edit players, economy, homepage, shop items, tournaments, etc. in this admin panel.</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-[#00BFFF]">
                <span>↑</span><span>Send to GitHub</span><span className="text-gray-600">— data only</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-violet-400">
                <span>📦</span><span>Push Everything</span><span className="text-gray-600">— code + data</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden sm:flex items-center justify-center text-gray-700 text-xl">→</div>

          {/* Step 2 */}
          <div className="flex flex-col gap-1 p-4 bg-white/3 rounded-xl border border-white/5 mt-2 sm:mt-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center">2</span>
              <p className="text-white font-semibold">Published site updates</p>
            </div>
            <p className="text-gray-500">The live website <span className="text-emerald-400 font-semibold">automatically pulls</span> fresh data from GitHub every 5 minutes.</p>
            <div className="mt-2 space-y-1 text-[10px] text-gray-600">
              <div className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span>
                <span>Player data (rigs, balances) always safe</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-400">✓</span>
                <span>No downtime — hot swap</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-amber-400">⚡</span>
                <span>New <em>code</em> features need a redeploy</span>
              </div>
            </div>
          </div>

        </div>

        {/* Code update note */}
        <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-3 flex items-start gap-3">
          <span className="text-violet-400 text-lg shrink-0 mt-0.5">📦</span>
          <div>
            <p className="text-violet-300 text-xs font-semibold">Adding new features (code changes)</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Use <strong className="text-white">Push Everything to GitHub</strong> below to push your code.
              Then go to <strong className="text-white">Replit → Deploy</strong> and click <strong className="text-white">Redeploy</strong>
              — this rebuilds the app with your new code. Data updates don't need a redeploy.
            </p>
          </div>
        </div>
      </div>

      {/* ── Connection status bar ─────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-white/8 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-lg flex-shrink-0">
              ☁️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-bold text-base">GitHub Connection</p>
                {loading
                  ? <span className="text-xs text-gray-600 animate-pulse">Checking…</span>
                  : <StatusPill ok={!!status?.connected} label={status?.connected ? 'Connected' : 'Not Connected'} />
                }
                {status?.connected && allInSync && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    ✓ Everything in sync
                  </span>
                )}
              </div>
              {status?.connected && (
                <p className="text-gray-500 text-xs mt-0.5 font-mono">
                  {status.owner}/{status.repo} · branch: {status.branch}
                </p>
              )}
              {status?.error && (
                <p className="text-red-400 text-xs mt-0.5">{status.error}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {status?.latestCommit && (
              <div className="text-right">
                <p className="text-gray-500 text-[10px] uppercase tracking-widest">Latest GitHub commit</p>
                <p className="text-white text-xs font-semibold mt-0.5">
                  <span className="font-mono text-[#00BFFF] mr-1.5">{status.latestCommit.shortSha}</span>
                  {status.latestCommit.message}
                </p>
                <p className="text-gray-600 text-[10px] mt-0.5">
                  {status.latestCommit.author} · {timeAgo(status.latestCommit.date)}
                </p>
              </div>
            )}
            <button
              onClick={loadStatus}
              disabled={loading}
              className="px-3 py-2 rounded-xl text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-40 shrink-0"
            >
              {loading ? '⟳ Checking…' : '⟳ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Live site sync status ─────────────────────────────────────── */}
      <LiveSyncCard
        syncState={syncState}
        forceSyncing={forceSyncing}
        forceSyncDone={forceSyncDone}
        onForceSync={handleForceSync}
      />

      {/* ── Two action cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* PUSH card */}
        <div className="glass rounded-2xl border border-[#00BFFF]/15 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-xl">
              ↑
            </div>
            <div>
              <p className="text-white font-bold text-base">Send to GitHub</p>
              <p className="text-gray-500 text-xs">Push your data up</p>
            </div>
          </div>

          <div className="space-y-1.5 text-sm text-gray-400 flex-1">
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-2">What this does</p>
            {[
              'Takes all your current data (players, gamemodes, economy, etc.)',
              'Saves it to GitHub so your published website can read it',
              'Also uploads any custom gamemode icons you changed',
              'The live site picks it up automatically within 5 minutes',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-[#00BFFF] mt-0.5 shrink-0">·</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {pushDone && (
            <div className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
              ✓ Data sent to GitHub — live site will refresh within 5 minutes
            </div>
          )}

          <button
            onClick={handlePush}
            disabled={anyBusy || !status?.connected}
            className="w-full py-3 rounded-xl text-sm font-bold text-white btn-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {pushing
              ? <><span className="animate-spin">⟳</span> Sending…</>
              : <>↑ Send to GitHub</>
            }
          </button>

          {!status?.connected && !loading && (
            <p className="text-center text-xs text-gray-600">Set up your GitHub token in GitHub Sync to enable this</p>
          )}
        </div>

        {/* PULL card */}
        <div className="glass rounded-2xl border border-emerald-500/15 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
              ↓
            </div>
            <div>
              <p className="text-white font-bold text-base">Get from GitHub</p>
              <p className="text-gray-500 text-xs">Pull the latest data down</p>
            </div>
          </div>

          <div className="space-y-1.5 text-sm text-gray-400 flex-1">
            <p className="text-gray-300 text-xs font-semibold uppercase tracking-widest mb-2">What this does</p>
            {[
              'Downloads the latest data straight from GitHub',
              'Applies it here so you see exactly what your live website has',
              'Also downloads any icon files stored in GitHub',
              'Use this after making changes on your published website',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-emerald-400 mt-0.5 shrink-0">·</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {pullDone && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              ✓ Data pulled from GitHub and applied — reload the page to see all changes
            </div>
          )}

          <button
            onClick={handlePull}
            disabled={anyBusy || !status?.connected}
            className="w-full py-3 rounded-xl text-sm font-bold text-white border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {pulling
              ? <><span className="animate-spin">⟳</span> Downloading…</>
              : <>↓ Get from GitHub</>
            }
          </button>

          {pullDone && (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00BFFF]/15 border border-[#00BFFF]/30 hover:bg-[#00BFFF]/25 transition-all"
            >
              🔄 Reload Page to See Changes
            </button>
          )}

          {!status?.connected && !loading && (
            <p className="text-center text-xs text-gray-600">Set up your GitHub token in GitHub Sync to enable this</p>
          )}
        </div>
      </div>

      {/* ── Push Everything card ─────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-violet-500/15 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl">
            📦
          </div>
          <div>
            <p className="text-white font-bold text-base">Push Everything to GitHub</p>
            <p className="text-gray-500 text-xs">Sends all files — code, data, icons, new features — everything</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
          {[
            ['Data files', 'players, gamemodes, economy, etc.'],
            ['Code files', 'new pages, components, features you added'],
            ['Config files', 'settings, routes, package files'],
            ['Icon files', 'custom gamemode icons in public/icons/'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-2">
              <span className="text-violet-400 mt-0.5 shrink-0">·</span>
              <span><span className="text-gray-300 font-semibold">{title}</span> — {desc}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-3 text-xs text-gray-500">
          <p className="text-violet-300 font-semibold mb-1">⚡ After pushing new code features:</p>
          <p>Go to <strong className="text-white">Replit → Deploy</strong> → click <strong className="text-white">Redeploy</strong> to rebuild and publish your new features live.</p>
        </div>

        <div className="space-y-2">
          <label className="text-gray-500 text-xs">
            Describe what you changed <span className="text-gray-700">(optional — leave blank for auto message)</span>
          </label>
          <input
            type="text"
            value={commitMsg}
            onChange={e => setCommitMsg(e.target.value)}
            placeholder='e.g. "Added new tournament system and updated player data"'
            disabled={pushingAll}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-violet-500/40 focus:bg-white/8 transition-all disabled:opacity-40"
          />
        </div>

        {pushAllDone && (
          <div className="px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">
            ✓ Everything pushed to GitHub — data updates live automatically, code updates need a Redeploy
          </div>
        )}

        <button
          onClick={handlePushAll}
          disabled={anyBusy || !status?.connected}
          className="w-full py-3 rounded-xl text-sm font-bold text-white border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {pushingAll
            ? <><span className="animate-spin">⟳</span> Pushing everything…</>
            : <>📦 Push Everything to GitHub</>
          }
        </button>

        {!status?.connected && !loading && (
          <p className="text-center text-xs text-gray-600">Set up your GitHub token in GitHub Sync to enable this</p>
        )}
      </div>

      {/* ── Operation log ─────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Operation Log</p>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors"
            >
              Clear
            </button>
          </div>
          <div
            ref={logRef}
            className="p-4 space-y-0.5 max-h-52 overflow-y-auto bg-black/20"
          >
            {logs.map((l, i) => <LogEntry key={i} line={l} />)}
          </div>
        </div>
      )}

      {/* ── File comparison table ─────────────────────────────────────── */}
      {status && status.sections.length > 0 && (
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-white font-bold text-sm">Data Files — Local vs GitHub</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Comparison of what's on this server right now vs what's stored in GitHub
            </p>
          </div>

          <div className="grid grid-cols-[1fr_80px_80px_120px] gap-3 px-4 py-2 bg-white/2 border-b border-white/5">
            <span className="text-[10px] text-gray-600 uppercase tracking-widest">File</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">Local</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">GitHub</span>
            <span className="text-[10px] text-gray-600 uppercase tracking-widest text-right">Status</span>
          </div>

          {status.sections.map(s => <FileRow key={s.section} s={s} />)}

          <div className="px-4 py-3 bg-white/2 border-t border-white/5 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-600">
              {status.sections.filter(s => s.isSame).length} in sync
            </span>
            {status.sections.filter(s => !s.isSame && s.localExists && s.remoteExists).length > 0 && (
              <span className="text-xs text-amber-400">
                · {status.sections.filter(s => !s.isSame && s.localExists && s.remoteExists).length} different
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Icon files ────────────────────────────────────────────────── */}
      {status && (status.localIcons.length > 0 || status.remoteIcons.length > 0) && (
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-white font-bold text-sm">Icon Files</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Custom gamemode icons — {status.localIcons.length} on server · {status.remoteIcons.length} in GitHub
            </p>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {[...new Set([...status.localIcons, ...status.remoteIcons])].sort().map(name => {
              const hasLocal  = status.localIcons.includes(name)
              const hasRemote = status.remoteIcons.includes(name)
              const inSync    = hasLocal && hasRemote
              return (
                <div
                  key={name}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                    inSync
                      ? 'bg-white/5 border-white/10 text-gray-400'
                      : hasLocal
                        ? 'bg-blue-500/8 border-blue-500/20 text-blue-400'
                        : 'bg-purple-500/8 border-purple-500/20 text-purple-400'
                  }`}
                >
                  {hasLocal && (
                    <img
                      src={`/icons/${name}`}
                      alt={name}
                      className="w-4 h-4 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <span className="font-mono">{name}</span>
                  {inSync    && <span className="text-green-500/60">✓</span>}
                  {hasLocal  && !hasRemote && <span title="Only on server, not in GitHub">⬆</span>}
                  {hasRemote && !hasLocal  && <span title="Only in GitHub, not on server">⬇</span>}
                </div>
              )
            })}
          </div>
          <div className="px-4 pb-3 flex gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><span className="text-green-500/60">✓</span> In sync</span>
            <span className="flex items-center gap-1"><span className="text-blue-400">⬆</span> Only on server (push to add to GitHub)</span>
            <span className="flex items-center gap-1"><span className="text-purple-400">⬇</span> Only in GitHub (pull to get it here)</span>
          </div>
        </div>
      )}

    </div>
  )
}
