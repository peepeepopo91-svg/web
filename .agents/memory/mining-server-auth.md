---
name: Mining server-authoritative time
description: How the mining system avoids client clock manipulation and supports cross-device offline earnings
---

## Rule
All offline-earnings calculations use the **server's** `Date.now()` — never the client's.

## How it works
- `src/server/miningServer.ts` — three server fns: `getServerNow`, `serverCatchUp`, `saveMiningUser`
- `serverCatchUp` loads user + community from `data/mining-users.json` + `data/mining-community.json`, runs `catchUpUser(user, serverNow, { community, overrides })`, atomically writes both files back
- On login/bootstrap, `MiningContext.tsx` calls `serverCatchUp` and stores `clockOffset = serverNow − Date.now()` in a ref
- 10-second tick uses `Date.now() + clockOffset` instead of `Date.now()` — prevents mid-session clock manipulation
- Every rig op (buy/start/stop/repair/sell/exchange) fires `saveMiningUser` (fire-and-forget) for cross-device consistency
- Tick also calls `saveMiningUser` fire-and-forget via `queueMicrotask`

## catchUpUser signature change
`catchUpUser(user, now, opts?)` now returns `{ user, community }` (not just `User`).  
Pass `opts.community` + `opts.overrides` when calling from server to skip localStorage reads.  
If `opts.community` is provided, the function skips `saveCommunityState` (caller handles persistence).

## Data files
- `data/mining-users.json` — `Record<string, User>`, authoritative cross-device user state
- `data/mining-community.json` — `CommunityBlock`, server-side block epoch; initialized on first access

**Why:** Client clock is untrusted. Server `Date.now()` is the only source of truth for `elapsed = serverNow − lastCheckedAt`. After `serverCatchUp` on login, `lastCheckedAt` is always server-set, so subsequent logins correctly calculate offline time.
