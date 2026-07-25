// ─── Repository History Management ───────────────────────────────────────────
// Standalone admin section for resetting repository commit history.

import { useState, useEffect, useMemo } from 'react'
import { useSyncState } from '../../store/syncStore'
import {
  getRepoInfo,
  createBackupBranch,
  performHistoryReset,
  type RepoInfo,
  type ResetResult,
} from '../../server/repoHistory'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SafetyCheck {
  id: string
  label: string
  description: string
  ok: boolean
  loading: boolean
}

interface StepEntry {
  id: string
  label: string
  status: 'pending' | 'running' | 'ok' | 'error'
  detail?: string
}

type Phase = 'idle' | 'confirming' | 'running' | 'done'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function timeAgo(iso: string): string {
  if (!iso) return ''
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function makeTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false, dim = false }: { label: string; value: string; mono?: boolean; dim?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/4 last:border-0">
      <span className="text-gray-500 text-xs shrink-0 w-36">{label}</span>
      <span className={`text-xs text-right leading-relaxed ${mono ? 'font-mono text-[#00BFFF]' : dim ? 'text-gray-600' : 'text-gray-300'}`}>
        {value || '—'}
      </span>
    </div>
  )
}

function CheckRow({ check }: { check: SafetyCheck }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
      check.loading
        ? 'bg-white/2 border-white/5'
        : check.ok
          ? 'bg-green-500/5 border-green-500/15'
          : 'bg-red-500/5 border-red-500/20'
    }`}>
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
        check.loading
          ? 'bg-white/5 text-gray-600'
          : check.ok
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
      }`}>
        {check.loading ? '·' : check.ok ? '✓' : '✗'}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${
          check.loading ? 'text-gray-500' : check.ok ? 'text-green-300' : 'text-red-300'
        }`}>{check.label}</p>
        {!check.loading && (
          <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">{check.description}</p>
        )}
      </div>
    </div>
  )
}

function StepRow({ step, index }: { step: StepEntry; index: number }) {
  return (
    <div
      className="flex items-start gap-3 animate-[fadeInUp_0.3s_ease_both]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold transition-all ${
        step.status === 'pending' ? 'bg-white/5 text-gray-700' :
        step.status === 'running' ? 'bg-[#00BFFF]/15 text-[#00BFFF] animate-pulse' :
        step.status === 'ok'      ? 'bg-green-500/20 text-green-400' :
                                    'bg-red-500/20 text-red-400'
      }`}>
        {step.status === 'pending' ? '·' :
         step.status === 'running' ? '○' :
         step.status === 'ok'      ? '✓' : '✗'}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium ${
          step.status === 'pending' ? 'text-gray-600' :
          step.status === 'running' ? 'text-[#00BFFF]' :
          step.status === 'ok'      ? 'text-green-300' : 'text-red-300'
        }`}>{step.label}</span>
        {step.detail && step.status !== 'pending' && (
          <span className="text-[10px] text-gray-600 font-mono ml-2">{step.detail}</span>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RepoHistoryManager({ admin: _admin }: { admin: string }) {
  const sync = useSyncState()

  const [repoInfo, setRepoInfo]     = useState<RepoInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [createBackup, setCreateBackup] = useState(true)
  const [commitMsg, setCommitMsg]   = useState('Initial commit')
  const [phase, setPhase]           = useState<Phase>('idle')
  const [steps, setSteps]           = useState<StepEntry[]>([])
  const [result, setResult]         = useState<ResetResult | null>(null)
  const [runError, setRunError]     = useState<string | null>(null)

  // Load repo info on mount
  useEffect(() => {
    loadInfo()
  }, [])

  async function loadInfo() {
    setLoadingInfo(true)
    try {
      const info = await getRepoInfo()
      setRepoInfo(info)
    } catch {
      setRepoInfo(null)
    } finally {
      setLoadingInfo(false)
    }
  }

  // Safety checks derived from repo info + local state
  const safetyChecks: SafetyCheck[] = useMemo(() => {
    const loading = loadingInfo
    const info = repoInfo

    return [
      {
        id: 'auth',
        label: 'GitHub authentication available',
        description: info?.authAvailable
          ? 'GITHUB_TOKEN is configured and ready'
          : 'GITHUB_TOKEN is not configured — set it in the GitHub Sync page',
        ok: !!info?.authAvailable,
        loading,
      },
      {
        id: 'repo',
        label: 'Repository accessible',
        description: info?.repoAccessible
          ? `Connected to ${info.owner}/${info.repo}`
          : (info?.errorMessage ?? 'Cannot reach the repository — check your token permissions'),
        ok: !!info?.repoAccessible,
        loading,
      },
      {
        id: 'branch',
        label: 'Branch is valid',
        description: info?.repoAccessible
          ? `Working on branch: ${info?.branch ?? 'main'}`
          : 'Could not verify branch — repository must be accessible first',
        ok: !!info?.repoAccessible && !!info?.branch,
        loading,
      },
      {
        id: 'dirty',
        label: 'No unsaved changes',
        description: sync.isDirty
          ? 'You have unsaved changes — push them via GitHub Sync before resetting history'
          : 'All changes are saved and committed to GitHub',
        ok: !sync.isDirty,
        loading: false,
      },
      {
        id: 'head',
        label: 'HEAD commit is present',
        description: info?.headShort
          ? `Current HEAD: ${info.headShort} — "${info.lastMessage}"`
          : 'Could not resolve HEAD commit',
        ok: !!info?.headShort,
        loading,
      },
    ]
  }, [repoInfo, loadingInfo, sync.isDirty])

  const allChecksPassed = !loadingInfo && safetyChecks.every(c => c.ok)

  // ── Run the reset ──────────────────────────────────────────────────────────

  async function runReset() {
    setPhase('running')
    setRunError(null)
    setResult(null)

    const allSteps: StepEntry[] = [
      { id: 'check',    label: 'Checking repository',         status: 'pending' },
      { id: 'backup',   label: 'Creating backup branch',       status: 'pending' },
      { id: 'verify',   label: 'Repository state verified',    status: 'pending' },
      { id: 'tree',     label: 'Current file tree captured',   status: 'pending' },
      { id: 'commit',   label: 'Creating new initial commit',  status: 'pending' },
      { id: 'push',     label: 'Force pushing to GitHub',      status: 'pending' },
      { id: 'verify2',  label: 'Verifying synchronization',    status: 'pending' },
    ]
    const withoutBackup = allSteps.filter(s => s.id !== 'backup')
    const initialSteps = createBackup ? allSteps : withoutBackup
    setSteps(initialSteps)

    function updateStep(id: string, patch: Partial<StepEntry>) {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    }

    const timestamp = makeTimestamp()
    const oldCommitCount = repoInfo?.commitCount ?? 0
    let backupBranchName: string | undefined

    try {
      // Step: Check repository
      updateStep('check', { status: 'running' })
      await sleep(300)
      const freshInfo = await getRepoInfo()
      if (!freshInfo.repoAccessible) throw new Error('Repository is not accessible')
      updateStep('check', { status: 'ok', detail: `HEAD: ${freshInfo.headShort}` })
      await sleep(200)

      // Step: Backup (optional)
      if (createBackup) {
        updateStep('backup', { status: 'running' })
        await sleep(300)
        const backupRes = await createBackupBranch({ data: { timestamp } })
        if (!backupRes.success) throw new Error(`Backup failed: ${backupRes.error}`)
        backupBranchName = backupRes.branchName
        updateStep('backup', { status: 'ok', detail: backupRes.branchName })
        await sleep(200)
      }

      // Steps: Full reset (server handles the rest atomically)
      const resetStepIds = ['verify', 'tree', 'commit', 'push', 'verify2']
      resetStepIds.forEach(id => updateStep(id, { status: 'pending' }))

      // Mark first reset step as running
      updateStep('verify', { status: 'running' })

      const res = await performHistoryReset({
        data: {
          commitMessage: commitMsg.trim() || 'Initial commit',
          oldCommitCount,
          backupBranchName,
        },
      })

      // Animate server-returned steps
      for (const serverStep of res.steps) {
        const clientId = serverStep.id === 'push' ? 'push' :
                         serverStep.id === 'commit' ? 'commit' :
                         serverStep.id === 'verify2' ? 'verify2' :
                         serverStep.id === 'tree' ? 'tree' : 'verify'

        if (serverStep.status === 'ok') {
          updateStep(clientId, { status: 'ok', detail: serverStep.detail })
        } else {
          updateStep(clientId, { status: 'error', detail: serverStep.detail })
        }
        await sleep(350)

        // Mark next step as running
        const idx = resetStepIds.indexOf(clientId)
        if (idx >= 0 && idx < resetStepIds.length - 1) {
          updateStep(resetStepIds[idx + 1], { status: 'running' })
          await sleep(150)
        }
      }

      if (!res.success) throw new Error(res.error ?? 'Reset failed')

      setResult(res)
      setPhase('done')
    } catch (e: any) {
      setRunError(e.message)
      setPhase('done')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* ── Warning banner ───────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25">
          <span className="text-amber-400 text-base shrink-0 mt-0.5">⚠</span>
          <div>
            <p className="text-amber-300 text-xs font-semibold">Destructive operation</p>
            <p className="text-amber-500/80 text-[11px] mt-0.5 leading-relaxed">
              This permanently removes all previous commit history from the repository.
              Current project files are preserved exactly — only the Git history is reset.
              Anyone who has cloned the repository will need to re-clone or re-sync.
            </p>
          </div>
        </div>
      )}

      {/* ── Repository info card ─────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="rounded-2xl bg-[#0D1117] border border-white/6 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-sm">
                🗂
              </div>
              <div>
                <p className="text-white text-sm font-semibold font-['Space_Grotesk']">Repository Information</p>
                <p className="text-gray-600 text-[10px]">Current state from GitHub</p>
              </div>
            </div>
            <button
              onClick={loadInfo}
              disabled={loadingInfo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/10 hover:bg-white/3 transition-all disabled:opacity-40"
            >
              <span className={loadingInfo ? 'animate-spin' : ''}>↻</span>
              Refresh
            </button>
          </div>

          {loadingInfo ? (
            <div className="px-5 py-8 flex items-center justify-center gap-3">
              <span className="text-2xl animate-spin">⟳</span>
              <span className="text-gray-600 text-xs">Loading repository data…</span>
            </div>
          ) : repoInfo ? (
            <div className="px-5 py-1">
              <InfoRow label="Remote repository" value={repoInfo.remoteUrl} />
              <InfoRow label="Current branch" value={repoInfo.branch} mono />
              <InfoRow label="Total commits" value={repoInfo.commitCount > 0 ? repoInfo.commitCount.toLocaleString() : '—'} mono />
              <InfoRow label="HEAD commit" value={repoInfo.headShort} mono />
              <InfoRow label="Last commit message" value={repoInfo.lastMessage} />
              <InfoRow label="Last commit date" value={repoInfo.lastDate ? `${formatDate(repoInfo.lastDate)} (${timeAgo(repoInfo.lastDate)})` : '—'} />
              <InfoRow label="Last commit author" value={repoInfo.lastAuthor} />
              <InfoRow label="Repository" value={`${repoInfo.owner}/${repoInfo.repo}`} mono />
            </div>
          ) : (
            <div className="px-5 py-6 text-center text-gray-600 text-xs">
              Could not load repository information
            </div>
          )}
        </div>
      )}

      {/* ── Safety checks ────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="rounded-2xl bg-[#0D1117] border border-white/6 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-sm">
              🔒
            </div>
            <div>
              <p className="text-white text-sm font-semibold font-['Space_Grotesk']">Safety Checks</p>
              <p className="text-gray-600 text-[10px]">All must pass before reset is allowed</p>
            </div>
            {!loadingInfo && (
              <span className={`ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                allChecksPassed
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {allChecksPassed ? 'All passed' : `${safetyChecks.filter(c => !c.ok).length} failed`}
              </span>
            )}
          </div>
          <div className="p-4 space-y-2">
            {safetyChecks.map(check => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>
        </div>
      )}

      {/* ── Reset action card ─────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="rounded-2xl bg-[#0D1117] border border-white/6 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-sm">
              🔄
            </div>
            <div>
              <p className="text-white text-sm font-semibold font-['Space_Grotesk']">Reset History</p>
              <p className="text-gray-600 text-[10px]">Configure and initiate the history reset</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Initial commit message */}
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-medium">Initial commit message</label>
              <input
                type="text"
                value={commitMsg}
                onChange={e => setCommitMsg(e.target.value)}
                placeholder="Initial commit"
                className="w-full px-3 py-2.5 rounded-xl bg-white/3 border border-white/8 text-white text-xs font-mono focus:outline-none focus:border-[#00BFFF]/40 focus:bg-white/5 transition-all placeholder-gray-700"
              />
            </div>

            {/* Backup option */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                createBackup
                  ? 'bg-[#00BFFF]/15 border-[#00BFFF]/40 text-[#00BFFF]'
                  : 'bg-white/3 border-white/10 text-transparent'
              }`}
                onClick={() => setCreateBackup(v => !v)}
              >
                <span className="text-[10px] font-bold">✓</span>
              </div>
              <div onClick={() => setCreateBackup(v => !v)}>
                <p className="text-white text-xs font-medium">Create backup branch before reset</p>
                <p className="text-gray-600 text-[10px] mt-0.5 leading-relaxed">
                  Pushes a branch named{' '}
                  <span className="font-mono text-gray-500">backup-history-{makeTimestamp()}</span>{' '}
                  to GitHub before erasing history. Recommended.
                </p>
              </div>
            </label>

            {/* Reset button */}
            <div className="pt-1">
              <button
                onClick={() => setPhase('confirming')}
                disabled={!allChecksPassed}
                className={`w-full py-3 rounded-xl text-sm font-bold font-['Space_Grotesk'] transition-all ${
                  allChecksPassed
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:border-red-500/50 hover:text-red-300'
                    : 'bg-white/3 border border-white/5 text-gray-700 cursor-not-allowed'
                }`}
              >
                {allChecksPassed ? '⚠ Reset Repository History' : 'Complete safety checks to continue'}
              </button>
              {!allChecksPassed && !loadingInfo && (
                <p className="text-center text-gray-700 text-[10px] mt-2">
                  {safetyChecks.filter(c => !c.ok).map(c => c.label).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Progress view ─────────────────────────────────────────────────── */}
      {(phase === 'running' || phase === 'done') && (
        <div className="rounded-2xl bg-[#0D1117] border border-white/6 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${
              phase === 'running' ? 'bg-[#00BFFF]/10 border border-[#00BFFF]/20' :
              result?.success ? 'bg-green-500/10 border border-green-500/20' :
              'bg-red-500/10 border border-red-500/20'
            }`}>
              {phase === 'running' ? '⟳' : result?.success ? '✓' : '✗'}
            </div>
            <div>
              <p className="text-white text-sm font-semibold font-['Space_Grotesk']">
                {phase === 'running' ? 'Resetting History…' :
                 result?.success ? 'Reset Complete' : 'Reset Failed'}
              </p>
              <p className="text-gray-600 text-[10px]">
                {phase === 'running' ? 'Do not close this page' : 'Operation finished'}
              </p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {steps.map((step, i) => (
              <StepRow key={step.id} step={step} index={i} />
            ))}
          </div>

          {/* Error message */}
          {phase === 'done' && runError && (
            <div className="mx-5 mb-5 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
              <p className="text-red-400 text-xs font-semibold mb-1">Error</p>
              <p className="text-red-500/80 text-[11px] font-mono leading-relaxed">{runError}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Summary card ──────────────────────────────────────────────────── */}
      {phase === 'done' && result?.success && (
        <div className="rounded-2xl bg-[#0D1117] border border-green-500/20 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-sm">
              📊
            </div>
            <p className="text-white text-sm font-semibold font-['Space_Grotesk']">Reset Summary</p>
          </div>
          <div className="px-5 py-1">
            <InfoRow label="Old commit count"   value={result.oldCommitCount.toLocaleString()} mono />
            <InfoRow label="New commit count"   value="1" mono />
            <InfoRow label="New HEAD commit"    value={result.newCommitShort} mono />
            <InfoRow label="Branch"             value={result.branch} mono />
            {result.backupBranch && (
              <InfoRow label="Backup branch"    value={result.backupBranch} mono />
            )}
            <InfoRow label="Push status"        value="Force-pushed successfully" />
            <InfoRow label="Synchronization"    value="GitHub remote matches local" />
          </div>
          <div className="px-5 pb-5 pt-3">
            <button
              onClick={() => { setPhase('idle'); setResult(null); setRunError(null); loadInfo() }}
              className="w-full py-2.5 rounded-xl text-xs text-gray-400 border border-white/8 hover:text-white hover:border-white/15 hover:bg-white/3 transition-all"
            >
              ← Back to Repository Management
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && !result?.success && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => { setPhase('idle'); setRunError(null) }}
            className="px-6 py-2.5 rounded-xl text-xs text-gray-400 border border-white/8 hover:text-white hover:border-white/15 hover:bg-white/3 transition-all"
          >
            ← Back to Repository Management
          </button>
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────────────────────── */}
      {phase === 'confirming' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0D1117] border border-white/10 shadow-2xl overflow-hidden animate-[fadeInUp_0.2s_ease_both]">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-lg">
                  ⚠
                </div>
                <div>
                  <h2 className="text-white font-['Space_Grotesk'] font-bold text-base">Confirm History Reset</h2>
                  <p className="text-gray-600 text-[10px] mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Consequences */}
            <div className="px-6 py-5 space-y-2.5">
              {[
                'All previous commit history will be permanently removed from the selected branch',
                'Current project files will remain exactly as they are',
                'Repository size and commit history will be reset to a single commit',
                'This operation force-pushes the branch to GitHub',
                'Anyone who has cloned the repository will need to re-clone or re-sync',
              ].map((line, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-red-500 text-xs shrink-0 mt-0.5">•</span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">{line}</p>
                </div>
              ))}

              {createBackup && (
                <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                  <span className="text-green-400 text-xs shrink-0 mt-0.5">✓</span>
                  <p className="text-green-400/80 text-[11px] leading-relaxed">
                    A backup branch will be created before the reset so you can restore if needed.
                  </p>
                </div>
              )}

              <div className="pt-1">
                <p className="text-gray-500 text-[10px]">
                  Commit message: <span className="font-mono text-gray-400">"{commitMsg || 'Initial commit'}"</span>
                </p>
                {repoInfo && (
                  <p className="text-gray-500 text-[10px] mt-0.5">
                    Removing <span className="text-amber-400 font-semibold">{repoInfo.commitCount.toLocaleString()} commits</span> from <span className="font-mono">{repoInfo.branch}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setPhase('idle')}
                className="flex-1 py-2.5 rounded-xl text-xs text-gray-400 border border-white/8 hover:text-white hover:border-white/15 hover:bg-white/3 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={runReset}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:border-red-500/50 hover:text-red-300 transition-all"
              >
                Yes, Reset History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
