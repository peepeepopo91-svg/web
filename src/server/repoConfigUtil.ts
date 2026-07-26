// ─── Repository Config Utilities — server-only ───────────────────────────────
// Plain sync helpers for reading/writing github-config.json.
// IMPORTANT: This file must only be imported from server-side code
// (server function handlers, other server utilities). Never import it
// from client components — use repoConfig.ts (createServerFn) instead.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve }                                from 'node:path'
import type { RepoConfig }                        from './repoConfig'

export const CONFIG_FILE = resolve(process.cwd(), 'data', 'github-config.json')

export const DEFAULT_CONFIG: RepoConfig = {
  owner:  'peepeepopo91-svg',
  repo:   'rupa',
  branch: 'main',
}

/** Read config from disk — synchronous, fast. Falls back to DEFAULT_CONFIG. */
export function readRepoConfig(): RepoConfig {
  try {
    const raw    = readFileSync(CONFIG_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<RepoConfig>
    return {
      owner:  (typeof parsed.owner  === 'string' && parsed.owner.trim())  ? parsed.owner.trim()  : DEFAULT_CONFIG.owner,
      repo:   (typeof parsed.repo   === 'string' && parsed.repo.trim())   ? parsed.repo.trim()   : DEFAULT_CONFIG.repo,
      branch: (typeof parsed.branch === 'string' && parsed.branch.trim()) ? parsed.branch.trim() : DEFAULT_CONFIG.branch,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/** Write config to disk atomically. */
export function writeRepoConfig(config: RepoConfig): void {
  mkdirSync(resolve(process.cwd(), 'data'), { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
}
