// ─── Homepage CMS Store — Enterprise-grade configuration for the landing page
// Provides a single source of truth for every visible element on the homepage.
// Changes are persisted to localStorage and synced to data/homepage.json via
// the admin panel's flush-to-disk flow.

import { createContext, useContext } from 'react'
import { markDirty } from './syncStore'
import { gamemodes } from '../data/gamemodes'
import type { Gamemode } from '../data/gamemodes'

const HOMEPAGE_KEY = 'bn_admin_homepage'
const HOMEPAGE_HISTORY_KEY = 'bn_admin_homepage_history'

export type HeroAlign = 'left' | 'center' | 'right'
export type HeroMinHeight = 'auto' | 'screen' | '80' | '96'
export type HeroTitleSize = 'sm' | 'md' | 'lg' | 'xl'
export type HeroAnimation = 'fade-up' | 'scale' | 'none'
export type BackgroundStyle = 'gradient' | 'particles' | 'image' | 'video'
export type BorderRadius = 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type SectionSpacing = 'compact' | 'normal' | 'loose'
export type ContainerPadding = 'sm' | 'md' | 'lg'
export type FeaturesLayout = 'grid' | 'scroll' | 'compact'
export type CtaStyle = 'primary' | 'discord' | 'outline' | 'ghost'
export type AnnouncementType = 'info' | 'warning' | 'success' | 'event'
export type AnnouncementStyle = 'ribbon' | 'minimal' | 'ticker' | 'spotlight' | 'gradient'
export type EventStyle = 'mega' | 'minimal' | 'split' | 'countdown' | 'neon'
export type EventBannerHeight = 'xs' | 'sm' | 'md' | 'lg'

export interface CtaButton {
  text: string
  link: string
  external: boolean
  style: CtaStyle
  visible: boolean
}

export interface StatCardConfig {
  id: string
  label: string
  value: number | 'auto'
  source: 'players' | 'tests' | 'years' | 'manual' | 'mining-users' | 'mining-blocks' | 'shop-revenue'
  suffix: string
  accent: boolean
  icon: string
  visible: boolean
}

export interface FeatureItemConfig {
  id: string
  label: string
  icon: string
  link: string
  visible: boolean
  color: string
  description: string
}

export interface NavLinkConfig {
  id: string
  label: string
  to: string
  icon: string
  visible: boolean
  external: boolean
}

export interface FooterColumn {
  title: string
  links: Array<{ label: string; url: string; internal: boolean }>
}

export interface AnnouncementConfig {
  id: string
  enabled: boolean
  text: string
  title: string
  body: string
  eyebrow: string
  icon: string
  type: AnnouncementType
  style: AnnouncementStyle
  accentColor: string
  backgroundColor: string
  link: string
  linkLabel: string
  startAt: string | null
  endAt: string | null
  dismissible: boolean
}

export interface ThemeConfig {
  brandPrimary: string
  brandSecondary: string
  brandAccent: string
  bgPrimary: string
  bgSecondary: string
  surface: string
  glassOpacity: number
  borderRadius: BorderRadius
  fontHeading: string
  fontBody: string
  heroGradient: string
  textGradient: string
  particleColor: string
  particleCount: number
  particleSpeed: number
  backgroundStyle: BackgroundStyle
  backgroundImage: string
  backgroundOverlay: string
}

export interface HeroConfig {
  enabled: boolean
  liveTickerEnabled: boolean
  liveTickerLabel: string
  title: string
  titleAccent: string
  subtitle: string
  primaryCta: CtaButton
  secondaryCta: CtaButton
  showServerIP: boolean
  serverIP: string
  ipCopyLabel: string
  ipCopiedLabel: string
  align: HeroAlign
  minHeight: HeroMinHeight
  titleSize: HeroTitleSize
  animation: HeroAnimation
}

export interface StatsConfig {
  enabled: boolean
  cards: StatCardConfig[]
  title: string
  subtitle: string
}

export interface FeaturesConfig {
  enabled: boolean
  title: string
  subtitle: string
  description: string
  layout: FeaturesLayout
  columns: 3 | 4 | 5 | 6
  items: FeatureItemConfig[]
}

export interface QuoteConfig {
  enabled: boolean
  text: string
  highlight: string
  author: string
  align: 'left' | 'center' | 'right'
}

export interface FooterConfig {
  enabled: boolean
  logoText: string
  logoUrl: string
  showWatermark: boolean
  showSocials: boolean
  showLegal: boolean
  showServerIP: boolean
  columns: FooterColumn[]
  bottomLinks: Array<{ label: string; url: string; internal: boolean }>
  copyright: string
  tagline: string
  extra: string
}

export interface NavConfig {
  logoText: string
  logoUrl: string
  showSearch: boolean
  showDiscord: boolean
  discordLink: string
  links: NavLinkConfig[]
}

export interface EventConfig {
  enabled: boolean
  title: string
  subtitle: string
  description: string
  eyebrow: string
  icon: string
  buttonText: string
  link: string
  secondaryButtonText: string
  secondaryLink: string
  endDate: string
  visible: boolean
  showAboveNavbar: boolean
  badge: string
  style: EventStyle
  accentColor: string
  backgroundColor: string
  imageUrl: string
  countdownLabel: string
  showCountdown: boolean
  metaLabel: string
  metaValue: string
  showMeta: boolean
  // Banner thickness & button visibility
  bannerHeight: EventBannerHeight
  showPrimaryButton: boolean
  showSecondaryButton: boolean
  // Visitor behaviour
  dismissible: boolean
  hideWhenExpired: boolean
  closedText: string
  hideOnScroll: boolean
}

export interface MediaConfig {
  logoUrl: string
  faviconUrl: string
  ogImageUrl: string
  heroBackgroundUrl: string
  footerWatermarkUrl: string
}

export interface SeoConfig {
  title: string
  description: string
  keywords: string
  canonical: string
  ga4Id: string
  gscVerification: string
}

export interface LayoutConfig {
  sectionOrder: string[]
  maxWidth: string
  sectionSpacing: SectionSpacing
  containerPadding: ContainerPadding
  navbarFixed: boolean
  showScrollHint: boolean
}

export interface HomepageConfig {
  published: boolean
  publishAt: string | null
  version: number
  lastEditedAt: string
  lastEditedBy: string
  theme: ThemeConfig
  layout: LayoutConfig
  hero: HeroConfig
  stats: StatsConfig
  features: FeaturesConfig
  quote: QuoteConfig
  footer: FooterConfig
  nav: NavConfig
  announcements: AnnouncementConfig[]
  event: EventConfig
  media: MediaConfig
  seo: SeoConfig
}

export interface HomepageSnapshot {
  ts: number
  label: string
  admin: string
  data: HomepageConfig
}

export const HOMEPAGE_VERSION = 1

export const DEFAULT_SECTION_ORDER = [
  'announcement',
  'navbar',
  'hero',
  'stats',
  'quote',
  'features',
  'event',
  'footer',
]

const defaultGamemodeItems: FeatureItemConfig[] = gamemodes.map((gm: Gamemode) => ({
  id: gm.key,
  label: gm.label,
  icon: gm.fallback || '⚔️',
  link: `/rankings?mode=${gm.key}`,
  visible: true,
  color: '#00BFFF',
  description: '',
}))

export const HOMEPAGE_DEFAULTS: HomepageConfig = {
  published: true,
  publishAt: null,
  version: HOMEPAGE_VERSION,
  lastEditedAt: new Date().toISOString(),
  lastEditedBy: 'system',

  theme: {
    brandPrimary: '#00BFFF',
    brandSecondary: '#0099FF',
    brandAccent: '#0066FF',
    bgPrimary: '#00060f',
    bgSecondary: '#0B0F17',
    surface: '#111827',
    glassOpacity: 0.03,
    borderRadius: 'xl',
    fontHeading: 'Space Grotesk',
    fontBody: 'Inter',
    heroGradient: 'linear-gradient(135deg, #00BFFF 0%, #0088FF 50%, #0044DD 100%)',
    textGradient: 'linear-gradient(90deg, #00BFFF, #0088FF, #0055DD)',
    particleColor: '#00BFFF',
    particleCount: 60,
    particleSpeed: 1,
    backgroundStyle: 'gradient',
    backgroundImage: '',
    backgroundOverlay: 'rgba(0,0,0,0.2)',
  },

  layout: {
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    maxWidth: '1280px',
    sectionSpacing: 'normal',
    containerPadding: 'md',
    navbarFixed: true,
    showScrollHint: true,
  },

  hero: {
    enabled: true,
    liveTickerEnabled: true,
    liveTickerLabel: 'LIVE',
    title: 'DOMINATE',
    titleAccent: 'THE TIERS',
    subtitle: 'The ultimate Minecraft PvP tier ranking platform. Discover the best — and the worst.',
    primaryCta: { text: 'Join Discord', link: 'https://discord.gg/DmEPAb3NFU', external: true, style: 'discord', visible: true },
    secondaryCta: { text: 'Leaderboards', link: '/rankings', external: false, style: 'outline', visible: true },
    showServerIP: true,
    serverIP: 'play.sennahosting.com',
    ipCopyLabel: 'Copy',
    ipCopiedLabel: 'Copied!',
    align: 'center',
    minHeight: 'screen',
    titleSize: 'xl',
    animation: 'fade-up',
  },

  stats: {
    enabled: true,
    title: '',
    subtitle: '',
    cards: [
      { id: 'ranked', label: 'Total Players', value: 'auto', source: 'players', suffix: '', accent: false, icon: '👥', visible: true },
      { id: 'tests', label: 'Tests Completed', value: 'auto', source: 'tests', suffix: '', accent: true, icon: '⭐', visible: true },
      { id: 'years', label: 'Years Running', value: 1, source: 'manual', suffix: '+', accent: false, icon: '🏆', visible: true },
    ],
  },

  features: {
    enabled: true,
    title: 'Every game mode',
    subtitle: 'you could imagine',
    description: '7 competitive PvP modes, each with its own ranked tier list.',
    layout: 'grid',
    columns: 6,
    items: defaultGamemodeItems,
  } as unknown as FeaturesConfig,

  quote: {
    enabled: true,
    text: "It's so accurate and fair to follow",
    highlight: 'accurate and fair',
    author: '— Blue Tiers community',
    align: 'center',
  },

  footer: {
    enabled: true,
    logoText: 'BlueTiers',
    logoUrl: '',
    showWatermark: true,
    showSocials: true,
    showLegal: true,
    showServerIP: true,
    columns: [
      {
        title: 'navigate',
        links: [
          { label: 'Home', url: '/', internal: true },
          { label: 'Rankings', url: '/rankings', internal: true },
          { label: 'Tournament', url: '/tournament', internal: true },
          { label: 'Mining', url: '/mining', internal: true },
          { label: 'Shop', url: '/shop', internal: true },
        ],
      },
      {
        title: 'social',
        links: [
          { label: 'Discord', url: 'https://discord.gg/DmEPAb3NFU', internal: false },
        ],
      },
      {
        title: 'legal',
        links: [
          { label: 'Terms of Service', url: 'terms', internal: true },
          { label: 'Privacy Policy', url: 'privacy', internal: true },
          { label: 'Screenshare Rules', url: 'screenshare', internal: true },
        ],
      },
    ],
    bottomLinks: [
      { label: 'API Documentation', url: '#', internal: false },
    ],
    copyright: '© 2026 Blue Tiers. All rights reserved.',
    tagline: 'Not affiliated with Microsoft or Mojang AB.',
    extra: '',
  },

  nav: {
    logoText: 'Blue Tiers',
    logoUrl: '',
    showSearch: true,
    showDiscord: true,
    discordLink: 'https://discord.gg/DmEPAb3NFU',
    links: [
      { id: 'rankings', label: 'Rankings', to: '/rankings', icon: 'BarChart2', visible: true, external: false },
      { id: 'tournament', label: 'Tournament', to: '/tournament', icon: 'Trophy', visible: true, external: false },
      { id: 'mining', label: 'Mining', to: '/mining', icon: 'Pickaxe', visible: true, external: false },
      { id: 'exchange', label: 'Exchange', to: '/exchange', icon: 'ArrowLeftRight', visible: true, external: false },
      { id: 'shop', label: 'Shop', to: '/shop', icon: 'ShoppingBag', visible: true, external: false },
      { id: 'tier-tagger', label: 'Tier Tagger', to: '/tier-tagger', icon: 'Tag', visible: true, external: false },
    ],
  },

  announcements: [
    {
      id: 'default',
      enabled: false,
      text: 'Welcome to Blue Tiers — the new homepage CMS is live!',
      title: 'Welcome to Blue Tiers',
      body: 'The new homepage CMS is live!',
      eyebrow: 'News',
      icon: '✦',
      type: 'info',
      style: 'spotlight',
      accentColor: '#00BFFF',
      backgroundColor: '#062039',
      link: '',
      linkLabel: 'Learn more',
      startAt: null,
      endAt: null,
      dismissible: true,
    },
  ],

  event: {
    enabled: false,
    title: 'PvP World Cup',
    subtitle: 'Registration closes soon',
    description: 'Assemble your squad, climb the bracket, and prove who owns the arena.',
    eyebrow: 'Featured event',
    icon: '🏆',
    buttonText: 'Register Now',
    link: '/tournament',
    secondaryButtonText: 'View details',
    secondaryLink: '/tournament',
    endDate: '',
    visible: false,
    showAboveNavbar: false,
    badge: 'EVENT',
    style: 'mega',
    accentColor: '#00BFFF',
    backgroundColor: '#071426',
    imageUrl: '',
    countdownLabel: 'Registration closes in',
    showCountdown: true,
    metaLabel: 'Format',
    metaValue: 'Open tournament',
    showMeta: true,
    bannerHeight: 'sm',
    showPrimaryButton: true,
    showSecondaryButton: true,
    dismissible: false,
    hideWhenExpired: false,
    closedText: 'Registration is now closed.',
    hideOnScroll: false,
  },

  media: {
    logoUrl: '',
    faviconUrl: '',
    ogImageUrl: '',
    heroBackgroundUrl: '',
    footerWatermarkUrl: '',
  },

  seo: {
    title: 'Blue Tiers — #1 Minecraft PvP Tier List',
    description: 'The definitive tier list for all types of Minecraft PvP players. Rankings, mining, shop, and more.',
    keywords: 'minecraft, pvp, tier list, blue tiers, rankings',
    canonical: 'https://bluetiers.bolt.host',
    ga4Id: '',
    gscVerification: '',
  },
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

function deepMerge<T>(target: T, source: Partial<T> | Record<string, unknown>): T {
  if (typeof source !== 'object' || source === null) return target
  const out = { ...target } as Record<string, unknown>
  for (const [key, val] of Object.entries(source)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val) && key in out && typeof out[key] === 'object' && out[key] !== null && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key] as Record<string, unknown>, val as Record<string, unknown>)
    } else {
      out[key] = val
    }
  }
  return out as T
}

export function normalizeHomepageConfig(config: HomepageConfig): HomepageConfig {
  const announcementDefaults = HOMEPAGE_DEFAULTS.announcements[0]
  return {
    ...config,
    announcements: Array.isArray(config.announcements)
      ? config.announcements.map(announcement => ({
          ...announcementDefaults,
          ...announcement,
        }))
      : [...HOMEPAGE_DEFAULTS.announcements],
  }
}

export function getHomepageConfig(): HomepageConfig {
  const stored = safeGet<Partial<HomepageConfig>>(HOMEPAGE_KEY)
  return normalizeHomepageConfig(stored ? deepMerge(HOMEPAGE_DEFAULTS, stored) : HOMEPAGE_DEFAULTS)
}

export function saveHomepageConfig(config: HomepageConfig, opts?: { silent?: boolean }) {
  safeSet(HOMEPAGE_KEY, config)
  if (!opts?.silent) markDirty('homepage')
}

export function resetHomepageConfig() {
  safeSet(HOMEPAGE_KEY, {})
  markDirty('homepage')
}

export function getHomepageHistory(): HomepageSnapshot[] {
  return safeGet<HomepageSnapshot[]>(HOMEPAGE_HISTORY_KEY) ?? []
}

export function pushHomepageHistory(snapshot: HomepageSnapshot) {
  const history = getHomepageHistory()
  history.unshift(snapshot)
  safeSet(HOMEPAGE_HISTORY_KEY, history.slice(0, 50))
}

export function clearHomepageHistory() {
  safeSet(HOMEPAGE_HISTORY_KEY, [])
}

export function homepageConfigToJSON(config: HomepageConfig): string {
  return JSON.stringify(config, null, 2)
}

export function homepageConfigFromJSON(json: string): HomepageConfig {
  const parsed = JSON.parse(json)
  return normalizeHomepageConfig(deepMerge(HOMEPAGE_DEFAULTS, parsed))
}

export { HOMEPAGE_KEY }

// ─── React Context for SSR-safe homepage config ───────────────────────────────

export const HomepageConfigContext = createContext<HomepageConfig>(HOMEPAGE_DEFAULTS)

export const HomepageConfigProvider = HomepageConfigContext.Provider

export function useHomepageConfig(): HomepageConfig {
  return useContext(HomepageConfigContext)
}
