---
name: Mining block reward calculation fix
description: Root causes of miners not receiving BlueCoin on the published site, and how they were fixed
---

# Mining block reward bugs (fixed)

## Bug 1 — CRITICAL: blocks missed when community was advanced by another user

**Rule:** `blocksPassed` must be derived from how many block boundaries crossed inside the user's own window `[lastCheckedAt, earnUntil]`, NOT from `earnUntil - community.lastSolvedAt`.

**Why:** `serverCatchUp` advances `community.lastSolvedAt` to `now` and writes it to disk. The next user who calls `serverCatchUp` sees a very recent `lastSolvedAt`, so `timeSinceLastBlock` is near-zero even if that user has been mining for hours → they receive zero block rewards.

**Fix (miningStore.ts `catchUpUser`):**
```js
const blockAtLastCheck = Math.floor((user.lastCheckedAt - community.lastSolvedAt) / blockIntervalMs)
const blockAtEarnUntil = Math.floor((earnUntil        - community.lastSolvedAt) / blockIntervalMs)
const blocksPassed     = elapsed > 0 ? Math.max(0, blockAtEarnUntil - blockAtLastCheck) : 0
```
Block number and `solvedAt` in the reward loop also updated to use `blockAtLastCheck + i` as the offset.

## Bug 2 — Economy overrides ignored on server

**Rule:** `computeUserBlockReward` must accept an optional `overrides` parameter; callers on the server must pass them explicitly.

**Why:** The function used to call `getEconomyOverrides()` internally, which reads localStorage. On the server `typeof window === 'undefined'` so it returns `{}`, meaning admin-configured `BLOCK_REWARD`, `FINDER_BONUS_PCT`, etc. were always silently ignored.

**Fix:** Added `overrides?: EconomyOverrides` param; `catchUpUser` passes `ov` through.

## Bug 3 — renewMiningSession used solo-miner mode

**Rule:** `renewMiningSession` must build `globalMiners` and pass it to `catchUpUser`, same as `serverCatchUp`.

**Why:** Without `globalMiners`, the renewing user always wins the finder bonus (solo fallback = always winner), over-awarding them.

## Bug 4 — Expired sessions diluted active miners' rewards

**Rule:** When building `globalMiners`, skip any user whose `miningExpiresAt` is in the past.

**Why:** Rigs stay `status: 'mining'` on disk until that user's own `catchUpUser` runs. Expired miners were included in `totalHashrate` and `activeMinerCount`, reducing every active miner's payout.

**How to apply:** Both `serverCatchUp` and `renewMiningSession` now filter: `if (u.miningExpiresAt !== null && u.miningExpiresAt !== undefined && u.miningExpiresAt <= serverNow) continue`
