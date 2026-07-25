---
name: Site Growth Analytics Architecture
description: How the Site Growth / analytics system is implemented — data flow, in-memory state, and beacon placement.
---

# Site Growth Analytics Architecture

## Data Flow

1. **Client**: `GrowthBeacon` component (in `src/components/GrowthBeacon.tsx`) fires on each route change (skips `/admin`), calls `recordPageView` server fn, and sends heartbeats every 30s via `heartbeatSession`.
2. **Server**: `src/server/growthServer.ts` maintains in-memory state (`globalThis.__growthSessions`, `__growthTodaySessions`, `__growthTodayKey`, `__growthCache`) and flushes to `data/growth.json` with a 3s debounce.
3. **Admin page**: `src/components/admin/SiteGrowth.tsx` calls `getGrowthStats()` + existing `getDashboardStats()` + `adminGetAllPurchases()` for mining/shop data.

## Key Decisions

- **Beacon placement**: Added to `RootDocument` in `src/routes/__root.tsx`, not to individual routes — captures all pages automatically.
- **In-memory cache**: `globalThis.__growthCache` avoids re-reading disk on every page view; debounced 3s write prevents I/O overload.
- **Concurrent tracking**: `globalThis.__growthSessions: Map<sessionId, lastSeenMs>` cleaned on each request; sessions inactive >2min are removed.
- **No fabrication**: `data/growth.json` starts with `startedAt: <deploy timestamp>` and `dailyStats: {}` — accumulates from first visitor.
- **Admin section type**: Added `'site-growth'` to `AdminSection` union in `src/routes/admin.tsx`.

**Why debounced write:** every page view hitting disk directly would be too expensive at scale; 3s debounce batches concurrent views into one write.

**How to apply:** When adding new tracked metrics, add fields to `DayStatStored` interface and populate them in the `recordPageView` handler. The admin page reads everything from `getGrowthStats()`.
