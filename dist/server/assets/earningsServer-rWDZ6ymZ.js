import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { c as createServerFn } from "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const DATA_DIR = resolve(process.cwd(), "data");
const ADS_FILE = "ads-config.json";
const DEFAULT_CONFIG = {
  enabled: true,
  adProvider: "placeholder",
  adsensePublisherId: "",
  adsenseSlotId: "",
  medianetSiteId: "",
  ezoicSiteId: "",
  propelleradsZoneId: "",
  adsterraPublisherId: "",
  adsterraDirectLink: "",
  infolinksPublisherId: "",
  infolinksWebsiteId: "",
  monetagWebsiteId: "",
  amazonApsPublisherId: "",
  taboolaSiteId: "",
  mgidClientId: "",
  buyselladsPropertyId: "",
  carbonZoneKey: "",
  networkStatus: {},
  adDurationSeconds: 5,
  renewMode: "ad-required",
  showAdOnExpired: true,
  showAdOnEarlyRenew: false,
  skipAllowed: false,
  skipAfterSeconds: 3,
  customAdHtml: "",
  rewardOnComplete: false,
  rewardType: "bluecoin",
  rewardAmount: 100,
  bannerAdEnabled: false,
  bannerAdHtml: "",
  estimatedRpm: 2.5,
  pageAds: {
    home: false,
    rankings: false,
    mining: false,
    exchange: false,
    shop: false,
    tournament: false
  },
  pageAdHtml: {},
  stickyFooterEnabled: false,
  stickyFooterHtml: "",
  interstitialEnabled: false,
  interstitialOnPageChange: false,
  interstitialFrequency: 3,
  dailyAdCapPerUser: 0,
  cooldownBetweenAdsSeconds: 0,
  maxAdsPerSession: 0,
  bannerRefreshIntervalSeconds: 30,
  scheduleEnabled: false,
  scheduleTimezone: "UTC",
  scheduleHoursStart: 6,
  scheduleHoursEnd: 22,
  scheduleAllowedDays: [0, 1, 2, 3, 4, 5, 6],
  quietHoursEnabled: false,
  quietHoursStart: 23,
  quietHoursEnd: 6,
  showThankYouMessage: false,
  thankYouMessage: "Thanks for supporting Blue Tiers! 🎉",
  adLabelText: "Advertisement",
  showAdProgressBar: true,
  showCountdownTimer: true,
  fatigueProtectionEnabled: false,
  fatigueMaxAdsPerHour: 3,
  allowPlayerOptOut: false,
  optOutMessage: "Ads help keep this server free. Are you sure you want to opt out?",
  muteByDefault: false,
  showSkipAnimation: true,
  gdprEnabled: false,
  gdprConsentRequired: false,
  gdprConsentText: "We use ads to support the server. By continuing, you consent to personalised advertising.",
  privacyPolicyUrl: "",
  termsUrl: "",
  coppaMode: false,
  adDisclosureText: "This site uses advertising to fund operations.",
  ccpaEnabled: false,
  cookieConsentRequired: false,
  cookieConsentText: "We use cookies to serve relevant ads.",
  sponsors: [],
  goalDaily: 0,
  goalWeekly: 0,
  goalMonthly: 0,
  milestones: [],
  webhookEnabled: false,
  webhookUrl: "",
  webhookEvents: ["milestone", "reset", "daily-digest"],
  notifyOnMilestone: true,
  notifyOnReset: true,
  revenueAlertEnabled: false,
  revenueAlertThreshold: 10,
  dailyDigestEnabled: false,
  digestEmail: "",
  geoEnabled: false,
  geoMode: "allowlist",
  geoCountries: [],
  geoFallbackHtml: "",
  geoShowFallbackAd: true,
  abTestEnabled: false,
  abTestName: "Test 1",
  abTestSplit: 50,
  abTestVariantAHtml: "",
  abTestVariantADuration: 5,
  abTestVariantBHtml: "",
  abTestVariantBDuration: 10,
  abTestStats: {
    variantAImpressions: 0,
    variantACompletions: 0,
    variantARevenue: 0,
    variantBImpressions: 0,
    variantBCompletions: 0,
    variantBRevenue: 0,
    startedAt: null
  },
  waterfallEnabled: false,
  waterfallProviders: [{
    id: "w1",
    provider: "Google AdSense",
    enabled: true,
    priority: 1,
    estimatedFillRate: 95,
    customTag: ""
  }, {
    id: "w2",
    provider: "Media.net",
    enabled: false,
    priority: 2,
    estimatedFillRate: 70,
    customTag: ""
  }, {
    id: "w3",
    provider: "Custom",
    enabled: false,
    priority: 3,
    estimatedFillRate: 100,
    customTag: ""
  }],
  revenueShareEnabled: false,
  revenueShareRecipients: [],
  affiliateEnabled: false,
  affiliateLinks: [],
  payoutEnabled: false,
  payoutMethod: "paypal",
  payoutThreshold: 50,
  payoutEmail: "",
  payoutCurrency: "USD",
  payoutHistory: [],
  boostEnabled: false,
  boostMultiplier: 2,
  boostStartDate: "",
  boostEndDate: "",
  boostLabel: "2× Revenue Event",
  boostBannerText: "🚀 Double earnings are live! Limited time.",
  referralEnabled: false,
  referralCommissionPercent: 10,
  referralClickBonus: 0,
  referralCookieDays: 30,
  referralStats: {
    totalReferrals: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalCommission: 0
  },
  stats: {
    totalImpressions: 0,
    totalCompletions: 0,
    totalSkips: 0,
    estimatedRevenue: 0,
    lastReset: null,
    pageImpressions: {},
    hourlyImpressions: new Array(24).fill(0),
    dailyRevenue: {}
  }
};
function loadAdsConfig() {
  try {
    const raw = readFileSync(resolve(DATA_DIR, ADS_FILE), "utf8");
    const parsed = JSON.parse(raw);
    const merged = {
      ...DEFAULT_CONFIG,
      ...parsed
    };
    merged.stats = {
      ...DEFAULT_CONFIG.stats,
      ...parsed.stats
    };
    merged.abTestStats = {
      ...DEFAULT_CONFIG.abTestStats,
      ...parsed.abTestStats
    };
    return merged;
  } catch {
    return {
      ...DEFAULT_CONFIG
    };
  }
}
function writeAdsConfig(cfg) {
  mkdirSync(DATA_DIR, {
    recursive: true
  });
  const tmp = resolve(DATA_DIR, ADS_FILE + ".tmp");
  writeFileSync(tmp, JSON.stringify(cfg, null, 2), "utf8");
  renameSync(tmp, resolve(DATA_DIR, ADS_FILE));
}
const getAdsConfig_createServerFn_handler = createServerRpc({
  id: "bda408528402cc40c10ebae8493c87594338b18499c43e313ba941d2dbe69a11",
  name: "getAdsConfig",
  filename: "src/server/earningsServer.ts"
}, (opts) => getAdsConfig.__executeServer(opts));
const getAdsConfig = createServerFn({
  method: "GET"
}).handler(getAdsConfig_createServerFn_handler, async () => {
  return loadAdsConfig();
});
const saveAdsConfig_createServerFn_handler = createServerRpc({
  id: "ac20a71becbdda8d50045e7cd69812d4b36660e495aa3e5565c52bee80ce1c2c",
  name: "saveAdsConfig",
  filename: "src/server/earningsServer.ts"
}, (opts) => saveAdsConfig.__executeServer(opts));
const saveAdsConfig = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  config: z.any()
})).handler(saveAdsConfig_createServerFn_handler, async ({
  data
}) => {
  const current = loadAdsConfig();
  const merged = {
    ...current,
    ...data.config,
    stats: current.stats,
    abTestStats: current.abTestStats
  };
  writeAdsConfig(merged);
  return {
    ok: true
  };
});
const trackAdEvent_createServerFn_handler = createServerRpc({
  id: "b0c00df0a524fbcbcb6649f9d21d35dfc5c5a86052acdf811868ad7ef65bca01",
  name: "trackAdEvent",
  filename: "src/server/earningsServer.ts"
}, (opts) => trackAdEvent.__executeServer(opts));
const trackAdEvent = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  event: z.enum(["impression", "completion", "skip"]),
  page: z.string().optional(),
  hour: z.number().min(0).max(23).optional(),
  variant: z.enum(["a", "b"]).optional()
})).handler(trackAdEvent_createServerFn_handler, async ({
  data
}) => {
  const cfg = loadAdsConfig();
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (data.event === "impression") {
    cfg.stats.totalImpressions += 1;
    if (data.page) cfg.stats.pageImpressions[data.page] = (cfg.stats.pageImpressions[data.page] ?? 0) + 1;
    if (data.hour !== void 0) cfg.stats.hourlyImpressions[data.hour] = (cfg.stats.hourlyImpressions[data.hour] ?? 0) + 1;
    if (data.variant === "a") cfg.abTestStats.variantAImpressions += 1;
    if (data.variant === "b") cfg.abTestStats.variantBImpressions += 1;
  }
  if (data.event === "completion") {
    cfg.stats.totalCompletions += 1;
    const boostMult = cfg.boostEnabled ? cfg.boostMultiplier : 1;
    const earned = parseFloat((cfg.estimatedRpm / 1e3 * boostMult).toFixed(6));
    cfg.stats.estimatedRevenue = parseFloat((cfg.stats.estimatedRevenue + earned).toFixed(6));
    cfg.stats.dailyRevenue[today] = parseFloat(((cfg.stats.dailyRevenue[today] ?? 0) + earned).toFixed(6));
    if (data.variant === "a") {
      cfg.abTestStats.variantACompletions += 1;
      cfg.abTestStats.variantARevenue = parseFloat((cfg.abTestStats.variantARevenue + earned).toFixed(6));
    }
    if (data.variant === "b") {
      cfg.abTestStats.variantBCompletions += 1;
      cfg.abTestStats.variantBRevenue = parseFloat((cfg.abTestStats.variantBRevenue + earned).toFixed(6));
    }
  }
  if (data.event === "skip") cfg.stats.totalSkips += 1;
  writeAdsConfig(cfg);
  return {
    ok: true
  };
});
const resetAdsStats_createServerFn_handler = createServerRpc({
  id: "4686f50ccdd8c60ab286dab4566eb7e066b6d3b40524984dd33539e3367c0731",
  name: "resetAdsStats",
  filename: "src/server/earningsServer.ts"
}, (opts) => resetAdsStats.__executeServer(opts));
const resetAdsStats = createServerFn({
  method: "POST"
}).handler(resetAdsStats_createServerFn_handler, async () => {
  const cfg = loadAdsConfig();
  cfg.stats = {
    totalImpressions: 0,
    totalCompletions: 0,
    totalSkips: 0,
    estimatedRevenue: 0,
    lastReset: (/* @__PURE__ */ new Date()).toISOString(),
    pageImpressions: {},
    hourlyImpressions: new Array(24).fill(0),
    dailyRevenue: {}
  };
  writeAdsConfig(cfg);
  return {
    ok: true
  };
});
const resetAbTestStats_createServerFn_handler = createServerRpc({
  id: "12e6c496b1979f52eba7acbe480303b046baf912f403dbadfebc89909068cf38",
  name: "resetAbTestStats",
  filename: "src/server/earningsServer.ts"
}, (opts) => resetAbTestStats.__executeServer(opts));
const resetAbTestStats = createServerFn({
  method: "POST"
}).handler(resetAbTestStats_createServerFn_handler, async () => {
  const cfg = loadAdsConfig();
  cfg.abTestStats = {
    variantAImpressions: 0,
    variantACompletions: 0,
    variantARevenue: 0,
    variantBImpressions: 0,
    variantBCompletions: 0,
    variantBRevenue: 0,
    startedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  writeAdsConfig(cfg);
  return {
    ok: true
  };
});
const trackAffiliateClick_createServerFn_handler = createServerRpc({
  id: "980d3172af72490d422146cc9600d8514eb552afb1145e580053adbf108d5921",
  name: "trackAffiliateClick",
  filename: "src/server/earningsServer.ts"
}, (opts) => trackAffiliateClick.__executeServer(opts));
const trackAffiliateClick = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  linkId: z.string()
})).handler(trackAffiliateClick_createServerFn_handler, async ({
  data
}) => {
  const cfg = loadAdsConfig();
  const link = cfg.affiliateLinks.find((l) => l.id === data.linkId);
  if (link) {
    link.clicks += 1;
  }
  writeAdsConfig(cfg);
  return {
    ok: true
  };
});
const addPayoutRecord_createServerFn_handler = createServerRpc({
  id: "219ae3114e4607a45fea223c75104d53c4de8791d58d9d06662d94490676a3b2",
  name: "addPayoutRecord",
  filename: "src/server/earningsServer.ts"
}, (opts) => addPayoutRecord.__executeServer(opts));
const addPayoutRecord = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  amount: z.number(),
  method: z.string(),
  notes: z.string().optional()
})).handler(addPayoutRecord_createServerFn_handler, async ({
  data
}) => {
  const cfg = loadAdsConfig();
  cfg.payoutHistory.unshift({
    id: Date.now().toString(),
    date: (/* @__PURE__ */ new Date()).toISOString(),
    amount: data.amount,
    method: data.method,
    status: "pending",
    notes: data.notes ?? ""
  });
  writeAdsConfig(cfg);
  return {
    ok: true
  };
});
const exportEarningsData_createServerFn_handler = createServerRpc({
  id: "70ee23244a1cf7dcbbb4c2b3d194f1c659076ba93fded5d65385deab0c9c3d0a",
  name: "exportEarningsData",
  filename: "src/server/earningsServer.ts"
}, (opts) => exportEarningsData.__executeServer(opts));
const exportEarningsData = createServerFn({
  method: "GET"
}).handler(exportEarningsData_createServerFn_handler, async () => {
  return loadAdsConfig();
});
export {
  addPayoutRecord_createServerFn_handler,
  exportEarningsData_createServerFn_handler,
  getAdsConfig_createServerFn_handler,
  resetAbTestStats_createServerFn_handler,
  resetAdsStats_createServerFn_handler,
  saveAdsConfig_createServerFn_handler,
  trackAdEvent_createServerFn_handler,
  trackAffiliateClick_createServerFn_handler
};
