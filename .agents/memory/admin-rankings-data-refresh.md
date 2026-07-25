---
name: Admin rankings data refresh
description: Admin player edits persist to disk while public rankings may retain a client-side route snapshot.
---

Admin player mutations that write canonical JSON must await the disk flush before reporting success, and public data pages should refresh canonical server data when mounted after an admin navigation.

**Why:** The admin UI and rankings route use different state layers; localStorage updates can make the admin look correct while rankings continues rendering an older loader result.

**How to apply:** For future admin-managed JSON sections, make persistence completion explicit and avoid assuming a client-side route loader automatically re-reads files after another route changes them.