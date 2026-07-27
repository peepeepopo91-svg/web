import { useState, useMemo, useRef, useEffect } from 'react'
import {
  getPlayers, savePlayers,
  importPlayers, exportPlayersJSON, resetPlayers,
  getGamemodes,
} from '../../store/playersStore'
import { validateAllData, repairPlayers, previewRepairPlayers, loadAllData, flushStoresToDisk, savePlayersToTS, type ValidationReport, type RepairPreview } from '../../server/dataFiles'
import type { Player, Region } from '../../data/players'
import { REGIONS } from '../../data/players'
import { TIER_ORDER, tierColors, getPlayerTotalPoints } from '../../data/tiers'
import type { Gamemode } from '../../data/gamemodes'
import { gamemodes as defaultGamemodes } from '../../data/gamemodes'
import { addLog } from '../../store/adminStore'

interface Props { admin: string }

const BLANK_PLAYER: Player = {
  name: '',
  head: '',
  region: 'North America',
  ranks: Object.fromEntries(defaultGamemodes.map(gm => [gm.key, 'None'])) as Record<string, string>,
}

function AdminToast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border max-w-sm ${
      type === 'success'
        ? 'bg-green-500/15 border-green-500/30 text-green-400'
        : 'bg-red-500/15 border-red-500/30 text-red-400'
    }`}>
      {type === 'success' ? '✓ ' : '⚠ '}{msg}
    </div>
  )
}

type ModalMode = 'add' | 'edit' | null

// ─── Validate / Repair result panel ───────────────────────────────────────────

function ValidationPanel({
  report,
  onClose,
}: {
  report: ValidationReport
  onClose: () => void
}) {
  const playersFile = report.files.find(f => f.section === 'players')
  const otherFiles  = report.files.filter(f => f.section !== 'players')

  function IssueRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
    return (
      <div className="flex items-start gap-2">
        <span className={`shrink-0 mt-0.5 text-xs font-bold ${ok ? 'text-green-400' : 'text-red-400'}`}>
          {ok ? '✓' : '✗'}
        </span>
        <div className="flex-1 min-w-0">
          <span className={`text-xs ${ok ? 'text-gray-400' : 'text-red-300'}`}>{label}</span>
          {detail && <p className="text-[10px] text-gray-600 font-mono mt-0.5 break-all">{detail}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="relative rounded-2xl border border-white/10 bg-[#070B12]/96 backdrop-blur-xl shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/50 to-transparent" />

          <div className="px-6 pt-6 pb-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-base">🔍</div>
            <div className="flex-1">
              <h2 className="font-['Space_Grotesk'] font-bold text-white text-base">Data Validation Report</h2>
              <p className="text-gray-600 text-[11px] mt-0.5">
                {report.totalIssues === 0
                  ? 'All checks passed — data is clean'
                  : `${report.totalIssues} issue${report.totalIssues !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <div className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${
              report.totalIssues === 0
                ? 'bg-green-500/12 border-green-500/25 text-green-400'
                : 'bg-red-500/12 border-red-500/25 text-red-400'
            }`}>
              {report.totalIssues === 0 ? '✓ Clean' : `✗ ${report.totalIssues} issues`}
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Players file */}
            {playersFile && (
              <section className="space-y-2">
                <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">players.json</h3>
                <div className="glass rounded-xl border border-white/8 p-4 space-y-2">
                  <IssueRow ok={playersFile.jsonValid} label="Valid JSON" detail={playersFile.error} />
                  <IssueRow ok={!playersFile.hasMergeConflicts} label="No merge conflict markers" />
                  <IssueRow
                    ok={!playersFile.duplicates?.length}
                    label="No duplicate players"
                    detail={playersFile.duplicates?.length ? `Duplicates: ${playersFile.duplicates.join(', ')}` : undefined}
                  />
                  <IssueRow
                    ok={!playersFile.missingFields?.length}
                    label="All players have required fields"
                    detail={playersFile.missingFields?.length ? `Missing: ${playersFile.missingFields.join(', ')}` : undefined}
                  />
                  <IssueRow
                    ok={!playersFile.missingRegions?.length}
                    label="All players have valid region"
                    detail={playersFile.missingRegions?.length ? `Invalid region: ${playersFile.missingRegions.join(', ')}` : undefined}
                  />
                  <IssueRow
                    ok={!playersFile.invalidRanks?.length}
                    label="All rank values are valid"
                    detail={playersFile.invalidRanks?.length ? `Invalid ranks: ${playersFile.invalidRanks.join(', ')}` : undefined}
                  />
                  {playersFile.playerCount !== undefined && (
                    <p className="text-[10px] text-gray-600 pt-1">
                      {playersFile.playerCount} player{playersFile.playerCount !== 1 ? 's' : ''} total
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Other files */}
            <section className="space-y-2">
              <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Other Data Files</h3>
              <div className="glass rounded-xl border border-white/8 p-4 space-y-2">
                {otherFiles.map(f => (
                  <IssueRow
                    key={f.file}
                    ok={f.jsonValid && !f.hasMergeConflicts}
                    label={f.file}
                    detail={f.error}
                  />
                ))}
              </div>
            </section>

            {/* GitHub checks */}
            <section className="space-y-2">
              <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">GitHub Connection</h3>
              <div className="glass rounded-xl border border-white/8 p-4 space-y-2">
                <IssueRow ok={report.hasGitHubToken}  label="GitHub token configured" />
                <IssueRow ok={report.repoReachable}   label="Repository reachable" />
                <IssueRow ok={report.branchExists}    label='Branch "main" exists' />
              </div>
            </section>
          </div>

          <div className="px-6 pb-6 border-t border-white/5 pt-4">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-semibold text-gray-400 border border-white/10 hover:bg-white/5 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Repair preview modal ──────────────────────────────────────────────────────

function RepairPreviewModal({
  preview,
  applying,
  onApply,
  onCancel,
}: {
  preview:  RepairPreview
  applying: boolean
  onApply:  () => void
  onCancel: () => void
}) {
  const hasIssues = preview.conflictBlocks > 0 || preview.missingCommas > 0 || preview.duplicatePlayers.length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="relative rounded-2xl border border-amber-500/20 bg-[#070B12]/97 backdrop-blur-xl shadow-[0_32px_64px_rgba(0,0,0,0.7)]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          <div className="px-6 pt-6 pb-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base">🔍</div>
            <div className="flex-1">
              <h2 className="font-['Space_Grotesk'] font-bold text-white text-base">Repair Preview</h2>
              <p className="text-gray-600 text-[11px] mt-0.5">
                {preview.canAutoRepair
                  ? `${preview.playerCountBefore} players found → ${preview.playerCountAfter} after repair`
                  : 'Analysis complete — see issues below'}
              </p>
            </div>
            <div className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${
              preview.canAutoRepair
                ? 'bg-green-500/12 border-green-500/25 text-green-400'
                : 'bg-red-500/12 border-red-500/25 text-red-400'
            }`}>
              {preview.canAutoRepair ? '✓ Auto-repairable' : '✗ Manual fix needed'}
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">

            {/* Detected issues */}
            <section>
              <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Detected Issues</h3>
              <div className="space-y-2">
                {[
                  {
                    ok: preview.conflictBlocks === 0,
                    label: preview.conflictBlocks > 0
                      ? `${preview.conflictBlocks} Git conflict block(s) (<<<<<<< / ======= / >>>>>>>)`
                      : 'No Git conflict markers',
                  },
                  {
                    ok: preview.missingCommas === 0,
                    label: preview.missingCommas > 0
                      ? `${preview.missingCommas} missing comma(s) in JSON`
                      : 'No missing commas',
                  },
                  {
                    ok: preview.duplicatePlayers.length === 0,
                    label: preview.duplicatePlayers.length > 0
                      ? `${preview.duplicatePlayers.length} duplicate player(s): ${preview.duplicatePlayers.slice(0, 4).join(', ')}${preview.duplicatePlayers.length > 4 ? '…' : ''}`
                      : 'No duplicate players',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`shrink-0 mt-0.5 text-xs font-bold ${item.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {item.ok ? '✓' : '✗'}
                    </span>
                    <span className={`text-xs ${item.ok ? 'text-gray-500' : 'text-gray-200'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Recovery plan */}
            {preview.canAutoRepair && preview.repairs.length > 0 && (
              <section>
                <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Recovery Plan</h3>
                <div className="space-y-1.5 bg-green-500/4 border border-green-500/15 rounded-xl px-4 py-3">
                  {preview.repairs.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 text-green-400 text-[10px] font-bold">✓</span>
                      <span className="text-green-300/80 text-xs">{r}</span>
                    </div>
                  ))}
                  {preview.duplicatePlayers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 text-green-400 text-[10px] font-bold">✓</span>
                      <span className="text-green-300/80 text-xs">Merge duplicate players (ranks combined, not lost)</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 text-green-400 text-[10px] font-bold">✓</span>
                    <span className="text-green-300/80 text-xs">Backup created before any changes</span>
                  </div>
                </div>
              </section>
            )}

            {/* Result */}
            {preview.canAutoRepair && (
              <section>
                <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Result</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Players before', value: preview.playerCountBefore.toString(), color: 'text-gray-300' },
                    { label: 'Players after',  value: preview.playerCountAfter.toString(),  color: 'text-green-400' },
                    { label: 'Removed dupes',  value: (preview.playerCountBefore - preview.playerCountAfter).toString(), color: 'text-amber-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white/2 border border-white/5 rounded-xl px-3 py-2.5 text-center">
                      <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Parse error if can't auto-repair */}
            {!preview.canAutoRepair && preview.parseError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/4 px-4 py-3">
                <p className="text-red-400 text-xs font-bold mb-1">Auto-repair failed</p>
                <p className="text-red-300/70 text-[11px] font-mono leading-relaxed break-all">{preview.parseError}</p>
                <p className="text-gray-600 text-[10px] mt-2">
                  The JSON corruption is too severe for automatic repair. You can try pulling the remote version
                  using "Advanced Git → Pull" in the GitHub Sync Center, or manually fix the file.
                </p>
              </div>
            )}

            {!hasIssues && (
              <p className="text-green-400 text-sm text-center py-2">✓ No issues found — players.json is clean</p>
            )}
          </div>

          <div className="px-6 pb-6 border-t border-white/5 pt-4 flex gap-3">
            <button
              onClick={onCancel}
              disabled={applying}
              className="flex-1 py-3 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-40"
            >
              Cancel
            </button>
            {preview.canAutoRepair && (
              <button
                onClick={onApply}
                disabled={applying}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-amber-400 border border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {applying
                  ? <><span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />Applying Repair…</>
                  : '🔧 Apply Repair'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Repair result modal ───────────────────────────────────────────────────────

function RepairResultModal({
  repairs,
  playerCount,
  backupFile,
  onClose,
  onRefresh,
}: {
  repairs:     string[]
  playerCount: number
  backupFile:  string | null
  onClose:     () => void
  onRefresh:   () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="relative rounded-2xl border border-green-500/20 bg-[#070B12]/96 backdrop-blur-xl shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          <div className="px-6 pt-6 pb-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-base">🔧</div>
            <div>
              <h2 className="font-['Space_Grotesk'] font-bold text-white text-base">Repair Complete</h2>
              <p className="text-gray-600 text-[11px] mt-0.5">{playerCount} players after repair</p>
            </div>
          </div>

          <div className="px-6 py-5 space-y-2">
            {repairs.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-green-400 text-xs font-bold">✓</span>
                <span className="text-gray-300 text-xs">{r}</span>
              </div>
            ))}
            {backupFile && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-gray-600 text-[10px] font-mono">💾 Backup: {backupFile}</p>
              </div>
            )}
            <p className="text-gray-500 text-xs pt-3 border-t border-white/5 mt-3">
              The local file has been repaired. Use "GitHub Sync" in the sidebar to commit the fixed data.
            </p>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => { onRefresh(); onClose() }}
              className="flex-1 py-3 rounded-xl text-sm font-semibold btn-primary text-white"
            >
              Refresh Player List
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TierListManager({ admin }: Props) {
  const [players, setPlayers]             = useState<Player[]>(getPlayers)
  const [liveGamemodes]                   = useState<Gamemode[]>(getGamemodes)
  const [search, setSearch]               = useState('')
  const [page, setPage]                   = useState(1)
  const [modal, setModal]                 = useState<ModalMode>(null)
  const [form, setForm]                   = useState<Player>(BLANK_PLAYER)
  const [originalName, setOriginalName]   = useState('')
  const [deleteTarget, setDeleteTarget]   = useState<Player | null>(null)
  const [showResetConfirm, setShowResetConfirm]   = useState(false)
  const [toast, setToast]                         = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Validate / Repair state
  const [savingToTS, setSavingToTS]             = useState(false)
  const [validating, setValidating]             = useState(false)
  const [previewing, setPreviewing]             = useState(false)
  const [applyingRepair, setApplyingRepair]     = useState(false)
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [repairPreview, setRepairPreview]       = useState<RepairPreview | null>(null)
  const [repairResult, setRepairResult]         = useState<{ repairs: string[]; playerCount: number; backupFile: string | null } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Refresh player list from disk every time this section is opened,
  // so edits made outside the admin session (e.g. bulk imports) are visible
  // immediately without requiring a full page reload.
  useEffect(() => {
    loadAllData()
      .then(d => {
        if (d.players && Array.isArray(d.players)) {
          savePlayers(d.players as Player[], { silent: true })
          setPlayers(d.players as Player[])
        }
      })
      .catch(() => { /* keep existing localStorage data on failure */ })
  }, [])

  function showToastMsg(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function persist(updated: Player[]) {
    setPlayers(updated)
    savePlayers(updated)
    // Write directly to data/players.json so the homepage server loader
    // always reflects the latest player list without needing a GitHub sync.
    await flushStoresToDisk({
      data: {
        sections: [{ section: 'players', jsonData: JSON.stringify(updated) }],
      },
    })
  }

  const PAGE_SIZE = 24

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    return [...players]
      .filter(p => !q || p.name.toLowerCase().includes(q) || p.region.toLowerCase().includes(q))
      .sort((a, b) => getPlayerTotalPoints(b.ranks) - getPlayerTotalPoints(a.ranks))
  }, [players, search])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset to page 1 whenever search changes
  const prevSearch = useRef(search)
  if (prevSearch.current !== search) {
    prevSearch.current = search
    if (page !== 1) setPage(1)
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  function openAdd() {
    setForm({ ...BLANK_PLAYER, ranks: {} })
    setOriginalName('')
    setModal('add')
  }

  function openEdit(p: Player) {
    // Normalize rank values so the controlled selects always match an option:
    // data/players.json uses "NONE" but the <select> options use value="" for "no tier".
    const normalizedRanks: Record<string, string> = {}
    for (const [k, v] of Object.entries(p.ranks ?? {})) {
      normalizedRanks[k] = (!v || (v as string).toUpperCase() === 'NONE') ? '' : (v as string)
    }
    setForm({ ...p, ranks: normalizedRanks })
    setOriginalName(p.name)
    setModal('edit')
  }

  async function handleSave() {
    if (!form.name.trim()) { showToastMsg('Name is required.', 'error'); return }

    // Normalise ranks: '' (the "no tier" sentinel used in the form) → 'NONE'
    const savedRanks: Record<string, string> = {}
    for (const gm of liveGamemodes) {
      const val = form.ranks[gm.key]
      savedRanks[gm.key] = val && val !== '' ? val : 'NONE'
    }
    const withHead: Player = {
      ...form,
      name: form.name.trim(),
      head: form.head.trim() || `https://mc-heads.net/avatar/${encodeURIComponent(form.name.trim())}`,
      ranks: savedRanks,
    }

    if (modal === 'add') {
      // If a player with this name already exists, merge the new rank data into
      // their existing record instead of rejecting with an error.
      const existingIdx = players.findIndex(
        p => p.name.toLowerCase() === withHead.name.toLowerCase()
      )
      if (existingIdx !== -1) {
        const existing = players[existingIdx]
        // Merge: keep existing ranks, overwrite only the ones the user changed
        const mergedRanks = { ...existing.ranks } as Record<string, string>
        for (const gm of liveGamemodes) {
          if (savedRanks[gm.key] && savedRanks[gm.key] !== 'NONE') {
            mergedRanks[gm.key] = savedRanks[gm.key]
          }
        }
        const merged: Player = {
          ...existing,
          head: withHead.head || existing.head,
          region: withHead.region || existing.region,
          ranks: mergedRanks,
        }
        try {
          await persist(players.map((p, i) => i === existingIdx ? merged : p))
        } catch {
          showToastMsg('Could not save player data to disk.', 'error')
          return
        }
        addLog(admin, 'player:edit', `Updated existing player via Add: ${merged.name}`)
        showToastMsg(`${merged.name} updated`)
      } else {
        try {
          await persist([...players, withHead])
        } catch {
          showToastMsg('Could not save player data to disk.', 'error')
          return
        }
        addLog(admin, 'player:add', `Added player: ${withHead.name}`)
        showToastMsg(`${withHead.name} added to tier list`)
      }
    } else {
      try {
        await persist(players.map(p => p.name === originalName ? withHead : p))
      } catch {
        showToastMsg('Could not save player data to disk.', 'error')
        return
      }
      addLog(admin, 'player:edit', `Edited player: ${withHead.name}`)
      showToastMsg(`${withHead.name} updated`)
    }
    setModal(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const updated = players.filter(p => p.name !== deleteTarget.name)
    try {
      await persist(updated)
    } catch {
      showToastMsg('Could not save player data to disk.', 'error')
      return
    }
    addLog(admin, 'player:delete', `Deleted player: ${deleteTarget.name}`)
    showToastMsg(`${deleteTarget.name} removed`)
    setDeleteTarget(null)
  }

  function handleReset() {
    resetPlayers()
    setPlayers(getPlayers())
    setShowResetConfirm(false)
    addLog(admin, 'player:reset', 'Reset all players to default data')
    showToastMsg('Players reset to defaults')
  }

  // ── Import / Export ────────────────────────────────────────────────────────

  async function handleSaveToTS() {
    setSavingToTS(true)
    try {
      const result = await savePlayersToTS()
      addLog(admin, 'player:save-ts', `Saved ${result.count} players to src/data/players.ts`)
      showToastMsg(`✓ Saved ${result.count} players to players.ts`)
    } catch (e) {
      showToastMsg(`Failed to save players.ts: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setSavingToTS(false)
    }
  }

  function handleExport() {
    const json = exportPlayersJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `bluetiers-players-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    addLog(admin, 'player:export', `Exported ${players.length} players`)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data)) throw new Error('Expected array')
        importPlayers(data as Player[])
        setPlayers(getPlayers())
        addLog(admin, 'player:import', `Imported ${data.length} players`)
        showToastMsg(`Imported ${data.length} players`)
      } catch {
        showToastMsg('Import failed: invalid JSON format', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Validate ───────────────────────────────────────────────────────────────

  async function handleValidate() {
    setValidating(true)
    try {
      const report = await validateAllData()
      setValidationReport(report)
    } catch (e) {
      showToastMsg(`Validation error: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setValidating(false)
    }
  }

  // ── Repair ─────────────────────────────────────────────────────────────────

  // Step 1: preview (shows modal with issues before applying)
  async function handleRepair() {
    setPreviewing(true)
    addLog(admin, 'player:repair', 'Analysing players.json for repair…')
    try {
      const preview = await previewRepairPlayers()
      setRepairPreview(preview)
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/^REPAIR_ERROR:\s*/, '') : String(e)
      showToastMsg(`Repair analysis failed: ${msg}`, 'error')
      addLog(admin, 'player:repair', `Repair analysis failed: ${msg}`)
    } finally {
      setPreviewing(false)
    }
  }

  // Step 2: apply (called from preview modal)
  async function handleApplyRepair() {
    setApplyingRepair(true)
    addLog(admin, 'player:repair', 'Applying repair to players.json…')
    try {
      const result = await repairPlayers()
      addLog(admin, 'player:repair', `Repair complete: ${result.repairs.join('; ')}`)
      setRepairPreview(null)
      setRepairResult({ repairs: result.repairs, playerCount: result.playerCount, backupFile: result.backupFile })
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/^REPAIR_ERROR:\s*/, '') : String(e)
      showToastMsg(`Repair failed: ${msg}`, 'error')
      addLog(admin, 'player:repair', `Repair failed: ${msg}`)
      setRepairPreview(null)
    } finally {
      setApplyingRepair(false)
    }
  }

  // Refresh player list from disk after repair
  async function handleRefreshFromDisk() {
    try {
      const data = await loadAllData()
      if (data.players) {
        savePlayers(data.players as Player[], { silent: true })
        setPlayers(data.players as Player[])
        showToastMsg('Player list refreshed from disk')
      }
    } catch {
      // Falls back to localStorage
      setPlayers(getPlayers())
    }
  }

  function setRank(key: string, val: string) {
    // Store val as-is: '' means "no tier" (matches the <option value="">) and
    // 'HT1'–'LT5' are real tiers. We normalise to 'NONE' only when saving.
    setForm(prev => ({ ...prev, ranks: { ...prev.ranks, [key]: val } }))
  }

  const pts = getPlayerTotalPoints(form.ranks)

  return (
    <div className="space-y-5">
      {toast && <AdminToast msg={toast.msg} type={toast.type} />}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search players…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-[#00BFFF]/40 transition-all"
        />
        <button onClick={openAdd} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white">
          + Add Player
        </button>
        <button onClick={handleExport} className="px-5 py-2.5 rounded-xl text-sm text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/8 transition-all">
          ↓ Export JSON
        </button>
        <button
          onClick={handleSaveToTS}
          disabled={savingToTS}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm text-green-400 border border-green-500/20 hover:bg-green-500/8 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {savingToTS
            ? <><span className="w-3.5 h-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" /> Saving…</>
            : '💾 Save to players.ts'
          }
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
          ↑ Import JSON
        </button>
        <button onClick={() => setShowResetConfirm(true)} className="px-5 py-2.5 rounded-xl text-sm text-orange-400 border border-orange-500/20 hover:bg-orange-500/8 transition-all">
          Reset
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
      </div>

      {/* Data integrity toolbar */}
      <div className="flex flex-wrap gap-2 px-4 py-3 rounded-xl border border-white/5 bg-white/1">
        <span className="text-gray-600 text-xs self-center mr-1">Data Integrity:</span>
        <button
          onClick={handleValidate}
          disabled={validating}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-purple-400 border border-purple-500/20 hover:bg-purple-500/8 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {validating ? (
            <span className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          ) : '🔍'}
          {validating ? 'Validating…' : 'Validate Data'}
        </button>
        <button
          onClick={handleRepair}
          disabled={previewing || applyingRepair}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-amber-400 border border-amber-500/20 hover:bg-amber-500/8 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {previewing ? (
            <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          ) : '🔧'}
          {previewing ? 'Analysing…' : 'Repair Data'}
        </button>
        <span className="text-gray-700 text-[10px] self-center ml-auto hidden sm:block">
          Repair removes conflicts, fills missing fields, deduplicates, and sorts
        </span>
      </div>

      {/* Stat bar + Pagination */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-gray-600 text-xs">
          {sorted.length} player{sorted.length !== 1 ? 's' : ''} shown · {players.length} total
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 border border-white/10 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 border border-white/10 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
              .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…')
                acc.push(n)
                return acc
              }, [])
              .map((n, i) =>
                n === '…'
                  ? <span key={`ellipsis-${i}`} className="px-1.5 text-gray-600 text-[10px]">…</span>
                  : <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`min-w-[28px] px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                        currentPage === n
                          ? 'bg-[#00BFFF]/15 border-[#00BFFF]/40 text-[#00BFFF]'
                          : 'text-gray-400 border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
              )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 border border-white/10 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 border border-white/10 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              »
            </button>

            <span className="text-gray-600 text-[10px] ml-1">
              Page {currentPage} / {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        <div className="hidden md:grid gap-2 px-4 py-3 border-b border-white/5 text-[9px] text-gray-600 uppercase tracking-widest" style={{ gridTemplateColumns: `40px 2fr 1fr 60px repeat(${liveGamemodes.length}, 1fr) 100px` }}>
          <span>#</span>
          <span>Player</span>
          <span>Region</span>
          <span className="text-center">Pts</span>
          {liveGamemodes.map(gm => (
            <span key={gm.key} className="text-center">{gm.label}</span>
          ))}
          <span className="text-right">Actions</span>
        </div>

        {sorted.length === 0 && (
          <div className="py-16 text-center text-gray-600 text-sm">No players found.</div>
        )}

        <div className="divide-y divide-white/5">
          {paginated.map((p, i) => {
            const total = getPlayerTotalPoints(p.ranks)
            const globalIdx = (currentPage - 1) * PAGE_SIZE + i
            return (
              <div key={p.name} className="grid gap-2 px-4 py-3 items-center hover:bg-white/2 transition-colors" style={{ gridTemplateColumns: `40px 2fr 1fr 60px repeat(${liveGamemodes.length}, 1fr) 100px` }}>
                <span className="text-gray-700 text-xs font-mono">{globalIdx + 1}</span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={p.head}
                    alt={p.name}
                    className="w-7 h-7 rounded-lg shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = '' }}
                  />
                  <span className="text-white text-sm font-semibold truncate">{p.name}</span>
                </div>
                <span className="text-gray-500 text-xs truncate">{p.region}</span>
                <span className="text-[#00BFFF] text-xs font-bold text-center font-mono">{total}</span>
                {liveGamemodes.map(gm => {
                  const t = p.ranks[gm.key]
                  if (!t || t === 'None' || t === 'NONE') return <span key={gm.key} className="text-center text-gray-700 text-[10px]">None</span>
                  const colors = tierColors[t]
                  return (
                    <span
                      key={gm.key}
                      className={`text-center text-[9px] font-bold px-1 py-0.5 rounded ${colors?.bg ?? 'bg-white/5'} ${colors?.text ?? 'text-gray-400'}`}
                    >
                      {t}
                    </span>
                  )
                })}
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => openEdit(p)} className="px-2.5 py-1 rounded-lg text-[10px] text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all">
                    Edit
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="px-2.5 py-1 rounded-lg text-[10px] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
                    Del
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <h3 className="font-['Space_Grotesk'] font-black text-white text-xl">
              {modal === 'add' ? '+ Add Player' : `Edit: ${originalName}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Username *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Minecraft username"
                  className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all placeholder-gray-700"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">Region</label>
                <select
                  value={form.region}
                  onChange={e => setForm(p => ({ ...p, region: e.target.value as Region }))}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40"
                >
                  {REGIONS.map(r => (
                    <option key={r} value={r} className="bg-[#0B0F17]">{r}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1.5">
                  Head URL <span className="normal-case text-gray-700">(leave blank to auto-generate from username)</span>
                </label>
                <input
                  type="text"
                  value={form.head}
                  onChange={e => setForm(p => ({ ...p, head: e.target.value }))}
                  placeholder={`https://mc-heads.net/avatar/${form.name || 'Username'}`}
                  className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all placeholder-gray-700"
                />
              </div>
            </div>

            {(form.head || form.name) && (
              <div className="flex items-center gap-3">
                <img
                  src={form.head || `https://mc-heads.net/avatar/${encodeURIComponent(form.name)}`}
                  alt="preview"
                  className="w-12 h-12 rounded-xl border border-white/10"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                />
                <div>
                  <p className="text-white text-sm font-bold">{form.name || '—'}</p>
                  <p className="text-gray-600 text-xs">{form.region} · {pts} pts</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Tier Ranks</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {liveGamemodes.map(gm => (
                  <div key={gm.key}>
                    <p className="text-gray-400 text-xs mb-1.5 flex items-center gap-1.5">
                      {gm.icon ? (
                        <img src={gm.icon} alt={gm.label} className="w-4 h-4 object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <span>{gm.fallback}</span>
                      )}
                      {gm.label}
                    </p>
                    <select
                      value={form.ranks[gm.key] ?? ''}
                      onChange={e => setRank(gm.key, e.target.value)}
                      className="w-full bg-white/3 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-[#00BFFF]/40"
                    >
                      <option value="" className="bg-[#0B0F17]">None</option>
                      {TIER_ORDER.map(t => (
                        <option key={t} value={t} className="bg-[#0B0F17]">{t}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-xl text-sm font-semibold btn-primary text-white">
                {modal === 'add' ? '+ Add Player' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-red-500/20 p-6 max-w-sm w-full text-center">
            <img src={deleteTarget.head} alt={deleteTarget.name} className="w-14 h-14 rounded-xl mx-auto mb-3 border border-white/10" />
            <h3 className="text-white font-bold text-lg mb-2">Remove Player?</h3>
            <p className="text-gray-500 text-sm mb-6">
              <strong className="text-white">{deleteTarget.name}</strong> will be permanently removed from the tier list.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-orange-500/20 p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-white font-bold text-lg mb-2">Reset All Players?</h3>
            <p className="text-gray-500 text-sm mb-6">All custom player data will be discarded and replaced with the default players from the codebase.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10">Cancel</button>
              <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-orange-400 border border-orange-500/30 bg-orange-500/10">Reset All</button>
            </div>
          </div>
        </div>
      )}

      {validationReport && (
        <ValidationPanel
          report={validationReport}
          onClose={() => setValidationReport(null)}
        />
      )}

      {repairPreview && (
        <RepairPreviewModal
          preview={repairPreview}
          applying={applyingRepair}
          onApply={handleApplyRepair}
          onCancel={() => setRepairPreview(null)}
        />
      )}

      {repairResult && (
        <RepairResultModal
          repairs={repairResult.repairs}
          playerCount={repairResult.playerCount}
          backupFile={repairResult.backupFile}
          onClose={() => setRepairResult(null)}
          onRefresh={handleRefreshFromDisk}
        />
      )}
    </div>
  )
}
