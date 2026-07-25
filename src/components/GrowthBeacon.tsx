// ─── Growth Beacon ────────────────────────────────────────────────────────────
// Client-only component that fires analytics events on every page navigation.
// Uses sessionStorage for session ID persistence within a browser tab.
// Skips /admin routes to avoid polluting site analytics.

import { useEffect, useRef } from 'react'
import { useLocation }       from '@tanstack/react-router'
import { recordPageView, heartbeatSession } from '../server/growthServer'

const SID_KEY = 'bt_sid'
const NEW_KEY = 'bt_sid_new'

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY)
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      sessionStorage.setItem(SID_KEY, sid)
    }
    return sid
  } catch {
    return 'anon'
  }
}

function claimNewSession(): boolean {
  try {
    const isNew = !sessionStorage.getItem(NEW_KEY)
    if (isNew) sessionStorage.setItem(NEW_KEY, '1')
    return isNew
  } catch {
    return false
  }
}

export function GrowthBeacon() {
  const location    = useLocation()
  const firstRef    = useRef(true)
  const prevPathRef = useRef<string | null>(null)

  // Track page views on each navigation
  useEffect(() => {
    // Never track admin pages
    if (location.pathname.startsWith('/admin')) return

    const sid          = getSessionId()
    const isNewSession = firstRef.current && claimNewSession()
    firstRef.current   = false

    // Referrer: use document.referrer on first load, empty string on SPA navigations
    const referrer = prevPathRef.current == null
      ? (typeof document !== 'undefined' ? document.referrer : '') || 'direct'
      : 'direct'

    prevPathRef.current = location.pathname

    recordPageView({
      data: {
        sessionId:    sid,
        page:         location.pathname,
        referrer:     referrer || 'direct',
        ua:           typeof navigator !== 'undefined' ? navigator.userAgent : '',
        isNewSession,
      },
    }).catch(() => { /* silent fail — never crash the page */ })
  }, [location.pathname])

  // Heartbeat every 30 s to maintain concurrent visitor count
  useEffect(() => {
    if (typeof window === 'undefined') return

    const beat = () => {
      if (document.hidden) return
      if (window.location.pathname.startsWith('/admin')) return
      heartbeatSession({ data: { sessionId: getSessionId() } }).catch(() => {})
    }

    const id = setInterval(beat, 30_000)
    return () => clearInterval(id)
  }, [])

  return null
}
