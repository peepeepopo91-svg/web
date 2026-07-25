// ─── Content Store — Site-wide CMS ───────────────────────────────────────────
// Stores site content overrides in localStorage. Components read from here first.
// Default values come from the static data files.

import { EVENT } from '../data/event'
import type { EventConfig } from '../data/event'
import { markDirty } from './syncStore'

const SITE_CONTENT_KEY  = 'bn_admin_content'
const EVENT_CONTENT_KEY = 'bn_admin_event'

export interface SiteContent {
  // ── Homepage ──────────────────────────────────────────────────────────────
  heroTitle?: string
  heroSubtitle?: string
  serverIP?: string
  discordLink?: string
  // ── Announcement Banner ───────────────────────────────────────────────────
  announcementEnabled?: boolean
  announcementText?: string
  announcementType?: 'info' | 'warning' | 'success' | 'event'
  announcementLink?: string
  announcementLinkLabel?: string
  // ── Social Links ──────────────────────────────────────────────────────────
  twitterLink?: string
  youtubeLink?: string
  twitchLink?: string
  githubLink?: string
  // ── SEO & Meta ────────────────────────────────────────────────────────────
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  ogImageUrl?: string
  // ── Publish / Google ──────────────────────────────────────────────────────
  canonicalUrl?: string
  ga4Id?: string
  gscVerificationTag?: string
  // ── Footer ────────────────────────────────────────────────────────────────
  footerCopyright?: string
  footerTagline?: string
  footerShowServerIP?: boolean
  footerShowDiscord?: boolean
  footerShowSocials?: boolean
  footerExtra?: string
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

// ─── Site Content ─────────────────────────────────────────────────────────────

export const CONTENT_DEFAULTS: Required<SiteContent> = {
  // Homepage
  heroTitle:              'BLUE TIERS',
  heroSubtitle:           '#1 Tier List for all types of players.',
  serverIP:               'play.sennahosting.com',
  discordLink:            'https://discord.gg/DmEPAb3NFU',
  // Announcement
  announcementEnabled:    false,
  announcementText:       '',
  announcementType:       'info',
  announcementLink:       '',
  announcementLinkLabel:  'Learn more',
  // Social
  twitterLink:            '',
  youtubeLink:            '',
  twitchLink:             '',
  githubLink:             '',
  // SEO
  seoTitle:               'Blue Tiers — #1 Minecraft PvP Tier List',
  seoDescription:         'The definitive tier list for all types of Minecraft PvP players. Rankings, mining, shop, and more.',
  seoKeywords:            'minecraft, pvp, tier list, blue tiers, rankings',
  ogImageUrl:             '',
  // Publish / Google
  canonicalUrl:           '',
  ga4Id:                  '',
  gscVerificationTag:     '',
  // Footer
  footerCopyright:        '© 2026 Blue Tiers. All rights reserved.',
  footerTagline:          'Not affiliated with Mojang or Microsoft.',
  footerShowServerIP:     true,
  footerShowDiscord:      true,
  footerShowSocials:      true,
  footerExtra:            '',
}

export function getSiteContent(): Required<SiteContent> {
  const overrides = safeGet<SiteContent>(SITE_CONTENT_KEY) ?? {}
  return { ...CONTENT_DEFAULTS, ...overrides }
}

export function saveSiteContent(content: SiteContent, opts?: { silent?: boolean }) {
  safeSet(SITE_CONTENT_KEY, content)
  if (!opts?.silent) markDirty('content')
}

export function resetSiteContent() {
  safeSet(SITE_CONTENT_KEY, {})
  markDirty('content')
}

// ─── Event Config ─────────────────────────────────────────────────────────────

export function getEventConfig(): EventConfig {
  const overrides = safeGet<Partial<EventConfig>>(EVENT_CONTENT_KEY) ?? {}
  return { ...EVENT, ...overrides }
}

export function saveEventConfig(config: EventConfig, opts?: { silent?: boolean }) {
  safeSet(EVENT_CONTENT_KEY, config)
  if (!opts?.silent) markDirty('event')
}

export function resetEventConfig() {
  safeSet(EVENT_CONTENT_KEY, {})
  markDirty('event')
}
