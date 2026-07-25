---
name: Mining SSE Implementation
description: How SSE is wired for mining real-time updates in this TanStack Start version
---

## The constraint

`@tanstack/react-start` v1.167.41 does NOT export `createAPIFileRoute` from `@tanstack/react-start/api` — that path doesn't exist as a package export. Files in `src/routes/api/` that don't export `Route` are dropped from the route tree with a warning and never served.

## The working solution

**`globalThis.__miningSSEClients`** — a process-level `Set<WriteCallback>` shared between:
- The SSR module graph (where server functions call `broadcastMiningUpdate()`)
- The Vite middleware / `server.mjs` handler (which hold open the HTTP connections)

Both run in the same Node.js process and share `globalThis`, bypassing the module isolation problem.

**Dev (Vite):** Custom plugin `miningSSEPlugin()` in `vite.config.ts` registers a `configureServer` middleware at `/api/mining-events`.

**Prod (`server.mjs`):** Inline `handleSSE()` function intercepts `GET /api/mining-events` before the TanStack Start `tsServer.fetch(req)` call.

**Why:** `vite.ssrLoadModule` and regular Node.js `require/import` create separate module instances, so module-level singletons don't share state — `globalThis` does.

## Registry (`src/server/sseRegistry.ts`)

Uses `globalThis.__miningSSEClients` with a `WriteCallback = (data: string) => void` interface — works with both Node.js `res.write()` and Web Streams `controller.enqueue()`.
