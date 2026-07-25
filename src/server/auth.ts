// ─── Credential Validation — Server-Only ──────────────────────────────────────
// Security model:
//   • Passwords stored in credentials.yml (plaintext auto-upgraded to scrypt on first login)
//   • Rate limiting: 5 failed attempts per IP → 15-minute lockout
//   • All string comparisons are constant-time (timingSafeEqual)
//   • Disabled accounts are rejected before password check

import { createServerFn }                           from '@tanstack/react-start'
import { getRequestIP }                              from '@tanstack/react-start/server'
import { readFileSync, writeFileSync }               from 'node:fs'
import { resolve }                                   from 'node:path'
import { load as yamlLoad, dump as yamlDump }        from 'js-yaml'
import { z }                                         from 'zod'
import { scrypt, randomBytes, timingSafeEqual }      from 'node:crypto'
import { promisify }                                 from 'node:util'

const scryptAsync = promisify(scrypt)

// ─── Rate Limiting (in-memory, per IP) ───────────────────────────────────────
const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 15 * 60 * 1000   // 15 minutes

interface RateLimitEntry { count: number; lockedUntil: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

function checkRateLimit(ip: string): { blocked: boolean; remainingMs: number; attempts: number } {
  const now   = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry) return { blocked: false, remainingMs: 0, attempts: 0 }
  if (entry.lockedUntil > now) return { blocked: true, remainingMs: entry.lockedUntil - now, attempts: entry.count }
  if (entry.lockedUntil > 0) rateLimitStore.delete(ip)   // expired lock — reset
  return { blocked: false, remainingMs: 0, attempts: entry.count }
}

function recordFailure(ip: string): number {
  const entry = rateLimitStore.get(ip) ?? { count: 0, lockedUntil: 0 }
  const count = entry.count + 1
  rateLimitStore.set(ip, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0,
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

// ─── YAML shape ────────────────────────────────────────────────────────────────

const CredentialSchema = z.object({
  users: z.array(
    z.object({
      username: z.string(),
      password: z.string(),
      role:     z.string().optional(),
      uuid:     z.string().optional(),
      enabled:  z.boolean().optional(),
    })
  ),
})

type Credentials = z.infer<typeof CredentialSchema>

const CREDS_PATH = resolve(process.cwd(), 'credentials.yml')

function loadCredentials(): Credentials {
  const raw    = readFileSync(CREDS_PATH, 'utf8')
  const parsed = yamlLoad(raw)
  return CredentialSchema.parse(parsed)
}

/** Upgrade a single user's plaintext password to scrypt in-place and persist. */
async function upgradePassword(username: string, plain: string): Promise<void> {
  try {
    const creds = loadCredentials()
    const idx   = creds.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase())
    if (idx === -1) return
    creds.users[idx].password = await hashPassword(plain)
    writeFileSync(CREDS_PATH, yamlDump(creds), 'utf8')
    console.log(`[auth] Password for ${username} upgraded to scrypt hash`)
  } catch (e) {
    console.error('[auth] Password upgrade failed:', e)
  }
}

// ─── Server Function ──────────────────────────────────────────────────────────

export const validateCredentials = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ username: z.string(), password: z.string() }))
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
    let creds: Credentials
    try {
      creds = loadCredentials()
    } catch (err) {
      console.error('[auth] Failed to load credentials.yml:', err)
      return { valid: false as const, error: 'Auth system unavailable' }
    }

    // ── 3. Find user by username (constant-time username compare) ─────────────
    const inputUser = data.username.trim()
    const match = creds.users.find(u => {
      const a = Buffer.alloc(256, 0); a.write(u.username.toLowerCase())
      const b = Buffer.alloc(256, 0); b.write(inputUser.toLowerCase())
      return timingSafeEqual(a, b) && u.username.toLowerCase() === inputUser.toLowerCase()
    })

    // ── 4. Disabled-account check (before password work to avoid timing leaks) ─
    if (match?.enabled === false) {
      // Don't record a failure for disabled accounts — it's not a brute-force attempt
      return { valid: false as const, error: 'This account has been disabled. Contact an administrator.' }
    }

    // ── 5. Verify password (always run to prevent timing oracle on missing user) ─
    const storedPassword = match?.password ?? 'scrypt:00000000000000000000000000000000:' + '0'.repeat(128)
    const passwordOk = await verifyPassword(storedPassword, data.password.trim())

    if (!match || !passwordOk) {
      const failCount  = recordFailure(ip)
      const remaining  = MAX_ATTEMPTS - failCount
      const hint = remaining > 0
        ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`
        : ` — account locked for 15 minutes`
      return { valid: false as const, error: `Invalid username or password${hint}` }
    }

    // ── 6. Success ─────────────────────────────────────────────────────────────
    clearFailures(ip)

    // Auto-upgrade plaintext password to scrypt on first successful login
    if (!match.password.startsWith('scrypt:')) {
      void upgradePassword(match.username, data.password.trim())
    }

    return { valid: true as const, username: match.username, role: match.role ?? 'user' }
  })
