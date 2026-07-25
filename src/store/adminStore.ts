// ─── Admin Store — Session & Audit Logs ──────────────────────────────────────

const ADMIN_SESSION_KEY = 'bn_admin_session'
const ADMIN_LOGS_KEY    = 'bn_admin_logs'

export interface AdminSession {
  username: string
  loginAt:  number
  token:    string   // HMAC-SHA256 signature — verified server-side on every page load
}

export interface AdminLog {
  id: string
  timestamp: number
  admin: string
  action: string
  details?: string
}

function safeGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function getAdminSession(): AdminSession | null {
  return safeGet<AdminSession>(ADMIN_SESSION_KEY)
}

export function setAdminSession(session: AdminSession | null) {
  if (session) safeSet(ADMIN_SESSION_KEY, session)
  else try { if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_SESSION_KEY) } catch { /* ok */ }
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export function getLogs(): AdminLog[] {
  return safeGet<AdminLog[]>(ADMIN_LOGS_KEY) ?? []
}

export function addLog(admin: string, action: string, details?: string) {
  const logs = getLogs()
  const entry: AdminLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    admin,
    action,
    details,
  }
  // Keep last 500 logs
  const updated = [entry, ...logs].slice(0, 500)
  safeSet(ADMIN_LOGS_KEY, updated)
  return entry
}

export function clearLogs() {
  safeSet(ADMIN_LOGS_KEY, [])
}
