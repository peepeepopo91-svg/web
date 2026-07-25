import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
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
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
