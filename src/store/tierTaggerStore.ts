// ─── Tier Tagger Store ────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { markDirty } from './syncStore'

const KEY = 'bn_admin_tier_tagger'

export interface TierTaggerFeature {
  id: string
  icon: string
  title: string
  desc: string
}

export interface TierTaggerStep {
  id: string
  n: string
  title: string
  desc: string
}

export interface TierTaggerConfig {
  badge: string
  titlePrefix: string
  titleAccent: string
  subtitle: string
  downloadLabel: string
  downloadUrl: string
  secondaryLabel: string
  secondaryUrl: string
  nametagImageUrl: string
  nametagCaption: string
  nametagSubcaption: string
  profileImageUrl: string
  profileCaption: string
  profileSubcaption: string
  featuresEyebrow: string
  featuresHeading: string
  features: TierTaggerFeature[]
  stepsEyebrow: string
  stepsHeading: string
  steps: TierTaggerStep[]
  ctaHeading: string
  ctaBody: string
  ctaButtonLabel: string
  ctaButtonUrl: string
  ctaNote: string
  aboutTitle: string
  aboutBody: string
  aboutCredit: string
  /** When true, both download buttons are replaced with a countdown timer */
  releaseCountdownEnabled: boolean
  /** ISO datetime string for the release moment */
  releaseDate: string
  /** Label shown above the countdown digits, e.g. "Coming Soon" */
  countdownHeading: string
  /** Teaser line shown below the countdown digits */
  countdownSubtext: string
}

export const DEFAULT_TIER_TAGGER: TierTaggerConfig = {
  badge: 'Official Blue Tiers Mod',
  titlePrefix: 'Blue Tier',
  titleAccent: 'Tagger',
  subtitle: "See every player's Blue Tiers rank directly above their nametag — in real time, on any server.",
  downloadLabel: 'Download Now',
  downloadUrl: 'https://modrinth.com',
  secondaryLabel: 'View Rankings',
  secondaryUrl: '/rankings',
  nametagImageUrl: '/tagger-nametag.png',
  nametagCaption: 'Tier above nametag',
  nametagSubcaption: 'Visible on any multiplayer server',
  profileImageUrl: '/tagger-profile.webp',
  profileCaption: 'In-game player profile',
  profileSubcaption: 'Full tier breakdown per gamemode',
  featuresEyebrow: "What's Included",
  featuresHeading: 'Everything You Need',
  features: [
    { id: 'f1', icon: '🏷️', title: 'Live Tier Labels', desc: 'Displays Blue Tiers directly above nametags — instantly readable while in combat.' },
    { id: 'f2', icon: '📋', title: 'Full Ranking System', desc: 'Supports every gamemode ranking in the Blue Tiers system, shown at a glance.' },
    { id: 'f3', icon: '⚡', title: 'Auto-Fetch', desc: 'Automatically pulls the latest tier data so you never play with stale rankings.' },
    { id: 'f4', icon: '👤', title: 'In-Game Player Profile', desc: "View any player's full Blue Tiers profile, region, and points without leaving Minecraft." },
    { id: 'f5', icon: '🎨', title: 'Lightweight & Clean', desc: 'Zero performance overhead. Designed to blend with any texture pack or UI layout.' },
    { id: 'f6', icon: '🌐', title: 'Universal Compatibility', desc: 'Client-side Fabric mod — works on any multiplayer server without server-side setup.' },
  ],
  stepsEyebrow: 'Setup',
  stepsHeading: 'Up in 3 Steps',
  steps: [
    { id: 's1', n: '01', title: 'Install Fabric Loader', desc: 'Download and run the Fabric installer for your Minecraft version from fabricmc.net.' },
    { id: 's2', n: '02', title: 'Drop the Mod In', desc: 'Place the Blue Tier Tagger .jar into your .minecraft/mods folder.' },
    { id: 's3', n: '03', title: 'Launch Minecraft', desc: 'Select the Fabric profile in your launcher and launch. Tiers appear automatically.' },
  ],
  ctaHeading: 'Ready to Install?',
  ctaBody: 'Download Blue Tier Tagger and start seeing every player\'s rank in-game. Requires Fabric Loader.',
  ctaButtonLabel: 'Download Blue Tier Tagger',
  ctaButtonUrl: 'https://modrinth.com',
  ctaNote: 'Free forever · Fabric mod · Client-side only',
  aboutTitle: 'About Blue Tiers',
  aboutBody: 'Blue Tiers is a competitive Minecraft PvP ranking platform designed to provide accurate, reliable player rankings across multiple gamemodes. Compete against other players, climb the leaderboards, and showcase your skill — now visible directly in-game with Blue Tier Tagger.',
  aboutCredit: 'Made with 💙 by Blue Network',
  releaseCountdownEnabled: false,
  releaseDate: '',
  countdownHeading: 'Coming Soon',
  countdownSubtext: 'Blue Tier Tagger is almost here. Stay tuned.',
}

function safeGet<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}
function safeSet<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ }
}

export function getTierTaggerConfig(): TierTaggerConfig {
  const stored = safeGet<Partial<TierTaggerConfig>>(KEY)
  return stored ? { ...DEFAULT_TIER_TAGGER, ...stored } : { ...DEFAULT_TIER_TAGGER }
}

export function saveTierTaggerConfig(config: TierTaggerConfig, opts?: { silent?: boolean }) {
  safeSet(KEY, config)
  if (!opts?.silent) markDirty('tier-tagger')
}

/**
 * React hook that returns the tier tagger config.
 * Accepts optional server-loaded data (from the route loader) as the initial
 * value, then merges in any localStorage overrides on the client after mount.
 * This avoids the SSR bug where getTierTaggerConfig() always returned DEFAULT
 * (modrinth URL) because localStorage is unavailable during server rendering.
 */
export function useTierTaggerConfig(
  serverData?: Partial<TierTaggerConfig> | null,
): TierTaggerConfig {
  const [cfg, setCfg] = useState<TierTaggerConfig>(() => ({
    ...DEFAULT_TIER_TAGGER,
    ...(serverData ?? {}),
  }))

  useEffect(() => {
    const stored = safeGet<Partial<TierTaggerConfig>>(KEY)
    if (stored) {
      setCfg({ ...DEFAULT_TIER_TAGGER, ...(serverData ?? {}), ...stored })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return cfg
}

export const TIER_TAGGER_KEY = KEY
