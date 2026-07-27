---
name: Live Site Auto-Sync Architecture
description: How dev→GitHub→production data sync works; what files are protected vs synced.
---

# Live Site Auto-Sync Architecture

## Rule
The production server automatically pulls STATIC data from GitHub; DYNAMIC user data is never touched.

**Why:** Users' mining rigs, balances, and purchase history live only on the production server. GitHub is the transport for admin-controlled content only.

## How to apply
Any new admin-managed data file should be added to BOTH:
1. `STATIC_DATA_REPO_PATHS` in `src/server/dataFiles.ts` (the `pullStaticDataFromGitHub` server fn)
2. `STATIC_DATA_REPO_PATHS` in `server.mjs` (the auto-sync on startup)

Never add user-generated files (any file that accumulates player state) to either list.

## Static files (safe to sync FROM GitHub):
players.json, gamemodes.json, content.json, event.json, economy.json, homepage.json,
tier-tagger.json, ads-config.json, growth.json, shop-items.json, tournaments.json, public/icons/*

## Protected files (NEVER sync from GitHub):
mining-users.json, shop-purchases.json, mining-community.json, mining-access.json,
sync-history.json, credentials.yml, admin.yml, .github-token.json

## Sync state
`data/sync-state.json` — written after every sync (by both server.mjs and the server fn).
Contains: lastSyncAt, lastCommitSha, filesUpdated, filesFailed, triggeredBy, nextAutoSyncAt.

## Pipeline for updates
- Data changes: Send to GitHub → live site refreshes within 5 min (no redeploy)
- Code changes: Push Everything → Replit Deploy → Redeploy (rebuild required)
