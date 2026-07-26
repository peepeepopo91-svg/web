// ─── Repository Config Server Functions ──────────────────────────────────────
// Exposes configurable GitHub repository target via TanStack Start server fns.
// This file has NO node:fs imports — it uses dynamic imports inside handlers
// so Vite can safely code-split it for the browser bundle.
//
// For server-side utilities that call readRepoConfig() directly,
// import from ./repoConfigUtil instead.

import { createServerFn } from '@tanstack/react-start'
import { z }              from 'zod'

// ─── Shared types (safe to import in client code) ─────────────────────────────

export interface RepoConfig {
  owner:  string
  repo:   string
  branch: string
}

export interface RepoConnectionTest {
  repoExists:      boolean
  branchExists:    boolean
  writePermission: boolean
  repoFullName:    string | null
  defaultBranch:   string | null
  error:           string | null
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const getRepoConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RepoConfig> => {
    const { readRepoConfig } = await import('./repoConfigUtil')
    return readRepoConfig()
  },
)

export const saveRepoConfig = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    owner:  z.string().min(1),
    repo:   z.string().min(1),
    branch: z.string().min(1),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; config: RepoConfig }> => {
    const { writeRepoConfig } = await import('./repoConfigUtil')
    const config: RepoConfig = {
      owner:  data.owner.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, ''),
      repo:   data.repo.trim().replace(/\.git$/, ''),
      branch: data.branch.trim(),
    }
    writeRepoConfig(config)
    return { success: true, config }
  })

export const testRepoConnection = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    owner:  z.string().min(1),
    repo:   z.string().min(1),
    branch: z.string().min(1),
  }))
  .handler(async ({ data }): Promise<RepoConnectionTest> => {
    const { resolveTokenSource } = await import('./tokenStore')
    const token = resolveTokenSource()?.token
    const out: RepoConnectionTest = {
      repoExists: false, branchExists: false, writePermission: false,
      repoFullName: null, defaultBranch: null, error: null,
    }
    if (!token) { out.error = 'No GitHub token configured'; return out }

    const BASE    = 'https://api.github.com'
    const headers = {
      Authorization:          `Bearer ${token}`,
      Accept:                 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    try {
      const repoRes = await fetch(`${BASE}/repos/${data.owner}/${data.repo}`, { headers })
      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          out.error = `Repository ${data.owner}/${data.repo} not found or you don't have access`
        } else if (repoRes.status === 401 || repoRes.status === 403) {
          out.error = `Authentication failed (HTTP ${repoRes.status}) — check your token`
        } else {
          out.error = `GitHub API error: HTTP ${repoRes.status}`
        }
        return out
      }
      out.repoExists = true
      const repoData = await repoRes.json() as {
        full_name:      string
        default_branch: string
        permissions?:   { push?: boolean }
      }
      out.repoFullName    = repoData.full_name
      out.defaultBranch   = repoData.default_branch
      out.writePermission = repoData.permissions?.push ?? false

      const branchRes = await fetch(
        `${BASE}/repos/${data.owner}/${data.repo}/git/refs/heads/${data.branch}`,
        { headers },
      )
      out.branchExists = branchRes.ok
      if (!branchRes.ok) {
        out.error = `Branch '${data.branch}' not found — repo default branch is '${repoData.default_branch}'`
      }
    } catch (e) {
      out.error = e instanceof Error ? e.message : 'Network error'
    }
    return out
  })
