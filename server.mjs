/**
 * Production server for Replit deployment.
 * Serves static assets from dist/client/ and SSR via TanStack Start.
 * Also handles /api/mining-events and /api/tournament-events as SSE endpoints.
 *
 * ── Live Site Auto-Sync ──────────────────────────────────────────────────────
 * On startup, and then every 5 minutes, this server fetches the latest STATIC
 * admin-controlled data files from GitHub and writes them to disk.
 *
 * PROTECTED files — NEVER overwritten by GitHub sync (player-generated data):
 *   data/mining-users.json   ← player balances, mining rigs
 *   data/shop-purchases.json ← purchase history
 *   data/mining-community.json
 *   data/mining-access.json
 *   data/sync-history.json
 *   credentials.yml / admin.yml / .github-token.json
 */

import { serve }                            from 'srvx/node'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { readFileSync, renameSync }         from 'node:fs'
import { join, extname, resolve }           from 'node:path'

// Dynamically import the built TanStack Start SSR bundle
const { default: tsServer } = await import('./dist/server/server.js')

// ─── MIME types ──────────────────────────────────────────────────────────────

const MIME = {
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.html':  'text/html',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.webp':  'image/webp',
}

const CLIENT_DIR = new URL('./dist/client', import.meta.url).pathname
const PORT       = Number(process.env.PORT) || 5000
const CWD        = process.cwd()

// ─── GitHub Auto-Sync ─────────────────────────────────────────────────────────
// These are the STATIC admin-controlled files pulled from GitHub.
// Player / economy / transaction data is NEVER touched.

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

const SYNC_STATE_PATH = resolve(CWD, 'data', 'sync-state.json')
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000  // 5 minutes

/** Read the GitHub token from env var → panel file. */
function readGHToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  try {
    const raw = readFileSync(resolve(CWD, '.github-token.json'), 'utf-8')
    const d   = JSON.parse(raw)
    if (typeof d.token === 'string' && d.token.trim()) return d.token.trim()
  } catch { /* not configured yet */ }
  return null
}

/** Read owner/repo/branch from data/github-config.json. */
function readGHConfig() {
  try {
    const raw = readFileSync(resolve(CWD, 'data', 'github-config.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Atomically write a file: write .tmp first, then rename. */
async function atomicWrite(path, content) {
  const tmp = path + '.tmp'
  await writeFile(tmp, content, 'utf-8')
  renameSync(tmp, path)
}

/**
 * Pull all static data files from GitHub and write them to disk.
 * Also syncs public/icons/*.
 * Returns a summary written to data/sync-state.json.
 */
async function doGitHubSync(triggeredBy = 'auto') {
  const token  = readGHToken()
  const config = readGHConfig()

  if (!token || !config) {
    return { success: false, reason: 'GitHub not configured — set token via admin panel', triggeredBy }
  }

  const { owner, repo, branch } = config
  const BASE    = 'https://api.github.com'
  const headers = {
    Authorization:          `Bearer ${token}`,
    Accept:                 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  let filesUpdated = 0
  let filesFailed  = 0
  const fileResults = []

  // ── Fetch each static data file ──────────────────────────────────────────
  await mkdir(resolve(CWD, 'data'), { recursive: true })

  for (const repoPath of STATIC_DATA_REPO_PATHS) {
    try {
      const res = await fetch(
        `${BASE}/repos/${owner}/${repo}/contents/${repoPath}?ref=${branch}`,
        { headers },
      )
      if (!res.ok) {
        fileResults.push({ file: repoPath, ok: false, error: `HTTP ${res.status}` })
        filesFailed++
        continue
      }
      const data    = await res.json()
      const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')

      // Validate JSON before writing — never corrupt a data file
      JSON.parse(content)

      const localPath = resolve(CWD, repoPath)
      await atomicWrite(localPath, content)
      fileResults.push({ file: repoPath, ok: true, bytes: content.length })
      filesUpdated++
    } catch (e) {
      fileResults.push({ file: repoPath, ok: false, error: e.message })
      filesFailed++
    }
  }

  // ── Sync icon files from public/icons/ ───────────────────────────────────
  let iconsUpdated = 0
  try {
    const iconsRes = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/public/icons?ref=${branch}`,
      { headers },
    )
    if (iconsRes.ok) {
      const items = await iconsRes.json()
      const iconsDir = resolve(CWD, 'public', 'icons')
      await mkdir(iconsDir, { recursive: true })
      for (const item of items) {
        if (item.type !== 'file' || !/\.(png|jpg|jpeg|gif|webp)$/i.test(item.name)) continue
        try {
          const dl = await fetch(item.download_url)
          if (dl.ok) {
            await writeFile(resolve(iconsDir, item.name), Buffer.from(await dl.arrayBuffer()))
            iconsUpdated++
          }
        } catch { /* icon failed — skip */ }
      }
    }
  } catch { /* icons are optional */ }

  // ── Get latest commit info ────────────────────────────────────────────────
  let latestCommitSha     = null
  let latestCommitMessage = null
  try {
    const commitRes = await fetch(
      `${BASE}/repos/${owner}/${repo}/commits/${branch}`,
      { headers },
    )
    if (commitRes.ok) {
      const c = await commitRes.json()
      latestCommitSha     = c.sha
      latestCommitMessage = c.commit?.message?.split('\n')[0] ?? null
    }
  } catch { /* commit info is optional */ }

  // ── Write sync state ──────────────────────────────────────────────────────
  const now      = new Date()
  const nextSync = new Date(now.getTime() + AUTO_SYNC_INTERVAL_MS)
  const state = {
    lastSyncAt:          now.toISOString(),
    lastCommitSha:       latestCommitSha,
    lastCommitMessage:   latestCommitMessage,
    filesUpdated,
    filesFailed,
    iconsUpdated,
    triggeredBy,
    nextAutoSyncAt:      nextSync.toISOString(),
    fileResults,
  }
  try {
    await atomicWrite(SYNC_STATE_PATH, JSON.stringify(state, null, 2))
  } catch { /* non-critical */ }

  const shaStr = latestCommitSha?.slice(0, 7) ?? 'unknown'
  console.log(`[github-sync] ${triggeredBy}: ${filesUpdated} files + ${iconsUpdated} icons updated, ${filesFailed} failed — HEAD ${shaStr}`)

  return { success: true, ...state }
}

// ── Run sync on startup, then every 5 minutes ────────────────────────────────
doGitHubSync('startup').catch(e => console.error('[github-sync] startup sync error:', e.message))
setInterval(() => {
  doGitHubSync('auto').catch(e => console.error('[github-sync] periodic sync error:', e.message))
}, AUTO_SYNC_INTERVAL_MS)

// ─── SSE helper ───────────────────────────────────────────────────────────────

function handleSSE(req) {
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const enc  = new TextEncoder()
      const write = (data) => {
        if (closed) return
        try { controller.enqueue(enc.encode(data)) } catch { cleanup() }
      }

      if (!globalThis.__miningSSEClients) globalThis.__miningSSEClients = new Set()
      globalThis.__miningSSEClients.add(write)

      write(': connected\n\n')

      const heartbeat = setInterval(() => write(': ping\n\n'), 25_000)

      function cleanup() {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        globalThis.__miningSSEClients?.delete(write)
        try { controller.close() } catch {}
      }

      if (req.signal) req.signal.addEventListener('abort', cleanup, { once: true })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream; charset=utf-8',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ─── Server ───────────────────────────────────────────────────────────────────

serve({
  port: PORT,
  hostname: '0.0.0.0',
  fetch: async (req) => {
    const url = new URL(req.url)

    // ── SSE endpoints ──────────────────────────────────────────────────────
    if ((url.pathname === '/api/mining-events' || url.pathname === '/api/tournament-events') && req.method === 'GET') {
      return handleSSE(req)
    }

    // ── Sync status (public, read-only) ────────────────────────────────────
    // Used by the admin GitHubBridge panel to show live site sync state.
    if (url.pathname === '/api/sync-status' && req.method === 'GET') {
      try {
        const raw  = await readFile(SYNC_STATE_PATH, 'utf-8')
        const data = JSON.parse(raw)
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        })
      } catch {
        return new Response(JSON.stringify({ lastSyncAt: null, reason: 'No sync yet' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // ── Force sync trigger (admin-initiated via server function) ───────────
    // This endpoint is called from the TanStack Start server function
    // pullStaticDataFromGitHub, which runs server-side. The sync itself
    // is handled by doGitHubSync(); this endpoint is a direct HTTP trigger
    // for cases where the server function context isn't available.
    if (url.pathname === '/api/admin/trigger-sync' && req.method === 'POST') {
      // Simple shared-secret check: must pass X-Sync-Key matching the last
      // 12 chars of the SESSION_SECRET (kept short, not a security boundary
      // since the sync only writes public static data).
      const key      = req.headers.get('x-sync-key') ?? ''
      const secret   = process.env.SESSION_SECRET ?? ''
      const expected = secret.slice(-16)
      if (!expected || key !== expected) {
        return new Response('Forbidden', { status: 403 })
      }
      const result = await doGitHubSync('admin')
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // ── Player API ─────────────────────────────────────────────────────────
    const playerMatch = url.pathname.match(/^\/api\/([^/]+)$/)
    if (playerMatch && req.method === 'GET') {
      const name    = decodeURIComponent(playerMatch[1])
      const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      try {
        const raw     = await readFile(resolve(CWD, 'data/players.json'), 'utf-8')
        const players = JSON.parse(raw)
        const player  = players.find(p => p.name.toLowerCase() === name.toLowerCase())
        if (!player) {
          return new Response(JSON.stringify({ error: 'Player not found', player: name }), { status: 404, headers })
        }
        const tiers = {}
        for (const [mode, tier] of Object.entries(player.ranks)) {
          tiers[mode] = (tier === 'NONE' || tier === 'None' || tier === 'none') ? null : tier
        }
        return new Response(JSON.stringify({ player: player.name, region: player.region, tiers }), { status: 200, headers })
      } catch {
        return new Response(JSON.stringify({ error: 'Failed to read player data' }), { status: 500, headers })
      }
    }

    // ── Static files ───────────────────────────────────────────────────────
    const filePath = join(CLIENT_DIR, url.pathname)
    try {
      const s = await stat(filePath)
      if (s.isFile()) {
        const data = await readFile(filePath)
        const ext  = extname(filePath)
        return new Response(data, {
          headers: {
            'Content-Type':  MIME[ext] || 'application/octet-stream',
            'Cache-Control': url.pathname.startsWith('/assets/')
              ? 'max-age=31536000, immutable'
              : 'no-cache',
          },
        })
      }
    } catch {
      // File not found — fall through to SSR
    }

    // ── SSR via TanStack Start ─────────────────────────────────────────────
    return tsServer.fetch(req)
  },
})

console.log(`Server listening on http://localhost:${PORT}`)
