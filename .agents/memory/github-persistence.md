---
name: GitHub Persistence Architecture
description: How Admin Panel changes are persisted to GitHub — data files, server functions, dirty tracking, and sync UI
---

# GitHub Persistence Architecture

## Data files
- Live under `data/*.json` at the project root: `players.json`, `gamemodes.json`, `content.json`, `event.json`, `economy.json`
- Generated initially from TypeScript defaults via `npx tsx -e "..."` 
- Written to disk by server function on each save; committed to GitHub in the same call

## Server functions (`src/server/`)
- `github.ts` — GitHub Git Data API wrapper. Batch commits via the tree API (refs → HEAD commit → blobs → tree → commit → PATCH ref), so all files go in one atomic commit. Never exposed to client.
- `dataFiles.ts` — three `createServerFn` exports: `loadAllData` (GET), `saveToGitHub` (POST), `fetchRepoStatus` (GET). Uses typed `readJson<T>` calls to avoid `unknown` serialization errors.
- Repo: `peepeepopo91-svg/rupa`, branch: `main`. Token: `GITHUB_TOKEN` secret.

## Dirty state tracking (`src/store/syncStore.ts`)
- Module-level Set + listeners, not React state — any file can call `markDirty(section)` without hooks
- `useSyncState()` hook re-renders on any change
- Also tracks `isSaving`, `saveStatus`, `saveError`, `lastSyncAt`, `autoSave` preference
- `autoSave` preference persisted to localStorage under `bn_github_autosave`

## Save action (`src/store/syncActions.ts`)
- Separated from syncStore to avoid circular imports with data stores
- Reads from all dirty stores, builds commit message, calls `saveToGitHub`, then `clearDirty()`
- Error and saving state live in syncStore so all components see the same status

## Store modifications
- Every store's `save*` function now accepts `opts?: { silent?: boolean }`
- Without `silent: true` → calls `markDirty(section)` after writing to localStorage
- With `silent: true` → hydration path (no dirty marking)

## Admin hydration flow
- `AdminPage` calls `loadAllData()` on mount, populates all stores silently, then shows the panel
- This ensures fresh GitHub data is used when the admin logs in or refreshes
- Shows a spinner ("Loading data from GitHub…") during hydration

## Auto-save timer
- Managed in `AdminLayout` via `useEffect` watching `sync.autoSave`
- Fires every 5 seconds, calls `saveChangesToGitHub()` only if dirty and not already saving

## Why: tree API for batch commits
- Single commit for multiple file changes (players + economy + content in one push)
- Atomic — no partial commits if one file fails (all blobs created before the commit)
- No need to read individual file SHAs (unlike the single-file contents API)
