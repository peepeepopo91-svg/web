import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { N as Navbar } from "./Navbar-BmLqh_kL.js";
import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, ChevronRight } from "lucide-react";
import { u as useHomepageConfig } from "./homepageStore-KPOXxduW.js";
import { e as computeRankings, c as getHighestTier, j as ActiveHomepageBanners } from "./HomepageBanners-Db1v9XpX.js";
import { F as Footer } from "./Footer-BivHw4RG.js";
import { P as Route } from "./router-D-1D0-Hz.js";
import "react-dom";
import "./syncStore-C_ozCmAO.js";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "zod";
const TIER_HEX = {
  HT1: "#00BFFF",
  LT1: "#00E5FF",
  HT2: "#7DD3FC",
  LT2: "#2DD4BF",
  HT3: "#34D399",
  LT3: "#FACC15",
  HT4: "#FB923C",
  LT4: "#EA580C",
  HT5: "#EF4444",
  LT5: "#991B1B"
};
const MODE_LABELS = {
  sword: "Sword",
  crystal: "Crystal",
  axe: "Axe",
  mace: "Mace",
  uhc: "UHC",
  nethpot: "Nethpot",
  diapot: "Diapot"
};
function buildEntries(players) {
  const out = [];
  for (const p of players) {
    for (const [mode, tier] of Object.entries(p.ranks)) {
      if (tier && tier !== "NONE" && tier !== "None")
        out.push({ player: p.name, tier, mode: MODE_LABELS[mode] ?? mode });
    }
  }
  return out;
}
function shuffleEntries(entries) {
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function PremiumTicker({ label, players }) {
  const entries = useMemo(() => buildEntries(players), [players]);
  const [displayEntries, setDisplayEntries] = useState(entries);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("in");
  useEffect(() => {
    if (entries.length === 0) return;
    const randomizedEntries = shuffleEntries(entries);
    setDisplayEntries(randomizedEntries);
    setIdx(Math.floor(Math.random() * randomizedEntries.length));
    const t = setInterval(() => {
      setPhase("out");
      setTimeout(() => {
        setIdx((i) => (i + 1) % randomizedEntries.length);
        setPhase("in");
      }, 350);
    }, 4500);
    return () => clearInterval(t);
  }, [entries]);
  if (displayEntries.length === 0) return null;
  const a = displayEntries[idx % displayEntries.length];
  const tierColor = TIER_HEX[a.tier] ?? "#fff";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "inline-flex items-center gap-2.5 rounded-full px-4 py-2",
      style: {
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(8px)"
      },
      children: [
        /* @__PURE__ */ jsxs("span", { className: "relative flex h-1.5 w-1.5 shrink-0", children: [
          /* @__PURE__ */ jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" }),
          /* @__PURE__ */ jsx("span", { className: "relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold tracking-[0.18em] uppercase text-white/50 select-none shrink-0", children: label || "Live" }),
        /* @__PURE__ */ jsx("span", { className: "w-px h-3 bg-white/10 shrink-0" }),
        /* @__PURE__ */ jsxs(
          "span",
          {
            className: "text-xs transition-all duration-300 whitespace-nowrap",
            style: {
              opacity: phase === "in" ? 1 : 0,
              transform: phase === "in" ? "translateY(0)" : "translateY(-3px)"
            },
            children: [
              /* @__PURE__ */ jsxs("span", { className: "text-white/60", children: [
                a.player,
                " "
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-white/35", children: "ranked " }),
              /* @__PURE__ */ jsxs("span", { className: "font-semibold", style: { color: tierColor }, children: [
                a.tier,
                " "
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "text-white/35", children: [
                "in ",
                a.mode
              ] })
            ]
          }
        )
      ]
    }
  );
}
function TopPlayersPanel({ accent, players }) {
  const top = useMemo(() => {
    const rankings = computeRankings(players);
    return players.map((p) => {
      const info = rankings.get(p.name);
      return {
        name: p.name,
        rank: info?.rank ?? 9999,
        totalPoints: info?.totalPoints ?? 0,
        bestTier: getHighestTier(p.ranks)
      };
    }).filter((p) => p.totalPoints > 0).sort((a, b) => a.rank - b.rank).slice(0, 6);
  }, [players]);
  return /* @__PURE__ */ jsxs("div", { className: "hidden lg:flex flex-col gap-3", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-1", children: [
      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold uppercase tracking-[0.25em] text-white/30", children: "Top Ranked" }),
      /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/rankings",
          className: "flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:text-white",
          style: { color: `${accent}99` },
          children: [
            "View all ",
            /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm overflow-hidden", children: top.map((p, i) => {
      p.bestTier ? TIER_HEX[p.bestTier] ?? "#fff" : "#6B7280";
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.03] transition-colors",
          children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "w-4 text-center text-[10px] font-black shrink-0",
                style: { color: accent },
                children: i + 1
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "relative h-8 w-8 shrink-0 rounded bg-white/5 overflow-hidden", children: /* @__PURE__ */ jsx(
              "img",
              {
                src: `https://mc-heads.net/avatar/${p.name}/32`,
                alt: p.name,
                width: 32,
                height: 32,
                className: "h-8 w-8 rounded",
                onError: (e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.src = `https://minotar.net/helm/${p.name}/32`;
                  } else {
                    img.style.display = "none";
                  }
                }
              }
            ) }),
            /* @__PURE__ */ jsx("span", { className: "flex-1 min-w-0 text-sm font-semibold text-white/85 truncate", children: p.name }),
            /* @__PURE__ */ jsxs(
              "span",
              {
                className: "shrink-0 rounded px-2 py-0.5 text-[11px] font-black tracking-wide tabular-nums",
                style: {
                  color: accent,
                  background: `${accent}15`,
                  border: `1px solid ${accent}28`
                },
                children: [
                  p.totalPoints,
                  " pts"
                ]
              }
            )
          ]
        },
        p.name
      );
    }) }),
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "h-px w-full rounded-full",
        style: { background: `linear-gradient(90deg, ${accent}40, transparent)` }
      }
    )
  ] });
}
const DiscordIcon = () => /* @__PURE__ */ jsx("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { d: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" }) });
function CtaButton({ cfg }) {
  const cta = cfg.hero.primaryCta;
  if (!cta.visible) return null;
  const isDiscord = cta.style === "discord";
  const isOutline = cta.style === "outline" || cta.style === "ghost";
  const base = "group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200";
  const cls = isDiscord ? `${base} text-white` : isOutline ? `${base} bg-white/5 border border-white/15 text-white hover:bg-white/10 hover:border-white/25` : `${base} text-black hover:brightness-110`;
  const style = isDiscord ? { background: "linear-gradient(135deg,#5865F2,#4752c4)" } : isOutline ? void 0 : { background: cfg.theme.heroGradient || cfg.theme.brandPrimary };
  const inner = /* @__PURE__ */ jsxs(Fragment, { children: [
    isDiscord && /* @__PURE__ */ jsx(DiscordIcon, {}),
    cta.text,
    !isDiscord && /* @__PURE__ */ jsx(ArrowRight, { className: "h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" })
  ] });
  return cta.external ? /* @__PURE__ */ jsx("a", { href: cta.link, target: "_blank", rel: "noopener noreferrer", className: cls, style, children: inner }) : /* @__PURE__ */ jsx(Link, { to: cta.link, className: cls, style, children: inner });
}
function SecondaryCtaButton({ cfg }) {
  const cta = cfg.hero.secondaryCta;
  if (!cta.visible) return null;
  const isDiscord = cta.style === "discord";
  const isOutline = cta.style === "outline" || cta.style === "ghost";
  const base = "group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200";
  const cls = isDiscord ? `${base} text-white` : isOutline ? `${base} bg-transparent border border-white/15 text-white/70 hover:text-white hover:border-white/30` : `${base} text-black hover:brightness-110`;
  const style = isDiscord ? { background: "linear-gradient(135deg,#5865F2,#4752c4)" } : void 0;
  const inner = /* @__PURE__ */ jsxs(Fragment, { children: [
    isDiscord && /* @__PURE__ */ jsx(DiscordIcon, {}),
    cta.text
  ] });
  return cta.external ? /* @__PURE__ */ jsx("a", { href: cta.link, target: "_blank", rel: "noopener noreferrer", className: cls, style, children: inner }) : /* @__PURE__ */ jsx(Link, { to: cta.link, className: cls, style, children: inner });
}
function CopyIPButton() {
  const cfg = useHomepageConfig();
  const [copied, setCopied] = useState(false);
  const ip = cfg.hero.serverIP || "play.example.com";
  if (!cfg.hero.showServerIP) return null;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
    }
  };
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick: handleCopy,
      className: "group mt-4 inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer",
      children: [
        /* @__PURE__ */ jsx("span", { className: "font-mono text-white/50 text-xs tracking-wide", children: ip }),
        /* @__PURE__ */ jsxs("span", { className: `flex items-center gap-1 text-[10px] font-medium transition-colors ${copied ? "text-green-400" : "text-white/25 group-hover:text-white/40"}`, children: [
          copied ? /* @__PURE__ */ jsx(Check, { size: 10 }) : /* @__PURE__ */ jsx(Copy, { size: 10 }),
          copied ? cfg.hero.ipCopiedLabel || "Copied!" : cfg.hero.ipCopyLabel || "Copy"
        ] })
      ]
    }
  );
}
function Hero({ players: rawPlayers }) {
  const players = Array.isArray(rawPlayers) ? rawPlayers : [];
  const cfg = useHomepageConfig();
  if (!cfg.hero.enabled) return null;
  const accent = cfg.theme.brandPrimary || "#00BFFF";
  const anim = cfg.hero.animation === "fade-up" ? "fade-in-up" : cfg.hero.animation === "scale" ? "animate-[scaleIn_0.8s_ease-out]" : "";
  return /* @__PURE__ */ jsxs("section", { className: `relative flex flex-col justify-center min-h-[88vh] px-5 sm:px-8 lg:px-12 py-12 overflow-hidden ${anim}`, children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "pointer-events-none absolute left-0 top-1/4 bottom-1/4 w-px",
        style: { background: `linear-gradient(to bottom, transparent, ${accent}50, transparent)` }
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto w-full", children: [
      cfg.hero.liveTickerEnabled && /* @__PURE__ */ jsx("div", { className: "flex justify-center mb-10", children: /* @__PURE__ */ jsx(PremiumTicker, { label: cfg.hero.liveTickerLabel, players }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10 xl:gap-20 items-center", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-8", children: [
            /* @__PURE__ */ jsx("div", { className: "w-8 h-px shrink-0", style: { background: accent } }),
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "text-[10px] font-bold uppercase tracking-[0.28em]",
                style: { color: `${accent}80` },
                children: "Minecraft PvP · Tier Rankings"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "pl-5 mb-7", style: { borderLeft: `3px solid ${accent}` }, children: /* @__PURE__ */ jsxs("h1", { className: "font-black leading-[0.92] tracking-tight select-none", children: [
            /* @__PURE__ */ jsx("span", { className: "block text-5xl sm:text-6xl xl:text-[76px] text-white drop-shadow-2xl", children: cfg.hero.title }),
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "block text-5xl sm:text-6xl xl:text-[76px]",
                style: {
                  background: cfg.theme.heroGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                },
                children: cfg.hero.titleAccent
              }
            )
          ] }) }),
          /* @__PURE__ */ jsx("p", { className: "text-white/45 text-base sm:text-[17px] leading-relaxed mb-8 max-w-lg", children: cfg.hero.subtitle }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center flex-wrap gap-3", children: [
            /* @__PURE__ */ jsx(CtaButton, { cfg }),
            /* @__PURE__ */ jsx(SecondaryCtaButton, { cfg })
          ] }),
          /* @__PURE__ */ jsx(CopyIPButton, {})
        ] }),
        /* @__PURE__ */ jsx(TopPlayersPanel, { accent, players })
      ] }),
      cfg.layout?.showScrollHint && /* @__PURE__ */ jsx("div", { className: "mt-12 flex justify-center opacity-20 animate-bounce", children: /* @__PURE__ */ jsx("div", { className: "w-4 h-7 border border-white/40 rounded-full flex justify-center pt-1.5", children: /* @__PURE__ */ jsx("div", { className: "w-0.5 h-1.5 bg-white rounded-full" }) }) })
    ] })
  ] });
}
function useCountUp(target, duration = 1600, active) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return count;
}
function StatCard({
  value,
  label,
  accent = false,
  suffix = "",
  icon
}) {
  const [active, setActive] = useState(false);
  const ref = useRef(null);
  const count = useCountUp(value, 1600, active);
  const cfg = useHomepageConfig();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setActive(true);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return /* @__PURE__ */ jsxs("div", { ref, className: "text-center", children: [
    /* @__PURE__ */ jsx("div", { className: `text-3xl mb-1 ${accent ? "text-[#00BFFF]" : "text-white"}`, children: icon }),
    accent ? /* @__PURE__ */ jsxs(
      "div",
      {
        className: "font-black text-5xl sm:text-6xl lg:text-7xl leading-none mb-2",
        style: {
          background: cfg.theme.textGradient,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        },
        children: [
          count.toLocaleString(),
          suffix
        ]
      }
    ) : /* @__PURE__ */ jsxs("div", { className: "font-black text-5xl sm:text-6xl lg:text-7xl leading-none mb-2 text-white", children: [
      count.toLocaleString(),
      suffix
    ] }),
    /* @__PURE__ */ jsx("div", { className: "text-white/40 text-sm font-medium", children: label })
  ] });
}
function Stats({ players }) {
  const cfg = useHomepageConfig();
  if (!cfg.stats.enabled) return null;
  const totalRanked = players.filter(
    (p) => Object.values(p.ranks).some((t) => t && t !== "NONE" && t !== "None")
  ).length;
  const testsCompleted = players.reduce(
    (acc, p) => acc + Object.values(p.ranks).filter((t) => t && t !== "NONE" && t !== "None").length,
    0
  );
  const resolveValue = (source, manual) => {
    switch (source) {
      case "players":
        return totalRanked;
      case "tests":
        return testsCompleted;
      case "years":
        return 1;
      case "manual":
        return manual;
      default:
        return manual;
    }
  };
  const visibleCards = cfg.stats.cards.filter((c) => c.visible);
  if (visibleCards.length === 0) return null;
  return /* @__PURE__ */ jsx("section", { className: "py-16 px-4 relative", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto", children: [
    (cfg.stats.title || cfg.stats.subtitle) && /* @__PURE__ */ jsxs("div", { className: "text-center mb-10", children: [
      cfg.stats.title && /* @__PURE__ */ jsx("h2", { className: "font-black text-3xl text-white", children: cfg.stats.title }),
      cfg.stats.subtitle && /* @__PURE__ */ jsx("p", { className: "text-white/40 text-sm mt-2", children: cfg.stats.subtitle })
    ] }),
    /* @__PURE__ */ jsx("div", { className: `grid gap-8 sm:gap-16 ${visibleCards.length === 3 ? "grid-cols-3" : visibleCards.length === 2 ? "grid-cols-2" : "grid-cols-1"}`, children: visibleCards.map((card) => /* @__PURE__ */ jsx(
      StatCard,
      {
        value: resolveValue(card.source, card.value === "auto" ? 0 : card.value),
        label: card.label,
        accent: card.accent,
        suffix: card.suffix,
        icon: card.icon
      },
      card.id
    )) })
  ] }) });
}
function Features() {
  const cfg = useHomepageConfig();
  if (!cfg.features.enabled) return null;
  const visibleItems = cfg.features.items.filter((i) => i.visible);
  if (visibleItems.length === 0) return null;
  const isScroll = cfg.features.layout === "scroll";
  const isCompact = cfg.features.layout === "compact";
  return /* @__PURE__ */ jsx("section", { className: "py-20 px-4 relative overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-center mb-14", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-black text-4xl sm:text-5xl text-white leading-tight", children: [
        cfg.features.title,
        cfg.features.subtitle && /* @__PURE__ */ jsx("br", {}),
        cfg.features.subtitle && /* @__PURE__ */ jsx("span", { style: { color: cfg.theme.brandPrimary }, children: cfg.features.subtitle })
      ] }),
      cfg.features.description && /* @__PURE__ */ jsx("p", { className: "text-white/40 text-sm mt-3", children: cfg.features.description })
    ] }),
    isScroll ? /* @__PURE__ */ jsx("div", { className: "flex overflow-x-auto gap-4 pb-4 justify-start sm:justify-center", children: visibleItems.map((mode) => /* @__PURE__ */ jsxs(
      Link,
      {
        to: mode.link,
        className: `
                  group flex flex-col items-center justify-center gap-3 shrink-0
                  ${isCompact ? "w-24 h-24" : "w-32 h-32 sm:w-36 sm:h-36"}
                  rounded-2xl bg-white/4 border border-white/8
                  hover:border-white/20 hover:bg-white/8
                  transition-all duration-200 cursor-pointer
                `,
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-4xl select-none", children: mode.icon }),
          /* @__PURE__ */ jsx("span", { className: "text-white/60 text-xs font-medium group-hover:text-white transition-colors", children: mode.label })
        ]
      },
      mode.id
    )) }) : /* @__PURE__ */ jsx("div", { className: `flex flex-wrap justify-center gap-4 ${isCompact ? "max-w-3xl mx-auto" : ""}`, children: visibleItems.map((mode) => /* @__PURE__ */ jsxs(
      Link,
      {
        to: mode.link,
        className: `
                  group flex flex-col items-center justify-center gap-3
                  ${isCompact ? "w-24 h-24" : "w-32 h-32 sm:w-36 sm:h-36"}
                  rounded-2xl bg-white/4 border border-white/8
                  hover:border-white/20 hover:bg-white/8
                  transition-all duration-200 cursor-pointer
                `,
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-4xl select-none", children: mode.icon }),
          /* @__PURE__ */ jsx("span", { className: "text-white/60 text-xs font-medium group-hover:text-white transition-colors", children: mode.label })
        ]
      },
      mode.id
    )) })
  ] }) });
}
function Quote() {
  const cfg = useHomepageConfig();
  if (!cfg.quote.enabled) return null;
  const alignClass = { left: "text-left", center: "text-center", right: "text-right" }[cfg.quote.align];
  const parts = cfg.quote.text.split(cfg.quote.highlight);
  return /* @__PURE__ */ jsx("section", { className: "py-20 px-4 relative", children: /* @__PURE__ */ jsxs("div", { className: `max-w-4xl mx-auto ${alignClass}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-4 flex-wrap", children: [
      /* @__PURE__ */ jsx("span", { className: "text-6xl text-white/20 font-serif leading-none select-none", children: "“" }),
      /* @__PURE__ */ jsx("p", { className: "text-2xl sm:text-3xl font-bold text-white", children: parts.map((part, i, arr) => /* @__PURE__ */ jsxs("span", { children: [
        part,
        i < arr.length - 1 && cfg.quote.highlight && /* @__PURE__ */ jsxs(
          "span",
          {
            className: "relative inline-block",
            style: {
              background: cfg.theme.textGradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            },
            children: [
              cfg.quote.highlight,
              /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 left-0 right-0 h-px", style: { background: cfg.theme.textGradient } })
            ]
          }
        )
      ] }, i)) }),
      /* @__PURE__ */ jsx("span", { className: "text-6xl text-white/20 font-serif leading-none select-none", children: "”" })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-[#555555] text-sm mt-4", style: { textAlign: cfg.quote.align }, children: cfg.quote.author })
  ] }) });
}
function HomePage() {
  const {
    players
  } = Route.useLoaderData();
  const cfg = useHomepageConfig();
  const eventInSection = {
    ...cfg.event,
    visible: cfg.event.visible && !cfg.event.showAboveNavbar
  };
  const sectionComponents = {
    announcement: /* @__PURE__ */ jsx(ActiveHomepageBanners, { announcements: cfg.announcements, event: {
      ...cfg.event,
      visible: false
    } }, "announcement"),
    navbar: /* @__PURE__ */ jsx(Navbar, {}, "navbar"),
    hero: /* @__PURE__ */ jsx(Hero, { players }, "hero"),
    stats: /* @__PURE__ */ jsx(Stats, { players }, "stats"),
    quote: /* @__PURE__ */ jsx(Quote, {}, "quote"),
    features: /* @__PURE__ */ jsx(Features, {}, "features"),
    event: /* @__PURE__ */ jsx(ActiveHomepageBanners, { announcements: [], event: eventInSection }, "event"),
    footer: /* @__PURE__ */ jsx(Footer, {}, "footer")
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen", children: cfg.layout.sectionOrder.map((section) => sectionComponents[section]).filter(Boolean) });
}
export {
  HomePage as component
};
