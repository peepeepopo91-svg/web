---
name: Admin Auth Security Architecture
description: Security model for the admin panel login — hashing, rate limiting, signed sessions, server-side verification.
---

## Security layers (all in src/server/adminAuth.ts)

**Password hashing** — Node built-in `scrypt` (no npm dep). Format: `scrypt:<salt_hex>:<hash_hex>`. Auto-migrates plaintext on first successful login by rewriting `admin.yml`. Constant-time `timingSafeEqual` for all compares.

**Rate limiting** — In-memory `Map<ip, {count, lockedUntil}>`. 5 failures → 15-min lockout. IP from `getRequestIP({ xForwardedFor: true })` from `@tanstack/react-start/server`.

**Session tokens** — HMAC-SHA256 over `"username:loginAt"` using `SESSION_SECRET` env var. Returned as `token` field on login success. Stored in localStorage alongside `{username, loginAt}`.

**Server-side verification** — `checkAdminToken` server fn called on every admin page load (mount). Invalid/expired token clears localStorage and forces re-login. Sessions expire after 8 hours.

**Why:** Previous system used plaintext passwords, no rate limiting, and pure client-side localStorage "auth" — anyone could bypass by setting `bn_admin_session` manually.

**How to apply:** `AdminSession` type now includes `token: string`. Any new admin server fn that needs auth can call `checkAdminToken` to verify. Rate limit store is process-scoped (single Replit process), resets on server restart.
