import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

// ─── Dev SSE middleware ────────────────────────────────────────────────────────
// Serves /api/mining-events and /api/tournament-events as SSE endpoints in dev.
// Uses globalThis.__miningSSEClients (same registry as server functions).

function makeSseHandler(path: string): Plugin {
  return {
    name: `sse-${path.replace(/\W/g, '-')}`,
    configureServer(server) {
      server.middlewares.use(path, (req, res) => {
        res.writeHead(200, {
          'Content-Type':      'text/event-stream; charset=utf-8',
          'Cache-Control':     'no-cache, no-transform',
          'Connection':        'keep-alive',
          'X-Accel-Buffering': 'no',
        })
        res.write(': connected\n\n')

        if (!globalThis.__miningSSEClients) {
          globalThis.__miningSSEClients = new Set()
        }
        const write = (data: string) => res.write(data)
        globalThis.__miningSSEClients.add(write)

        const heartbeat = setInterval(() => {
          try { res.write(': ping\n\n') } catch { clearInterval(heartbeat) }
        }, 25_000)

        req.on('close', () => {
          clearInterval(heartbeat)
          globalThis.__miningSSEClients?.delete(write)
          res.end()
        })
      })
    },
  }
}

function miningSSEPlugin():     Plugin { return makeSseHandler('/api/mining-events')     }
function tournamentSSEPlugin(): Plugin { return makeSseHandler('/api/tournament-events') }

// ─── Player API middleware ─────────────────────────────────────────────────────
// Handles GET /api/<playername> — returns the player's tiers as JSON.

function playerApiPlugin(): Plugin {
  return {
    name: 'player-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        // Only handle /api/<something> that isn't a known SSE path
        const name = req.url?.replace(/^\//, '').split('?')[0]
        if (!name || name.includes('/') || name === 'mining-events' || name === 'tournament-events') {
          return next()
        }

        try {
          const raw = readFileSync(resolve(process.cwd(), 'data/players.json'), 'utf-8')
          const players: Array<{ name: string; region: string; ranks: Record<string, string> }> = JSON.parse(raw)
          const player = players.find(p => p.name.toLowerCase() === name.toLowerCase())

          if (!player) {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
            res.end(JSON.stringify({ error: 'Player not found', player: name }))
            return
          }

          const tiers: Record<string, string | null> = {}
          for (const [mode, tier] of Object.entries(player.ranks)) {
            tiers[mode] = (tier === 'NONE' || tier === 'None' || tier === 'none') ? null : tier
          }

          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ player: player.name, region: player.region, tiers }))
        } catch {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ error: 'Failed to read player data' }))
        }
      })
    },
  }
}

const config = defineConfig({
  server: {
    host: true,
    allowedHosts: true,
    // Prevent Vite from watching data/*.json files — writing those files from
    // server functions would otherwise trigger a full SSR reload mid-save,
    // closing the progress modal before the GitHub commit completes.
    watch: {
      ignored: ['**/data/**'],
    },
  },
  plugins: [
    miningSSEPlugin(),
    tournamentSSEPlugin(),
    playerApiPlugin(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
