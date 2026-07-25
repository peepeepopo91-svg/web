// ─── GitHub token store — shared server utility ────────────────────────────────
// Resolves the GitHub token from: env var → panel-saved JSON file.
// readFileSync is ONLY called inside function bodies — never at module level —
// so Vite's server/client split handles this file correctly.

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve }                                  from 'node:path'

export const TOKEN_FILE = resolve(process.cwd(), '.github-token.json')

/** Env var takes priority; file is the panel-saved fallback. */
export function resolveGitHubToken(): string | null {
  const envTok = process.env.GITHUB_TOKEN
  if (envTok) return envTok
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) as { token?: string }
    if (typeof data.token === 'string' && data.token.trim()) return data.token.trim()
  } catch { /* file missing or invalid */ }
  return null
}

/**
 * Like resolveGitHubToken but also tells you which source won.
 * File wins for *source tracking* (shows "managed via panel" badge),
 * but env still provides the token when the file has nothing.
 */
export function resolveTokenSource(): { token: string; source: 'env' | 'file' } | null {
  // Check file first — if present, it was explicitly set via the panel
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) as { token?: string }
    const tok = data.token
    if (typeof tok === 'string' && tok.trim()) return { token: tok.trim(), source: 'file' }
  } catch { /* ok */ }

  const envTok = process.env.GITHUB_TOKEN
  if (envTok) return { token: envTok, source: 'env' }

  return null
}

/** Write token to the panel file and also inject into process.env immediately. */
export function persistToken(token: string): void {
  writeFileSync(TOKEN_FILE, JSON.stringify({ token }, null, 2), 'utf8')
  process.env.GITHUB_TOKEN = token
}

/** Remove panel-saved token. Returns true if the file existed. */
export function eraseToken(): boolean {
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) as { token?: string }
    if (data.token) {
      unlinkSync(TOKEN_FILE)
      delete process.env.GITHUB_TOKEN
      return true
    }
  } catch { /* file not found */ }
  return false
}
