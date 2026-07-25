---
name: Package installer behavior
description: Replit's package installer may normalize npm manifests and lockfile registry URLs during dependency setup.
---

The Replit package installer can broaden exact npm dependency versions to caret ranges and replace public registry URLs in `package-lock.json` with the package firewall URL, even when the repository already pins versions.

**Why:** Imported projects should keep their existing dependency constraints and avoid unrelated lockfile churn during setup.

**How to apply:** After installing dependencies, compare `package.json` and `package-lock.json` with the repository version. Restore exact pins and discard generated build output unless the user explicitly requested a rebuild commit.