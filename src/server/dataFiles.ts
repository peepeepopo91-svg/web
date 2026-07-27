// ─── Data File Persistence — Server Functions ─────────────────────────────────
// Reads/writes JSON files from the `data/` directory at project root.
// On save: validates → normalises (players) → commits to GitHub → writes atomically.

import { createServerFn } from '@tanstack/react-start'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import { getRepoStatus, commitFiles } from './github'
import { resolveTokenSource, persistToken, eraseToken } from './tokenStore'
import { readRepoConfig } from './repoConfigUtil'
import {
  markAlreadyCommitted,
  setBackupEnabled,
  getBackupStatus as _getBackupStatus,
  setDebounceMs,
  flushBackupNow,
  type BackupStatus,
} from './miningBackup'
import type { Player } from '../data/players'
import type { Gamemode } from '../data/gamemodes'
import type { EventConfig } from '../data/event'
import type { SiteContent } from '../store/contentStore'
import type { EconomyOverrides } from '../store/miningStore'
import type { HomepageConfig } from '../store/homepageStore'

const DATA_DIR = resolve(process.cwd(), 'data')

const BASE = 'https://api.github.com'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Detects Git merge conflict markers at start of any line */
const CONFLICT_RE = /^(<{7}|={7}|>{7})/m

const RANK_KEYS = ['mace', 'sword', 'axe', 'uhc', 'nethpot', 'diapot', 'crystal'] as const

const VALID_TIERS = new Set([
  'HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5',
  'None','NONE','none',
])

const VALID_REGIONS = new Set([
  'North America','South America','Europe','Asia','Oceania','Africa','Middle East',
])

// ─── Player normalisation helpers ─────────────────────────────────────────────

export function normalizePlayer(p: any): Player {
  const name   = typeof p?.name   === 'string' ? p.name.trim()   : ''
  const rawHead = typeof p?.head  === 'string' ? p.head.trim()   : ''
  const head   = rawHead || `https://mc-heads.net/avatar/${encodeURIComponent(name)}`
  const region = VALID_REGIONS.has(p?.region) ? p.region : 'North America'

  const ranks: Record<string, string> = {}
  // Preserve custom gamemode keys configured in data/gamemodes.json.
  // The admin panel can edit these modes (for example, "dismp"), but
  // restricting normalization to RANK_KEYS silently removed them on save.
  for (const [key, rawVal] of Object.entries(p?.ranks ?? {})) {
    if (typeof rawVal !== 'string' || !VALID_TIERS.has(rawVal)) continue
    ranks[key] = rawVal.toUpperCase() === 'NONE' ? 'NONE' : rawVal
  }
  for (const key of RANK_KEYS) {
    const val = p?.ranks?.[key]
    if (typeof val === 'string' && VALID_TIERS.has(val) && val.toUpperCase() !== 'NONE') {
      ranks[key] = val
    } else {
      ranks[key] = 'NONE'
    }
  }
  return { name, head, region, ranks } as Player
}

export function deduplicateAndSort(players: Player[]): Player[] {
  const seen = new Map<string, Player>()
  for (const p of players) {
    const key = p.name.toLowerCase()
    if (!seen.has(key)) seen.set(key, p)
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function findDuplicateNames(players: any[]): string[] {
  const names  = players.map(p => String(p?.name ?? '').toLowerCase())
  const dupes  = names.filter((n, i) => names.indexOf(n) !== i)
  return [...new Set(dupes)]
}

// ─── File I/O helpers ─────────────────────────────────────────────────────────

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8')) as T
  } catch {
    return null
  }
}

function readRaw(file: string): string | null {
  try {
    return readFileSync(resolve(DATA_DIR, file), 'utf8')
  } catch {
    return null
  }
}

/**
 * Atomic write: serialises → validates round-trip → writes .tmp → renames.
 * Never partially overwrites the target file.
 */
function atomicWriteJson(file: string, data: unknown): string {
  mkdirSync(DATA_DIR, { recursive: true })
  const content = JSON.stringify(data, null, 2)
  // Validate before touching disk
  JSON.parse(content)
  const target = resolve(DATA_DIR, file)
  const tmp    = `${target}.tmp`
  writeFileSync(tmp, content, 'utf8')
  // Double-check the written bytes
  JSON.parse(readFileSync(tmp, 'utf8'))
  renameSync(tmp, target)
  return content
}

// ─── Load all canonical data from disk ───────────────────────────────────────

export const loadAllData = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    players:     readJson<Player[]>('players.json'),
    gamemodes:   readJson<Gamemode[]>('gamemodes.json'),
    content:     readJson<SiteContent>('content.json'),
    event:       readJson<EventConfig>('event.json'),
    economy:     readJson<EconomyOverrides>('economy.json'),
    homepage:    readJson<HomepageConfig>('homepage.json'),
    tierTagger:  readJson<unknown>('tier-tagger.json'),
  }
})

// ─── Section → file map ───────────────────────────────────────────────────────

export type SectionKey = 'players' | 'gamemodes' | 'content' | 'event' | 'economy' | 'homepage' | 'tier-tagger'

const FILE_MAP: Record<SectionKey, { file: string; repoPath: string }> = {
  players:      { file: 'players.json',      repoPath: 'data/players.json'      },
  gamemodes:    { file: 'gamemodes.json',    repoPath: 'data/gamemodes.json'    },
  content:      { file: 'content.json',      repoPath: 'data/content.json'      },
  event:        { file: 'event.json',        repoPath: 'data/event.json'        },
  economy:      { file: 'economy.json',      repoPath: 'data/economy.json'      },
  homepage:     { file: 'homepage.json',     repoPath: 'data/homepage.json'     },
  'tier-tagger':{ file: 'tier-tagger.json',  repoPath: 'data/tier-tagger.json'  },
}

// ─── Flush in-memory sections to disk (no GitHub API) ────────────────────────
// Used by GitDiagnosticsPanel before running git sync, to ensure
// any dirty React store data is written to disk before git commit/push.

export const flushStoresToDisk = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      sections: z.array(
        z.object({
          section:  z.enum(['players', 'gamemodes', 'content', 'event', 'economy', 'homepage', 'tier-tagger']),
          jsonData: z.string(),
        }),
      ),
    }),
  )
  .handler(async ({ data: { sections } }): Promise<{ success: boolean; written: string[] }> => {
    const written: string[] = []

    for (const { section, jsonData } of sections) {
      // Reject merge-conflict markers
      if (CONFLICT_RE.test(jsonData)) {
        throw new Error(`CONFLICT_ERROR: Merge conflict markers found in ${section}`)
      }

      // Validate JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(jsonData)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(`VALIDATE_ERROR: Invalid JSON in ${section} — ${msg}`)
      }

      // Normalize players (dedup + sort + schema normalise)
      if (section === 'players' && Array.isArray(parsed)) {
        parsed = deduplicateAndSort((parsed as any[]).map(normalizePlayer))
      }

      const { file } = FILE_MAP[section]
      atomicWriteJson(file, parsed)
      written.push(file)
    }

    // Verification pass — confirm all written files can be read back
    for (const file of written) {
      const verify = readJson(file)
      if (verify === null) {
        throw new Error(`WRITE_ERROR: Disk-write verification failed for ${file}`)
      }
    }

    return { success: true, written }
  })

// ─── GitHub helpers ───────────────────────────────────────────────────────────

function buildGHHeaders(token: string): Record<string, string> {
  return {
    Authorization:          `Bearer ${token}`,
    Accept:                 'application/vnd.github+json',
    'Content-Type':         'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function ghFetch(token: string, path: string, opts?: RequestInit): Promise<any> {
  const res  = await fetch(`${BASE}${path}`, { ...opts, headers: buildGHHeaders(token) })
  const body = await res.text()

  if (!res.ok) {
    let msg = body
    try { msg = (JSON.parse(body) as { message?: string }).message ?? body } catch { /* raw */ }

    if (res.status === 401 || res.status === 403) throw new Error(`AUTH_ERROR: ${msg}`)
    if (res.status === 404 && path.includes('/repos/')) throw new Error(`REPO_ERROR: Repository not found — ${msg}`)
    if (path.includes('/git/blobs'))  throw new Error(`BLOB_ERROR: ${msg}`)
    if (path.includes('/git/trees'))  throw new Error(`TREE_ERROR: ${msg}`)
    if (path.includes('/git/commits') && opts?.method === 'POST') throw new Error(`COMMIT_ERROR: ${msg}`)
    if (path.includes('/git/refs/heads') && opts?.method === 'PATCH') {
      // 422 = "Update is not a fast forward" — caller handles auto-rebase
      throw new Error(`REF_ERROR[${res.status}]: ${msg}`)
    }
    if (path.includes('/git/refs') || (path.includes('/git/commits') && !opts?.method)) {
      throw new Error(`SHA_ERROR: ${msg}`)
    }
    throw new Error(`UPLOAD_ERROR: GitHub API ${res.status}: ${msg}`)
  }

  return JSON.parse(body)
}

// Fetch file content from GitHub (base64-encoded via Contents API)
async function fetchRemoteFile(token: string, repoPath: string): Promise<string | null> {
  try {
    const { owner, repo, branch } = readRepoConfig()
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${repoPath}?ref=${branch}`,
      { headers: buildGHHeaders(token) },
    )
    if (!res.ok) return null
    const data = await res.json() as { content?: string }
    if (!data.content) return null
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8')
  } catch {
    return null
  }
}


// ─── Repo status ──────────────────────────────────────────────────────────────

export const fetchRepoStatus = createServerFn({ method: 'GET' }).handler(async () => {
  return getRepoStatus()
})

// ─── Validate all data files ──────────────────────────────────────────────────

export interface FileValidation {
  file:              string
  section:           string
  jsonValid:         boolean
  hasMergeConflicts: boolean
  playerCount?:      number
  duplicates?:       string[]
  missingFields?:    string[]
  missingRegions?:   string[]
  invalidRanks?:     string[]
  error?:            string
}

export interface ValidationReport {
  files:          FileValidation[]
  hasGitHubToken: boolean
  repoReachable:  boolean
  branchExists:   boolean
  totalIssues:    number
}

export const validateAllData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ValidationReport> => {
    const results: FileValidation[] = []

    for (const [section, { file }] of Object.entries(FILE_MAP)) {
      const raw = readRaw(file)
      if (raw === null) {
        results.push({ file, section, jsonValid: false, hasMergeConflicts: false, error: 'File not found or unreadable' })
        continue
      }

      // Check merge markers
      const hasMergeConflicts = CONFLICT_RE.test(raw)
      if (hasMergeConflicts) {
        results.push({ file, section, jsonValid: false, hasMergeConflicts: true, error: 'Merge conflict markers detected' })
        continue
      }

      // Parse JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch (e) {
        results.push({ file, section, jsonValid: false, hasMergeConflicts: false, error: `Invalid JSON: ${e}` })
        continue
      }

      if (section !== 'players') {
        results.push({ file, section, jsonValid: true, hasMergeConflicts: false })
        continue
      }

      // Players-specific checks
      if (!Array.isArray(parsed)) {
        results.push({ file, section, jsonValid: false, hasMergeConflicts: false, error: 'players.json is not an array' })
        continue
      }
      const players = parsed as any[]

      const duplicates    = findDuplicateNames(players)
      const missingFields = players
        .filter(p => !p?.name || !p?.head || !p?.region || !p?.ranks)
        .map(p => p?.name || '(unnamed)')
      const missingRegions = players
        .filter(p => !VALID_REGIONS.has(p?.region))
        .map(p => p?.name || '(unnamed)')
      const invalidRanks = players
        .filter(p => p?.ranks && RANK_KEYS.some(k => {
          const v = p.ranks[k]
          return typeof v === 'string' && !VALID_TIERS.has(v)
        }))
        .map(p => p?.name || '(unnamed)')

      results.push({
        file, section,
        jsonValid:    true,
        hasMergeConflicts: false,
        playerCount:  players.length,
        duplicates,
        missingFields,
        missingRegions,
        invalidRanks,
      })
    }

    // GitHub token
    const _resolved      = resolveTokenSource()
    const hasGitHubToken = !!_resolved

    // Repo reachability
    let repoReachable = false
    let branchExists  = false
    if (_resolved) {
      const { owner, repo, branch } = readRepoConfig()
      try {
        const repoRes = await fetch(`${BASE}/repos/${owner}/${repo}`, {
          headers: buildGHHeaders(_resolved.token),
        })
        repoReachable = repoRes.ok
        if (repoReachable) {
          const branchRes = await fetch(
            `${BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
            { headers: buildGHHeaders(_resolved.token) },
          )
          branchExists = branchRes.ok
        }
      } catch { /* offline */ }
    }

    const totalIssues = results.reduce((sum, r) => {
      let n = 0
      if (!r.jsonValid)           n++
      if (r.hasMergeConflicts)    n++
      if (r.duplicates?.length)   n += r.duplicates.length
      if (r.missingFields?.length) n += r.missingFields.length
      if (r.missingRegions?.length) n += r.missingRegions.length
      if (r.invalidRanks?.length) n += r.invalidRanks.length
      return sum + n
    }, 0)

    return { files: results, hasGitHubToken, repoReachable, branchExists, totalIssues }
  },
)

// ─── GitHub connection check ──────────────────────────────────────────────────

export interface ConnectionChecks {
  tokenExists:     boolean
  apiAccessible:   boolean
  repoExists:      boolean
  branchExists:    boolean
  writePermission: boolean
  username:        string | null
  rateLimit:       { remaining: number; limit: number } | null
}

export const checkGitHubConnection = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ConnectionChecks> => {
    const token = resolveTokenSource()?.token ?? null
    const out: ConnectionChecks = {
      tokenExists: !!token,
      apiAccessible: false,
      repoExists: false,
      branchExists: false,
      writePermission: false,
      username: null,
      rateLimit: null,
    }
    if (!token) return out

    // User + rate limit
    try {
      const userRes = await fetch(`${BASE}/user`, { headers: buildGHHeaders(token) })
      if (userRes.ok) {
        out.apiAccessible = true
        const user = await userRes.json() as { login: string }
        out.username = user.login
        const rem  = Number(userRes.headers.get('x-ratelimit-remaining') ?? '-1')
        const lim  = Number(userRes.headers.get('x-ratelimit-limit')     ?? '-1')
        if (rem >= 0) out.rateLimit = { remaining: rem, limit: lim }
      }
    } catch { /* offline */ }

    // Repo
    const { owner: cfgOwner, repo: cfgRepo, branch: cfgBranch } = readRepoConfig()
    try {
      const repoRes = await fetch(`${BASE}/repos/${cfgOwner}/${cfgRepo}`, { headers: buildGHHeaders(token) })
      if (repoRes.ok) {
        out.repoExists = true
        const repoData = await repoRes.json() as { permissions?: { push?: boolean } }
        out.writePermission = repoData.permissions?.push ?? false
      }
    } catch { /* */ }

    // Branch
    if (out.repoExists) {
      try {
        const brRes = await fetch(
          `${BASE}/repos/${cfgOwner}/${cfgRepo}/git/refs/heads/${cfgBranch}`,
          { headers: buildGHHeaders(token) },
        )
        out.branchExists = brRes.ok
      } catch { /* */ }
    }

    return out
  },
)

// ─── Token info (safe — never returns the raw token to the client) ─────────────

export interface TokenInfo {
  configured:   boolean
  source:       'env' | 'file' | null   // 'env' = Replit Secret, 'file' = saved via panel
  maskedToken:  string | null            // e.g. "ghp_…abc4"
  valid:        boolean
  invalid:      boolean
  username:     string | null
  avatarUrl:    string | null
  name:         string | null
  scopes:       string | null            // comma-separated, e.g. "repo, workflow"
  hasRepoScope: boolean
  rateLimit:    { remaining: number; limit: number } | null
}

export const getTokenInfo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<TokenInfo> => {
    const resolved = resolveTokenSource()
    const blank: TokenInfo = {
      configured: false, source: null, maskedToken: null,
      valid: false, invalid: false, username: null, avatarUrl: null, name: null,
      scopes: null, hasRepoScope: false, rateLimit: null,
    }
    if (!resolved) return blank

    const { token, source } = resolved
    const masked = `${token.slice(0, 6)}…${token.slice(-4)}`
    try {
      const res = await fetch(`${BASE}/user`, { headers: buildGHHeaders(token) })
      if (!res.ok) {
        return { ...blank, configured: true, source, maskedToken: masked, invalid: true }
      }
      const user = await res.json() as { login: string; avatar_url: string; name?: string }
      const scopes = res.headers.get('x-oauth-scopes') ?? null
      const rem    = Number(res.headers.get('x-ratelimit-remaining') ?? '-1')
      const lim    = Number(res.headers.get('x-ratelimit-limit')     ?? '-1')
      const hasRepoScope = (scopes ?? '').split(',').map(s => s.trim())
        .some(s => s === 'repo' || s === 'public_repo')
      return {
        configured: true, source, maskedToken: masked,
        valid: true, invalid: false,
        username: user.login, avatarUrl: user.avatar_url, name: user.name ?? null,
        scopes, hasRepoScope,
        rateLimit: rem >= 0 ? { remaining: rem, limit: lim } : null,
      }
    } catch {
      return { ...blank, configured: true, source, maskedToken: masked }
    }
  },
)

// ─── Test a token without saving it ──────────────────────────────────────────

export interface TokenTestResult {
  valid:        boolean
  error:        string | null
  username:     string | null
  avatarUrl:    string | null
  name:         string | null
  scopes:       string | null
  hasRepoScope: boolean
  rateLimit:    { remaining: number; limit: number } | null
}

export const testGitHubToken = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<TokenTestResult> => {
    const token = data.token.trim()
    const blank: TokenTestResult = {
      valid: false, error: null, username: null, avatarUrl: null,
      name: null, scopes: null, hasRepoScope: false, rateLimit: null,
    }
    try {
      const res = await fetch(`${BASE}/user`, { headers: buildGHHeaders(token) })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        let msg = `GitHub rejected the token (HTTP ${res.status})`
        try { msg = (JSON.parse(body) as { message?: string }).message ?? msg } catch { /* ok */ }
        return { ...blank, error: msg }
      }
      const user = await res.json() as { login: string; avatar_url: string; name?: string }
      const scopes = res.headers.get('x-oauth-scopes') ?? null
      const rem    = Number(res.headers.get('x-ratelimit-remaining') ?? '-1')
      const lim    = Number(res.headers.get('x-ratelimit-limit')     ?? '-1')
      const hasRepoScope = (scopes ?? '').split(',').map(s => s.trim())
        .some(s => s === 'repo' || s === 'public_repo')
      return {
        valid: true, error: null,
        username: user.login, avatarUrl: user.avatar_url, name: user.name ?? null,
        scopes, hasRepoScope,
        rateLimit: rem >= 0 ? { remaining: rem, limit: lim } : null,
      }
    } catch (e) {
      return { ...blank, error: e instanceof Error ? e.message : 'Network error' }
    }
  })

// ─── Save GitHub token to .github-token.json (+ process.env for immediate use) ─

export const saveGitHubToken = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    persistToken(data.token.trim())
    return { success: true }
  })

// ─── Clear panel-saved token ──────────────────────────────────────────────────

export const clearGitHubToken = createServerFn({ method: 'POST' }).handler(async () => {
  const wasInFile = eraseToken()
  return { success: true, wasInFile }
})

// ─── Fetch commit history from GitHub ────────────────────────────────────────

export interface CommitEntry {
  sha:      string
  shortSha: string
  message:  string
  date:     string
  author:   string
}

export const fetchCommitHistory = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CommitEntry[]> => {
    const token = resolveTokenSource()?.token
    if (!token) throw new Error('AUTH_ERROR: GITHUB_TOKEN not configured')
    const { owner, repo, branch } = readRepoConfig()
    const list = await ghFetch(token, `/repos/${owner}/${repo}/commits?sha=${branch}&per_page=30`)
    return (list as any[]).map(c => ({
      sha:      c.sha as string,
      shortSha: (c.sha as string).slice(0, 7),
      message:  (c.commit.message as string).split('\n')[0],
      date:     c.commit.author.date as string,
      author:   c.commit.author.name as string,
    }))
  },
)

// ─── Restore to a previous commit (creates a new "revert" commit) ─────────────

export const restoreToCommit = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ sha: z.string().min(7), message: z.string().optional() }))
  .handler(async ({ data }) => {
    const token = resolveTokenSource()?.token
    if (!token) throw new Error('AUTH_ERROR: GITHUB_TOKEN not configured')

    // Resolve full SHA if short
    const { owner, repo, branch } = readRepoConfig()
    const targetCommit  = await ghFetch(token, `/repos/${owner}/${repo}/git/commits/${data.sha}`)
    const targetTreeSha = targetCommit.tree.sha as string

    const ref      = await ghFetch(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`)
    const headSha  = ref.object.sha as string

    const message = data.message ?? `Revert to ${(data.sha as string).slice(0, 7)}`

    const newCommit = await ghFetch(token, `/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      body:   JSON.stringify({ message, tree: targetTreeSha, parents: [headSha] }),
    })

    await ghFetch(token, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body:   JSON.stringify({ sha: newCommit.sha }),
    })

    return {
      success:  true,
      sha:      newCommit.sha as string,
      shortSha: (newCommit.sha as string).slice(0, 7),
    }
  })

// ─── Git Diagnostics — real git status vs remote ──────────────────────────────

export interface GitJsonCheck {
  file: string
  ok: boolean
  error?: string
}

export interface GitDiagnostics {
  branch:       string
  headSha:      string
  ahead:        number
  behind:       number
  isDiverged:   boolean
  modified:     number
  untracked:    number
  deleted:      number
  totalPending: number
  statusLines:  string[]
  jsonChecks:   GitJsonCheck[]
  fetchError?:  string
  gitError?:    string
  /** true when running in a deployed env with no local .git — sync uses GitHub API instead */
  apiMode?:     boolean
}

export const getGitDiagnostics = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GitDiagnostics> => {
    const { spawnSync } = await import('node:child_process')
    const cwd = process.cwd()

    // Non-interactive env: prevent git from ever blocking on credential prompts
    const ghToken = resolveTokenSource()?.token ?? ''
    const gitEnv: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][],
      ),
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS:         'echo',
    }

    function git(...args: string[]): { out: string; err: string; ok: boolean } {
      const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 15_000, env: gitEnv })
      return {
        out: (r.stdout ?? '').trim(),
        err: (r.stderr ?? '').trim(),
        ok:  (r.status ?? 1) === 0,
      }
    }

    // Verify git is available
    const gitCheck = git('--version')
    if (!gitCheck.ok) {
      return {
        branch: 'unknown', headSha: '???????', ahead: 0, behind: 0,
        isDiverged: false, modified: 0, untracked: 0, deleted: 0,
        totalPending: 0, statusLines: [], jsonChecks: [],
        gitError: 'git not available in this environment',
      }
    }

    // Verify we are inside a git repository.
    // In production (Replit deployment) there is no .git dir — fall back to the
    // GitHub API for branch/commit status so the admin panel still works.
    const repoCheck = git('rev-parse', '--git-dir')
    if (!repoCheck.ok) {
      const jsonChecks: GitJsonCheck[] = Object.values(FILE_MAP).map(({ file }) => {
        const raw = readRaw(file)
        if (!raw) return { file, ok: false, error: 'File not found' }
        if (CONFLICT_RE.test(raw)) return { file, ok: false, error: 'Contains conflict markers' }
        try { JSON.parse(raw); return { file, ok: true } }
        catch (e) { return { file, ok: false, error: String(e).slice(0, 100) } }
      })
      try {
        const status = await getRepoStatus()
        return {
          branch:       status.branch,
          headSha:      status.latestCommit?.sha ?? 'unknown',
          ahead: 0, behind: 0,
          isDiverged: false, modified: 0, untracked: 0, deleted: 0,
          totalPending: 0, statusLines: [], jsonChecks,
          apiMode: true,
          ...(status.connected ? {} : { gitError: 'Could not connect to GitHub API — check your token.' }),
        }
      } catch (e: any) {
        return {
          branch: 'main', headSha: 'unknown',
          ahead: 0, behind: 0,
          isDiverged: false, modified: 0, untracked: 0, deleted: 0,
          totalPending: 0, statusLines: [], jsonChecks,
          apiMode: true,
          gitError: `GitHub API error: ${(e as Error).message}`,
        }
      }
    }

    // Inject token into remote URL for fetch (best-effort, restore after)
    const originalUrl = git('remote', 'get-url', 'origin').out
    if (ghToken && originalUrl.startsWith('https://github.com/')) {
      const authUrl = originalUrl.replace('https://github.com/', `https://x-access-token:${ghToken}@github.com/`)
      git('remote', 'set-url', 'origin', authUrl)
    }

    // Fetch remote (best-effort)
    let fetchError: string | undefined
    const fetchRes = git('fetch', 'origin', '--quiet')
    if (!fetchRes.ok && fetchRes.err) fetchError = fetchRes.err.slice(0, 200)

    // Restore clean URL
    if (ghToken && originalUrl.startsWith('https://github.com/')) {
      git('remote', 'set-url', 'origin', originalUrl)
    }

    const branch  = git('rev-parse', '--abbrev-ref', 'HEAD').out || 'main'
    const headSha = (git('rev-parse', 'HEAD').out || '???????').slice(0, 7)
    const aheadN  = parseInt(git('rev-list', '--count', 'origin/main..HEAD').out) || 0
    const behindN = parseInt(git('rev-list', '--count', 'HEAD..origin/main').out) || 0
    const statusRes = git('status', '--porcelain')

    const lines     = statusRes.out ? statusRes.out.split('\n').filter(Boolean) : []
    const modified  = lines.filter(l => !l.startsWith('??') && (l[0] === 'M' || l[1] === 'M')).length
    const untracked = lines.filter(l => l.startsWith('??')).length
    const deleted   = lines.filter(l => l[0] === 'D' || l[1] === 'D').length

    const jsonChecks: GitJsonCheck[] = Object.values(FILE_MAP).map(({ file }) => {
      const raw = readRaw(file)
      if (!raw) return { file, ok: false, error: 'File not found' }
      if (CONFLICT_RE.test(raw)) return { file, ok: false, error: 'Contains conflict markers (<<<<<<< / =======)' }
      try { JSON.parse(raw); return { file, ok: true } }
      catch (e) { return { file, ok: false, error: String(e).slice(0, 100) } }
    })

    return {
      branch,
      headSha,
      ahead:        aheadN,
      behind:       behindN,
      isDiverged:   aheadN > 0 && behindN > 0,
      modified,
      untracked,
      deleted,
      totalPending: lines.length,
      statusLines:  lines.slice(0, 30),
      jsonChecks,
      ...(fetchError ? { fetchError } : {}),
    }
  },
)

// ─── GitHub API push helper (production / no-.git environments) ───────────────
// Reads every data file from disk and pushes them all in a single commit via
// the GitHub Git Data API (no local git required).

const SYNC_DATA_FILES = [
  'data/ads-config.json',
  'data/content.json',
  'data/economy.json',
  'data/event.json',
  'data/gamemodes.json',
  'data/growth.json',
  'data/homepage.json',
  'data/mining-access.json',
  'data/mining-community.json',
  'data/mining-users.json',
  'data/players.json',
  'data/shop-items.json',
  'data/shop-purchases.json',
  'data/sync-history.json',
  'data/tier-tagger.json',
  'data/tournaments.json',
  'credentials.yml',
  'admin.yml',
]

async function pushAllDataViaApi(logs: string[]): Promise<FixDivergenceResult> {
  const { existsSync, readFileSync: fsRead } = await import('node:fs')

  const ghToken = resolveTokenSource()?.token ?? ''
  if (!ghToken) {
    logs.push('✗ GitHub token not configured — set it via the Token Management panel.')
    return { success: false, action: 'error', logs, ahead: 0, behind: 0 }
  }

  const files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }> = []
  for (const rel of SYNC_DATA_FILES) {
    const abs = resolve(process.cwd(), rel)
    if (existsSync(abs)) {
      files.push({ path: rel, content: fsRead(abs, 'utf8') })
    }
  }

  // Include custom gamemode icon files from public/icons/ as base64 blobs
  const { readdirSync } = await import('node:fs')
  const iconsDir = resolve(process.cwd(), 'public', 'icons')
  if (existsSync(iconsDir)) {
    for (const fname of readdirSync(iconsDir)) {
      if (/\.(png|jpg|jpeg|gif|webp)$/i.test(fname)) {
        const abs = resolve(iconsDir, fname)
        const b64 = (fsRead(abs) as unknown as Buffer).toString('base64')
        files.push({ path: `public/icons/${fname}`, content: b64, encoding: 'base64' })
      }
    }
  }

  if (files.length === 0) {
    logs.push('✗ No data files found to push.')
    return { success: false, action: 'error', logs, ahead: 0, behind: 0 }
  }

  logs.push(`→ Pushing ${files.length} file(s) to GitHub via API…`)
  files.forEach(f => logs.push(`  · ${f.path}`))

  try {
    const result = await commitFiles(
      files,
      `[admin] Sync data from production (${new Date().toISOString().slice(0, 10)})`,
    )
    logs.push(`✓ Committed and pushed — SHA: ${result.sha.slice(0, 7)}`)
    markAlreadyCommitted()
    return { success: true, action: 'push-only', logs, ahead: 0, behind: 0 }
  } catch (e: any) {
    logs.push(`✗ GitHub API push failed: ${(e as Error).message}`)
    return { success: false, action: 'error', logs, ahead: 0, behind: 0 }
  }
}

// ─── Fix Git Divergence — auto-rebase + resolve data conflicts + push ─────────
// Handles the case where local git history diverged from origin/main.
// Strategy: commit local changes → rebase -X theirs onto origin/main
// (remote wins on data files during conflicts) → push --force-with-lease.

export interface FixDivergenceResult {
  success:  boolean
  action:   'none' | 'push-only' | 'push-force' | 'rebase-push' | 'error'
  logs:     string[]
  ahead:    number
  behind:   number
}

export const fixGitDivergence = createServerFn({ method: 'POST' }).handler(
  async (): Promise<FixDivergenceResult> => {
    const { spawnSync }  = await import('node:child_process')
    const { existsSync } = await import('node:fs')
    const cwd  = process.cwd()
    const logs: string[] = []

    // ── Credential injection ────────────────────────────────────────────────
    // Git won't see GITHUB_TOKEN automatically; inject it into the HTTPS remote URL
    // so git fetch/push authenticate without hanging on a credential prompt.
    const ghToken = resolveTokenSource()?.token ?? ''
    if (!ghToken) {
      return {
        success: false,
        action:  'error',
        logs:    ['✗ GITHUB_TOKEN is not set — cannot authenticate git push. Set it via the Token Management panel or as a Replit Secret.'],
        ahead:   0,
        behind:  0,
      }
    }

    // ── Production (no .git) — use GitHub API instead of local git ─────────
    const repoPresent = spawnSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' })
    if ((repoPresent.status ?? 1) !== 0) {
      logs.push('ℹ Running in production (no local git repo) — using GitHub API sync')
      return pushAllDataViaApi(logs)
    }

    // Use non-interactive env so git never blocks waiting for editor/credential input
    const env: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][],
      ),
      GIT_EDITOR:            'true',
      GIT_MERGE_AUTOEDIT:    'no',
      GIT_TERMINAL_PROMPT:   '0',   // ← prevents git from hanging on auth prompt
      GIT_ASKPASS:           'echo', // ← returns empty string for any credential query
      EDITOR:                'true',
      VISUAL:                'true',
    }

    function git(...args: string[]): { out: string; err: string; ok: boolean } {
      const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000, env })
      return {
        out: (r.stdout ?? '').trim(),
        err: (r.stderr ?? '').trim(),
        ok:  (r.status ?? 1) === 0,
      }
    }

    function isRebasing(): boolean {
      return (
        existsSync(resolve(cwd, '.git', 'rebase-merge')) ||
        existsSync(resolve(cwd, '.git', 'rebase-apply'))
      )
    }

    // Inject token into remote URL (https://github.com/... → https://x-access-token:TOKEN@github.com/...)
    // This is the standard GitHub PAT push method; we restore the URL afterwards.
    const originalUrl = git('remote', 'get-url', 'origin').out
    let authenticatedUrl = originalUrl
    if (originalUrl.startsWith('https://github.com/')) {
      authenticatedUrl = originalUrl.replace(
        'https://github.com/',
        `https://x-access-token:${ghToken}@github.com/`,
      )
      git('remote', 'set-url', 'origin', authenticatedUrl)
      logs.push('✓ GitHub token injected into remote URL')
    } else if (originalUrl.includes('github.com') && !originalUrl.includes('@')) {
      // Handles https://github.com without trailing slash
      authenticatedUrl = originalUrl.replace('github.com', `x-access-token:${ghToken}@github.com`)
      git('remote', 'set-url', 'origin', authenticatedUrl)
      logs.push('✓ GitHub token injected into remote URL')
    } else {
      logs.push(`Remote URL: ${originalUrl} — token not injected (non-HTTPS or already has credentials)`)
    }

    // Helper to restore the clean URL (without token) after push
    function restoreRemoteUrl() {
      if (authenticatedUrl !== originalUrl) {
        git('remote', 'set-url', 'origin', originalUrl)
      }
    }

    // Ensure git user config so commits don't fail
    if (!git('config', 'user.email').out) {
      git('config', 'user.email', 'admin@bluetiers.app')
      git('config', 'user.name', 'Blue Tiers Admin')
    }

    // ── 1. Fetch ────────────────────────────────────────────────────────────
    logs.push('→ git fetch origin')
    const fetchRes = git('fetch', 'origin')
    logs.push(fetchRes.ok ? '✓ Fetched origin/main' : `Fetch warning: ${fetchRes.err.slice(0, 200)}`)

    // ── 2. Read divergence counts ────────────────────────────────────────────
    const ahead0  = parseInt(git('rev-list', '--count', 'origin/main..HEAD').out) || 0
    const behind0 = parseInt(git('rev-list', '--count', 'HEAD..origin/main').out) || 0
    logs.push(`Branch is ${ahead0} commit(s) ahead, ${behind0} commit(s) behind origin/main`)

    // ── 3. Commit any dirty local working tree ───────────────────────────────
    const statusRes = git('status', '--porcelain')
    if (statusRes.out) {
      logs.push(`→ git add -A && git commit  (${statusRes.out.split('\n').filter(Boolean).length} files)`)
      git('add', '-A')
      const commitRes = git(
        'commit', '-m',
        `[admin] Auto-commit local changes before divergence fix (${new Date().toISOString().slice(0, 10)})`,
      )
      logs.push(commitRes.ok ? '✓ Committed local changes' : `Commit: ${commitRes.err.slice(0, 120)}`)
    } else {
      logs.push('Working tree clean — no uncommitted changes')
    }

    const ahead  = parseInt(git('rev-list', '--count', 'origin/main..HEAD').out) || 0
    const behind = parseInt(git('rev-list', '--count', 'HEAD..origin/main').out) || 0

    // ── 4. If not behind, just push ──────────────────────────────────────────
    if (behind === 0) {
      if (ahead === 0) {
        restoreRemoteUrl()
        logs.push('Repository already synchronized — nothing to push.')
        return { success: true, action: 'none', logs, ahead, behind }
      }
      logs.push(`→ git push origin main  (${ahead} commit(s) ahead)`)
      const push = git('push', 'origin', 'main')
      if (push.ok) {
        restoreRemoteUrl()
        markAlreadyCommitted()
        logs.push('✓ Push successful')
        return { success: true, action: 'push-only', logs, ahead, behind }
      }
      // Fallback: force-with-lease
      logs.push(`Push failed (${push.err.slice(0, 120)}) — retrying with --force-with-lease`)
      const pushF = git('push', '--force-with-lease', 'origin', 'main')
      restoreRemoteUrl()
      if (pushF.ok) markAlreadyCommitted()
      logs.push(pushF.ok ? '✓ Push successful (force-with-lease)' : `✗ Push failed: ${pushF.err.slice(0, 300)}`)
      return { success: pushF.ok, action: 'push-force', logs, ahead, behind }
    }

    // ── 5. Need to rebase onto remote ────────────────────────────────────────
    logs.push(`→ git rebase -X theirs origin/main  (absorbing ${behind} remote commit(s))`)
    logs.push('  Note: data/*.json conflicts will be resolved by keeping the remote version.')
    const rebaseRes = git('rebase', '-X', 'theirs', 'origin/main')

    if (!rebaseRes.ok && isRebasing()) {
      // The "-X theirs" strategy should handle most conflicts automatically,
      // but just in case: try to force-resolve every remaining conflict step.
      logs.push(`Rebase hit a conflict — force-resolving remaining steps (prefer remote)…`)

      let maxSteps = 30
      while (isRebasing() && maxSteps-- > 0) {
        // Checkout remote ("theirs" in rebase context) for all conflicted files
        git('checkout', '--theirs', '.')
        git('add', '-A')
        const cont = git('rebase', '--continue')
        if (cont.ok || !isRebasing()) break
        // If continue failed but we're still rebasing, loop
        if (cont.err.includes('nothing to commit')) {
          git('rebase', '--skip')
        }
      }

      if (isRebasing()) {
        // Give up — abort and report
        git('rebase', '--abort')
        restoreRemoteUrl()
        logs.push('✗ Rebase could not be completed automatically. Aborted.')
        logs.push('  Tip: Use "Fix Divergence" to sync local to remote,')
        logs.push('  then re-apply your changes through the admin panel.')
        return { success: false, action: 'error', logs, ahead, behind }
      }
      logs.push('✓ All conflicts resolved — rebase complete')
    } else if (rebaseRes.ok) {
      logs.push('✓ Rebase completed cleanly (no conflicts)')
    } else if (!isRebasing()) {
      // Rebase exited with error but left no rebase state — may have partly succeeded
      logs.push(`Rebase note: ${rebaseRes.err.slice(0, 120)}`)
    }

    // ── 6. Push ──────────────────────────────────────────────────────────────
    const aheadFinal  = parseInt(git('rev-list', '--count', 'origin/main..HEAD').out) || 0
    const behindFinal = parseInt(git('rev-list', '--count', 'HEAD..origin/main').out) || 0
    logs.push(`→ git push origin main  (now ${aheadFinal} ahead, ${behindFinal} behind)`)

    const push = git('push', 'origin', 'main')
    if (push.ok) {
      restoreRemoteUrl()
      markAlreadyCommitted()
      logs.push('✓ Push successful — repository fully synchronized')
      return { success: true, action: 'rebase-push', logs, ahead: aheadFinal, behind: behindFinal }
    }

    // Fallback: force-with-lease
    logs.push(`Push rejected (${push.err.slice(0, 120)}) — retrying with --force-with-lease`)
    const pushF = git('push', '--force-with-lease', 'origin', 'main')
    restoreRemoteUrl()
    if (pushF.ok) markAlreadyCommitted()
    logs.push(
      pushF.ok
        ? '✓ Push successful (force-with-lease) — repository synchronized'
        : `✗ Push failed: ${pushF.err.slice(0, 300)}`,
    )
    return {
      success: pushF.ok,
      action:  pushF.ok ? 'rebase-push' : 'error',
      logs,
      ahead:  aheadFinal,
      behind: behindFinal,
    }
  },
)


// ─── Backup mining data to GitHub ────────────────────────────────────────────
// Commits and pushes ONLY data/mining-users.json + data/mining-community.json.
// Uses the same authenticated push mechanism as fixGitDivergence.
// Returns early with alreadyBackedUp=true when neither file has changed.

export interface MiningBackupResult {
  success:        boolean
  alreadyBackedUp: boolean
  logs:           string[]
  filesCommitted: string[]
}

export const backupMiningData = createServerFn({ method: 'POST' }).handler(
  async (): Promise<MiningBackupResult> => {
    const { spawnSync } = await import('node:child_process')
    const cwd   = process.cwd()
    const logs: string[] = []
    const MINING_FILES = ['data/mining-users.json', 'data/mining-community.json']

    // ── Auth setup (mirrors fixGitDivergence) ───────────────────────────────
    const ghToken = resolveTokenSource()?.token ?? ''
    if (!ghToken) {
      return {
        success: false, alreadyBackedUp: false,
        logs: ['✗ GITHUB_TOKEN is not set — cannot push. Set it via the Token Management panel or as a Replit Secret.'],
        filesCommitted: [],
      }
    }

    // ── Production (no .git) — push mining files via GitHub API ────────────
    const repoPresent = spawnSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' })
    if ((repoPresent.status ?? 1) !== 0) {
      logs.push('ℹ Running in production — using GitHub API to backup mining files')
      const { existsSync, readFileSync: fsRead } = await import('node:fs')
      const MINING_FILES_REL = ['data/mining-users.json', 'data/mining-community.json']
      const files = MINING_FILES_REL
        .filter(f => existsSync(resolve(cwd, f)))
        .map(f => ({ path: f, content: fsRead(resolve(cwd, f), 'utf8') }))

      if (files.length === 0) {
        return { success: false, alreadyBackedUp: false, logs: [...logs, '✗ No mining files found.'], filesCommitted: [] }
      }
      logs.push(`→ Pushing ${files.length} mining file(s) via API…`)
      try {
        const msg = `Mining data snapshot (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`
        const result = await commitFiles(files, msg)
        logs.push(`✓ Committed — SHA: ${result.sha.slice(0, 7)}`)
        markAlreadyCommitted()
        return { success: true, alreadyBackedUp: false, logs, filesCommitted: files.map(f => f.path) }
      } catch (e: any) {
        logs.push(`✗ API push failed: ${(e as Error).message}`)
        return { success: false, alreadyBackedUp: false, logs, filesCommitted: [] }
      }
    }

    const env: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][],
      ),
      GIT_EDITOR:          'true',
      GIT_MERGE_AUTOEDIT:  'no',
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS:         'echo',
      EDITOR:              'true',
      VISUAL:              'true',
    }

    function git(...args: string[]): { out: string; err: string; ok: boolean } {
      const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000, env })
      return { out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim(), ok: (r.status ?? 1) === 0 }
    }

    const originalUrl = git('remote', 'get-url', 'origin').out
    let authenticatedUrl = originalUrl
    if (originalUrl.startsWith('https://github.com/')) {
      authenticatedUrl = originalUrl.replace(
        'https://github.com/',
        `https://x-access-token:${ghToken}@github.com/`,
      )
      git('remote', 'set-url', 'origin', authenticatedUrl)
    }
    function restoreUrl() {
      if (authenticatedUrl !== originalUrl) git('remote', 'set-url', 'origin', originalUrl)
    }

    // Ensure git user config
    if (!git('config', 'user.email').out) {
      git('config', 'user.email', 'admin@bluetiers.app')
      git('config', 'user.name', 'Blue Tiers Admin')
    }

    // ── Step 1: check which mining files have actually changed ──────────────
    // --porcelain on specific paths shows both staged and unstaged changes
    const statusOut = git('status', '--porcelain', '--', ...MINING_FILES).out
    const changedFiles = statusOut
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.slice(3).trim())   // strip the two-char status code + space

    logs.push(`→ Checking mining data files…`)
    if (changedFiles.length === 0) {
      restoreUrl()
      logs.push('✓ No changes detected — mining data is already backed up.')
      return { success: true, alreadyBackedUp: true, logs, filesCommitted: [] }
    }

    logs.push(`  ${changedFiles.length} file(s) have changes:`)
    changedFiles.forEach(f => logs.push(`  · ${f}`))

    // ── Step 2: stage ONLY the mining files ─────────────────────────────────
    const addRes = git('add', '--', ...MINING_FILES)
    if (!addRes.ok) {
      restoreUrl()
      logs.push(`✗ git add failed: ${addRes.err.slice(0, 200)}`)
      return { success: false, alreadyBackedUp: false, logs, filesCommitted: [] }
    }
    logs.push(`✓ Staged: ${MINING_FILES.join(', ')}`)

    // ── Step 3: commit with a rotating meaningful message ───────────────────
    const messages = [
      'Backup mining data',
      'Backup mining progress',
      'Mining data snapshot',
    ]
    const commitMsg = messages[Math.floor(Date.now() / 1000) % messages.length]
    const fullMsg   = `${commitMsg} (${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC)`

    const commitRes = git('commit', '-m', fullMsg)
    if (!commitRes.ok) {
      // Could fail with "nothing to commit" if the file contents were identical
      // to HEAD even though git-status showed them (e.g. staging artefact).
      restoreUrl()
      const nothing = commitRes.err.includes('nothing to commit') || commitRes.out.includes('nothing to commit')
      if (nothing) {
        logs.push('✓ Nothing new to commit — mining data is already backed up.')
        return { success: true, alreadyBackedUp: true, logs, filesCommitted: [] }
      }
      logs.push(`✗ Commit failed: ${commitRes.err.slice(0, 300)}`)
      return { success: false, alreadyBackedUp: false, logs, filesCommitted: [] }
    }
    logs.push(`✓ Committed: "${fullMsg}"`)

    // ── Step 4: fetch to detect if we need to rebase before pushing ─────────
    logs.push('→ git fetch origin')
    const fetchRes = git('fetch', 'origin')
    if (!fetchRes.ok) logs.push(`  Fetch warning: ${fetchRes.err.slice(0, 120)}`)

    const behind = parseInt(git('rev-list', '--count', 'HEAD..origin/main').out) || 0
    if (behind > 0) {
      logs.push(`  ${behind} remote commit(s) detected — rebasing before push…`)
      const rebaseRes = git('rebase', '-X', 'theirs', 'origin/main')
      if (!rebaseRes.ok) {
        // Abort and report — don't leave the repo in a half-rebased state
        git('rebase', '--abort')
        restoreUrl()
        logs.push('✗ Rebase failed — push aborted. Try "Fix Divergence" in Git Diagnostics first.')
        return { success: false, alreadyBackedUp: false, logs, filesCommitted: changedFiles }
      }
      logs.push('✓ Rebase completed cleanly')
    }

    // ── Step 5: push ─────────────────────────────────────────────────────────
    logs.push('→ git push origin main')
    const pushRes = git('push', 'origin', 'main')
    restoreUrl()

    if (pushRes.ok) {
      logs.push('✓ Push successful — mining data backed up to GitHub.')
      return { success: true, alreadyBackedUp: false, logs, filesCommitted: changedFiles }
    }

    // Fallback: force-with-lease (safe — only updates if remote hasn't moved since our fetch)
    logs.push(`  Push rejected (${pushRes.err.slice(0, 80)}) — retrying with --force-with-lease`)
    const pushF = git('push', '--force-with-lease', 'origin', 'main')
    if (pushF.ok) {
      logs.push('✓ Push successful (force-with-lease) — mining data backed up to GitHub.')
      return { success: true, alreadyBackedUp: false, logs, filesCommitted: changedFiles }
    }

    logs.push(`✗ Push failed: ${pushF.err.slice(0, 300)}`)
    return { success: false, alreadyBackedUp: false, logs, filesCommitted: changedFiles }
  },
)

// ─── Sync history (stored in data/sync-history.json) ─────────────────────────

export interface SyncHistoryEntry {
  id:            string
  date:          string
  commitHash:    string
  commitMessage: string
  filesChanged:  string[]
  status:        'success' | 'failed'
  durationMs:    number
}

export const fetchSyncHistory = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SyncHistoryEntry[]> => {
    return readJson<SyncHistoryEntry[]>('sync-history.json') ?? []
  },
)

export const addSyncHistoryEntry = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      commitHash:    z.string(),
      commitMessage: z.string(),
      filesChanged:  z.array(z.string()),
      status:        z.enum(['success', 'failed']),
      durationMs:    z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const history = readJson<SyncHistoryEntry[]>('sync-history.json') ?? []
    const entry: SyncHistoryEntry = { id: Date.now().toString(), date: new Date().toISOString(), ...data }
    const trimmed = [entry, ...history].slice(0, 100)
    atomicWriteJson('sync-history.json', trimmed)
    return entry
  })

// ─── Compare local files to remote ───────────────────────────────────────────

export const compareLocalToRemote = createServerFn({ method: 'GET' }).handler(async () => {
  const token = resolveTokenSource()?.token
  if (!token) throw new Error('AUTH_ERROR: GITHUB_TOKEN not configured')

  const results: Array<{
    section: string; file: string; repoPath: string
    localBytes: number; remoteBytes: number
    isSame: boolean; localExists: boolean; remoteExists: boolean
  }> = []

  for (const [section, { file, repoPath }] of Object.entries(FILE_MAP)) {
    const localRaw  = readRaw(file)
    const remoteRaw = await fetchRemoteFile(token, repoPath)
    const localNorm  = localRaw  ? JSON.stringify(JSON.parse(localRaw))  : null
    const remoteNorm = remoteRaw ? JSON.stringify(JSON.parse(remoteRaw)) : null
    results.push({
      section, file, repoPath,
      localBytes:    localRaw?.length  ?? 0,
      remoteBytes:   remoteRaw?.length ?? 0,
      isSame:        localNorm === remoteNorm,
      localExists:   localRaw  !== null,
      remoteExists:  remoteRaw !== null,
    })
  }

  return results
})

// ─── Pull remote files to disk ────────────────────────────────────────────────

export const pullRemoteFiles = createServerFn({ method: 'POST' }).handler(async () => {
  const token = resolveTokenSource()?.token
  if (!token) throw new Error('AUTH_ERROR: GITHUB_TOKEN not configured')

  const pulled: string[] = []
  for (const [, { file, repoPath }] of Object.entries(FILE_MAP)) {
    const remote = await fetchRemoteFile(token, repoPath)
    if (remote) {
      const parsed = JSON.parse(remote)
      atomicWriteJson(file, parsed)
      pulled.push(file)
    }
  }

  return { pulled }
})

// ─── GitHub Bridge: two-way sync ─────────────────────────────────────────────
// These three functions power the dedicated two-way sync panel.
// They work in production (no .git) via the GitHub Contents / Git Data APIs.

export interface BridgeSectionStatus {
  section:      string
  file:         string
  repoPath:     string
  localExists:  boolean
  remoteExists: boolean
  isSame:       boolean
  localBytes:   number
  remoteBytes:  number
}

export interface GitHubBridgeStatus {
  connected:    boolean
  owner:        string
  repo:         string
  branch:       string
  error?:       string
  latestCommit: { sha: string; shortSha: string; message: string; date: string; author: string } | null
  sections:     BridgeSectionStatus[]
  localIcons:   string[]
  remoteIcons:  string[]
}

export const getGitHubBridgeStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GitHubBridgeStatus> => {
    const token = resolveTokenSource()?.token
    if (!token) {
      return {
        connected: false, owner: '', repo: '', branch: '',
        error: 'GitHub token not configured', latestCommit: null, sections: [], localIcons: [], remoteIcons: [],
      }
    }
    const { owner, repo, branch } = readRepoConfig()

    // Latest commit
    let latestCommit: GitHubBridgeStatus['latestCommit'] = null
    let connected = false
    try {
      const data = await ghFetch(token, `/repos/${owner}/${repo}/commits/${branch}`)
      connected = true
      latestCommit = {
        sha:      data.sha as string,
        shortSha: (data.sha as string).slice(0, 7),
        message:  (data.commit.message as string).split('\n')[0].slice(0, 72),
        date:     data.commit.author.date as string,
        author:   data.commit.author.name as string,
      }
    } catch (e) {
      return {
        connected: false, owner, repo, branch,
        error: (e as Error).message.slice(0, 120),
        latestCommit: null, sections: [], localIcons: [], remoteIcons: [],
      }
    }

    // Per-section comparison
    const sections: BridgeSectionStatus[] = []
    for (const [section, { file, repoPath }] of Object.entries(FILE_MAP)) {
      const localRaw  = readRaw(file)
      const remoteRaw = await fetchRemoteFile(token, repoPath)
      let isSame = false
      try { isSame = localRaw !== null && remoteRaw !== null && JSON.stringify(JSON.parse(localRaw)) === JSON.stringify(JSON.parse(remoteRaw)) } catch { /* */ }
      sections.push({
        section, file, repoPath,
        localExists:  localRaw  !== null,
        remoteExists: remoteRaw !== null,
        isSame,
        localBytes:   localRaw?.length  ?? 0,
        remoteBytes:  remoteRaw?.length ?? 0,
      })
    }

    // Local icon files
    const { existsSync: exi, readdirSync: rds } = await import('node:fs')
    const iconsDir = resolve(process.cwd(), 'public', 'icons')
    const localIcons = exi(iconsDir)
      ? rds(iconsDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
      : []

    // Remote icon files
    let remoteIcons: string[] = []
    try {
      const res = await fetch(
        `${BASE}/repos/${owner}/${repo}/contents/public/icons?ref=${branch}`,
        { headers: buildGHHeaders(token) },
      )
      if (res.ok) {
        const files = await res.json() as Array<{ name: string; type: string }>
        remoteIcons = files.filter(f => f.type === 'file' && /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name)).map(f => f.name)
      }
    } catch { /* icons optional */ }

    return { connected, owner, repo, branch, latestCommit, sections, localIcons, remoteIcons }
  },
)

export interface PullResult {
  sections:     Record<string, { pulled: boolean; content?: string; bytes?: number; error?: string }>
  iconsPulled:  string[]
  iconsSkipped: string[]
}

export const pullAllFromGitHub = createServerFn({ method: 'POST' }).handler(
  async (): Promise<PullResult> => {
    const token = resolveTokenSource()?.token
    if (!token) throw new Error('AUTH_ERROR: GITHUB_TOKEN not configured')
    const { owner, repo, branch } = readRepoConfig()

    const sections: PullResult['sections'] = {}

    // Pull each JSON section
    for (const [section, { file, repoPath }] of Object.entries(FILE_MAP)) {
      try {
        const remote = await fetchRemoteFile(token, repoPath)
        if (remote) {
          const parsed = JSON.parse(remote)
          const written = atomicWriteJson(file, parsed)
          sections[section] = { pulled: true, content: remote, bytes: written.length }
        } else {
          sections[section] = { pulled: false, error: 'Not found in GitHub' }
        }
      } catch (e) {
        sections[section] = { pulled: false, error: (e as Error).message.slice(0, 120) }
      }
    }

    // Pull icon files from public/icons/ in the repo
    const iconsPulled:  string[] = []
    const iconsSkipped: string[] = []
    try {
      const listRes = await fetch(
        `${BASE}/repos/${owner}/${repo}/contents/public/icons?ref=${branch}`,
        { headers: buildGHHeaders(token) },
      )
      if (listRes.ok) {
        const items = await listRes.json() as Array<{ name: string; download_url: string; type: string }>
        const { mkdirSync: mkd, writeFileSync: wfs } = await import('node:fs')
        const iconsDir = resolve(process.cwd(), 'public', 'icons')
        mkd(iconsDir, { recursive: true })
        for (const item of items) {
          if (item.type !== 'file' || !/\.(png|jpg|jpeg|gif|webp)$/i.test(item.name)) continue
          try {
            const dl = await fetch(item.download_url)
            if (dl.ok) {
              wfs(resolve(iconsDir, item.name), Buffer.from(await dl.arrayBuffer()))
              iconsPulled.push(item.name)
            } else {
              iconsSkipped.push(item.name)
            }
          } catch {
            iconsSkipped.push(item.name)
          }
        }
      }
    } catch { /* icons are optional */ }

    return { sections, iconsPulled, iconsSkipped }
  },
)

export const pushAllToGitHub = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      sections: z.array(
        z.object({
          section:  z.enum(['players', 'gamemodes', 'content', 'event', 'economy', 'homepage', 'tier-tagger']),
          jsonData: z.string(),
        }),
      ).optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ success: boolean; sha?: string; logs: string[]; error?: string }> => {
    const logs: string[] = []

    // 1. Write provided sections to disk
    if (data.sections?.length) {
      for (const { section, jsonData } of data.sections) {
        const { file } = FILE_MAP[section as SectionKey]
        try {
          const parsed = JSON.parse(jsonData)
          atomicWriteJson(file, parsed)
          logs.push(`✓ Saved ${file} to disk`)
        } catch (e) {
          logs.push(`⚠ Could not save ${file}: ${(e as Error).message.slice(0, 60)}`)
        }
      }
    }

    // 2. Push everything (JSON + icons) to GitHub
    const result = await pushAllDataViaApi(logs)
    if (result.success) {
      const shaLine = logs.find(l => l.includes('SHA:'))
      const sha = shaLine?.match(/SHA: ([a-f0-9]+)/)?.[1]
      return { success: true, sha, logs }
    }
    return { success: false, logs, error: logs.filter(l => l.startsWith('✗')).join('; ') }
  })

// Push every file in the repo (code + data + icons) to GitHub.
// In dev (git present): git add -A → commit → pull --rebase → push.
// In production (no git): not supported — code changes cannot be made there anyway.
export const pushEverythingToGitHub = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ message: z.string().optional() }))
  .handler(async ({ data }): Promise<{ success: boolean; logs: string[]; sha?: string }> => {
    const logs: string[] = []
    const { spawnSync } = await import('node:child_process')
    const cwd = process.cwd()

    const ghToken = resolveTokenSource()?.token ?? ''
    if (!ghToken) {
      return { success: false, logs: ['✗ GitHub token not configured — set it in GitHub Sync first'] }
    }

    // Check git is available
    const repoCheck = spawnSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' })
    if ((repoCheck.status ?? 1) !== 0) {
      return {
        success: false,
        logs: ['✗ No local git repository found — full code push only works in the development environment, not on the live website'],
      }
    }

    const { owner, repo, branch } = readRepoConfig()
    const authUrl = `https://x-access-token:${ghToken}@github.com/${owner}/${repo}.git`

    const env: Record<string, string> = {
      ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][]),
      GIT_EDITOR: 'true', GIT_MERGE_AUTOEDIT: 'no',
      GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'echo',
      EDITOR: 'true', VISUAL: 'true',
    }

    function git(...args: string[]): { out: string; err: string; ok: boolean } {
      const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 60_000, env })
      return { out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim(), ok: (r.status ?? 1) === 0 }
    }

    // Stage all changes
    const statusRes = git('status', '--short')
    const changedLines = statusRes.out.split('\n').filter(Boolean)

    if (changedLines.length > 0) {
      logs.push(`→ Staging ${changedLines.length} changed file(s)…`)
      const addRes = git('add', '-A')
      if (!addRes.ok) {
        logs.push(`✗ Could not stage files: ${addRes.err.slice(0, 200)}`)
        return { success: false, logs }
      }

      const msg = data.message?.trim() || `Admin update — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
      const commitRes = git('commit', '-m', msg)
      if (!commitRes.ok && !commitRes.out.includes('nothing to commit')) {
        logs.push(`✗ Commit failed: ${commitRes.err.slice(0, 200)}`)
        return { success: false, logs }
      }
      logs.push(`✓ Committed: "${msg}"`)
    } else {
      logs.push('ℹ No local file changes to commit')
    }

    // Check how many commits ahead we are
    const aheadRes = git('rev-list', '--count', `${branch}@{upstream}..HEAD`)
    const ahead = parseInt(aheadRes.out) || 0
    if (changedLines.length === 0 && ahead === 0) {
      logs.push('✓ Everything is already up to date in GitHub')
      const shaRes = git('rev-parse', '--short', 'HEAD')
      return { success: true, logs, sha: shaRes.out }
    }

    // Pull --rebase to absorb any remote commits (auto-backups, etc.)
    logs.push('→ Fetching latest changes from GitHub…')
    const fetchRes = git('fetch', authUrl, branch)
    if (fetchRes.ok) {
      const rebaseRes = git('rebase', 'FETCH_HEAD')
      if (!rebaseRes.ok) {
        git('rebase', '--abort')
        logs.push('⚠ Could not merge remote changes automatically — pushing anyway')
      } else {
        logs.push('✓ Merged any remote changes')
      }
    } else {
      logs.push('⚠ Could not fetch from GitHub — pushing anyway')
    }

    // Push
    logs.push(`→ Pushing to GitHub (${branch})…`)
    const pushRes = git('push', authUrl, `HEAD:${branch}`)
    if (!pushRes.ok) {
      const safeErr = pushRes.err.replace(ghToken, '***').slice(0, 300)
      logs.push(`✗ Push failed: ${safeErr}`)
      return { success: false, logs }
    }

    const shaRes = git('rev-parse', '--short', 'HEAD')
    logs.push(`✓ All files pushed — commit ${shaRes.out}`)
    return { success: true, logs, sha: shaRes.out }
  })

// ─── Repair engine — helpers ──────────────────────────────────────────────────

/**
 * Merge duplicate players: union their ranks, later occurrence wins per key.
 * Unlike deduplicateAndSort (which drops duplicates), this preserves rank data
 * from every occurrence of a player before normalising.
 */
function deduplicateAndMergePlayers(players: any[]): Player[] {
  const map = new Map<string, any>()
  for (const p of players) {
    const key = String(p?.name ?? '').trim().toLowerCase()
    if (!key) continue
    if (!map.has(key)) {
      map.set(key, { ...p })
    } else {
      const existing = map.get(key)
      // Merge ranks: existing fills in gaps, later occurrence wins per key
      map.set(key, {
        ...existing,
        ranks: { ...(existing.ranks ?? {}), ...(p.ranks ?? {}) },
      })
    }
  }
  return [...map.values()]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(normalizePlayer)
}

/**
 * Resolve Git conflict blocks by keeping content from BOTH sides and inserting
 * a comma between the last line of "ours" and the first line of "theirs" when
 * needed to maintain valid JSON.
 */
function resolveConflictBlocks(raw: string): { text: string; conflictCount: number } {
  let conflictCount = 0
  // Regex: capture ours (between <<<<<<< and =======) and theirs (between ======= and >>>>>>>)
  const text = raw.replace(
    /^<{7}[^\n]*\n([\s\S]*?)^={7}[^\n]*\n([\s\S]*?)^>{7}[^\n]*\n?/gm,
    (_match, ours: string, theirs: string) => {
      conflictCount++
      const oursClean   = ours.replace(/\n$/, '')
      const theirsClean = theirs.replace(/\n$/, '')
      if (!oursClean)   return theirsClean + '\n'
      if (!theirsClean) return oursClean   + '\n'
      // If ours doesn't end with a comma, add one before appending theirs
      const needsComma = !/,\s*$/.test(oursClean)
      return oursClean + (needsComma ? ',' : '') + '\n' + theirsClean + '\n'
    },
  )
  return { text, conflictCount }
}

/**
 * Fix missing commas between adjacent JSON tokens.
 * Covers the most common corruption from conflict-marker removal:
 *   "value"\n  "key":   →  "value",\n  "key":
 *   }\n  {              →  },\n  {
 */
function fixMissingCommas(input: string): { text: string; fixedCount: number } {
  let fixedCount = 0
  const lines  = input.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    const trimmed = line.trimEnd()

    // Skip empty lines, lines that are openers, or already have a trailing comma
    if (!trimmed || trimmed.endsWith(',') || trimmed.endsWith('{') || trimmed.endsWith('[')) {
      result.push(line)
      continue
    }

    // Find the next non-empty line
    let nextTrimmed = ''
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim()
      if (t) { nextTrimmed = t; break }
    }

    // Add comma if current line ends with a value/closer AND next line opens a new property or object
    const endsWithValue = /["}\d]$/.test(trimmed)
    const nextOpensProperty = nextTrimmed.startsWith('"')
    const nextOpensObject   = nextTrimmed.startsWith('{')

    if (endsWithValue && (nextOpensProperty || nextOpensObject)) {
      line = trimmed + ','
      fixedCount++
    }

    result.push(line)
  }

  return { text: result.join('\n'), fixedCount }
}

/**
 * Remove trailing commas before } or ] (can appear after over-eager comma addition
 * or from merged conflict blocks whose last item already had a comma).
 */
function removeTrailingCommas(input: string): string {
  return input
    .replace(/,(\s*[}\]])/g, '$1')   // ,  }  →  }
    .replace(/,(\s*,)+/g, ',')        // ,,  →  ,
}

/**
 * Multi-pass JSON repair: conflict resolution → comma fix → trailing-comma strip → parse.
 * Returns parsed array + repair log, or throws with a descriptive message.
 */
function repairJsonText(raw: string): {
  parsed:        any[]
  conflictCount: number
  commasFix:     number
  parseAttempts: number
  repairs:       string[]
} {
  const repairs: string[] = []
  let text = raw

  // ── Pass 1: resolve conflict blocks ────────────────────────────────────────
  const { text: afterConflict, conflictCount } = resolveConflictBlocks(text)
  text = afterConflict
  if (conflictCount > 0) repairs.push(`Resolved ${conflictCount} Git conflict block(s)`)

  // ── Pass 2: fix missing commas ─────────────────────────────────────────────
  const { text: afterCommas, fixedCount } = fixMissingCommas(text)
  text = afterCommas
  if (fixedCount > 0) repairs.push(`Added ${fixedCount} missing comma(s)`)

  // ── Pass 3: remove trailing commas ────────────────────────────────────────
  text = removeTrailingCommas(text)

  let parseAttempts = 0

  // ── Attempt 1: parse as-is ─────────────────────────────────────────────────
  parseAttempts++
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return { parsed, conflictCount, commasFix: fixedCount, parseAttempts, repairs }
  } catch { /* continue */ }

  // ── Attempt 2: second comma-fix pass (handles nested conflicts) ────────────
  parseAttempts++
  const { text: text2, fixedCount: fix2 } = fixMissingCommas(text)
  text = removeTrailingCommas(text2)
  if (fix2 > 0) repairs.push(`Second comma-fix pass: ${fix2} additional comma(s)`)
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return { parsed, conflictCount, commasFix: fixedCount + fix2, parseAttempts, repairs }
  } catch { /* continue */ }

  // ── Attempt 3: extract first complete JSON array ───────────────────────────
  parseAttempts++
  const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        repairs.push('Salvaged JSON array structure from partial content')
        return { parsed, conflictCount, commasFix: fixedCount, parseAttempts, repairs }
      }
    } catch { /* fall through */ }
  }

  // ── All attempts failed ────────────────────────────────────────────────────
  let parseError = 'Unknown parse error'
  try { JSON.parse(text) } catch (e) { parseError = String(e) }

  // Try to identify line number from error message
  const lineMatch = parseError.match(/position (\d+)/)
  let lineHint = ''
  if (lineMatch) {
    const pos    = parseInt(lineMatch[1])
    const before = text.slice(0, pos)
    const lineNo = before.split('\n').length
    lineHint = ` (near line ${lineNo})`
  }

  throw new Error(
    `REPAIR_ERROR: Could not repair players.json after ${parseAttempts} parse attempt(s). ` +
    `Parse error: ${parseError}${lineHint}. ` +
    `The file may have structural corruption beyond what auto-repair can fix. ` +
    `A backup was saved before any changes were made.`,
  )
}

// ─── Preview repair (analysis only — no writes) ────────────────────────────────

export interface RepairPreview {
  conflictBlocks:    number
  missingCommas:     number
  duplicatePlayers:  string[]
  canAutoRepair:     boolean
  playerCountBefore: number
  playerCountAfter:  number
  parseError?:       string
  repairs:           string[]
}

export const previewRepairPlayers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RepairPreview> => {
    let raw: string
    try {
      raw = readFileSync(resolve(DATA_DIR, 'players.json'), 'utf8')
    } catch (e) {
      throw new Error(`REPAIR_ERROR: Cannot read players.json — ${e}`)
    }

    // Count conflict blocks before resolving
    const conflictBlocks = (raw.match(/^<{7}/gm) ?? []).length

    // Count missing commas (dry run)
    const { text: afterConflict } = resolveConflictBlocks(raw)
    const { fixedCount: missingCommas } = fixMissingCommas(afterConflict)

    let canAutoRepair = false
    let playerCountBefore = 0
    let playerCountAfter  = 0
    let parseError: string | undefined
    let repairs: string[] = []
    let duplicatePlayers: string[] = []

    try {
      const result = repairJsonText(raw)
      repairs  = result.repairs
      const raw2 = result.parsed as any[]
      playerCountBefore = raw2.length
      // Find duplicate names
      const names = raw2.map(p => String(p?.name ?? '').trim().toLowerCase())
      duplicatePlayers = [...new Set(names.filter((n, i) => n && names.indexOf(n) !== i))]
      const merged = deduplicateAndMergePlayers(raw2)
      playerCountAfter = merged.length
      canAutoRepair = true
    } catch (e) {
      parseError = e instanceof Error ? e.message.replace(/^REPAIR_ERROR:\s*/, '') : String(e)
    }

    return { conflictBlocks, missingCommas, duplicatePlayers, canAutoRepair, playerCountBefore, playerCountAfter, parseError, repairs }
  },
)

// ─── Repair players.json ──────────────────────────────────────────────────────
// Smart multi-pass repair: backup → resolve conflicts → fix commas → dedup+merge
// → validate → write atomically. Local-only — no GitHub commit.
// After repair, use "Save to GitHub" to commit the fixed data.

export const repairPlayers = createServerFn({ method: 'POST' }).handler(async () => {
  const repairs: string[] = []

  // ── Read raw file ──────────────────────────────────────────────────────────
  let raw: string
  try {
    raw = readFileSync(resolve(DATA_DIR, 'players.json'), 'utf8')
  } catch (e) {
    throw new Error(`REPAIR_ERROR: Cannot read players.json — ${e}`)
  }
  // ── Create backup BEFORE any modifications ────────────────────────────────
  const backupDir  = resolve(DATA_DIR, 'backups')
  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupFile = `players-before-repair-${timestamp}.json`
  const backupPath = resolve(backupDir, backupFile)
  let backupSaved  = false
  try {
    mkdirSync(backupDir, { recursive: true })
    writeFileSync(backupPath, raw, 'utf8')
    backupSaved = true
    repairs.push(`Backup saved: data/backups/${backupFile}`)
  } catch (e) {
    repairs.push(`Warning: Could not create backup — ${e}`)
  }

  // ── Smart JSON repair ──────────────────────────────────────────────────────
  let parsed: any[]
  try {
    const result = repairJsonText(raw)
    parsed  = result.parsed
    repairs.push(...result.repairs.filter(r => !repairs.includes(r)))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      backupSaved
        ? `${msg} Backup saved at data/backups/${backupFile}.`
        : msg,
    )
  }

  // ── Player-level normalisation and smart dedup (merge ranks) ───────────────
  const before = parsed.length
  const merged = deduplicateAndMergePlayers(parsed)  // merges ranks across duplicates
  const after  = merged.length

  if (after < before) {
    const removed = before - after
    repairs.push(`Merged and removed ${removed} duplicate player(s) (ranks combined)`)
  }
  repairs.push(`Normalised schema for all ${after} players (rank keys, region, head URL)`)
  repairs.push(`Sorted ${after} players alphabetically by name`)

  // ── Atomic write — only after validation ──────────────────────────────────
  try {
    atomicWriteJson('players.json', merged)
  } catch (e) {
    throw new Error(`REPAIR_ERROR: Failed to write repaired file — ${e}`)
  }

  return {
    success:           true,
    repairs,
    playerCount:       after,
    removedDuplicates: before - after,
    backupFile:        backupSaved ? `data/backups/${backupFile}` : null,
  }
})

// ─── User Management Grand Section ───────────────────────────────────────────
// Reads/writes across credentials.yml, players.json, mining-users.json.
// All mutations go directly to disk (server-authoritative).
// GitHub backup picks up changes on the next push via the Sync Center.

const CREDS_PATH = resolve(process.cwd(), 'credentials.yml')

interface CredUser {
  username: string
  password: string
  role?:    string
  uuid?:    string
  enabled?: boolean
}

function readCredsFile(): { users: CredUser[] } {
  try {
    const raw    = readFileSync(CREDS_PATH, 'utf8')
    const parsed = yamlLoad(raw) as { users?: CredUser[] }
    return { users: Array.isArray(parsed?.users) ? parsed.users : [] }
  } catch {
    return { users: [] }
  }
}

function writeCredsFile(data: { users: CredUser[] }): void {
  writeFileSync(CREDS_PATH, yamlDump(data, { indent: 2, lineWidth: -1, noRefs: true }), 'utf8')
}

const RANK_TIER_ORDER = ['HT5','LT5','HT4','LT4','HT3','LT3','HT2','LT2','HT1','LT1']

function getBestRank(ranks: Record<string, string> | null | undefined): string | null {
  if (!ranks) return null
  for (const t of RANK_TIER_ORDER) {
    if (Object.values(ranks).some(v => v === t)) return t
  }
  return null
}

export interface UserRecord {
  key:          string
  username:     string
  hasCred:      boolean
  hasPlayer:    boolean
  hasMining:    boolean
  role:         string | null
  uuid:         string | null
  avatar:       string | null
  region:       string | null
  ranks:        Record<string, string> | null
  topRank:      string | null
  balance:      number
  gems:         number
  totalRigs:    number
  activeRigs:   number
  joinDate:     number | null
  lastSeen:     number | null
  rewardCount:  number
  credEnabled:  boolean | null   // null = no cred account
  miningKey:    string | null    // actual key used in mining-users.json
}

// ─── Save players.json → src/data/players.ts ─────────────────────────────────

export const savePlayersToTS = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: boolean; count: number }> => {
    const players = readJson<Player[]>('players.json') ?? []

    const TS_HEADER = `export interface PlayerRanks {
  [key: string]: string | null | undefined
  mace?: string | null
  sword?: string | null
  crystal?: string | null
  uhc?: string | null
  axe?: string | null
  nethpot?: string | null
  diapot?: string | null
}

export const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Asia",
  "Oceania",
  "Africa",
  "Middle East",
] as const

export type Region = typeof REGIONS[number]

export interface Player {
  name: string
  head: string
  region: Region
  ranks: PlayerRanks
}
`

    function playerToTS(p: Player): string {
      const rankKeys = ['sword', 'axe', 'uhc', 'crystal', 'mace', 'nethpot', 'diapot']
      const activeRanks = rankKeys.filter(k => {
        const v = p.ranks?.[k]
        return v && v !== 'NONE'
      })
      const ranksStr = activeRanks.length === 0
        ? '{}'
        : `{\n${activeRanks.map(k => `      ${k}: "${p.ranks[k]}",`).join('\n')}\n    }`
      return `  {\n    name: "${p.name}",\n    head: "${p.head}",\n    region: "${p.region}",\n    ranks: ${ranksStr},\n  }`
    }

    const body = players.map(playerToTS).join(',\n')
    const content = `${TS_HEADER}\nconst players: Player[] = [\n${body},\n]\n\nexport default players\n`

    const tsPath = resolve(process.cwd(), 'src', 'data', 'players.ts')
    writeFileSync(tsPath, content, 'utf8')

    return { ok: true, count: players.length }
  }
)

export const adminLoadUsers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UserRecord[]> => {
    const creds   = readCredsFile()
    const players = readJson<any[]>('players.json')              ?? []
    const mining  = readJson<Record<string, any>>('mining-users.json') ?? {}
    const map     = new Map<string, UserRecord>()

    for (const u of creds.users) {
      const key = u.username.toLowerCase()
      map.set(key, {
        key, username: u.username,
        hasCred: true, hasPlayer: false, hasMining: false,
        role: u.role ?? 'user', uuid: u.uuid ?? null,
        avatar: null, region: null, ranks: null, topRank: null,
        balance: 0, gems: 0, totalRigs: 0, activeRigs: 0,
        joinDate: null, lastSeen: null, rewardCount: 0,
        credEnabled: u.enabled !== false,
        miningKey:   null,
      })
    }

    for (const p of players) {
      const key = String(p.name ?? '').toLowerCase()
      if (!key) continue
      const ex = map.get(key)
      if (ex) {
        ex.hasPlayer = true; ex.avatar = p.head ?? null; ex.region = p.region ?? null
        ex.ranks = p.ranks ?? null; ex.topRank = getBestRank(p.ranks)
      } else {
        map.set(key, {
          key, username: p.name,
          hasCred: false, role: null, uuid: null,
          hasPlayer: true, avatar: p.head ?? null, region: p.region ?? null,
          ranks: p.ranks ?? null, topRank: getBestRank(p.ranks),
          hasMining: false,
          balance: 0, gems: 0, totalRigs: 0, activeRigs: 0,
          joinDate: null, lastSeen: null, rewardCount: 0,
          credEnabled: null,
          miningKey:   null,
        })
      }
    }

    for (const [mKey, u] of Object.entries(mining)) {
      if (!mKey) continue
      const rigs = Array.isArray(u.rigs) ? u.rigs : []
      // Try to find a matching user record (mining key may differ from player/cred key
      // if username was ever renamed, so fall back to key)
      const ex = map.get(mKey)
      const miningFields = {
        hasMining:   true,
        miningKey:   mKey,
        balance:     typeof u.balance      === 'number' ? u.balance      : 0,
        gems:        typeof u.gems         === 'number' ? u.gems         : 0,
        totalRigs:   rigs.length,
        activeRigs:  rigs.filter((r: any) => r.status === 'mining').length,
        joinDate:    typeof u.createdAt     === 'number' ? u.createdAt     : null,
        lastSeen:    typeof u.lastCheckedAt === 'number' ? u.lastCheckedAt : null,
        rewardCount: Array.isArray(u.rewardHistory) ? u.rewardHistory.length : 0,
      }
      if (ex) {
        Object.assign(ex, miningFields)
      } else {
        map.set(mKey, {
          key: mKey, username: u.username ?? mKey,
          hasCred: false, role: null, uuid: null,
          hasPlayer: false, avatar: null, region: null, ranks: null, topRank: null,
          credEnabled: null,
          ...miningFields,
        })
      }
    }

    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
  },
)

export const adminCreateUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username:     z.string().min(1).max(32),
    password:     z.string().min(1),
    role:         z.string().default('user'),
    addCred:      z.boolean(),
    addPlayer:    z.boolean(),
    addMining:    z.boolean(),
    region:       z.string().optional(),
    startingBC:   z.number().min(0).optional(),
    startingGems: z.number().min(0).optional(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; uuid: string }> => {
    const key     = data.username.toLowerCase()
    const creds   = readCredsFile()
    const players = readJson<any[]>('players.json')              ?? []
    const mining  = readJson<Record<string, any>>('mining-users.json') ?? {}

    const conflicts: string[] = []
    if (data.addCred   && creds.users.some(u => u.username.toLowerCase() === key))              conflicts.push('credentials')
    if (data.addPlayer && players.some((p: any) => String(p.name ?? '').toLowerCase() === key)) conflicts.push('player profiles')
    if (data.addMining && mining[key])                                                           conflicts.push('mining accounts')
    if (conflicts.length > 0) throw new Error(`DUPLICATE: "${data.username}" already exists in: ${conflicts.join(', ')}`)

    const { randomUUID } = await import('node:crypto')
    const uuid = randomUUID()

    if (data.addCred) {
      creds.users.push({ username: data.username, password: data.password, role: data.role, uuid })
      writeCredsFile(creds)
    }
    if (data.addPlayer) {
      players.push({
        name: data.username, head: `https://mc-heads.net/avatar/${encodeURIComponent(data.username)}`,
        region: data.region ?? 'North America',
        ranks:  { mace: 'NONE', sword: 'NONE', axe: 'NONE', uhc: 'NONE', nethpot: 'NONE', diapot: 'NONE', crystal: 'NONE' },
      })
      atomicWriteJson('players.json', deduplicateAndSort(players.map(normalizePlayer)))
    }
    if (data.addMining) {
      const now = Date.now()
      mining[key] = {
        username: data.username, createdAt: now, lastCheckedAt: now,
        balance: data.startingBC ?? 0, gems: data.startingGems ?? 0,
        rigs: [], rewardHistory: [], exchangeUsedToday: 0, exchangeResetAt: now,
      }
      atomicWriteJson('mining-users.json', mining)
    }

    return { success: true, uuid }
  })

export const adminUpdateUserPlayer = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username: z.string(),
    region:   z.string().optional(),
    head:     z.string().optional(),
    ranks:    z.record(z.string(), z.string()).optional(),
    create:   z.boolean().optional(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; created: boolean }> => {
    const key     = data.username.toLowerCase()
    const players = readJson<any[]>('players.json') ?? []
    const idx     = players.findIndex((p: any) => String(p.name ?? '').toLowerCase() === key)
    let created   = false

    if (idx === -1) {
      if (!data.create) throw new Error(`Player profile not found for "${data.username}"`)
      players.push({
        name: data.username, head: data.head ?? `https://mc-heads.net/avatar/${encodeURIComponent(data.username)}`,
        region: data.region ?? 'North America',
        ranks: data.ranks ?? { mace: 'NONE', sword: 'NONE', axe: 'NONE', uhc: 'NONE', nethpot: 'NONE', diapot: 'NONE', crystal: 'NONE' },
      })
      created = true
    } else {
      if (data.region !== undefined) players[idx].region = data.region
      if (data.head   !== undefined) players[idx].head   = data.head
      if (data.ranks  !== undefined) players[idx].ranks  = { ...players[idx].ranks, ...data.ranks }
    }

    atomicWriteJson('players.json', deduplicateAndSort(players.map(normalizePlayer)))
    return { success: true, created }
  })

export const adminUpdateUserCred = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username:    z.string(),
    newPassword: z.string().min(1).optional(),
    role:        z.string().optional(),
    enabled:     z.boolean().optional(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const key   = data.username.toLowerCase()
    const creds = readCredsFile()
    const idx   = creds.users.findIndex(u => u.username.toLowerCase() === key)
    if (idx === -1) throw new Error(`Credential account not found for "${data.username}"`)

    if (data.newPassword !== undefined) creds.users[idx].password = data.newPassword
    if (data.role        !== undefined) creds.users[idx].role     = data.role
    if (data.enabled     !== undefined) creds.users[idx].enabled  = data.enabled
    writeCredsFile(creds)
    return { success: true }
  })

export const adminUpdateUserMining = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username:     z.string(),
    balance:      z.number().min(0).optional(),
    gems:         z.number().min(0).optional(),
    create:       z.boolean().optional(),
    startingBC:   z.number().min(0).optional(),
    startingGems: z.number().min(0).optional(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; created: boolean }> => {
    const key    = data.username.toLowerCase()
    const mining = readJson<Record<string, any>>('mining-users.json') ?? {}
    let created  = false

    if (!mining[key]) {
      if (!data.create) throw new Error(`Mining account not found for "${data.username}"`)
      const now = Date.now()
      mining[key] = {
        username: data.username, createdAt: now, lastCheckedAt: now,
        balance: data.startingBC ?? 0, gems: data.startingGems ?? 0,
        rigs: [], rewardHistory: [], exchangeUsedToday: 0, exchangeResetAt: now,
      }
      created = true
    } else {
      if (data.balance !== undefined) mining[key].balance = data.balance
      if (data.gems    !== undefined) mining[key].gems    = data.gems
    }

    atomicWriteJson('mining-users.json', mining)
    return { success: true, created }
  })

// ─── Create mining account for an existing tier-list player ──────────────────
// Creates both a mining entry (mining-users.json) and a login credential
// (credentials.yml) so the player can log in to mine BlueCoin.
// The login username always equals the tier-list player name so all three stores
// share the same lowercase key and adminLoadUsers merges them into one row.

export const adminCreateMiningForPlayer = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    playerName:   z.string().min(1),   // existing name in players.json — becomes the mining/login username
    password:     z.string().min(1),
    startingBC:   z.number().min(0).optional(),
    startingGems: z.number().min(0).optional(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; uuid: string }> => {
    // The mining key and login username always equal the player name (lowercase key).
    // This is intentional: all three stores (players, creds, mining) are keyed by the same
    // username so adminLoadUsers can merge them into a single coherent row.
    const key = data.playerName.toLowerCase()

    const players = readJson<any[]>('players.json') ?? []
    const mining  = readJson<Record<string, any>>('mining-users.json') ?? {}
    const creds   = readCredsFile()

    // Verify the tier-list player exists
    if (!players.some((p: any) => String(p.name ?? '').toLowerCase() === key)) {
      throw new Error(`Player "${data.playerName}" not found in the tier list`)
    }
    // Guard against duplicates
    if (mining[key]) throw new Error(`DUPLICATE: Mining account for "${data.playerName}" already exists`)
    if (creds.users.some(u => u.username.toLowerCase() === key)) {
      throw new Error(`DUPLICATE: Login account for "${data.playerName}" already exists`)
    }

    const { randomUUID } = await import('node:crypto')
    const uuid = randomUUID()
    const now  = Date.now()

    // Create credential entry (same username as the tier-list player name)
    creds.users.push({ username: data.playerName, password: data.password, role: 'user', uuid })
    writeCredsFile(creds)

    // Create mining entry (keyed by lowercase player name to match adminLoadUsers aggregation)
    mining[key] = {
      username: data.playerName, createdAt: now, lastCheckedAt: now,
      balance: data.startingBC ?? 0, gems: data.startingGems ?? 0,
      rigs: [], rewardHistory: [], exchangeUsedToday: 0, exchangeResetAt: now,
    }
    atomicWriteJson('mining-users.json', mining)

    return { success: true, uuid }
  })

// ─── Rename a mining account (mining entry + credential + player profile) ─────
// Atomically updates the username across all three stores so adminLoadUsers
// continues to merge them into one coherent row after the rename.
// If a player profile with the old name exists it is renamed too; the same
// goes for the credential entry.

export const adminRenameMiningUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    currentUsername: z.string().min(1),
    newUsername:     z.string().min(1).max(32),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; renamedPlayer: boolean; renamedCred: boolean }> => {
    const oldKey = data.currentUsername.toLowerCase()
    const newKey = data.newUsername.toLowerCase()

    if (oldKey === newKey) return { success: true, renamedPlayer: false, renamedCred: false }

    const mining  = readJson<Record<string, any>>('mining-users.json') ?? {}
    const creds   = readCredsFile()
    const players = readJson<any[]>('players.json') ?? []

    if (!mining[oldKey]) throw new Error(`Mining account "${data.currentUsername}" not found`)
    if (mining[newKey])  throw new Error(`DUPLICATE: Mining account "${data.newUsername}" already exists`)
    if (creds.users.some(u => u.username.toLowerCase() === newKey)) {
      throw new Error(`DUPLICATE: Login account "${data.newUsername}" already exists`)
    }
    if (players.some((p: any) => String(p.name ?? '').toLowerCase() === newKey)) {
      throw new Error(`DUPLICATE: Player profile "${data.newUsername}" already exists`)
    }

    // 1. Rename mining entry: move to new key, update internal username
    mining[newKey] = { ...mining[oldKey], username: data.newUsername }
    delete mining[oldKey]
    atomicWriteJson('mining-users.json', mining)

    // 2. Rename credential entry if it exists (same lowercase key)
    let renamedCred = false
    const credIdx = creds.users.findIndex(u => u.username.toLowerCase() === oldKey)
    if (credIdx !== -1) {
      creds.users[credIdx].username = data.newUsername
      writeCredsFile(creds)
      renamedCred = true
    }

    // 3. Rename player profile if one exists with the same name, so the row
    //    stays aggregated under the new key in adminLoadUsers
    let renamedPlayer = false
    const playerIdx = players.findIndex((p: any) => String(p.name ?? '').toLowerCase() === oldKey)
    if (playerIdx !== -1) {
      players[playerIdx] = normalizePlayer({ ...players[playerIdx], name: data.newUsername })
      atomicWriteJson('players.json', deduplicateAndSort(players.map(normalizePlayer)))
      renamedPlayer = true
    }

    return { success: true, renamedPlayer, renamedCred }
  })

export const adminDeleteUser = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username:     z.string(),
    deleteCred:   z.boolean(),
    deletePlayer: z.boolean(),
    deleteMining: z.boolean(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; removed: string[] }> => {
    const key     = data.username.toLowerCase()
    const removed: string[] = []

    if (data.deleteCred) {
      const creds = readCredsFile()
      const before = creds.users.length
      creds.users  = creds.users.filter(u => u.username.toLowerCase() !== key)
      if (creds.users.length < before) { writeCredsFile(creds); removed.push('login account') }
    }
    if (data.deletePlayer) {
      let players  = readJson<any[]>('players.json') ?? []
      const before = players.length
      players      = players.filter((p: any) => String(p.name ?? '').toLowerCase() !== key)
      if (players.length < before) { atomicWriteJson('players.json', deduplicateAndSort(players.map(normalizePlayer))); removed.push('player profile') }
    }
    if (data.deleteMining) {
      const mining = readJson<Record<string, any>>('mining-users.json') ?? {}
      if (mining[key]) { delete mining[key]; atomicWriteJson('mining-users.json', mining); removed.push('mining account') }
    }

    return { success: true, removed }
  })

export const adminBulkDeleteUsers = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    usernames:    z.array(z.string()),
    deleteCred:   z.boolean(),
    deletePlayer: z.boolean(),
    deleteMining: z.boolean(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; count: number }> => {
    const keys = new Set(data.usernames.map(u => u.toLowerCase()))

    if (data.deleteCred) {
      const creds = readCredsFile()
      creds.users = creds.users.filter(u => !keys.has(u.username.toLowerCase()))
      writeCredsFile(creds)
    }
    if (data.deletePlayer) {
      let players = readJson<any[]>('players.json') ?? []
      players     = players.filter((p: any) => !keys.has(String(p.name ?? '').toLowerCase()))
      atomicWriteJson('players.json', deduplicateAndSort(players.map(normalizePlayer)))
    }
    if (data.deleteMining) {
      const mining = readJson<Record<string, any>>('mining-users.json') ?? {}
      for (const key of keys) delete mining[key]
      atomicWriteJson('mining-users.json', mining)
    }

    return { success: true, count: data.usernames.length }
  })

// ─── Auto-Backup Server Functions ────────────────────────────────────────────

export type { BackupStatus }

/** Full live status of the backup system. */
export const getBackupStatusFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<BackupStatus> => {
    return _getBackupStatus()
  })

/** Enable or disable the auto-backup scheduler; returns full updated status. */
export const setAutoBackupEnabled = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }): Promise<BackupStatus> => {
    setBackupEnabled(data.enabled)
    return _getBackupStatus()
  })

/** Change the debounce interval; returns full updated status. */
export const setBackupDebounce = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ ms: z.number().int().min(5000).max(1_800_000) }))
  .handler(async ({ data }): Promise<BackupStatus> => {
    setDebounceMs(data.ms)
    return _getBackupStatus()
  })

/** Trigger an immediate backup, bypassing the debounce. */
export const triggerBackupNow = createServerFn({ method: 'POST' })
  .handler(async (): Promise<{ ok: boolean; message: string; status: BackupStatus }> => {
    const before = _getBackupStatus()
    await flushBackupNow()
    const status = _getBackupStatus()
    if (status.lastBackupError) {
      return { ok: false, message: `Backup failed: ${status.lastBackupError}`, status }
    }
    if (status.totalBackups > before.totalBackups) {
      return { ok: true, message: status.lastBackupMessage ?? 'Backup committed', status }
    }
    return { ok: true, message: 'No changes — data unchanged since last commit', status }
  })

// ─── Live Site Sync State ─────────────────────────────────────────────────────
// The production server (server.mjs) writes data/sync-state.json after every
// GitHub pull. These server functions expose it to the admin UI and let the
// admin force an immediate re-sync.

export interface SyncState {
  lastSyncAt:          string | null
  lastCommitSha:       string | null
  lastCommitMessage:   string | null
  filesUpdated:        number
  filesFailed:         number
  iconsUpdated:        number
  triggeredBy:         'startup' | 'auto' | 'admin' | 'server-fn'
  nextAutoSyncAt:      string | null
  fileResults:         Array<{ file: string; ok: boolean; bytes?: number; error?: string }>
}

export interface StaticSyncResult {
  success:           boolean
  filesUpdated:      number
  filesFailed:       number
  iconsUpdated:      number
  lastCommitSha:     string | null
  lastCommitMessage: string | null
  logs:              string[]
  error?:            string
}

// Static data repo paths — these are the admin-controlled files we pull.
// NEVER includes user data: mining-users.json, shop-purchases.json, etc.
const STATIC_REPO_PATHS = [
  { repoPath: 'data/players.json',      file: 'players.json' },
  { repoPath: 'data/gamemodes.json',    file: 'gamemodes.json' },
  { repoPath: 'data/content.json',      file: 'content.json' },
  { repoPath: 'data/event.json',        file: 'event.json' },
  { repoPath: 'data/economy.json',      file: 'economy.json' },
  { repoPath: 'data/homepage.json',     file: 'homepage.json' },
  { repoPath: 'data/tier-tagger.json',  file: 'tier-tagger.json' },
  { repoPath: 'data/ads-config.json',   file: 'ads-config.json' },
  { repoPath: 'data/growth.json',       file: 'growth.json' },
  { repoPath: 'data/shop-items.json',   file: 'shop-items.json' },
  { repoPath: 'data/tournaments.json',  file: 'tournaments.json' },
]

const SYNC_STATE_FILE_PATH = resolve(process.cwd(), 'data', 'sync-state.json')

/** Read the current sync-state.json produced by the production server. */
export const getSyncState = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SyncState | null> => {
    try {
      const raw = readFileSync(SYNC_STATE_FILE_PATH, 'utf8')
      return JSON.parse(raw) as SyncState
    } catch {
      return null
    }
  },
)

/**
 * Pull all STATIC data files from GitHub and write them to disk.
 * Safe to run in both dev and production — never touches player/purchase data.
 * Called by the admin "Force Refresh" button in GitHubBridge.
 */
export const pullStaticDataFromGitHub = createServerFn({ method: 'POST' }).handler(
  async (): Promise<StaticSyncResult> => {
    const { mkdirSync, renameSync: fsRename, writeFileSync: fsWrite } = await import('node:fs')
    const logs: string[] = []

    const token = resolveTokenSource()?.token
    if (!token) {
      return { success: false, filesUpdated: 0, filesFailed: 0, iconsUpdated: 0, lastCommitSha: null, lastCommitMessage: null, logs, error: 'GitHub token not configured' }
    }

    const { owner, repo, branch } = readRepoConfig()
    const ghHeaders = buildGHHeaders(token)

    let filesUpdated = 0
    let filesFailed  = 0
    const fileResults: SyncState['fileResults'] = []

    mkdirSync(DATA_DIR, { recursive: true })

    logs.push(`→ Pulling ${STATIC_REPO_PATHS.length} static data files from GitHub…`)

    // Fetch each static file
    for (const { repoPath, file } of STATIC_REPO_PATHS) {
      try {
        const remote = await fetchRemoteFile(token, repoPath)
        if (!remote) {
          logs.push(`⚠ ${file} — not found in GitHub`)
          fileResults.push({ file: repoPath, ok: false, error: 'Not found in GitHub' })
          filesFailed++
          continue
        }
        // Validate JSON
        JSON.parse(remote)
        // Atomic write
        const target = resolve(DATA_DIR, file)
        const tmp    = `${target}.tmp`
        fsWrite(tmp, remote, 'utf8')
        fsRename(tmp, target)
        logs.push(`✓ ${file} (${(remote.length / 1024).toFixed(1)} KB)`)
        fileResults.push({ file: repoPath, ok: true, bytes: remote.length })
        filesUpdated++
      } catch (e: any) {
        logs.push(`✗ ${file} — ${(e as Error).message.slice(0, 80)}`)
        fileResults.push({ file: repoPath, ok: false, error: (e as Error).message.slice(0, 80) })
        filesFailed++
      }
    }

    // Sync icon files
    let iconsUpdated = 0
    try {
      const listRes = await fetch(
        `${BASE}/repos/${owner}/${repo}/contents/public/icons?ref=${branch}`,
        { headers: ghHeaders },
      )
      if (listRes.ok) {
        const items = await listRes.json() as Array<{ name: string; download_url: string; type: string }>
        const iconsDir = resolve(process.cwd(), 'public', 'icons')
        mkdirSync(iconsDir, { recursive: true })
        for (const item of items) {
          if (item.type !== 'file' || !/\.(png|jpg|jpeg|gif|webp)$/i.test(item.name)) continue
          try {
            const dl = await fetch(item.download_url)
            if (dl.ok) {
              fsWrite(resolve(iconsDir, item.name), Buffer.from(await dl.arrayBuffer()))
              iconsUpdated++
            }
          } catch { /* skip */ }
        }
        if (iconsUpdated > 0) logs.push(`✓ ${iconsUpdated} icon file${iconsUpdated !== 1 ? 's' : ''} updated`)
      }
    } catch { /* icons are optional */ }

    // Get latest commit info
    let lastCommitSha:     string | null = null
    let lastCommitMessage: string | null = null
    try {
      const commitRes = await fetch(
        `${BASE}/repos/${owner}/${repo}/commits/${branch}`,
        { headers: ghHeaders },
      )
      if (commitRes.ok) {
        const c = await commitRes.json() as { sha: string; commit: { message: string } }
        lastCommitSha     = c.sha
        lastCommitMessage = c.commit?.message?.split('\n')[0] ?? null
      }
    } catch { /* optional */ }

    if (lastCommitSha) logs.push(`✓ Synced to commit ${lastCommitSha.slice(0, 7)}: ${lastCommitMessage ?? ''}`)

    // Write sync state
    const now = new Date()
    const state: SyncState = {
      lastSyncAt:        now.toISOString(),
      lastCommitSha,
      lastCommitMessage,
      filesUpdated,
      filesFailed,
      iconsUpdated,
      triggeredBy:       'server-fn',
      nextAutoSyncAt:    null,   // next auto-sync is managed by server.mjs
      fileResults,
    }
    try {
      const content = JSON.stringify(state, null, 2)
      const tmp = `${SYNC_STATE_FILE_PATH}.tmp`
      fsWrite(tmp, content, 'utf8')
      fsRename(tmp, SYNC_STATE_FILE_PATH)
    } catch { /* non-critical */ }

    const summary = `${filesUpdated} file${filesUpdated !== 1 ? 's' : ''} updated, ${filesFailed} failed`
    logs.push(filesUpdated > 0 ? `✓ Done — ${summary}` : `⚠ Done — ${summary}`)

    return {
      success: filesFailed === 0 || filesUpdated > 0,
      filesUpdated,
      filesFailed,
      iconsUpdated,
      lastCommitSha,
      lastCommitMessage,
      logs,
    }
  },
)
