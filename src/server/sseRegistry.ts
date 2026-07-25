// ─── SSE Client Registry — server-only singleton ─────────────────────────────
// Uses globalThis so the same client set is shared between:
//   - Vite's SSR-transformed server functions (loaded via vite.ssrLoadModule)
//   - The Vite dev middleware / server.mjs handler (regular Node.js module)
// Both run in the same Node.js process and share the same globalThis object.

type WriteCallback = (data: string) => boolean | void

declare global {
  // eslint-disable-next-line no-var
  var __miningSSEClients: Set<WriteCallback> | undefined
}

function getClients(): Set<WriteCallback> {
  if (!globalThis.__miningSSEClients) {
    globalThis.__miningSSEClients = new Set()
  }
  return globalThis.__miningSSEClients
}

export function addSSEClient(write: WriteCallback): void {
  getClients().add(write)
}

export function removeSSEClient(write: WriteCallback): void {
  getClients().delete(write)
}

/** Push a `mining_updated` event to every connected SSE client. */
export function broadcastMiningUpdate(): void {
  const msg     = 'event: mining_updated\ndata: 1\n\n'
  const clients = getClients()
  for (const write of clients) {
    try {
      write(msg)
    } catch {
      clients.delete(write)
    }
  }
}

/** Push a `shop_updated` event to every connected SSE client. */
export function broadcastShopUpdate(): void {
  const msg     = 'event: shop_updated\ndata: 1\n\n'
  const clients = getClients()
  for (const write of clients) {
    try {
      write(msg)
    } catch {
      clients.delete(write)
    }
  }
}

/** Push a `tournament_updated` event to every connected SSE client. */
export function broadcastTournamentUpdate(): void {
  const msg     = 'event: tournament_updated\ndata: 1\n\n'
  const clients = getClients()
  for (const write of clients) {
    try {
      write(msg)
    } catch {
      clients.delete(write)
    }
  }
}

export function getSSEClientCount(): number {
  return getClients().size
}
