---
name: Vite optimized dependency cache
description: Clean recovery for stale Vite dependency optimization after package or runtime changes.
---

When the dev preview reports an error loading a dynamically imported optimized dependency and React reports an invalid hook call, first verify the dependency tree has one React copy, then remove `node_modules/.vite` and restart the workflow. Keep values rendered during SSR deterministic; move randomness, clocks, and browser-only state into effects after mount.

**Why:** Vite's browser-served optimized module can remain out of sync after dependency installation or runtime changes. The resulting module-load failure can surface as a misleading React hook error even when React and React DOM are deduplicated. Separately, nondeterministic SSR markup causes hydration failures that can cascade into similar client errors.

**How to apply:** Treat the optimized dependency cache as generated state. Clear it after package/runtime setup changes or when the browser URL points at a stale `/node_modules/.vite/deps/*` module; do not change application code unless a clean restart reproduces the error.