// ─── Admin Authentication — Server-Only ──────────────────────────────────────
// Security model:
//   • Passwords stored as scrypt hashes in admin.yml (auto-upgraded from plaintext on first login)
//   • Rate limiting: 5 failed attempts → 15-minute IP lockout
//   • Sessions signed with HMAC-SHA256 using SESSION_SECRET env var
//   • Session expiry: 8 hours
//   • All string comparisons are constant-time (timingSafeEqual)

import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import { z } from 'zod'
import { scrypt, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS   = 5
const LOCKOUT_MS     = 15 * 60 * 1000   // 15 minutes
const SESSION_TTL_MS =  8 * 60 * 60 * 1000  // 8 hours

// ─── Rate Limiting (in-memory, per IP) ───────────────────────────────────────
interface RateLimitEntry { count: number; lockedUntil: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkRateLimit(ip: string, _maxAttempts = MAX_ATTEMPTS, _lockoutMs = LOCKOUT_MS): { blocked: boolean; remainingMs: number; attempts: number } {
  const now   = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry) return { blocked: false, remainingMs: 0, attempts: 0 }
  if (entry.lockedUntil > now) return { blocked: true, remainingMs: entry.lockedUntil - now, attempts: entry.count }
  if (entry.lockedUntil > 0) rateLimitStore.delete(ip)   // expired lock — reset
  return { blocked: false, remainingMs: 0, attempts: entry.count }
}

function recordFailure(ip: string, maxAttempts = MAX_ATTEMPTS, lockoutMs = LOCKOUT_MS): number {
  const entry = rateLimitStore.get(ip) ?? { count: 0, lockedUntil: 0 }
  const count = entry.count + 1
  rateLimitStore.set(ip, {
    count,
    lockedUntil: count >= maxAttempts ? Date.now() + lockoutMs : 0,
  })
  return count
}

function clearFailures(ip: string) {
  rateLimitStore.delete(ip)
}

// ─── Password Hashing (Node built-in scrypt) ──────────────────────────────────
async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(plain, salt, 64)) as Buffer
  return `scrypt:${salt}:${hash.toString('hex')}`
}

async function verifyPassword(stored: string, input: string): Promise<boolean> {
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':')
    if (parts.length !== 3) return false
    const [, salt, hashHex] = parts
    const inputHash  = (await scryptAsync(input, salt, 64)) as Buffer
    const storedHash = Buffer.from(hashHex, 'hex')
    if (inputHash.length !== storedHash.length) return false
    return timingSafeEqual(inputHash, storedHash)
  }
  // Plaintext fallback (pre-migration) — constant-time padded compare
  const a = Buffer.alloc(256, 0); a.write(stored)
  const b = Buffer.alloc(256, 0); b.write(input)
  return timingSafeEqual(a, b) && stored === input
}

// ─── Session Signing (HMAC-SHA256 + SESSION_SECRET) ───────────────────────────
function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET env var is not set')
  return s
}

function signSession(username: string, loginAt: number): string {
  return createHmac('sha256', getSecret())
    .update(`${username}:${loginAt}`)
    .digest('hex')
}

// ─── Credentials File ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = { maxAttempts: 5, lockoutMinutes: 15, sessionHours: 8 }

const AdminSchema = z.object({
  admin: z.object({
    username:             z.string(),
    password1:            z.string(),
    password2:            z.string(),
    // Any session token whose loginAt < sessionInvalidBefore is rejected.
    // Bumped on every credential update to force re-authentication.
    sessionInvalidBefore: z.number().optional().default(0),
  }),
  // Runtime-configurable security settings (optional — defaults apply if absent)
  settings: z.object({
    maxAttempts:    z.number().int().min(1).max(50).optional().default(DEFAULT_SETTINGS.maxAttempts),
    lockoutMinutes: z.number().int().min(1).max(1440).optional().default(DEFAULT_SETTINGS.lockoutMinutes),
    sessionHours:   z.number().int().min(1).max(168).optional().default(DEFAULT_SETTINGS.sessionHours),
  }).optional().default(DEFAULT_SETTINGS),
})

type AdminConfig = z.infer<typeof AdminSchema>

function loadAdminCredentials(): AdminConfig {
  const filePath = resolve(process.cwd(), 'admin.yml')
  const raw      = readFileSync(filePath, 'utf8')
  return AdminSchema.parse(yamlLoad(raw))
}

function getSettings(cfg: AdminConfig) {
  return {
    maxAttempts:    cfg.settings?.maxAttempts    ?? DEFAULT_SETTINGS.maxAttempts,
    lockoutMinutes: cfg.settings?.lockoutMinutes ?? DEFAULT_SETTINGS.lockoutMinutes,
    sessionHours:   cfg.settings?.sessionHours   ?? DEFAULT_SETTINGS.sessionHours,
  }
}

function writeAdminCredentials(data: {
  username: string
  password1: string
  password2: string
  sessionInvalidBefore: number
  settings?: { maxAttempts: number; lockoutMinutes: number; sessionHours: number }
}) {
  const { settings, ...admin } = data
  const filePath = resolve(process.cwd(), 'admin.yml')
  writeFileSync(filePath, yamlDump({ admin, ...(settings ? { settings } : {}) }), 'utf8')
}

async function upgradePasswords(username: string, p1Plain: string, p2Plain: string) {
  try {
    const [h1, h2] = await Promise.all([hashPassword(p1Plain), hashPassword(p2Plain)])
    // Preserve existing sessionInvalidBefore when upgrading hashes
    let sib = 0
    try { sib = loadAdminCredentials().admin.sessionInvalidBefore ?? 0 } catch { /* ok */ }
    writeAdminCredentials({ username, password1: h1, password2: h2, sessionInvalidBefore: sib })
    console.log('[adminAuth] Passwords upgraded to scrypt hashes')
  } catch (e) {
    console.error('[adminAuth] Password upgrade failed:', e)
  }
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const validateAdminCredentials = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username:  z.string(),
    password1: z.string(),
    password2: z.string(),
  }))
  .handler(async ({ data }) => {
    // ── 1. Rate-limit check ──────────────────────────────────────────────────
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    const rl  = checkRateLimit(ip)
    if (rl.blocked) {
      const mins = Math.ceil(rl.remainingMs / 60000)
      return {
        valid: false as const,
        error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`,
      }
    }

    // ── 2. Load credentials ───────────────────────────────────────────────────
    let cfg: ReturnType<typeof loadAdminCredentials>
    try {
      cfg = loadAdminCredentials()
    } catch (err) {
      console.error('[adminAuth] Failed to load admin.yml:', err)
      return { valid: false as const, error: 'Admin auth unavailable' }
    }

    const { admin } = cfg

    // ── 3. Constant-time username compare ─────────────────────────────────────
    const uA = Buffer.alloc(256, 0); uA.write(admin.username)
    const uB = Buffer.alloc(256, 0); uB.write(data.username.trim())
    const usernameOk = timingSafeEqual(uA, uB) && admin.username === data.username.trim()

    // ── 4. Verify passwords ───────────────────────────────────────────────────
    const [p1Ok, p2Ok] = await Promise.all([
      verifyPassword(admin.password1, data.password1),
      verifyPassword(admin.password2, data.password2),
    ])

    if (!usernameOk || !p1Ok || !p2Ok) {
      const s = getSettings(cfg)
      const lockoutMs = s.lockoutMinutes * 60_000
      const failCount = recordFailure(ip, s.maxAttempts, lockoutMs)
      const remaining = s.maxAttempts - failCount
      const hint = remaining > 0
        ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
        : ` — account locked for ${s.lockoutMinutes} minute${s.lockoutMinutes === 1 ? '' : 's'}`
      return { valid: false as const, error: `Invalid credentials${hint}` }
    }

    // ── 5. Success ────────────────────────────────────────────────────────────
    clearFailures(ip)

    // Auto-upgrade plaintext passwords to scrypt on first successful login
    if (!admin.password1.startsWith('scrypt:') || !admin.password2.startsWith('scrypt:')) {
      void upgradePasswords(admin.username, data.password1, data.password2)
    }

    // Issue HMAC-signed session token
    const loginAt = Date.now()
    let token: string
    try {
      token = signSession(admin.username, loginAt)
    } catch {
      return { valid: false as const, error: 'Auth misconfigured — SESSION_SECRET is missing' }
    }

    return { valid: true as const, username: admin.username, loginAt, token }
  })

// ─── Update Admin Credentials ─────────────────────────────────────────────────

export const updateAdminCredentials = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    // Caller must supply current password1 to authorize any change
    currentPassword1: z.string(),
    currentPassword2: z.string(),
    // What to change — all optional
    newUsername:   z.string().optional(),
    newPassword1:  z.string().optional(),
    newPassword2:  z.string().optional(),
  }))
  .handler(async ({ data }) => {
    // ── 1. Rate-limit ────────────────────────────────────────────────────────
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    const rl  = checkRateLimit(ip)
    if (rl.blocked) {
      const mins = Math.ceil(rl.remainingMs / 60000)
      return { ok: false as const, error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` }
    }

    // ── 2. Load current credentials ──────────────────────────────────────────
    let cfg: ReturnType<typeof loadAdminCredentials>
    try { cfg = loadAdminCredentials() }
    catch { return { ok: false as const, error: 'Failed to read admin.yml' } }

    const { admin } = cfg

    // ── 3. Verify current passwords ──────────────────────────────────────────
    const [p1Ok, p2Ok] = await Promise.all([
      verifyPassword(admin.password1, data.currentPassword1),
      verifyPassword(admin.password2, data.currentPassword2),
    ])
    if (!p1Ok || !p2Ok) {
      recordFailure(ip)
      return { ok: false as const, error: 'Current passwords are incorrect' }
    }
    clearFailures(ip)

    // ── 4. Validate new values ───────────────────────────────────────────────
    const newUsername  = data.newUsername?.trim()  || admin.username
    const newPlain1    = data.newPassword1?.trim()
    const newPlain2    = data.newPassword2?.trim()

    if (newUsername.length < 3)
      return { ok: false as const, error: 'Username must be at least 3 characters' }

    if (newPlain1 !== undefined && newPlain1.length < 8)
      return { ok: false as const, error: 'Password 1 must be at least 8 characters' }
    if (newPlain2 !== undefined && newPlain2.length < 8)
      return { ok: false as const, error: 'Password 2 must be at least 8 characters' }
    if (newPlain1 && newPlain2 && newPlain1 === newPlain2)
      return { ok: false as const, error: 'Password 1 and Password 2 must be different from each other' }

    // ── 5. Hash new passwords if changed ────────────────────────────────────
    const [h1, h2] = await Promise.all([
      newPlain1 ? hashPassword(newPlain1) : Promise.resolve(admin.password1),
      newPlain2 ? hashPassword(newPlain2) : Promise.resolve(admin.password2),
    ])

    // ── 6. Write updated admin.yml — bump sessionInvalidBefore to revoke all
    //       existing sessions regardless of which field changed.
    const sessionInvalidBefore = Date.now()
    try {
      writeAdminCredentials({ username: newUsername, password1: h1, password2: h2, sessionInvalidBefore })
    } catch {
      return { ok: false as const, error: 'Failed to write admin.yml' }
    }

    const changed: string[] = []
    if (newUsername !== admin.username) changed.push('username')
    if (newPlain1) changed.push('password1')
    if (newPlain2) changed.push('password2')

    return { ok: true as const, changed, newUsername }
  })

// ─── Get Admin Info (username only — no passwords) ────────────────────────────

export const getAdminInfo = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string(), username: z.string(), loginAt: z.number() }))
  .handler(async ({ data }) => {
    // Verify token first
    if (Date.now() - data.loginAt > SESSION_TTL_MS)
      return { ok: false as const, error: 'Session expired' }

    let expected: string
    try { expected = signSession(data.username, data.loginAt) }
    catch { return { ok: false as const, error: 'Misconfigured' } }

    try {
      const a = Buffer.from(data.token, 'hex')
      const b = Buffer.from(expected, 'hex')
      if (a.length !== b.length || !timingSafeEqual(a, b))
        return { ok: false as const, error: 'Invalid token' }
    } catch { return { ok: false as const, error: 'Bad token' } }

    let cfg: ReturnType<typeof loadAdminCredentials>
    try { cfg = loadAdminCredentials() }
    catch { return { ok: false as const, error: 'Cannot read admin.yml' } }

    return {
      ok: true as const,
      username: cfg.admin.username,
      password1Hashed: cfg.admin.password1.startsWith('scrypt:'),
      password2Hashed: cfg.admin.password2.startsWith('scrypt:'),
    }
  })

// ─── Rate Limit Status (admin-gated) ─────────────────────────────────────────

export const getAdminRateLimitStatus = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string(), username: z.string(), loginAt: z.number() }))
  .handler(async ({ data }) => {
    // Light token check (no DB, HMAC only)
    if (Date.now() - data.loginAt > SESSION_TTL_MS) return { ok: false as const }
    try {
      const exp = signSession(data.username, data.loginAt)
      const a = Buffer.from(data.token, 'hex')
      const b = Buffer.from(exp, 'hex')
      if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false as const }
    } catch { return { ok: false as const } }

    const ip   = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    let cfg: AdminConfig
    try { cfg = loadAdminCredentials() } catch { return { ok: false as const } }
    const s    = getSettings(cfg)
    const rl   = checkRateLimit(ip, s.maxAttempts, s.lockoutMinutes * 60_000)

    return {
      ok:           true as const,
      ip,
      attempts:     rl.attempts,
      maxAttempts:  s.maxAttempts,
      blocked:      rl.blocked,
      remainingMs:  rl.remainingMs,
      lockedUntilTs: rl.blocked ? Date.now() + rl.remainingMs : 0,
    }
  })

// ─── Get Security Settings ────────────────────────────────────────────────────

export const getSecuritySettings = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ token: z.string(), username: z.string(), loginAt: z.number() }))
  .handler(async ({ data }) => {
    if (Date.now() - data.loginAt > SESSION_TTL_MS) return { ok: false as const }
    try {
      const exp = signSession(data.username, data.loginAt)
      const a = Buffer.from(data.token, 'hex')
      const b = Buffer.from(exp, 'hex')
      if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false as const }
    } catch { return { ok: false as const } }

    let cfg: AdminConfig
    try { cfg = loadAdminCredentials() } catch { return { ok: false as const } }
    const s = getSettings(cfg)
    return { ok: true as const, settings: s }
  })

// ─── Update Security Settings (password-gated) ───────────────────────────────

export const updateSecuritySettings = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    currentPassword1: z.string(),
    currentPassword2: z.string(),
    settings: z.object({
      maxAttempts:    z.number().int().min(1).max(50),
      lockoutMinutes: z.number().int().min(1).max(1440),
      sessionHours:   z.number().int().min(1).max(168),
    }),
  }))
  .handler(async ({ data }) => {
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    const rl  = checkRateLimit(ip)
    if (rl.blocked) {
      const mins = Math.ceil(rl.remainingMs / 60000)
      return { ok: false as const, error: `Rate limited. Try again in ${mins}m.` }
    }

    let cfg: AdminConfig
    try { cfg = loadAdminCredentials() } catch { return { ok: false as const, error: 'Cannot read admin.yml' } }

    const [p1Ok, p2Ok] = await Promise.all([
      verifyPassword(cfg.admin.password1, data.currentPassword1),
      verifyPassword(cfg.admin.password2, data.currentPassword2),
    ])
    if (!p1Ok || !p2Ok) {
      recordFailure(ip)
      return { ok: false as const, error: 'Current passwords are incorrect' }
    }
    clearFailures(ip)

    try {
      writeAdminCredentials({
        username: cfg.admin.username,
        password1: cfg.admin.password1,
        password2: cfg.admin.password2,
        sessionInvalidBefore: cfg.admin.sessionInvalidBefore ?? 0,
        settings: data.settings,
      })
    } catch { return { ok: false as const, error: 'Failed to write admin.yml' } }

    return { ok: true as const, settings: data.settings }
  })

// ─── Token Verification (called on every admin page load) ─────────────────────
export const checkAdminToken = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    username: z.string(),
    loginAt:  z.number(),
    token:    z.string(),
  }))
  .handler(async ({ data }) => {
    // ── 1. Verify HMAC signature first (no I/O) ───────────────────────────────
    let expected: string
    try {
      expected = signSession(data.username, data.loginAt)
    } catch {
      return { valid: false as const, reason: 'Auth misconfigured — SESSION_SECRET is missing' }
    }

    try {
      const a = Buffer.from(data.token, 'hex')
      const b = Buffer.from(expected,   'hex')
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return { valid: false as const, reason: 'Invalid session token' }
      }
    } catch {
      return { valid: false as const, reason: 'Malformed session token' }
    }

    // ── 2. Load config — runtime TTL + revocation check ───────────────────────
    let cfg: AdminConfig
    try { cfg = loadAdminCredentials() } catch {
      return { valid: false as const, reason: 'Cannot verify session against current credentials' }
    }

    const sessionTTL_ms = (getSettings(cfg).sessionHours) * 60 * 60 * 1000
    if (Date.now() - data.loginAt > sessionTTL_ms) {
      return { valid: false as const, reason: 'Session expired — please log in again' }
    }

    // ── 3. Enforce credential-rotation revocation ─────────────────────────────
    const sib = cfg.admin.sessionInvalidBefore ?? 0
    if (sib > 0 && data.loginAt < sib) {
      return { valid: false as const, reason: 'Credentials were rotated — please log in again' }
    }

    return { valid: true as const }
  })
