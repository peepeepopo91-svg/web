// ─── Site Growth / Analytics Server Functions ─────────────────────────────────
// Tracks page views, sessions, device info, and concurrent visitors.
// Data is stored in data/growth.json and updated in memory between writes.
// Never fabricates historical data — starts collecting from first deployment.

import { createServerFn } from '@tanstack/react-start'
import { z }              from 'zod'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { resolve }        from 'node:path'

const DATA_DIR    = resolve('data')
const GROWTH_FILE = 'growth.json'
const SESSION_TIMEOUT_MS = 2 * 60 * 1000 // 2 min inactivity = offline

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DayStatStored {
  pageViews:      number
  uniqueSessions: number
  pages:          Record<string, number>
  referrers:      Record<string, number>
  devices:        Record<string, number>
  browsers:       Record<string, number>
  os:             Record<string, number>
  peakConcurrent: number
}

export interface GrowthData {
  startedAt:          number
  peakConcurrentEver: number
  dailyStats:         Record<string, DayStatStored> // "YYYY-MM-DD" -> stats
}

// ── Global in-memory state ─────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __growthSessions:      Map<string, number>  // sessionId -> lastSeenMs
  // eslint-disable-next-line no-var
  var __growthTodaySessions: Set<string>          // unique sessions seen today
  // eslint-disable-next-line no-var
  var __growthTodayKey:      string               // "YYYY-MM-DD"
  // eslint-disable-next-line no-var
  var __growthCache:         GrowthData | null    // in-memory data cache
  // eslint-disable-next-line no-var
  var __growthWriteTimer:    ReturnType<typeof setTimeout> | null
}

if (!globalThis.__growthSessions)      globalThis.__growthSessions      = new Map()
if (!globalThis.__growthTodaySessions) globalThis.__growthTodaySessions = new Set()
if (!globalThis.__growthTodayKey)      globalThis.__growthTodayKey      = ''
if (!('__growthCache' in globalThis))  globalThis.__growthCache         = null
if (!('__growthWriteTimer' in globalThis)) globalThis.__growthWriteTimer = null

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function checkDayRollover() {
  const key = todayKey()
  if (key !== globalThis.__growthTodayKey) {
    globalThis.__growthTodayKey      = key
    globalThis.__growthTodaySessions = new Set()
  }
}

function emptyDay(): DayStatStored {
  return {
    pageViews:      0,
    uniqueSessions: 0,
    pages:          {},
    referrers:      {},
    devices:        {},
    browsers:       {},
    os:             {},
    peakConcurrent: 0,
  }
}

function inc(obj: Record<string, number>, key: string) {
  obj[key] = (obj[key] ?? 0) + 1
}

function readGrowthFromDisk(): GrowthData {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, GROWTH_FILE), 'utf8')) as GrowthData
  } catch {
    return { startedAt: Date.now(), peakConcurrentEver: 0, dailyStats: {} }
  }
}

function getGrowth(): GrowthData {
  if (globalThis.__growthCache) return globalThis.__growthCache
  globalThis.__growthCache = readGrowthFromDisk()
  return globalThis.__growthCache
}

function scheduleWrite(data: GrowthData) {
  globalThis.__growthCache = data
  if (globalThis.__growthWriteTimer) return
  globalThis.__growthWriteTimer = setTimeout(() => {
    globalThis.__growthWriteTimer = null
    if (globalThis.__growthCache) {
      try {
        mkdirSync(DATA_DIR, { recursive: true })
        const target = resolve(DATA_DIR, GROWTH_FILE)
        const tmp    = target + '.tmp'
        writeFileSync(tmp, JSON.stringify(globalThis.__growthCache, null, 2), 'utf8')
        renameSync(tmp, target)
      } catch { /* silent */ }
    }
  }, 3000)
}

function cleanSessions(): number {
  const cutoff = Date.now() - SESSION_TIMEOUT_MS
  for (const [id, ts] of globalThis.__growthSessions) {
    if (ts < cutoff) globalThis.__growthSessions.delete(id)
  }
  return globalThis.__growthSessions.size
}

export function parseDevice(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return 'Tablet'
  if (/mobile|android|iphone/i.test(ua)) return 'Mobile'
  return 'Desktop'
}

export function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua))   return 'Edge'
  if (/opr\//i.test(ua))   return 'Opera'
  if (/chrome/i.test(ua))  return 'Chrome'
  if (/firefox/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua))  return 'Safari'
  return 'Other'
}

export function parseOS(ua: string): string {
  if (/windows/i.test(ua))         return 'Windows'
  if (/android/i.test(ua))         return 'Android'
  if (/iphone|ipad/i.test(ua))     return 'iOS'
  if (/mac os x/i.test(ua))        return 'macOS'
  if (/linux/i.test(ua))           return 'Linux'
  return 'Other'
}

export function parseSource(ref: string): string {
  if (!ref || ref === 'direct' || ref === '') return 'Direct'
  if (/discord/i.test(ref))        return 'Discord'
  if (/google/i.test(ref))         return 'Google'
  if (/bing/i.test(ref))           return 'Bing'
  if (/youtube/i.test(ref))        return 'YouTube'
  if (/twitter|x\.com/i.test(ref)) return 'Twitter/X'
  if (/reddit/i.test(ref))         return 'Reddit'
  return 'Referral'
}

// ── Server Functions ───────────────────────────────────────────────────────────

/** Called by the GrowthBeacon on each page navigation. */
export const recordPageView = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    sessionId:    z.string().max(64),
    page:         z.string().max(256),
    referrer:     z.string().max(512),
    ua:           z.string().max(512),
    isNewSession: z.boolean(),
  }))
  .handler(({ data }): { concurrent: number } => {
    checkDayRollover()
    const key = globalThis.__growthTodayKey

    // Concurrent tracking
    globalThis.__growthSessions.set(data.sessionId, Date.now())
    const concurrent = cleanSessions()

    // Unique-per-day tracking
    const isNewToday = !globalThis.__growthTodaySessions.has(data.sessionId)
    if (isNewToday) globalThis.__growthTodaySessions.add(data.sessionId)

    // Persist
    const growth = getGrowth()
    if (!growth.dailyStats[key]) growth.dailyStats[key] = emptyDay()
    const day = growth.dailyStats[key]

    day.pageViews++
    if (isNewToday) day.uniqueSessions++

    const pagePath = data.page.split('?')[0].slice(0, 80) || '/'
    inc(day.pages,    pagePath)
    inc(day.referrers, parseSource(data.referrer))
    inc(day.devices,  parseDevice(data.ua))
    inc(day.browsers, parseBrowser(data.ua))
    inc(day.os,       parseOS(data.ua))

    if (concurrent > day.peakConcurrent)       day.peakConcurrent       = concurrent
    if (concurrent > growth.peakConcurrentEver) growth.peakConcurrentEver = concurrent

    scheduleWrite(growth)
    return { concurrent }
  })

/** Heartbeat: keeps session alive. Called every 30 s from the client. */
export const heartbeatSession = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ sessionId: z.string().max(64) }))
  .handler(({ data }): { concurrent: number } => {
    checkDayRollover()
    const key = globalThis.__growthTodayKey

    globalThis.__growthSessions.set(data.sessionId, Date.now())
    const concurrent = cleanSessions()

    // Only persist if we set a new peak
    const growth = getGrowth()
    if (!growth.dailyStats[key]) growth.dailyStats[key] = emptyDay()
    const day = growth.dailyStats[key]
    if (concurrent > day.peakConcurrent || concurrent > growth.peakConcurrentEver) {
      if (concurrent > day.peakConcurrent)       day.peakConcurrent       = concurrent
      if (concurrent > growth.peakConcurrentEver) growth.peakConcurrentEver = concurrent
      scheduleWrite(growth)
    }

    return { concurrent }
  })

/** Full analytics snapshot for the admin page. */
export const getGrowthStats = createServerFn({ method: 'GET' })
  .handler((): { growth: GrowthData; concurrent: number; todaySessions: number } => {
    checkDayRollover()
    const growth = getGrowth()
    const concurrent    = cleanSessions()
    const todaySessions = globalThis.__growthTodaySessions.size
    return { growth, concurrent, todaySessions }
  })
