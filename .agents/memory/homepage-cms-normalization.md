---
name: Homepage CMS normalization
description: Keep homepage configuration schema migrations consistent across browser storage, JSON imports, and SSR publish loading.
---

Homepage configuration is backward-compatible only when loaded through the shared merge and per-item announcement normalization path; direct JSON reads can otherwise leave older announcement entries missing new presentation fields.

**Why:** The homepage is consumed from multiple sources (local storage, imported JSON, and server-side `data/homepage.json`), and array merging does not automatically fill fields on legacy items.

**How to apply:** Route every homepage config load/import through the shared normalization helper before exposing it to the public provider or admin editor.