/**
 * Production server for Replit deployment.
 * Serves static assets from dist/client/ and SSR via TanStack Start.
 * Also handles /api/mining-events as a native SSE endpoint using the same
 * globalThis.__miningSSEClients registry that server functions write to.
 */

import { serve } from 'srvx/node'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

// Dynamically import the built TanStack Start SSR bundle
const { default: tsServer } = await import('./dist/server/server.js')

const MIME = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
}

const CLIENT_DIR = new URL('./dist/client', import.meta.url).pathname
const PORT = Number(process.env.PORT) || 5000

// ─── SSE helper ───────────────────────────────────────────────────────────────
// Returns a long-lived Response whose body stays open and emits events.
// Uses globalThis.__miningSSEClients — the same registry as server functions.

function handleSSE(req) {
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const write = (data) => {
        if (closed) return
        try { controller.enqueue(enc.encode(data)) } catch { cleanup() }
      }

      if (!globalThis.__miningSSEClients) globalThis.__miningSSEClients = new Set()
      globalThis.__miningSSEClients.add(write)

      // Initial ping
      write(': connected\n\n')

      // Keepalive every 25 s
      const heartbeat = setInterval(() => write(': ping\n\n'), 25_000)

      function cleanup() {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        globalThis.__miningSSEClients?.delete(write)
        try { controller.close() } catch {}
      }

      // Detect client disconnect (req.signal fires on abort)
      if (req.signal) {
        req.signal.addEventListener('abort', cleanup, { once: true })
      }
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

serve({
  port: PORT,
  fetch: async (req) => {
    const url = new URL(req.url)

    // ── SSE endpoints ───────────────────────────────────────────────────────
    if ((url.pathname === '/api/mining-events' || url.pathname === '/api/tournament-events') && req.method === 'GET') {
      return handleSSE(req)
    }

    // ── Static files ────────────────────────────────────────────────────────
    const filePath = join(CLIENT_DIR, url.pathname)
    try {
      const s = await stat(filePath)
      if (s.isFile()) {
        const data = await readFile(filePath)
        const ext = extname(filePath)
        return new Response(data, {
          headers: {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Cache-Control': url.pathname.startsWith('/assets/')
              ? 'max-age=31536000, immutable'
              : 'no-cache',
          },
        })
      }
    } catch {
      // File not found — fall through to SSR
    }

    // ── SSR via TanStack Start ──────────────────────────────────────────────
    return tsServer.fetch(req)
  },
})

console.log(`Server listening on http://localhost:${PORT}`)
