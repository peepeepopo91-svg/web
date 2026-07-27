/**
 * Production server for Replit deployment.
 * Serves static assets from dist/client/ and SSR via TanStack Start.
 *
 * ── Live Site Auto-Sync ──────────────────────────────────────────────────────
 * Fetches STATIC admin data from GitHub on startup and on a configurable
 * interval (default 5 min, reads from data/sync-config.json each tick).
 *
 * PROTECTED — NEVER overwritten:
 *   mining-users.json, shop-purchases.json, mining-community.json,
 *   mining-access.json, sync-history.json, credentials.yml, admin.yml
 */

import { serve }                            from 'srvx/node'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { readFileSync, renameSync }         from 'node:fs'
import { join, extname, resolve }           from 'node:path'

const { default: tsServer } = await import('./dist/server/server.js')

const MIME = {
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webp': 'image/webp',
}

const CLIENT_DIR = new URL('./dist/client', import.meta.url).pathname
const PORT       = Number(process.env.PORT) || 5000
const CWD        = process.cwd()

// ─── Static data files synced FROM GitHub (NEVER includes user data) ──────────

const STATIC_DATA_REPO_PATHS = [
  'data/players.json',
  'data/gamemodes.json',
  'data/content.json',
  'data/event.json',
  'data/economy.json',
  'data/homepage.json',
  'data/tier-tagger.json',
  'data/ads-config.json',
  'data/growth.json',
  'data/shop-items.json',
  'data/tournaments.json',
]

const SYNC_STATE_PATH  = resolve(CWD, 'data', 'sync-state.json')
const SYNC_CONFIG_PATH = resolve(CWD, 'data', 'sync-config.json')
const MAX_HISTORY      = 30

// ─── Config helpers ───────────────────────────────────────────────────────────

function readGHToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  try {
    const d = JSON.parse(readFileSync(resolve(CWD, '.github-token.json'), 'utf-8'))
    return typeof d.token === 'string' && d.token.trim() ? d.token.trim() : null
  } catch { return null }
}

function readGHConfig() {
  try { return JSON.parse(readFileSync(resolve(CWD, 'data', 'github-config.json'), 'utf-8')) }
  catch { return null }
}

function readSyncConfig() {
  try {
    const d = JSON.parse(readFileSync(SYNC_CONFIG_PATH, 'utf-8'))
    return {
      intervalMs:  typeof d.intervalMs  === 'number' ? d.intervalMs  : 300_000,
      startupSync: d.startupSync !== false,
    }
  } catch { return { intervalMs: 300_000, startupSync: true } }
}

function readCurrentSyncState() {
  try { return JSON.parse(readFileSync(SYNC_STATE_PATH, 'utf-8')) }
  catch { return null }
}

async function atomicWrite(path, content) {
  const tmp = path + '.tmp'
  await writeFile(tmp, content, 'utf-8')
  renameSync(tmp, path)
}

// ─── Core sync function ───────────────────────────────────────────────────────

async function doGitHubSync(triggeredBy = 'auto') {
  const token  = readGHToken()
  const config = readGHConfig()

  if (!token || !config) {
    console.log('[sync] GitHub not configured — skipping')
    return { success: false }
  }

  const { owner, repo, branch } = config
  const BASE    = 'https://api.github.com'
  const headers = {
    Authorization:          `Bearer ${token}`,
    Accept:                 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  let filesUpdated = 0, filesFailed = 0
  const fileResults = []

  await mkdir(resolve(CWD, 'data'), { recursive: true })

  for (const repoPath of STATIC_DATA_REPO_PATHS) {
    try {
      const res  = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${repoPath}?ref=${branch}`, { headers })
      if (!res.ok) { filesFailed++; fileResults.push({ file: repoPath, ok: false, error: `HTTP ${res.status}` }); continue }
      const data    = await res.json()
      const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
      JSON.parse(content)  // validate
      await atomicWrite(resolve(CWD, repoPath), content)
      filesUpdated++
      fileResults.push({ file: repoPath, ok: true, bytes: content.length })
    } catch (e) {
      filesFailed++
      fileResults.push({ file: repoPath, ok: false, error: e.message })
    }
  }

  // Icons
  let iconsUpdated = 0
  try {
    const iconsRes = await fetch(`${BASE}/repos/${owner}/${repo}/contents/public/icons?ref=${branch}`, { headers })
    if (iconsRes.ok) {
      const items    = await iconsRes.json()
      const iconsDir = resolve(CWD, 'public', 'icons')
      await mkdir(iconsDir, { recursive: true })
      for (const item of items) {
        if (item.type !== 'file' || !/\.(png|jpg|jpeg|gif|webp)$/i.test(item.name)) continue
        try {
          const dl = await fetch(item.download_url)
          if (dl.ok) { await writeFile(resolve(iconsDir, item.name), Buffer.from(await dl.arrayBuffer())); iconsUpdated++ }
        } catch {}
      }
    }
  } catch {}

  // Latest commit
  let lastCommitSha = null, lastCommitMessage = null
  try {
    const cr = await fetch(`${BASE}/repos/${owner}/${repo}/commits/${branch}`, { headers })
    if (cr.ok) { const c = await cr.json(); lastCommitSha = c.sha; lastCommitMessage = c.commit?.message?.split('\n')[0] ?? null }
  } catch {}

  // Build state with history
  const existing = readCurrentSyncState()
  const prevHistory = Array.isArray(existing?.history) ? existing.history : []
  const now = new Date()

  const historyEntry = {
    at:            now.toISOString(),
    commitSha:     lastCommitSha,
    commitMessage: lastCommitMessage,
    filesUpdated,
    filesFailed,
    iconsUpdated,
    triggeredBy,
  }

  const cfg = readSyncConfig()
  const state = {
    lastSyncAt:        now.toISOString(),
    lastCommitSha,
    lastCommitMessage,
    filesUpdated,
    filesFailed,
    iconsUpdated,
    triggeredBy,
    nextAutoSyncAt:    cfg.intervalMs > 0 ? new Date(now.getTime() + cfg.intervalMs).toISOString() : null,
    fileResults,
    history:           [...prevHistory.slice(-(MAX_HISTORY - 1)), historyEntry],
  }

  try { await atomicWrite(SYNC_STATE_PATH, JSON.stringify(state, null, 2)) } catch {}

  console.log(`[sync] ${triggeredBy}: ${filesUpdated}+${iconsUpdated}ico updated, ${filesFailed} failed — ${lastCommitSha?.slice(0, 7) ?? '?'}`)
  return { success: true, ...state }
}

// ─── Self-scheduling sync (reads config each tick) ────────────────────────────

function scheduleNextSync(overrideDelayMs) {
  const cfg   = readSyncConfig()
  const delay = overrideDelayMs ?? (cfg.intervalMs > 0 ? cfg.intervalMs : null)
  if (!delay) return  // auto-sync disabled
  setTimeout(async () => {
    await doGitHubSync('auto').catch(e => console.error('[sync] error:', e.message))
    scheduleNextSync()  // re-read config for next interval
  }, delay)
}

const startupCfg = readSyncConfig()
if (startupCfg.startupSync) {
  doGitHubSync('startup').catch(e => console.error('[sync] startup error:', e.message))
}
scheduleNextSync(startupCfg.intervalMs > 0 ? startupCfg.intervalMs : null)

// ─── SSE handler ─────────────────────────────────────────────────────────────

function handleSSE(req) {
  let closed = false
  const stream = new ReadableStream({
    start(controller) {
      const enc   = new TextEncoder()
      const write = d => { if (!closed) try { controller.enqueue(enc.encode(d)) } catch { cleanup() } }
      if (!globalThis.__miningSSEClients) globalThis.__miningSSEClients = new Set()
      globalThis.__miningSSEClients.add(write)
      write(': connected\n\n')
      const hb = setInterval(() => write(': ping\n\n'), 25_000)
      function cleanup() {
        if (closed) return; closed = true; clearInterval(hb)
        globalThis.__miningSSEClients?.delete(write); try { controller.close() } catch {}
      }
      if (req.signal) req.signal.addEventListener('abort', cleanup, { once: true })
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
  })
}

// ─── Server ───────────────────────────────────────────────────────────────────

serve({
  port: PORT,
  hostname: '0.0.0.0',
  fetch: async (req) => {
    const url = new URL(req.url)

    if ((url.pathname === '/api/mining-events' || url.pathname === '/api/tournament-events') && req.method === 'GET')
      return handleSSE(req)

    // Public sync-status endpoint (read-only, used by admin UI)
    if (url.pathname === '/api/sync-status' && req.method === 'GET') {
      try {
        return new Response(await readFile(SYNC_STATE_PATH, 'utf-8'), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } })
      } catch {
        return new Response(JSON.stringify({ lastSyncAt: null }), { headers: { 'Content-Type': 'application/json' } })
      }
    }

    // Sync config endpoint (read-only)
    if (url.pathname === '/api/sync-config' && req.method === 'GET') {
      try {
        return new Response(await readFile(SYNC_CONFIG_PATH, 'utf-8'), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } })
      } catch {
        return new Response(JSON.stringify({ intervalMs: 300000, startupSync: true }), { headers: { 'Content-Type': 'application/json' } })
      }
    }

    // Admin force-sync trigger (validated by shared secret)
    if (url.pathname === '/api/admin/trigger-sync' && req.method === 'POST') {
      const key      = req.headers.get('x-sync-key') ?? ''
      const secret   = process.env.SESSION_SECRET ?? ''
      const expected = secret.slice(-16)
      if (!expected || key !== expected) return new Response('Forbidden', { status: 403 })
      const result = await doGitHubSync('admin')
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }

    // Player API
    const playerMatch = url.pathname.match(/^\/api\/([^/]+)$/)
    if (playerMatch && req.method === 'GET') {
      const name    = decodeURIComponent(playerMatch[1])
      const hd      = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      try {
        const players = JSON.parse(await readFile(resolve(CWD, 'data/players.json'), 'utf-8'))
        const player  = players.find(p => p.name.toLowerCase() === name.toLowerCase())
        if (!player) return new Response(JSON.stringify({ error: 'Player not found' }), { status: 404, headers: hd })
        const tiers = {}
        for (const [mode, tier] of Object.entries(player.ranks))
          tiers[mode] = (tier === 'NONE' || tier === 'None' || tier === 'none') ? null : tier
        return new Response(JSON.stringify({ player: player.name, region: player.region, tiers }), { headers: hd })
      } catch { return new Response(JSON.stringify({ error: 'Failed to read player data' }), { status: 500, headers: hd }) }
    }

    // Static files
    const filePath = join(CLIENT_DIR, url.pathname)
    try {
      const s = await stat(filePath)
      if (s.isFile()) {
        const data = await readFile(filePath)
        const ext  = extname(filePath)
        return new Response(data, {
          headers: { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': url.pathname.startsWith('/assets/') ? 'max-age=31536000, immutable' : 'no-cache' },
        })
      }
    } catch {}

    return tsServer.fetch(req)
  },
})

console.log(`Server listening on http://localhost:${PORT}`)
