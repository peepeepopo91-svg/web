import { createContext, useContext } from "react";
import { m as markDirty } from "./syncStore-C_ozCmAO.js";
const gamemodes = [
  { key: "mace", label: "Mace", icon: "/icons/Mace.png", fallback: "🔨" },
  { key: "sword", label: "Sword", icon: "/icons/Sword.png", fallback: "⚔" },
  { key: "axe", label: "Axe", icon: "/icons/Axe.png", fallback: "🪓" },
  { key: "crystal", label: "Crystal", icon: "/icons/Crystal.png", fallback: "💎" },
  { key: "uhc", label: "UHC", icon: "/icons/UHC.png", fallback: "🏆" },
  { key: "nethpot", label: "Nethpot", icon: "/icons/Nethpot.png", fallback: "🧪" },
  { key: "diapot", label: "Diapot", icon: "/icons/Diapot.png", fallback: "⚗" }
];
const HOMEPAGE_KEY = "bn_admin_homepage";
const HOMEPAGE_HISTORY_KEY = "bn_admin_homepage_history";
const HOMEPAGE_VERSION = 1;
const DEFAULT_SECTION_ORDER = [
  "announcement",
  "navbar",
  "hero",
  "stats",
  "quote",
  "features",
  "event",
  "footer"
];
const defaultGamemodeItems = gamemodes.map((gm) => ({
  id: gm.key,
  label: gm.label,
  icon: gm.fallback || "⚔️",
  link: `/rankings?mode=${gm.key}`,
  visible: true,
  color: "#00BFFF",
  description: ""
}));
const HOMEPAGE_DEFAULTS = {
  published: true,
  publishAt: null,
  version: HOMEPAGE_VERSION,
  lastEditedAt: (/* @__PURE__ */ new Date()).toISOString(),
  lastEditedBy: "system",
  theme: {
    brandPrimary: "#00BFFF",
    brandSecondary: "#0099FF",
    brandAccent: "#0066FF",
    bgPrimary: "#00060f",
    bgSecondary: "#0B0F17",
    surface: "#111827",
    glassOpacity: 0.03,
    borderRadius: "xl",
    fontHeading: "Space Grotesk",
    fontBody: "Inter",
    heroGradient: "linear-gradient(135deg, #00BFFF 0%, #0088FF 50%, #0044DD 100%)",
    textGradient: "linear-gradient(90deg, #00BFFF, #0088FF, #0055DD)",
    particleColor: "#00BFFF",
    particleCount: 60,
    particleSpeed: 1,
    backgroundStyle: "gradient",
    backgroundImage: "",
    backgroundOverlay: "rgba(0,0,0,0.2)"
  },
  layout: {
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    maxWidth: "1280px",
    sectionSpacing: "normal",
    containerPadding: "md",
    navbarFixed: true,
    showScrollHint: true
  },
  hero: {
    enabled: true,
    liveTickerEnabled: true,
    liveTickerLabel: "LIVE",
    title: "DOMINATE",
    titleAccent: "THE TIERS",
    subtitle: "The ultimate Minecraft PvP tier ranking platform. Discover the best — and the worst.",
    primaryCta: { text: "Join Discord", link: "https://discord.gg/DmEPAb3NFU", external: true, style: "discord", visible: true },
    secondaryCta: { text: "Leaderboards", link: "/rankings", external: false, style: "outline", visible: true },
    showServerIP: true,
    serverIP: "play.sennahosting.com",
    ipCopyLabel: "Copy",
    ipCopiedLabel: "Copied!",
    align: "center",
    minHeight: "screen",
    titleSize: "xl",
    animation: "fade-up"
  },
  stats: {
    enabled: true,
    title: "",
    subtitle: "",
    cards: [
      { id: "ranked", label: "Total Players", value: "auto", source: "players", suffix: "", accent: false, icon: "👥", visible: true },
      { id: "tests", label: "Tests Completed", value: "auto", source: "tests", suffix: "", accent: true, icon: "⭐", visible: true },
      { id: "years", label: "Years Running", value: 1, source: "manual", suffix: "+", accent: false, icon: "🏆", visible: true }
    ]
  },
  features: {
    enabled: true,
    title: "Every game mode",
    subtitle: "you could imagine",
    description: "7 competitive PvP modes, each with its own ranked tier list.",
    layout: "grid",
    columns: 6,
    items: defaultGamemodeItems
  },
  quote: {
    enabled: true,
    text: "It's so accurate and fair to follow",
    highlight: "accurate and fair",
    author: "— Blue Tiers community",
    align: "center"
  },
  footer: {
    enabled: true,
    logoText: "BlueTiers",
    logoUrl: "",
    showWatermark: true,
    showSocials: true,
    showLegal: true,
    showServerIP: true,
    columns: [
      {
        title: "navigate",
        links: [
          { label: "Home", url: "/", internal: true },
          { label: "Rankings", url: "/rankings", internal: true },
          { label: "Tournament", url: "/tournament", internal: true },
          { label: "Mining", url: "/mining", internal: true },
          { label: "Shop", url: "/shop", internal: true }
        ]
      },
      {
        title: "social",
        links: [
          { label: "Discord", url: "https://discord.gg/DmEPAb3NFU", internal: false }
        ]
      },
      {
        title: "legal",
        links: [
          { label: "Terms of Service", url: "terms", internal: true },
          { label: "Privacy Policy", url: "privacy", internal: true },
          { label: "Screenshare Rules", url: "screenshare", internal: true }
        ]
      }
    ],
    bottomLinks: [
      { label: "API Documentation", url: "#", internal: false }
    ],
    copyright: "© 2026 Blue Tiers. All rights reserved.",
    tagline: "Not affiliated with Microsoft or Mojang AB.",
    extra: ""
  },
  nav: {
    logoText: "Blue Tiers",
    logoUrl: "",
    showSearch: true,
    showDiscord: true,
    discordLink: "https://discord.gg/DmEPAb3NFU",
    links: [
      { id: "rankings", label: "Rankings", to: "/rankings", icon: "BarChart2", visible: true, external: false },
      { id: "tournament", label: "Tournament", to: "/tournament", icon: "Trophy", visible: true, external: false },
      { id: "mining", label: "Mining", to: "/mining", icon: "Pickaxe", visible: true, external: false },
      { id: "exchange", label: "Exchange", to: "/exchange", icon: "ArrowLeftRight", visible: true, external: false },
      { id: "shop", label: "Shop", to: "/shop", icon: "ShoppingBag", visible: true, external: false },
      { id: "tier-tagger", label: "Tier Tagger", to: "/tier-tagger", icon: "Tag", visible: true, external: false }
    ]
  },
  announcements: [
    {
      id: "default",
      enabled: false,
      text: "Welcome to Blue Tiers — the new homepage CMS is live!",
      title: "Welcome to Blue Tiers",
      body: "The new homepage CMS is live!",
      eyebrow: "News",
      icon: "✦",
      type: "info",
      style: "spotlight",
      accentColor: "#00BFFF",
      backgroundColor: "#062039",
      link: "",
      linkLabel: "Learn more",
      startAt: null,
      endAt: null,
      dismissible: true
    }
  ],
  event: {
    enabled: false,
    title: "PvP World Cup",
    subtitle: "Registration closes soon",
    description: "Assemble your squad, climb the bracket, and prove who owns the arena.",
    eyebrow: "Featured event",
    icon: "🏆",
    buttonText: "Register Now",
    link: "/tournament",
    secondaryButtonText: "View details",
    secondaryLink: "/tournament",
    endDate: "",
    visible: false,
    showAboveNavbar: false,
    badge: "EVENT",
    style: "mega",
    accentColor: "#00BFFF",
    backgroundColor: "#071426",
    imageUrl: "",
    countdownLabel: "Registration closes in",
    showCountdown: true,
    metaLabel: "Format",
    metaValue: "Open tournament",
    showMeta: true,
    bannerHeight: "sm",
    showPrimaryButton: true,
    showSecondaryButton: true,
    dismissible: false,
    hideWhenExpired: false,
    closedText: "Registration is now closed.",
    hideOnScroll: false
  },
  media: {
    logoUrl: "",
    faviconUrl: "",
    ogImageUrl: "",
    heroBackgroundUrl: "",
    footerWatermarkUrl: ""
  },
  seo: {
    title: "Blue Tiers — #1 Minecraft PvP Tier List",
    description: "The definitive tier list for all types of Minecraft PvP players. Rankings, mining, shop, and more.",
    keywords: "minecraft, pvp, tier list, blue tiers, rankings",
    canonical: "https://bluetiers.bolt.host",
    ga4Id: "",
    gscVerification: ""
  }
};
function safeGet(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function deepMerge(target, source) {
  if (typeof source !== "object" || source === null) return target;
  const out = { ...target };
  for (const [key, val] of Object.entries(source)) {
    if (typeof val === "object" && val !== null && !Array.isArray(val) && key in out && typeof out[key] === "object" && out[key] !== null && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}
function normalizeHomepageConfig(config) {
  const announcementDefaults = HOMEPAGE_DEFAULTS.announcements[0];
  return {
    ...config,
    announcements: Array.isArray(config.announcements) ? config.announcements.map((announcement) => ({
      ...announcementDefaults,
      ...announcement
    })) : [...HOMEPAGE_DEFAULTS.announcements]
  };
}
function getHomepageConfig() {
  const stored = safeGet(HOMEPAGE_KEY);
  return normalizeHomepageConfig(stored ? deepMerge(HOMEPAGE_DEFAULTS, stored) : HOMEPAGE_DEFAULTS);
}
function saveHomepageConfig(config, opts) {
  safeSet(HOMEPAGE_KEY, config);
  if (!opts?.silent) markDirty("homepage");
}
function resetHomepageConfig() {
  safeSet(HOMEPAGE_KEY, {});
  markDirty("homepage");
}
function getHomepageHistory() {
  return safeGet(HOMEPAGE_HISTORY_KEY) ?? [];
}
function pushHomepageHistory(snapshot) {
  const history = getHomepageHistory();
  history.unshift(snapshot);
  safeSet(HOMEPAGE_HISTORY_KEY, history.slice(0, 50));
}
function homepageConfigToJSON(config) {
  return JSON.stringify(config, null, 2);
}
function homepageConfigFromJSON(json) {
  const parsed = JSON.parse(json);
  return normalizeHomepageConfig(deepMerge(HOMEPAGE_DEFAULTS, parsed));
}
const HomepageConfigContext = createContext(HOMEPAGE_DEFAULTS);
const HomepageConfigProvider = HomepageConfigContext.Provider;
function useHomepageConfig() {
  return useContext(HomepageConfigContext);
}
export {
  HOMEPAGE_DEFAULTS as H,
  HomepageConfigProvider as a,
  getHomepageConfig as b,
  getHomepageHistory as c,
  homepageConfigToJSON as d,
  gamemodes as g,
  homepageConfigFromJSON as h,
  pushHomepageHistory as p,
  resetHomepageConfig as r,
  saveHomepageConfig as s,
  useHomepageConfig as u
};
