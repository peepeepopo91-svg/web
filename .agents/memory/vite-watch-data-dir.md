---
name: Vite watcher and data/ directory
description: Writing to data/*.json from server functions triggers Vite's file watcher, causing SSR reload → browser refresh → any open modal closes mid-operation.
---

# Vite file watcher and data/ directory

## The rule
Any server function that writes to `data/*.json` must be guarded by `server.watch.ignored: ['**/data/**']` in `vite.config.ts`. Without this, the disk write triggers a Vite SSR reload → browser page refresh → any in-flight UI (like a progress modal) is destroyed before completion.

**Why:** Vite watches all files under the project root by default. JSON files in `data/` are not in the module graph, but the SSR worker restart fires anyway and propagates a full page reload to the browser via the Vite WebSocket.

**How to apply:** Keep `server.watch.ignored: ['**/data/**']` in `vite.config.ts`. Additionally, order all server functions to commit to GitHub FIRST and write to disk AFTER success, so even in the worst case (inadvertent reload) the data is already committed.

## Symptom pattern
- Browser console shows repeated `[vite] connecting...` / `[vite] connected.` cycles
- Workflow log shows many consecutive `[vite] program reload` lines
- Any modal or long-running UI operation closes unexpectedly mid-flight
- No actual error is displayed — the page just refreshes

## Affected files
- `vite.config.ts` — add `server.watch.ignored`
- `src/server/dataFiles.ts` — order: GitHub commit first, disk write second
