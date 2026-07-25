// ─── Repository History Management — server-only ─────────────────────────────
// Uses the GitHub Git Data API to inspect and reset repository commit history.
// Never exposes GITHUB_TOKEN to the client.

import { createServerFn } from '@tanstack/react-start'
import { resolveGitHubToken } from './tokenStore'

const OWNER  = 'peepeepopo91-svg'
const REPO   = 'rupa'
const BRANCH = 'main'
const BASE   = 'https://api.github.com'

function getToken(): string {
  const token = resolveGitHubToken()
  if (!token) throw new Error('GITHUB_TOKEN secret is not configured')
  return token
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function ghFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: buildHeaders() })
  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new Error(`GitHub API ${res.status} on ${path}: ${body}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function ghFetchRaw(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { headers: buildHeaders() })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RepoInfo {
  owner: string
  repo: string
  branch: string
  remoteUrl: string
  commitCount: number
  headSha: string
  headShort: string
  lastMessage: string
  lastDate: string
  lastAuthor: string
  treeSha: string
  authAvailable: boolean
  repoAccessible: boolean
  errorMessage?: string
}

export interface BackupResult {
  success: boolean
  branchName: string
  sha: string
  error?: string
}

export interface ResetStep {
  id: string
  label: string
  status: 'ok' | 'error'
  detail?: string
}

export interface ResetResult {
  success: boolean
  steps: ResetStep[]
  oldCommitCount: number
  newCommitSha: string
  newCommitShort: string
  branch: string
  backupBranch?: string
  error?: string
}

// ─── Server Functions ─────────────────────────────────────────────────────────

/** Fetch current repository information from GitHub. */
export const getRepoInfo = createServerFn({ method: 'GET' }).handler(async (): Promise<RepoInfo> => {
  const token = resolveGitHubToken()
  const base = { owner: OWNER, repo: REPO, branch: BRANCH, remoteUrl: `https://github.com/${OWNER}/${REPO}` }

  if (!token) {
    return { ...base, commitCount: 0, headSha: '', headShort: '', lastMessage: '', lastDate: '', lastAuthor: '', treeSha: '', authAvailable: false, repoAccessible: false }
  }

  try {
    // HEAD commit info
    const headData = await ghFetch(`/repos/${OWNER}/${REPO}/commits/${BRANCH}`)
    const headSha: string = headData.sha
    const treeSha: string = headData.commit.tree.sha

    // Commit count via Link header pagination trick
    const countRes = await ghFetchRaw(`/repos/${OWNER}/${REPO}/commits?sha=${BRANCH}&per_page=1`)
    let commitCount = 1
    if (countRes.ok) {
      const link = countRes.headers.get('Link') || ''
      const m = link.match(/[?&]page=(\d+)>; rel="last"/)
      if (m) commitCount = parseInt(m[1], 10)
    }

    // Repo metadata for URL
    const repoData = await ghFetch(`/repos/${OWNER}/${REPO}`)

    return {
      owner: OWNER,
      repo: REPO,
      branch: BRANCH,
      remoteUrl: repoData.html_url ?? `https://github.com/${OWNER}/${REPO}`,
      commitCount,
      headSha,
      headShort: headSha.slice(0, 7),
      lastMessage: headData.commit.message.split('\n')[0],
      lastDate: headData.commit.author.date,
      lastAuthor: headData.commit.author.name,
      treeSha,
      authAvailable: true,
      repoAccessible: true,
    }
  } catch (e: any) {
    return {
      ...base,
      commitCount: 0, headSha: '', headShort: '', lastMessage: '', lastDate: '',
      lastAuthor: '', treeSha: '',
      authAvailable: true,
      repoAccessible: false,
      errorMessage: e.message,
    }
  }
})

/** Create a backup branch pointing to the current HEAD before a history reset. */
export const createBackupBranch = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => data as { timestamp: string })
  .handler(async ({ data }): Promise<BackupResult> => {
    const branchName = `backup-history-${data.timestamp}`
    try {
      const ref = await ghFetch(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`)
      const sha: string = ref.object.sha

      await ghFetch(`/repos/${OWNER}/${REPO}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
      })
      return { success: true, branchName, sha: sha.slice(0, 7) }
    } catch (e: any) {
      return { success: false, branchName, sha: '', error: e.message }
    }
  })

/**
 * Reset the repository history to a single fresh commit.
 * Creates an orphan commit (no parents) containing the current file tree
 * and force-updates the branch ref to point to it.
 * All project files are preserved — only history is removed.
 */
export const performHistoryReset = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => data as { commitMessage: string; oldCommitCount: number; backupBranchName?: string })
  .handler(async ({ data }): Promise<ResetResult> => {
    const steps: ResetStep[] = []

    try {
      // Step 1 — Verify repository state
      const ref = await ghFetch(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`)
      const currentSha: string = ref.object.sha
      steps.push({ id: 'verify', label: 'Repository state verified', status: 'ok', detail: `HEAD: ${currentSha.slice(0, 7)}` })

      // Step 2 — Capture current file tree
      const headCommit = await ghFetch(`/repos/${OWNER}/${REPO}/git/commits/${currentSha}`)
      const treeSha: string = headCommit.tree.sha
      steps.push({ id: 'tree', label: 'Current file tree captured', status: 'ok', detail: `Tree: ${treeSha.slice(0, 7)}` })

      // Step 3 — Create orphan commit (parents: [])
      const newCommit = await ghFetch(`/repos/${OWNER}/${REPO}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message: data.commitMessage,
          tree: treeSha,
          parents: [],
        }),
      })
      const newSha: string = newCommit.sha
      steps.push({ id: 'commit', label: 'New initial commit created', status: 'ok', detail: `SHA: ${newSha.slice(0, 7)}` })

      // Step 4 — Force-update branch ref
      await ghFetch(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: newSha, force: true }),
      })
      steps.push({ id: 'push', label: `Force pushed to ${BRANCH}`, status: 'ok', detail: `${currentSha.slice(0, 7)} → ${newSha.slice(0, 7)}` })

      // Step 5 — Verify sync
      const verifyRef = await ghFetch(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`)
      const verifiedSha: string = verifyRef.object.sha
      if (verifiedSha !== newSha) throw new Error(`Verification mismatch: expected ${newSha.slice(0, 7)}, got ${verifiedSha.slice(0, 7)}`)
      steps.push({ id: 'verify2', label: 'Synchronization verified', status: 'ok', detail: `Remote HEAD: ${verifiedSha.slice(0, 7)}` })

      return {
        success: true,
        steps,
        oldCommitCount: data.oldCommitCount,
        newCommitSha: newSha,
        newCommitShort: newSha.slice(0, 7),
        branch: BRANCH,
        backupBranch: data.backupBranchName,
      }
    } catch (e: any) {
      steps.push({ id: 'error', label: 'Operation failed', status: 'error', detail: e.message })
      return {
        success: false,
        steps,
        oldCommitCount: data.oldCommitCount,
        newCommitSha: '',
        newCommitShort: '',
        branch: BRANCH,
        error: e.message,
      }
    }
  })
