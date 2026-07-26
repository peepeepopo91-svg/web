// ─── GitHub Git Data API — server-only ───────────────────────────────────────
// Uses the low-level Git Data API to create a single atomic commit for
// multiple file changes. Never exposes GITHUB_TOKEN to the client.
// Repository target is read from data/github-config.json at call time.

import { resolveGitHubToken } from './tokenStore'
import { readRepoConfig }     from './repoConfigUtil'

const BASE = 'https://api.github.com'

function getToken(): string {
  const token = resolveGitHubToken()
  if (!token) throw new Error('GITHUB_TOKEN secret is not configured')
  return token
}

function buildHeaders(): Record<string, string> {
  return {
    Authorization:          `Bearer ${getToken()}`,
    Accept:                 'application/vnd.github+json',
    'Content-Type':         'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function ghFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: buildHeaders() })
  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new Error(`GitHub API ${res.status} on ${path}: ${body}`)
  }
  return res.json()
}

// ─── Batch commit (Git Data API tree approach) ────────────────────────────────

export async function commitFiles(
  files: Array<{ path: string; content: string; encoding?: 'utf-8' | 'base64' }>,
  message: string,
): Promise<{ sha: string }> {
  if (files.length === 0) throw new Error('commitFiles: no files provided')

  const { owner, repo, branch } = readRepoConfig()

  // 1. Current HEAD commit SHA
  const ref     = await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`)
  const headSha: string = ref.object.sha

  // 2. Current commit's tree SHA
  const headCommit   = await ghFetch(`/repos/${owner}/${repo}/git/commits/${headSha}`)
  const baseTreeSha: string = headCommit.tree.sha

  // 3. Create a blob for each file (in parallel)
  const blobs = await Promise.all(
    files.map(f =>
      ghFetch(`/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: f.content, encoding: f.encoding ?? 'utf-8' }),
      }),
    ),
  )

  // 4. Create a new tree
  const newTree = await ghFetch(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: files.map((f, i) => ({
        path: f.path,
        mode: '100644',
        type: 'blob',
        sha:  blobs[i].sha,
      })),
    }),
  })

  // 5. Create the commit
  const newCommit = await ghFetch(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] }),
  })

  // 6. Advance the branch ref
  await ghFetch(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  })

  return { sha: newCommit.sha }
}

// ─── Repo status (latest commit) ─────────────────────────────────────────────

export interface RepoStatus {
  connected:    boolean
  branch:       string
  owner:        string
  repo:         string
  latestCommit: { message: string; sha: string; date: string } | null
}

export async function getRepoStatus(): Promise<RepoStatus> {
  const { owner, repo, branch } = readRepoConfig()
  try {
    const data = await ghFetch(`/repos/${owner}/${repo}/commits/${branch}`)
    return {
      connected: true,
      branch,
      owner,
      repo,
      latestCommit: {
        message: data.commit.message,
        sha:     (data.sha as string).slice(0, 7),
        date:    data.commit.author.date,
      },
    }
  } catch {
    return { connected: false, branch, owner, repo, latestCommit: null }
  }
}
