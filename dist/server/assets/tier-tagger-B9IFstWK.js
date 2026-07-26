import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { N as Navbar } from "./Navbar-BmLqh_kL.js";
import { F as Footer } from "./Footer-BivHw4RG.js";
import { useState, useEffect } from "react";
import { u as useTierTaggerConfig } from "./tierTaggerStore-CipTEJ5s.js";
import { R as Route } from "./router-BF68vAiv.js";
import "@tanstack/react-router";
import "lucide-react";
import "./HomepageBanners-Db1v9XpX.js";
import "react-dom";
import "./homepageStore-KPOXxduW.js";
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
function useCountdown(targetIso) {
  const [remaining, setRemaining] = useState(
    () => Math.max(0, new Date(targetIso).getTime() - Date.now())
  );
  useEffect(() => {
    if (!targetIso) {
      setRemaining(0);
      return;
    }
    function tick() {
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    }
    tick();
    const id = setInterval(tick, 1e3);
    return () => clearInterval(id);
  }, [targetIso]);
  const totalSec = Math.floor(remaining / 1e3);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor(totalSec % 86400 / 3600),
    minutes: Math.floor(totalSec % 3600 / 60),
    seconds: totalSec % 60,
    expired: remaining === 0
  };
}
function Digit({ value, label, size }) {
  const str = String(value).padStart(2, "0");
  if (size === "lg") {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative flex items-center justify-center",
          style: {
            width: 76,
            height: 80,
            background: "linear-gradient(160deg, rgba(0,191,255,0.08) 0%, rgba(0,0,0,0.6) 100%)",
            border: "1px solid rgba(0,191,255,0.22)",
            borderRadius: 14,
            boxShadow: "0 0 24px rgba(0,191,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
          },
          children: [
            /* @__PURE__ */ jsx("div", { className: "absolute top-0 inset-x-3 h-px", style: { background: "linear-gradient(90deg,transparent,rgba(0,191,255,0.4),transparent)" } }),
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "font-['Space_Grotesk'] font-black tabular-nums",
                style: { fontSize: 34, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 0 20px rgba(0,191,255,0.5)" },
                children: str
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsx("span", { style: { fontSize: 9, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase" }, children: label })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-1", children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "flex items-center justify-center",
        style: {
          width: 42,
          height: 44,
          background: "linear-gradient(160deg, rgba(0,191,255,0.08) 0%, rgba(0,0,0,0.6) 100%)",
          border: "1px solid rgba(0,191,255,0.2)",
          borderRadius: 9,
          boxShadow: "0 0 14px rgba(0,191,255,0.1)"
        },
        children: /* @__PURE__ */ jsx(
          "span",
          {
            className: "font-['Space_Grotesk'] font-black tabular-nums",
            style: { fontSize: 18, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 0 12px rgba(0,191,255,0.4)" },
            children: str
          }
        )
      }
    ),
    /* @__PURE__ */ jsx("span", { style: { fontSize: 8, letterSpacing: "0.18em", color: "rgba(255,255,255,0.25)", fontWeight: 700, textTransform: "uppercase" }, children: label })
  ] });
}
function Separator({ size }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "flex flex-col gap-2 pb-4",
      style: { color: "rgba(0,191,255,0.35)", fontWeight: 900, fontSize: size === "lg" ? 22 : 14, letterSpacing: 0 },
      children: /* @__PURE__ */ jsx("span", { children: ":" })
    }
  );
}
function ReleaseCountdown({ heading, subtext, releaseDate, variant, fallback }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(releaseDate);
  if (expired && releaseDate) return /* @__PURE__ */ jsx(Fragment, { children: fallback });
  const releaseLabel = releaseDate ? new Date(releaseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  if (variant === "hero") {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest",
          style: { background: "rgba(0,191,255,0.08)", border: "1px solid rgba(0,191,255,0.2)", color: "#00BFFF" },
          children: [
            /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" }),
            heading
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-1.5", children: [
        /* @__PURE__ */ jsx(Digit, { value: days, label: "Days", size: "sm" }),
        /* @__PURE__ */ jsx(Separator, { size: "sm" }),
        /* @__PURE__ */ jsx(Digit, { value: hours, label: "Hrs", size: "sm" }),
        /* @__PURE__ */ jsx(Separator, { size: "sm" }),
        /* @__PURE__ */ jsx(Digit, { value: minutes, label: "Min", size: "sm" }),
        /* @__PURE__ */ jsx(Separator, { size: "sm" }),
        /* @__PURE__ */ jsx(Digit, { value: seconds, label: "Sec", size: "sm" })
      ] }),
      releaseLabel && /* @__PURE__ */ jsxs("p", { style: { fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em" }, children: [
        "Releasing ",
        releaseLabel
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-6", children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em]",
        style: { background: "rgba(0,191,255,0.07)", border: "1px solid rgba(0,191,255,0.22)", color: "#00BFFF" },
        children: [
          /* @__PURE__ */ jsxs("svg", { width: "11", height: "11", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
            /* @__PURE__ */ jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
          ] }),
          heading
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-3", children: [
      /* @__PURE__ */ jsx(Digit, { value: days, label: "Days", size: "lg" }),
      /* @__PURE__ */ jsx(Separator, { size: "lg" }),
      /* @__PURE__ */ jsx(Digit, { value: hours, label: "Hours", size: "lg" }),
      /* @__PURE__ */ jsx(Separator, { size: "lg" }),
      /* @__PURE__ */ jsx(Digit, { value: minutes, label: "Minutes", size: "lg" }),
      /* @__PURE__ */ jsx(Separator, { size: "lg" }),
      /* @__PURE__ */ jsx(Digit, { value: seconds, label: "Seconds", size: "lg" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 text-center", children: [
      /* @__PURE__ */ jsx("p", { style: { color: "rgba(255,255,255,0.35)", fontSize: 13, maxWidth: 360, lineHeight: 1.6 }, children: subtext }),
      releaseLabel && /* @__PURE__ */ jsx("p", { style: { fontSize: 11, color: "rgba(0,191,255,0.5)", letterSpacing: "0.12em", fontWeight: 600 }, children: releaseLabel })
    ] })
  ] });
}
function TierTaggerPage({ serverData } = {}) {
  const cfg = useTierTaggerConfig(serverData);
  const showCountdown = cfg.releaseCountdownEnabled && !!cfg.releaseDate;
  return /* @__PURE__ */ jsxs("main", { className: "min-h-screen", style: { background: "#080c14" }, children: [
    /* @__PURE__ */ jsx("section", { className: "relative pt-8 pb-12 px-4 overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto text-center relative", children: [
      /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5 text-[#00BFFF] text-xs font-semibold mb-6 tracking-wide uppercase", children: [
        /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" }),
        cfg.badge
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "font-black text-4xl sm:text-5xl text-white mb-4", children: [
        cfg.titlePrefix,
        " ",
        /* @__PURE__ */ jsx("span", { className: "text-gradient", children: cfg.titleAccent })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500 max-w-md mx-auto text-sm mb-8", children: cfg.subtitle }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-3 justify-center", children: showCountdown ? /* @__PURE__ */ jsx(
        ReleaseCountdown,
        {
          heading: cfg.countdownHeading,
          subtext: cfg.countdownSubtext,
          releaseDate: cfg.releaseDate,
          variant: "hero",
          fallback: /* @__PURE__ */ jsxs(
            "a",
            {
              href: cfg.downloadUrl,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-200",
              style: { background: "linear-gradient(135deg, #00BFFF, #0066FF)" },
              children: [
                /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                  /* @__PURE__ */ jsx("polyline", { points: "7 10 12 15 17 10" }),
                  /* @__PURE__ */ jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
                ] }),
                cfg.downloadLabel
              ]
            }
          )
        }
      ) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: cfg.downloadUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-200",
            style: { background: "linear-gradient(135deg, #00BFFF, #0066FF)" },
            children: [
              /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                /* @__PURE__ */ jsx("polyline", { points: "7 10 12 15 17 10" }),
                /* @__PURE__ */ jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
              ] }),
              cfg.downloadLabel
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "a",
          {
            href: cfg.secondaryUrl,
            className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-white/5 border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all duration-200",
            children: cfg.secondaryLabel
          }
        )
      ] }) }),
      showCountdown && /* @__PURE__ */ jsx("div", { className: "mt-4", children: /* @__PURE__ */ jsx(
        "a",
        {
          href: cfg.secondaryUrl,
          className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-white/5 border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all duration-200",
          children: cfg.secondaryLabel
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "max-w-6xl mx-auto px-6 pb-20", children: /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-5", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative rounded-2xl overflow-hidden group",
          style: { border: "1px solid rgba(0,191,255,0.15)", background: "rgba(0,0,0,0.3)" },
          children: [
            /* @__PURE__ */ jsx("div", { className: "absolute top-0 inset-x-0 h-px", style: { background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.5), transparent)" } }),
            /* @__PURE__ */ jsx(
              "img",
              {
                src: cfg.nametagImageUrl,
                alt: "Blue Tier Tagger nametag showcase",
                className: "w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]",
                style: { aspectRatio: "16/9", objectPosition: "center" }
              }
            ),
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: "absolute bottom-0 inset-x-0 p-4",
                style: { background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" },
                children: [
                  /* @__PURE__ */ jsx("p", { className: "text-white font-semibold text-sm", children: cfg.nametagCaption }),
                  /* @__PURE__ */ jsx("p", { className: "text-white/40 text-xs mt-0.5", children: cfg.nametagSubcaption })
                ]
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative rounded-2xl overflow-hidden group",
          style: { border: "1px solid rgba(0,191,255,0.15)", background: "rgba(0,0,0,0.3)" },
          children: [
            /* @__PURE__ */ jsx("div", { className: "absolute top-0 inset-x-0 h-px", style: { background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.5), transparent)" } }),
            /* @__PURE__ */ jsx(
              "img",
              {
                src: cfg.profileImageUrl,
                alt: "Blue Tier Tagger player profile",
                className: "w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]",
                style: { aspectRatio: "16/9", objectPosition: "top center" }
              }
            ),
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: "absolute bottom-0 inset-x-0 p-4",
                style: { background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" },
                children: [
                  /* @__PURE__ */ jsx("p", { className: "text-white font-semibold text-sm", children: cfg.profileCaption }),
                  /* @__PURE__ */ jsx("p", { className: "text-white/40 text-xs mt-0.5", children: cfg.profileSubcaption })
                ]
              }
            )
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs("section", { className: "max-w-6xl mx-auto px-6 pb-24", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ jsx(
          "p",
          {
            className: "text-[10px] uppercase tracking-[0.25em] font-bold mb-3",
            style: { background: "linear-gradient(90deg,#00BFFF,#0099FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
            children: cfg.featuresEyebrow
          }
        ),
        /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white", children: cfg.featuresHeading })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: cfg.features.map((f) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "rounded-xl p-6 transition-all duration-200",
          style: {
            background: "linear-gradient(135deg, rgba(0,191,255,0.04) 0%, rgba(0,0,0,0) 100%)",
            border: "1px solid rgba(0,191,255,0.1)"
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.borderColor = "rgba(0,191,255,0.25)";
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,191,255,0.07) 0%, rgba(0,0,0,0) 100%)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.borderColor = "rgba(0,191,255,0.1)";
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,191,255,0.04) 0%, rgba(0,0,0,0) 100%)";
          },
          children: [
            /* @__PURE__ */ jsx("div", { className: "text-2xl mb-3", children: f.icon }),
            /* @__PURE__ */ jsx("h3", { className: "text-white font-bold text-sm mb-1.5", children: f.title }),
            /* @__PURE__ */ jsx("p", { className: "text-white/35 text-xs leading-relaxed", children: f.desc })
          ]
        },
        f.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "max-w-6xl mx-auto px-6 pb-24", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ jsx(
          "p",
          {
            className: "text-[10px] uppercase tracking-[0.25em] font-bold mb-3",
            style: { background: "linear-gradient(90deg,#00BFFF,#0099FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
            children: cfg.stepsEyebrow
          }
        ),
        /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white", children: cfg.stepsHeading })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-3 gap-4", children: cfg.steps.map((s, i) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative rounded-xl p-7",
          style: {
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)"
          },
          children: [
            i < cfg.steps.length - 1 && /* @__PURE__ */ jsx(
              "div",
              {
                className: "hidden md:block absolute top-10 -right-2 w-4 h-px",
                style: { background: "rgba(0,191,255,0.3)" }
              }
            ),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "font-['Space_Grotesk'] font-black text-4xl mb-4",
                style: { background: "linear-gradient(135deg, rgba(0,191,255,0.4), rgba(0,102,255,0.2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
                children: s.n
              }
            ),
            /* @__PURE__ */ jsx("h3", { className: "text-white font-bold text-sm mb-2", children: s.title }),
            /* @__PURE__ */ jsx("p", { className: "text-white/35 text-xs leading-relaxed", children: s.desc })
          ]
        },
        s.id
      )) })
    ] }),
    /* @__PURE__ */ jsx("section", { id: "download", className: "max-w-6xl mx-auto px-6 pb-28", children: /* @__PURE__ */ jsxs(
      "div",
      {
        className: "relative rounded-2xl overflow-hidden px-8 md:px-16 py-14 text-center",
        style: {
          background: "linear-gradient(135deg, #080D18 0%, #0D1525 50%, #080D18 100%)",
          border: showCountdown ? "1px solid rgba(0,191,255,0.25)" : "1px solid rgba(0,191,255,0.18)",
          boxShadow: showCountdown ? "0 0 100px rgba(0,191,255,0.1)" : "0 0 80px rgba(0,191,255,0.06)"
        },
        children: [
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,191,255,0.1) 0%, transparent 70%)" } }),
          /* @__PURE__ */ jsx("div", { className: "absolute top-0 inset-x-0 h-px", style: { background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)" } }),
          /* @__PURE__ */ jsx("div", { className: "relative", children: showCountdown ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("div", { className: "text-4xl mb-5", children: "⏳" }),
            /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white mb-3", children: cfg.ctaHeading }),
            /* @__PURE__ */ jsx("p", { className: "text-white/35 text-sm max-w-md mx-auto mb-10 leading-relaxed", children: cfg.ctaBody }),
            /* @__PURE__ */ jsx(
              ReleaseCountdown,
              {
                heading: cfg.countdownHeading,
                subtext: cfg.countdownSubtext,
                releaseDate: cfg.releaseDate,
                variant: "cta",
                fallback: /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsxs(
                    "a",
                    {
                      href: cfg.ctaButtonUrl,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-sm text-white transition-all duration-200",
                      style: { background: "linear-gradient(135deg, #00BFFF, #0066FF)", boxShadow: "0 0 40px rgba(0,191,255,0.4)" },
                      onMouseEnter: (e) => {
                        e.currentTarget.style.boxShadow = "0 0 56px rgba(0,191,255,0.6)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      },
                      onMouseLeave: (e) => {
                        e.currentTarget.style.boxShadow = "0 0 40px rgba(0,191,255,0.4)";
                        e.currentTarget.style.transform = "translateY(0)";
                      },
                      children: [
                        /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
                          /* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                          /* @__PURE__ */ jsx("polyline", { points: "7 10 12 15 17 10" }),
                          /* @__PURE__ */ jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
                        ] }),
                        cfg.ctaButtonLabel
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx("p", { className: "text-white/20 text-[11px] mt-5", children: cfg.ctaNote })
                ] })
              }
            )
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("div", { className: "text-4xl mb-5", children: "📦" }),
            /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white mb-3", children: cfg.ctaHeading }),
            /* @__PURE__ */ jsx("p", { className: "text-white/35 text-sm max-w-md mx-auto mb-8 leading-relaxed", children: cfg.ctaBody }),
            /* @__PURE__ */ jsxs(
              "a",
              {
                href: cfg.ctaButtonUrl,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-sm text-white transition-all duration-200",
                style: {
                  background: "linear-gradient(135deg, #00BFFF, #0066FF)",
                  boxShadow: "0 0 40px rgba(0,191,255,0.4)"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.boxShadow = "0 0 56px rgba(0,191,255,0.6)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.boxShadow = "0 0 40px rgba(0,191,255,0.4)";
                  e.currentTarget.style.transform = "translateY(0)";
                },
                children: [
                  /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                    /* @__PURE__ */ jsx("polyline", { points: "7 10 12 15 17 10" }),
                    /* @__PURE__ */ jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
                  ] }),
                  cfg.ctaButtonLabel
                ]
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-white/20 text-[11px] mt-5", children: cfg.ctaNote })
          ] }) })
        ]
      }
    ) }),
    /* @__PURE__ */ jsx("section", { className: "max-w-6xl mx-auto px-6 pb-28", children: /* @__PURE__ */ jsxs(
      "div",
      {
        className: "rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8",
        style: {
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)"
        },
        children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl",
              style: { background: "linear-gradient(135deg, rgba(0,191,255,0.15), rgba(0,102,255,0.08))", border: "1px solid rgba(0,191,255,0.25)" },
              children: "💙"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 text-center md:text-left", children: [
            /* @__PURE__ */ jsx("h3", { className: "font-['Space_Grotesk'] font-black text-xl text-white mb-2", children: cfg.aboutTitle }),
            /* @__PURE__ */ jsx("p", { className: "text-white/35 text-sm leading-relaxed max-w-2xl", children: cfg.aboutBody }),
            /* @__PURE__ */ jsx("p", { className: "text-white/20 text-xs mt-4", children: cfg.aboutCredit })
          ] })
        ]
      }
    ) })
  ] });
}
const SplitComponent = function TierTaggerRoute() {
  const {
    tierTagger
  } = Route.useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Navbar, {}),
    /* @__PURE__ */ jsx(TierTaggerPage, { serverData: tierTagger }),
    /* @__PURE__ */ jsx(Footer, {})
  ] });
};
export {
  SplitComponent as component
};
