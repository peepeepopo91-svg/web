import { createServerFn } from '@tanstack/react-start'
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

const DATA_DIR = resolve(process.cwd(), 'data')
const ADS_FILE = 'ads-config.json'

// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface SponsorSlot {
  id: string
  name: string
  logoUrl: string
  linkUrl: string
  html: string
  weight: number
  active: boolean
  startDate: string
  endDate: string
  impressions: number
  clicks: number
  dealValue: number
}

export interface Milestone {
  id: string
  amount: number
  label: string
  achieved: boolean
  achievedAt: string | null
}

export interface WaterfallProvider {
  id: string
  provider: string
  enabled: boolean
  priority: number
  estimatedFillRate: number
  customTag: string
}

export interface RevenueShareRecipient {
  id: string
  name: string
  role: string
  percentage: number
  payoutAddress: string
  totalEarned: number
}

export interface AffiliateLink {
  id: string
  name: string
  url: string
  network: string
  commission: number
  commissionType: 'percent' | 'flat'
  clicks: number
  conversions: number
  totalEarned: number
  active: boolean
  placement: string
}

export interface PayoutRecord {
  id: string
  date: string
  amount: number
  method: string
  status: 'pending' | 'processing' | 'paid' | 'failed'
  notes: string
}

export interface ABTestStats {
  variantAImpressions: number
  variantACompletions: number
  variantARevenue: number
  variantBImpressions: number
  variantBCompletions: number
  variantBRevenue: number
  startedAt: string | null
}

export interface ReferralStats {
  totalReferrals: number
  totalClicks: number
  totalConversions: number
  totalCommission: number
}

export interface AdStats {
  totalImpressions: number
  totalCompletions: number
  totalSkips: number
  estimatedRevenue: number
  lastReset: string | null
  // Per-page impression counts
  pageImpressions: Record<string, number>
  // Hourly distribution (0-23)
  hourlyImpressions: number[]
  // Daily revenue history (last 30 days, ISO date -> revenue)
  dailyRevenue: Record<string, number>
}

// ─── Main config type ─────────────────────────────────────────────────────────

export interface AdsConfig {
  // ── Core ──────────────────────────────────────────────────────────────────
  enabled: boolean
  adProvider: 'placeholder' | 'adsense' | 'custom' | 'medianet' | 'ezoic' | 'propellerads' | 'adsterra' | 'infolinks' | 'monetag' | 'amazon-aps' | 'taboola' | 'mgid' | 'buysellads' | 'carbon'
  adsensePublisherId: string
  adsenseSlotId: string
  medianetSiteId: string
  ezoicSiteId: string
  // New providers
  propelleradsZoneId: string
  adsterraPublisherId: string
  adsterraDirectLink: string
  infolinksPublisherId: string
  infolinksWebsiteId: string
  monetagWebsiteId: string
  amazonApsPublisherId: string
  taboolaSiteId: string
  mgidClientId: string
  buyselladsPropertyId: string
  carbonZoneKey: string
  // Application tracking
  networkStatus: Record<string, 'not-applied' | 'applied' | 'pending' | 'approved' | 'rejected'>
  adDurationSeconds: number
  renewMode: 'free' | 'ad-required' | 'ad-optional' | 'disabled'
  showAdOnExpired: boolean
  showAdOnEarlyRenew: boolean
  skipAllowed: boolean
  skipAfterSeconds: number
  customAdHtml: string
  rewardOnComplete: boolean
  rewardType: 'bluecoin' | 'gems'
  rewardAmount: number
  bannerAdEnabled: boolean
  bannerAdHtml: string
  estimatedRpm: number
  pageAds: Record<string, boolean>
  pageAdHtml: Record<string, string>        // NEW: per-page custom HTML override
  stickyFooterEnabled: boolean              // NEW
  stickyFooterHtml: string                  // NEW
  interstitialEnabled: boolean              // NEW
  interstitialOnPageChange: boolean         // NEW
  interstitialFrequency: number             // NEW: every N page changes

  // ── Frequency & Limits ───────────────────────────────────────────────────
  dailyAdCapPerUser: number
  cooldownBetweenAdsSeconds: number
  maxAdsPerSession: number
  bannerRefreshIntervalSeconds: number

  // ── Schedule ─────────────────────────────────────────────────────────────
  scheduleEnabled: boolean
  scheduleTimezone: string
  scheduleHoursStart: number
  scheduleHoursEnd: number
  scheduleAllowedDays: number[]
  quietHoursEnabled: boolean
  quietHoursStart: number
  quietHoursEnd: number

  // ── Player UX ────────────────────────────────────────────────────────────
  showThankYouMessage: boolean
  thankYouMessage: string
  adLabelText: string
  showAdProgressBar: boolean
  showCountdownTimer: boolean
  fatigueProtectionEnabled: boolean
  fatigueMaxAdsPerHour: number
  allowPlayerOptOut: boolean
  optOutMessage: string
  muteByDefault: boolean
  showSkipAnimation: boolean

  // ── Compliance ───────────────────────────────────────────────────────────
  gdprEnabled: boolean
  gdprConsentRequired: boolean
  gdprConsentText: string
  privacyPolicyUrl: string
  termsUrl: string
  coppaMode: boolean
  adDisclosureText: string
  ccpaEnabled: boolean
  cookieConsentRequired: boolean
  cookieConsentText: string

  // ── Sponsors ─────────────────────────────────────────────────────────────
  sponsors: SponsorSlot[]

  // ── Goals & Milestones ───────────────────────────────────────────────────
  goalDaily: number
  goalWeekly: number
  goalMonthly: number
  milestones: Milestone[]

  // ── Notifications ────────────────────────────────────────────────────────
  webhookEnabled: boolean
  webhookUrl: string
  webhookEvents: string[]
  notifyOnMilestone: boolean
  notifyOnReset: boolean
  revenueAlertEnabled: boolean
  revenueAlertThreshold: number
  dailyDigestEnabled: boolean
  digestEmail: string

  // ── Geo Targeting ────────────────────────────────────────────────────────
  geoEnabled: boolean
  geoMode: 'allowlist' | 'blocklist'
  geoCountries: string[]
  geoFallbackHtml: string
  geoShowFallbackAd: boolean

  // ── A/B Testing ──────────────────────────────────────────────────────────
  abTestEnabled: boolean
  abTestName: string
  abTestSplit: number
  abTestVariantAHtml: string
  abTestVariantADuration: number
  abTestVariantBHtml: string
  abTestVariantBDuration: number
  abTestStats: ABTestStats

  // ── Multi-Provider Waterfall ─────────────────────────────────────────────
  waterfallEnabled: boolean
  waterfallProviders: WaterfallProvider[]

  // ── Revenue Share ────────────────────────────────────────────────────────
  revenueShareEnabled: boolean
  revenueShareRecipients: RevenueShareRecipient[]

  // ── Affiliate Links ──────────────────────────────────────────────────────
  affiliateEnabled: boolean
  affiliateLinks: AffiliateLink[]

  // ── Payout ───────────────────────────────────────────────────────────────
  payoutEnabled: boolean
  payoutMethod: 'paypal' | 'bank' | 'crypto' | 'check'
  payoutThreshold: number
  payoutEmail: string
  payoutCurrency: string
  payoutHistory: PayoutRecord[]

  // ── Boost Events ─────────────────────────────────────────────────────────
  boostEnabled: boolean
  boostMultiplier: number
  boostStartDate: string
  boostEndDate: string
  boostLabel: string
  boostBannerText: string

  // ── Referral Program ─────────────────────────────────────────────────────
  referralEnabled: boolean
  referralCommissionPercent: number
  referralClickBonus: number
  referralCookieDays: number
  referralStats: ReferralStats

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: AdStats
}

// ─── Default config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AdsConfig = {
  enabled: true,
  adProvider: 'placeholder',
  adsensePublisherId: '',
  adsenseSlotId: '',
  medianetSiteId: '',
  ezoicSiteId: '',
  propelleradsZoneId: '',
  adsterraPublisherId: '',
  adsterraDirectLink: '',
  infolinksPublisherId: '',
  infolinksWebsiteId: '',
  monetagWebsiteId: '',
  amazonApsPublisherId: '',
  taboolaSiteId: '',
  mgidClientId: '',
  buyselladsPropertyId: '',
  carbonZoneKey: '',
  networkStatus: {},
  adDurationSeconds: 5,
  renewMode: 'ad-required',
  showAdOnExpired: true,
  showAdOnEarlyRenew: false,
  skipAllowed: false,
  skipAfterSeconds: 3,
  customAdHtml: '',
  rewardOnComplete: false,
  rewardType: 'bluecoin',
  rewardAmount: 100,
  bannerAdEnabled: false,
  bannerAdHtml: '',
  estimatedRpm: 2.50,
  pageAds: { home: false, rankings: false, mining: false, exchange: false, shop: false, tournament: false },
  pageAdHtml: {},
  stickyFooterEnabled: false,
  stickyFooterHtml: '',
  interstitialEnabled: false,
  interstitialOnPageChange: false,
  interstitialFrequency: 3,

  dailyAdCapPerUser: 0,
  cooldownBetweenAdsSeconds: 0,
  maxAdsPerSession: 0,
  bannerRefreshIntervalSeconds: 30,

  scheduleEnabled: false,
  scheduleTimezone: 'UTC',
  scheduleHoursStart: 6,
  scheduleHoursEnd: 22,
  scheduleAllowedDays: [0, 1, 2, 3, 4, 5, 6],
  quietHoursEnabled: false,
  quietHoursStart: 23,
  quietHoursEnd: 6,

  showThankYouMessage: false,
  thankYouMessage: 'Thanks for supporting Blue Tiers! 🎉',
  adLabelText: 'Advertisement',
  showAdProgressBar: true,
  showCountdownTimer: true,
  fatigueProtectionEnabled: false,
  fatigueMaxAdsPerHour: 3,
  allowPlayerOptOut: false,
  optOutMessage: 'Ads help keep this server free. Are you sure you want to opt out?',
  muteByDefault: false,
  showSkipAnimation: true,

  gdprEnabled: false,
  gdprConsentRequired: false,
  gdprConsentText: 'We use ads to support the server. By continuing, you consent to personalised advertising.',
  privacyPolicyUrl: '',
  termsUrl: '',
  coppaMode: false,
  adDisclosureText: 'This site uses advertising to fund operations.',
  ccpaEnabled: false,
  cookieConsentRequired: false,
  cookieConsentText: 'We use cookies to serve relevant ads.',

  sponsors: [],

  goalDaily: 0,
  goalWeekly: 0,
  goalMonthly: 0,
  milestones: [],

  webhookEnabled: false,
  webhookUrl: '',
  webhookEvents: ['milestone', 'reset', 'daily-digest'],
  notifyOnMilestone: true,
  notifyOnReset: true,
  revenueAlertEnabled: false,
  revenueAlertThreshold: 10,
  dailyDigestEnabled: false,
  digestEmail: '',

  geoEnabled: false,
  geoMode: 'allowlist',
  geoCountries: [],
  geoFallbackHtml: '',
  geoShowFallbackAd: true,

  abTestEnabled: false,
  abTestName: 'Test 1',
  abTestSplit: 50,
  abTestVariantAHtml: '',
  abTestVariantADuration: 5,
  abTestVariantBHtml: '',
  abTestVariantBDuration: 10,
  abTestStats: {
    variantAImpressions: 0, variantACompletions: 0, variantARevenue: 0,
    variantBImpressions: 0, variantBCompletions: 0, variantBRevenue: 0,
    startedAt: null,
  },

  waterfallEnabled: false,
  waterfallProviders: [
    { id: 'w1', provider: 'Google AdSense', enabled: true, priority: 1, estimatedFillRate: 95, customTag: '' },
    { id: 'w2', provider: 'Media.net',      enabled: false, priority: 2, estimatedFillRate: 70, customTag: '' },
    { id: 'w3', provider: 'Custom',         enabled: false, priority: 3, estimatedFillRate: 100, customTag: '' },
  ],

  revenueShareEnabled: false,
  revenueShareRecipients: [],

  affiliateEnabled: false,
  affiliateLinks: [],

  payoutEnabled: false,
  payoutMethod: 'paypal',
  payoutThreshold: 50,
  payoutEmail: '',
  payoutCurrency: 'USD',
  payoutHistory: [],

  boostEnabled: false,
  boostMultiplier: 2,
  boostStartDate: '',
  boostEndDate: '',
  boostLabel: '2× Revenue Event',
  boostBannerText: '🚀 Double earnings are live! Limited time.',

  referralEnabled: false,
  referralCommissionPercent: 10,
  referralClickBonus: 0,
  referralCookieDays: 30,
  referralStats: { totalReferrals: 0, totalClicks: 0, totalConversions: 0, totalCommission: 0 },

  stats: {
    totalImpressions: 0,
    totalCompletions: 0,
    totalSkips: 0,
    estimatedRevenue: 0,
    lastReset: null,
    pageImpressions: {},
    hourlyImpressions: new Array(24).fill(0),
    dailyRevenue: {},
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadAdsConfig(): AdsConfig {
  try {
    const raw = readFileSync(resolve(DATA_DIR, ADS_FILE), 'utf8')
    const parsed = JSON.parse(raw)
    // Deep-merge stats to preserve new sub-keys
    const merged = { ...DEFAULT_CONFIG, ...parsed }
    merged.stats = { ...DEFAULT_CONFIG.stats, ...parsed.stats }
    merged.abTestStats = { ...DEFAULT_CONFIG.abTestStats, ...parsed.abTestStats }
    return merged
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function writeAdsConfig(cfg: AdsConfig) {
  mkdirSync(DATA_DIR, { recursive: true })
  const tmp = resolve(DATA_DIR, ADS_FILE + '.tmp')
  writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8')
  renameSync(tmp, resolve(DATA_DIR, ADS_FILE))
}

// ─── Server functions ─────────────────────────────────────────────────────────

export const getAdsConfig = createServerFn({ method: 'GET' }).handler(async () => {
  return loadAdsConfig()
})

export const saveAdsConfig = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ config: z.any() }))
  .handler(async ({ data }) => {
    const current = loadAdsConfig()
    const merged: AdsConfig = { ...current, ...data.config, stats: current.stats, abTestStats: current.abTestStats }
    writeAdsConfig(merged)
    return { ok: true }
  })

export const trackAdEvent = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    event:  z.enum(['impression', 'completion', 'skip']),
    page:   z.string().optional(),
    hour:   z.number().min(0).max(23).optional(),
    variant: z.enum(['a', 'b']).optional(),
  }))
  .handler(async ({ data }) => {
    const cfg = loadAdsConfig()
    const today = new Date().toISOString().slice(0, 10)

    if (data.event === 'impression') {
      cfg.stats.totalImpressions += 1
      if (data.page) cfg.stats.pageImpressions[data.page] = (cfg.stats.pageImpressions[data.page] ?? 0) + 1
      if (data.hour !== undefined) cfg.stats.hourlyImpressions[data.hour] = (cfg.stats.hourlyImpressions[data.hour] ?? 0) + 1
      if (data.variant === 'a') cfg.abTestStats.variantAImpressions += 1
      if (data.variant === 'b') cfg.abTestStats.variantBImpressions += 1
    }
    if (data.event === 'completion') {
      cfg.stats.totalCompletions += 1
      const boostMult = cfg.boostEnabled ? cfg.boostMultiplier : 1
      const earned = parseFloat(((cfg.estimatedRpm / 1000) * boostMult).toFixed(6))
      cfg.stats.estimatedRevenue = parseFloat((cfg.stats.estimatedRevenue + earned).toFixed(6))
      cfg.stats.dailyRevenue[today] = parseFloat(((cfg.stats.dailyRevenue[today] ?? 0) + earned).toFixed(6))
      if (data.variant === 'a') { cfg.abTestStats.variantACompletions += 1; cfg.abTestStats.variantARevenue = parseFloat((cfg.abTestStats.variantARevenue + earned).toFixed(6)) }
      if (data.variant === 'b') { cfg.abTestStats.variantBCompletions += 1; cfg.abTestStats.variantBRevenue = parseFloat((cfg.abTestStats.variantBRevenue + earned).toFixed(6)) }
      // Affiliate: count toward referral commissions is handled client-side
    }
    if (data.event === 'skip') cfg.stats.totalSkips += 1

    writeAdsConfig(cfg)
    return { ok: true }
  })

export const resetAdsStats = createServerFn({ method: 'POST' }).handler(async () => {
  const cfg = loadAdsConfig()
  cfg.stats = {
    totalImpressions: 0, totalCompletions: 0, totalSkips: 0, estimatedRevenue: 0,
    lastReset: new Date().toISOString(),
    pageImpressions: {},
    hourlyImpressions: new Array(24).fill(0),
    dailyRevenue: {},
  }
  writeAdsConfig(cfg)
  return { ok: true }
})

export const resetAbTestStats = createServerFn({ method: 'POST' }).handler(async () => {
  const cfg = loadAdsConfig()
  cfg.abTestStats = {
    variantAImpressions: 0, variantACompletions: 0, variantARevenue: 0,
    variantBImpressions: 0, variantBCompletions: 0, variantBRevenue: 0,
    startedAt: new Date().toISOString(),
  }
  writeAdsConfig(cfg)
  return { ok: true }
})

export const trackAffiliateClick = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ linkId: z.string() }))
  .handler(async ({ data }) => {
    const cfg = loadAdsConfig()
    const link = cfg.affiliateLinks.find(l => l.id === data.linkId)
    if (link) { link.clicks += 1 }
    writeAdsConfig(cfg)
    return { ok: true }
  })

export const addPayoutRecord = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ amount: z.number(), method: z.string(), notes: z.string().optional() }))
  .handler(async ({ data }) => {
    const cfg = loadAdsConfig()
    cfg.payoutHistory.unshift({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount: data.amount,
      method: data.method,
      status: 'pending',
      notes: data.notes ?? '',
    })
    writeAdsConfig(cfg)
    return { ok: true }
  })

export const exportEarningsData = createServerFn({ method: 'GET' }).handler(async () => {
  return loadAdsConfig()
})
