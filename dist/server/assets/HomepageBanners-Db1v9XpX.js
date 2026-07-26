import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from "react";
import { ArrowRight, X, Sparkles, Zap, Megaphone, Ticket } from "lucide-react";
const TIER_ORDER = [
  "HT1",
  "LT1",
  "HT2",
  "LT2",
  "HT3",
  "LT3",
  "HT4",
  "LT4",
  "HT5",
  "LT5"
];
const TIER_POINTS = {
  HT1: 10,
  LT1: 9,
  HT2: 8,
  LT2: 7,
  HT3: 6,
  LT3: 5,
  HT4: 4,
  LT4: 3,
  HT5: 2,
  LT5: 1
};
const tierColors = {
  HT1: { bg: "bg-[#00BFFF]/15", text: "text-[#00BFFF]", border: "border-[#00BFFF]/40", glow: "shadow-[#00BFFF]/30" },
  LT1: { bg: "bg-[#00E5FF]/15", text: "text-[#00E5FF]", border: "border-[#00E5FF]/40", glow: "shadow-[#00E5FF]/30" },
  HT2: { bg: "bg-sky-300/15", text: "text-sky-300", border: "border-sky-300/40", glow: "shadow-sky-300/30" },
  LT2: { bg: "bg-teal-400/15", text: "text-teal-400", border: "border-teal-400/40", glow: "shadow-teal-400/30" },
  HT3: { bg: "bg-emerald-400/15", text: "text-emerald-400", border: "border-emerald-400/40", glow: "shadow-emerald-400/30" },
  LT3: { bg: "bg-yellow-400/15", text: "text-yellow-400", border: "border-yellow-400/40", glow: "shadow-yellow-400/30" },
  HT4: { bg: "bg-orange-400/15", text: "text-orange-400", border: "border-orange-400/40", glow: "shadow-orange-400/30" },
  LT4: { bg: "bg-orange-600/15", text: "text-orange-600", border: "border-orange-600/40", glow: "shadow-orange-600/30" },
  HT5: { bg: "bg-red-500/15", text: "text-red-500", border: "border-red-500/40", glow: "shadow-red-500/30" },
  LT5: { bg: "bg-red-800/15", text: "text-red-800", border: "border-red-800/40", glow: "shadow-red-800/30" }
};
function getTierPoints(tier) {
  return TIER_POINTS[tier] ?? 0;
}
function isRanked(tier) {
  return !!tier && tier !== "None";
}
function tierSortValue(tier) {
  if (!tier || tier === "None") return 999;
  const idx = TIER_ORDER.indexOf(tier);
  return idx === -1 ? 999 : idx;
}
function getPlayerTotalPoints(ranks) {
  return Object.values(ranks).filter(isRanked).reduce((sum, tier) => sum + getTierPoints(tier), 0);
}
function getPlayerHTCount(ranks) {
  return Object.values(ranks).filter(isRanked).filter((t) => t.startsWith("HT")).length;
}
function getAveragePoints(ranks) {
  const ranked = Object.values(ranks).filter(isRanked);
  if (ranked.length === 0) return 0;
  return getPlayerTotalPoints(ranks) / ranked.length;
}
function getHighestTier(ranks) {
  const ranked = Object.values(ranks).filter(isRanked);
  if (ranked.length === 0) return null;
  return ranked.reduce((best, t) => tierSortValue(t) < tierSortValue(best) ? t : best);
}
function getLowestTier(ranks) {
  const ranked = Object.values(ranks).filter(isRanked);
  if (ranked.length === 0) return null;
  return ranked.reduce((worst, t) => tierSortValue(t) > tierSortValue(worst) ? t : worst);
}
function getAverageTier(ranks) {
  const ranked = Object.values(ranks).filter(isRanked);
  if (ranked.length === 0) return null;
  const avg = ranked.reduce((sum, t) => sum + getTierPoints(t), 0) / ranked.length;
  if (avg >= 9.5) return "HT1";
  if (avg >= 8.5) return "LT1";
  if (avg >= 7.5) return "HT2";
  if (avg >= 6.5) return "LT2";
  if (avg >= 5.5) return "HT3";
  if (avg >= 4.5) return "LT3";
  if (avg >= 3.5) return "HT4";
  if (avg >= 2.5) return "LT4";
  if (avg >= 1.5) return "HT5";
  return "LT5";
}
function computeRankings(players) {
  const scored = players.map((p) => ({
    name: p.name,
    totalPoints: getPlayerTotalPoints(p.ranks),
    htCount: getPlayerHTCount(p.ranks),
    overallTier: getAverageTier(p.ranks)
  }));
  scored.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.htCount !== a.htCount) return b.htCount - a.htCount;
    return a.name.localeCompare(b.name);
  });
  const map = /* @__PURE__ */ new Map();
  scored.forEach((p, i) => {
    map.set(p.name, { rank: i + 1, totalPoints: p.totalPoints, overallTier: p.overallTier });
  });
  return map;
}
const toneColors = {
  info: { accent: "#00BFFF", soft: "rgba(0,191,255,0.12)", border: "rgba(0,191,255,0.25)" },
  warning: { accent: "#F59E0B", soft: "rgba(245,158,11,0.13)", border: "rgba(245,158,11,0.28)" },
  success: { accent: "#34D399", soft: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)" },
  event: { accent: "#A78BFA", soft: "rgba(167,139,250,0.13)", border: "rgba(167,139,250,0.28)" }
};
function isHttpLink(link) {
  return /^https?:\/\//i.test(link);
}
function BannerLink({ href, children, className = "", style }) {
  if (!href) return null;
  return /* @__PURE__ */ jsx(
    "a",
    {
      href,
      target: isHttpLink(href) ? "_blank" : void 0,
      rel: isHttpLink(href) ? "noopener noreferrer" : void 0,
      className,
      style,
      children
    }
  );
}
function useDismissed(id, enabled) {
  const key = `blue-tiers-banner-dismissed:${id}`;
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      setDismissed(window.localStorage.getItem(key) === "1");
    } catch {
    }
  }, [key, enabled]);
  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(key, "1");
    } catch {
    }
  };
  return { dismissed, dismiss };
}
function isWithinSchedule(startAt, endAt) {
  const now = Date.now();
  if (startAt && Number.isFinite(new Date(startAt).getTime()) && new Date(startAt).getTime() > now) return false;
  if (endAt && Number.isFinite(new Date(endAt).getTime()) && new Date(endAt).getTime() < now) return false;
  return true;
}
function isAnnouncementLive(announcement) {
  return announcement.enabled && !!(announcement.title || announcement.text) && isWithinSchedule(announcement.startAt, announcement.endAt);
}
function useCountdown(endDate, preview) {
  const getRemaining = () => {
    if (preview && !endDate) return { total: 2 * 864e5 + 4 * 36e5 + 18 * 6e4 + 36 * 1e3, expired: false };
    const target = new Date(endDate).getTime();
    if (!Number.isFinite(target)) return { total: 0, expired: true };
    const total = Math.max(0, target - Date.now());
    return { total, expired: total <= 0 };
  };
  const [remaining, setRemaining] = useState(getRemaining);
  useEffect(() => {
    setRemaining(getRemaining());
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1e3);
    return () => window.clearInterval(timer);
  }, [endDate, preview]);
  const totalSeconds = Math.floor(remaining.total / 1e3);
  return {
    ...remaining,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds % 86400 / 3600),
    minutes: Math.floor(totalSeconds % 3600 / 60),
    seconds: totalSeconds % 60
  };
}
function AnnouncementIcon({ icon, tone }) {
  if (icon) return /* @__PURE__ */ jsx("span", { className: "text-lg leading-none", children: icon });
  const Icon = tone === "event" ? Sparkles : tone === "warning" ? Zap : Megaphone;
  return /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" });
}
function AnnouncementBanner({ announcement, preview = false }) {
  const { dismissed, dismiss } = useDismissed(announcement.id, !preview && announcement.dismissible);
  const tone = toneColors[announcement.type] ?? toneColors.info;
  const accent = announcement.accentColor || tone.accent;
  const background = announcement.backgroundColor || tone.soft;
  const title = announcement.title || announcement.text || "Announcement";
  const body = announcement.body || (announcement.title ? announcement.text : "");
  const style = announcement.style || "ribbon";
  if (dismissed) return null;
  const close = announcement.dismissible ? /* @__PURE__ */ jsx("button", { onClick: dismiss, "aria-label": "Dismiss announcement", className: "rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) }) : null;
  if (style === "minimal") {
    return /* @__PURE__ */ jsx("div", { className: "relative border-b border-white/10 bg-black/40 px-4 py-2.5 text-center text-sm text-white/75", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-5xl items-center justify-center gap-2", children: [
      /* @__PURE__ */ jsx(AnnouncementIcon, { icon: announcement.icon, tone: announcement.type }),
      /* @__PURE__ */ jsx("span", { children: title }),
      /* @__PURE__ */ jsx(BannerLink, { href: announcement.link, className: "font-semibold underline underline-offset-2", style: { color: accent }, children: announcement.linkLabel || "Learn more" }),
      close
    ] }) });
  }
  if (style === "ticker") {
    return /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden border-b px-4 py-2.5", style: { background, borderColor: `${accent}45` }, children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-7xl items-center gap-3 text-xs", children: [
      /* @__PURE__ */ jsxs("span", { className: "flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-bold uppercase tracking-widest", style: { color: accent, borderColor: `${accent}55`, background: `${accent}14` }, children: [
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full", style: { background: accent } }),
        announcement.eyebrow || announcement.type
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-white/80", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: title }),
        body ? /* @__PURE__ */ jsxs("span", { className: "text-white/45", children: [
          " — ",
          body
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs(BannerLink, { href: announcement.link, className: "hidden shrink-0 items-center gap-1 font-semibold sm:flex", style: { color: accent }, children: [
        announcement.linkLabel || "View",
        " ",
        /* @__PURE__ */ jsx(ArrowRight, { className: "h-3 w-3" })
      ] }),
      close
    ] }) });
  }
  if (style === "spotlight") {
    return /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden border-b px-4 py-4", style: { background: `radial-gradient(circle at 15% 0%, ${accent}25, transparent 48%), ${background}`, borderColor: `${accent}45` }, children: /* @__PURE__ */ jsxs("div", { className: "relative mx-auto flex max-w-6xl items-center gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:flex", style: { color: accent, borderColor: `${accent}55`, background: `${accent}18` }, children: /* @__PURE__ */ jsx(AnnouncementIcon, { icon: announcement.icon, tone: announcement.type }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsx("p", { className: "mb-1 text-[9px] font-bold uppercase tracking-[0.22em]", style: { color: accent }, children: announcement.eyebrow || announcement.type }),
        /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-bold text-white", children: title }),
        body && /* @__PURE__ */ jsx("p", { className: "mt-0.5 truncate text-xs text-white/50", children: body })
      ] }),
      /* @__PURE__ */ jsxs(BannerLink, { href: announcement.link, className: "hidden shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10 sm:flex", style: { color: accent, borderColor: `${accent}55` }, children: [
        announcement.linkLabel || "Learn more",
        " ",
        /* @__PURE__ */ jsx(ArrowRight, { className: "h-3 w-3" })
      ] }),
      close
    ] }) });
  }
  if (style === "gradient") {
    return /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden border-b px-4 py-4", style: { background: `linear-gradient(100deg, ${accent}30, ${background}, rgba(0,0,0,0.25))`, borderColor: `${accent}55` }, children: [
      /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl", style: { background: `${accent}35` } }),
      /* @__PURE__ */ jsxs("div", { className: "relative mx-auto flex max-w-5xl items-center gap-3 text-center sm:gap-5 sm:text-left", children: [
        /* @__PURE__ */ jsx(AnnouncementIcon, { icon: announcement.icon, tone: announcement.type }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.22em]", style: { color: accent }, children: announcement.eyebrow || announcement.type }),
          /* @__PURE__ */ jsxs("p", { className: "mt-0.5 text-sm font-bold text-white", children: [
            title,
            body ? /* @__PURE__ */ jsxs("span", { className: "font-normal text-white/55", children: [
              " — ",
              body
            ] }) : null
          ] })
        ] }),
        /* @__PURE__ */ jsx(BannerLink, { href: announcement.link, className: "hidden shrink-0 rounded-full px-4 py-2 text-xs font-bold text-black sm:block", style: { background: accent }, children: announcement.linkLabel || "Explore" }),
        close
      ] })
    ] });
  }
  return /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden border-b px-4 py-3", style: { background, borderColor: `${accent}40` }, children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center gap-3 text-sm", children: [
    /* @__PURE__ */ jsx("div", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", style: { color: accent, background: `${accent}18` }, children: /* @__PURE__ */ jsx(AnnouncementIcon, { icon: announcement.icon, tone: announcement.type }) }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 truncate", children: [
      /* @__PURE__ */ jsx("span", { className: "font-semibold text-white", children: title }),
      body && /* @__PURE__ */ jsxs("span", { className: "ml-1 text-white/50", children: [
        "— ",
        body
      ] })
    ] }),
    /* @__PURE__ */ jsxs(BannerLink, { href: announcement.link, className: "hidden shrink-0 items-center gap-1 text-xs font-semibold sm:flex", style: { color: accent }, children: [
      announcement.linkLabel || "Learn more",
      " ",
      /* @__PURE__ */ jsx(ArrowRight, { className: "h-3 w-3" })
    ] }),
    close
  ] }) });
}
function Ico({ icon }) {
  return icon ? /* @__PURE__ */ jsx("span", { className: "leading-none select-none", children: icon }) : /* @__PURE__ */ jsx(Ticket, { className: "h-4 w-4 opacity-50" });
}
function useDismissedEvent(key, enabled) {
  const storageKey = `bn-event-dismissed:${key}`;
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
    }
  }, [storageKey, enabled]);
  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
    }
  };
  return { dismissed, dismiss };
}
function InlineCd({ cd, accent }) {
  const vals = [cd.days, cd.hours, cd.minutes, cd.seconds];
  return /* @__PURE__ */ jsx("div", { className: "flex items-center font-['Space_Grotesk'] text-[11px] font-bold tabular-nums select-none shrink-0", children: ["D", "H", "M", "S"].map((u, i) => /* @__PURE__ */ jsxs("span", { children: [
    /* @__PURE__ */ jsx("span", { className: "text-white", children: String(vals[i]).padStart(2, "0") }),
    /* @__PURE__ */ jsx("span", { style: { color: accent }, children: u }),
    i < 3 && /* @__PURE__ */ jsx("span", { className: "mx-px text-white/20", children: ":" })
  ] }, u)) });
}
function ChipCd({ cd, accent }) {
  const vals = [cd.days, cd.hours, cd.minutes];
  return /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1 shrink-0", children: ["D", "H", "M"].map((u, i) => /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-px rounded border bg-black/30 px-2 py-0.5 font-['Space_Grotesk'] text-[11px] font-bold tabular-nums text-white", style: { borderColor: `${accent}28` }, children: [
    String(vals[i]).padStart(2, "0"),
    /* @__PURE__ */ jsx("span", { className: "text-[8px] font-medium", style: { color: accent }, children: u })
  ] }, u)) });
}
function BoxCd({ cd, label, accent, sm = false }) {
  const vals = [cd.days, cd.hours, cd.minutes, cd.seconds];
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 shrink-0", children: [
    label && /* @__PURE__ */ jsx("span", { className: "text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap", style: { color: accent }, children: label }),
    /* @__PURE__ */ jsx("div", { className: `flex items-end ${sm ? "gap-1" : "gap-1.5"}`, children: ["D", "H", "M", "S"].map((u, i) => /* @__PURE__ */ jsxs("div", { className: `rounded-lg border bg-black/25 text-center backdrop-blur-sm ${sm ? "min-w-[30px] px-1 py-0.5" : "min-w-[40px] px-2 py-1.5"}`, style: { borderColor: `${accent}18` }, children: [
      /* @__PURE__ */ jsx("div", { className: `font-['Space_Grotesk'] font-black text-white tabular-nums leading-none ${sm ? "text-sm" : "text-lg"}`, children: String(vals[i]).padStart(2, "0") }),
      /* @__PURE__ */ jsx("div", { className: `mt-0.5 font-bold uppercase text-white/30 ${sm ? "text-[6px]" : "text-[8px]"}`, children: u })
    ] }, u)) })
  ] });
}
function MegaBanner({ height, ...p }) {
  const shell = (ch) => /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden", style: { background: `linear-gradient(100deg,${p.bg} 0%,#020811 80%)`, borderBottom: `1px solid ${p.accent}20` }, children: [
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -left-12 inset-y-0 w-40 rounded-full blur-3xl opacity-40", style: { background: `${p.accent}22` } }),
    ch
  ] });
  const R = "relative mx-auto flex max-w-7xl items-center gap-3 px-5";
  if (height === "xs") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-1.5`, children: [
      p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest", style: { color: p.accent, background: `${p.accent}18` }, children: p.badge }),
      /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-xs font-semibold text-white", children: p.title }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(InlineCd, { cd: p.cd, accent: p.accent }),
      p.primaryBtn,
      p.dismissBtn
    ] })
  );
  if (height === "sm") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-2.5`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm", style: { color: p.accent }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 flex flex-wrap items-center gap-x-2", children: [
        p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest", style: { color: p.accent, background: `${p.accent}18` }, children: p.badge }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsxs("span", { className: "hidden truncate text-xs text-white/40 sm:block", children: [
          "— ",
          p.subtitle
        ] }),
        p.isExpired && /* @__PURE__ */ jsx("span", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(ChipCd, { cd: p.cd, accent: p.accent }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  if (height === "md") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-4`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl", style: { color: p.accent }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.2em]", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-bold leading-snug text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/45", children: p.subtitle }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent, sm: true }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 flex-col gap-1", children: [
        p.primaryBtn,
        p.secondaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-7`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl", style: { color: p.accent }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.22em]", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-base font-black text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/50", children: p.subtitle }),
        !p.isExpired && p.description && /* @__PURE__ */ jsx("p", { className: "mt-0.5 line-clamp-1 text-xs text-white/30", children: p.description }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt }),
        p.showMeta && p.metaLabel && /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[10px] text-white/35", children: [
          /* @__PURE__ */ jsxs("span", { style: { color: p.accent }, children: [
            p.metaLabel,
            ":"
          ] }),
          " ",
          p.metaValue
        ] })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
}
function NeonBanner({ height, ...p }) {
  const shell = (ch) => /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden", style: { background: p.bg, borderBottom: `1px solid ${p.accent}55`, boxShadow: `0 1px 0 ${p.accent}20` }, children: [
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-0 opacity-[0.07]", style: { backgroundImage: `linear-gradient(${p.accent}ff 1px,transparent 1px),linear-gradient(90deg,${p.accent}ff 1px,transparent 1px)`, backgroundSize: "28px 28px" } }),
    ch
  ] });
  const R = "relative mx-auto flex max-w-7xl items-center gap-3 px-5";
  const glow = (size) => `flex shrink-0 items-center justify-center rounded border-2 ${size}`;
  if (height === "xs") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-1.5`, children: [
      /* @__PURE__ */ jsx("span", { className: "shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest", style: { color: p.accent, borderColor: `${p.accent}60`, background: `${p.accent}10`, boxShadow: `0 0 6px ${p.accent}30` }, children: p.badge || "LIVE" }),
      /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-tight text-white", children: p.title }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(InlineCd, { cd: p.cd, accent: p.accent }),
      p.primaryBtn,
      p.dismissBtn
    ] })
  );
  if (height === "sm") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-2.5`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: glow("h-7 w-7 text-sm"), style: { color: p.accent, borderColor: p.accent, boxShadow: `0 0 10px ${p.accent}45` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 flex flex-wrap items-center gap-x-2", children: [
        p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[9px] font-bold uppercase tracking-widest", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-bold uppercase tracking-tight text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsxs("span", { className: "hidden text-xs text-white/40 sm:block", children: [
          "— ",
          p.subtitle
        ] }),
        p.isExpired && /* @__PURE__ */ jsx("span", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(ChipCd, { cd: p.cd, accent: p.accent }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  if (height === "md") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-4`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: glow("h-10 w-10 text-xl"), style: { color: p.accent, borderColor: p.accent, boxShadow: `0 0 16px ${p.accent}50, inset 0 0 8px ${p.accent}15` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-widest", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-black uppercase tracking-tight text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/45", children: p.subtitle }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent, sm: true }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-7`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: glow("h-14 w-14 text-3xl"), style: { color: p.accent, borderColor: p.accent, boxShadow: `0 0 28px ${p.accent}55, inset 0 0 14px ${p.accent}15` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.28em]", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-lg font-black uppercase tracking-tight text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/45", children: p.subtitle }),
        !p.isExpired && p.description && /* @__PURE__ */ jsx("p", { className: "mt-0.5 line-clamp-1 text-xs text-white/25", children: p.description }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
}
function SplitBanner({ height, ...p }) {
  const rightFill = p.imageUrl ? `linear-gradient(90deg,${p.bg} 15%,transparent 55%),url(${p.imageUrl})` : `radial-gradient(circle at 85% 50%,${p.accent}35,transparent 60%)`;
  const shell = (ch) => /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden", style: { background: `linear-gradient(108deg,${p.bg} 52%,#020812)`, borderBottom: `1px solid ${p.accent}28` }, children: [
    /* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute inset-y-0 right-0 w-2/5", style: { backgroundImage: rightFill, backgroundPosition: "center right", backgroundSize: "cover" } }),
    ch
  ] });
  const R = "relative mx-auto flex max-w-7xl items-center gap-3 px-5";
  if (height === "xs") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-1.5`, children: [
      p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest", style: { color: p.accent, background: `${p.accent}22` }, children: p.badge }),
      /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-xs font-semibold text-white", children: p.title }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(InlineCd, { cd: p.cd, accent: p.accent }),
      p.primaryBtn,
      p.dismissBtn
    ] })
  );
  if (height === "sm") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-2.5`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm", style: { color: p.accent, background: `${p.accent}22` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 flex flex-wrap items-center gap-x-2", children: [
        p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[9px] font-bold uppercase tracking-widest", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsxs("span", { className: "hidden text-xs text-white/40 sm:block", children: [
          "— ",
          p.subtitle
        ] }),
        p.isExpired && /* @__PURE__ */ jsx("span", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(ChipCd, { cd: p.cd, accent: p.accent }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  if (height === "md") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-4`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl", style: { color: p.accent, background: `${p.accent}25` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.2em]", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/45", children: p.subtitle }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block rounded-xl border border-white/8 bg-black/25 px-3 py-2 backdrop-blur-sm", style: { borderColor: `${p.accent}18` }, children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent, sm: true }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-7`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl", style: { color: p.accent, background: `${p.accent}25` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.22em]", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-base font-black text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/50", children: p.subtitle }),
        !p.isExpired && p.description && /* @__PURE__ */ jsx("p", { className: "mt-0.5 line-clamp-1 text-xs text-white/30", children: p.description }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt }),
        p.showMeta && p.metaLabel && /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[10px] text-white/35", children: [
          /* @__PURE__ */ jsxs("span", { style: { color: p.accent }, children: [
            p.metaLabel,
            ":"
          ] }),
          " ",
          p.metaValue
        ] })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block rounded-xl border border-white/8 bg-black/30 px-4 py-3 backdrop-blur-sm", style: { borderColor: `${p.accent}18` }, children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 flex-col gap-1", children: [
        p.primaryBtn,
        p.secondaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
}
function SpotlightBanner({ height, ...p }) {
  const shell = (ch) => /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden", style: { background: `radial-gradient(ellipse 60% 240% at 50% -5%,${p.accent}22,transparent 65%),${p.bg}`, borderBottom: `1px solid ${p.accent}30` }, children: ch });
  const R = "relative mx-auto flex max-w-7xl items-center gap-3 px-5";
  if (height === "xs") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-1.5 justify-between`, children: [
      /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 items-center gap-2", children: [
        p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest", style: { color: p.accent, borderColor: `${p.accent}50`, background: `${p.accent}10` }, children: p.badge }),
        /* @__PURE__ */ jsx("span", { className: "truncate text-xs font-semibold text-white", children: p.title })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
        p.showCd && !p.isExpired && /* @__PURE__ */ jsx(InlineCd, { cd: p.cd, accent: p.accent }),
        p.primaryBtn,
        p.dismissBtn
      ] })
    ] })
  );
  if (height === "sm") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-2.5`, children: [
      p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest", style: { color: p.accent, borderColor: `${p.accent}55`, background: `${p.accent}12` }, children: p.badge }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsxs("span", { className: "ml-2 hidden text-xs text-white/40 sm:inline", children: [
          "— ",
          p.subtitle
        ] }),
        p.isExpired && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(ChipCd, { cd: p.cd, accent: p.accent }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  if (height === "md") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-4`, children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "mb-0.5 text-[9px] font-bold uppercase tracking-[0.22em]", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/45", children: p.subtitle }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent, sm: true }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-7`, children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-[0.25em]", style: { color: p.accent }, children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-base font-black text-white", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/50", children: p.subtitle }),
        !p.isExpired && p.description && /* @__PURE__ */ jsx("p", { className: "mt-0.5 line-clamp-1 text-xs text-white/30", children: p.description }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
}
function MinimalBanner({ height, ...p }) {
  const shell = (ch) => /* @__PURE__ */ jsx("div", { className: "relative", style: { background: `${p.bg}f0`, borderBottom: "1px solid rgba(255,255,255,0.07)" }, children: ch });
  const R = "mx-auto flex max-w-7xl items-center gap-3 px-5";
  const div = /* @__PURE__ */ jsx("div", { className: "mx-4 hidden h-6 w-px bg-white/8 md:block" });
  const divLg = /* @__PURE__ */ jsx("div", { className: "mx-4 hidden h-8 w-px bg-white/8 lg:block" });
  if (height === "xs") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-1.5`, children: [
      p.badge && /* @__PURE__ */ jsxs("span", { className: "shrink-0 text-[9px] font-black uppercase tracking-widest", style: { color: p.accent }, children: [
        p.badge,
        " ·"
      ] }),
      /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-xs text-white/80", children: p.title }),
      !p.isExpired && p.subtitle && /* @__PURE__ */ jsxs("span", { className: "hidden text-xs text-white/35 sm:block", children: [
        "— ",
        p.subtitle
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(InlineCd, { cd: p.cd, accent: p.accent }),
      p.primaryBtn,
      p.dismissBtn
    ] })
  );
  if (height === "sm") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-2.5`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs", style: { color: p.accent, background: `${p.accent}12` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 flex flex-wrap items-center gap-x-2", children: [
        p.badge && /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[9px] font-black uppercase tracking-widest text-white/40", children: p.badge }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-white/90", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsxs("span", { className: "hidden text-xs text-white/35 sm:block", children: [
          "— ",
          p.subtitle
        ] }),
        p.isExpired && /* @__PURE__ */ jsx("span", { className: "text-xs text-white/30", children: p.closedTxt })
      ] }),
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx(InlineCd, { cd: p.cd, accent: p.accent }),
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  if (height === "md") return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-4`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base", style: { color: p.accent, background: `${p.accent}10` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-widest text-white/35", children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-white/90", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/35", children: p.subtitle }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/30", children: p.closedTxt })
      ] }),
      div,
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(ChipCd, { cd: p.cd, accent: p.accent }) }),
      div,
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
  return shell(
    /* @__PURE__ */ jsxs("div", { className: `${R} py-7`, children: [
      p.icon && /* @__PURE__ */ jsx("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl", style: { color: p.accent, background: `${p.accent}10` }, children: /* @__PURE__ */ jsx(Ico, { icon: p.icon }) }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        p.badge && /* @__PURE__ */ jsx("p", { className: "text-[9px] font-bold uppercase tracking-widest text-white/35", children: p.badge }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-white/90", children: p.title }),
        !p.isExpired && p.subtitle && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/40", children: p.subtitle }),
        !p.isExpired && p.description && /* @__PURE__ */ jsx("p", { className: "mt-0.5 line-clamp-1 text-xs text-white/25", children: p.description }),
        p.isExpired && /* @__PURE__ */ jsx("p", { className: "text-xs text-white/30", children: p.closedTxt }),
        p.showMeta && p.metaLabel && /* @__PURE__ */ jsxs("p", { className: "mt-1 text-[10px] text-white/30", children: [
          p.metaLabel,
          ": ",
          /* @__PURE__ */ jsx("span", { className: "text-white/50", children: p.metaValue })
        ] })
      ] }),
      divLg,
      p.showCd && !p.isExpired && /* @__PURE__ */ jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsx(BoxCd, { cd: p.cd, label: p.cdLabel, accent: p.accent, sm: true }) }),
      divLg,
      /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [
        p.secondaryBtn,
        p.primaryBtn
      ] }),
      p.dismissBtn
    ] })
  );
}
function EventBanner({ event, preview = false }) {
  const { dismissed, dismiss } = useDismissedEvent(event.title, !preview && event.dismissible === true);
  const cd = useCountdown(event.endDate, preview);
  if (!event.enabled || !preview && !event.visible) return null;
  if (!preview && dismissed) return null;
  if (!preview && event.hideWhenExpired && cd.expired) return null;
  const accent = event.accentColor || "#00BFFF";
  const bg = event.backgroundColor || "#071426";
  const style = event.style || "mega";
  const height = event.bannerHeight || "sm";
  const primaryBtn = event.showPrimaryButton !== false && event.link ? /* @__PURE__ */ jsxs(BannerLink, { href: event.link, className: "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-110", style: { background: accent }, children: [
    event.buttonText || "Learn more",
    " ",
    /* @__PURE__ */ jsx(ArrowRight, { className: "h-3 w-3" })
  ] }) : null;
  const secondaryBtn = event.showSecondaryButton !== false && event.secondaryLink && event.secondaryButtonText ? /* @__PURE__ */ jsx(BannerLink, { href: event.secondaryLink, className: "inline-flex shrink-0 items-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10", children: event.secondaryButtonText }) : null;
  const dismissBtn = event.dismissible && !preview ? /* @__PURE__ */ jsx("button", { onClick: dismiss, "aria-label": "Dismiss event banner", className: "ml-1 shrink-0 rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-white", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) }) : null;
  const bp = {
    accent,
    bg,
    title: event.title || "Featured event",
    subtitle: event.subtitle || "",
    description: event.description || "",
    icon: event.icon || "",
    badge: event.badge || "",
    cdLabel: event.countdownLabel || "Ends in",
    imageUrl: event.imageUrl || "",
    isExpired: cd.expired && !preview,
    closedTxt: event.closedText || "Registration is now closed.",
    showCd: event.showCountdown !== false,
    cd,
    showMeta: event.showMeta !== false && !!(event.metaLabel || event.metaValue),
    metaLabel: event.metaLabel || "",
    metaValue: event.metaValue || "",
    primaryBtn,
    secondaryBtn,
    dismissBtn
  };
  if (style === "neon") return /* @__PURE__ */ jsx(NeonBanner, { ...bp, height });
  if (style === "split") return /* @__PURE__ */ jsx(SplitBanner, { ...bp, height });
  if (style === "countdown") return /* @__PURE__ */ jsx(SpotlightBanner, { ...bp, height });
  if (style === "minimal") return /* @__PURE__ */ jsx(MinimalBanner, { ...bp, height });
  return /* @__PURE__ */ jsx(MegaBanner, { ...bp, height });
}
function ActiveHomepageBanners({ announcements, event }) {
  const active = useMemo(() => announcements.filter(isAnnouncementLive), [announcements]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    active.map((announcement) => /* @__PURE__ */ jsx(AnnouncementBanner, { announcement }, announcement.id)),
    /* @__PURE__ */ jsx(EventBanner, { event })
  ] });
}
export {
  AnnouncementBanner as A,
  EventBanner as E,
  TIER_ORDER as T,
  getAverageTier as a,
  getAveragePoints as b,
  getHighestTier as c,
  getLowestTier as d,
  computeRankings as e,
  tierSortValue as f,
  getPlayerTotalPoints as g,
  TIER_POINTS as h,
  isAnnouncementLive as i,
  ActiveHomepageBanners as j,
  tierColors as t
};
