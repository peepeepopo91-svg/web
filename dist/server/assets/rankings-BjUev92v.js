import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { N as Navbar } from "./Navbar-BmLqh_kL.js";
import { F as Footer } from "./Footer-BivHw4RG.js";
import { g as getPlayerTotalPoints, a as getAverageTier, b as getAveragePoints, c as getHighestTier, d as getLowestTier, t as tierColors, e as computeRankings, f as tierSortValue, T as TIER_ORDER, h as TIER_POINTS } from "./HomepageBanners-Db1v9XpX.js";
import { g as gamemodes } from "./homepageStore-KPOXxduW.js";
import { createPortal } from "react-dom";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { a as Route, l as loadAllData } from "./router-D8sMuNrU.js";
import "@tanstack/react-router";
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
function GamemodeTile({ gm, tier }) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ranked = tier && tier !== "None";
  const colors = ranked ? tierColors[tier] : null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "group/tile relative flex flex-col items-center gap-2",
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: `relative w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-200 cursor-default
          ${ranked && colors ? `${colors.bg} ${colors.border} group-hover/tile:scale-110` : "bg-white/4 border-white/8 opacity-25"}`,
            style: ranked && hovered ? { boxShadow: "0 0 18px rgba(0,191,255,0.4)" } : void 0,
            children: [
              ranked && /* @__PURE__ */ jsx("div", { className: `absolute inset-0 rounded-xl opacity-25 blur-sm ${colors?.bg}` }),
              !imgError && gm.icon ? /* @__PURE__ */ jsx(
                "img",
                {
                  src: gm.icon,
                  alt: gm.label,
                  width: 26,
                  height: 26,
                  className: "w-[26px] h-[26px] object-contain relative z-10",
                  style: {
                    imageRendering: "pixelated",
                    filter: ranked && hovered ? "drop-shadow(0 0 6px rgba(0,191,255,0.55))" : "none"
                  },
                  onError: () => setImgError(true)
                }
              ) : /* @__PURE__ */ jsx("span", { className: "text-lg relative z-10", children: gm.fallback })
            ]
          }
        ),
        /* @__PURE__ */ jsx("span", { className: `text-[11px] font-black tracking-wide uppercase ${colors ? colors.text : "text-gray-700"}`, children: ranked ? tier : "—" }),
        hovered && ranked && /* @__PURE__ */ jsxs("div", { className: "pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20", children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "relative rounded-xl px-3.5 py-2.5 text-center whitespace-nowrap border shadow-2xl",
              style: {
                background: "linear-gradient(135deg, rgba(8,16,32,0.98) 0%, rgba(0,24,52,0.98) 100%)",
                borderColor: "rgba(0,191,255,0.28)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,191,255,0.10)"
              },
              children: [
                /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/50 to-transparent" }),
                /* @__PURE__ */ jsx("div", { className: "text-white text-xs font-bold", children: gm.label }),
                colors && /* @__PURE__ */ jsx("div", { className: `text-[11px] font-black mt-1.5 ${colors.text}`, children: /* @__PURE__ */ jsx("span", { className: `px-2 py-0.5 rounded-md border ${colors.bg} ${colors.border}`, children: tier }) })
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(
            "div",
            {
              className: "w-2 h-2 rotate-45 border-r border-b -mt-[5px]",
              style: { background: "rgba(0,24,52,0.98)", borderColor: "rgba(0,191,255,0.28)" }
            }
          ) })
        ] })
      ]
    }
  );
}
function PlayerProfileModal({
  player,
  overallRank,
  totalPoints,
  overallTier,
  onClose,
  gamemodes: gamemodes$1 = gamemodes
}) {
  const [closing, setClosing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleClose]);
  const points = totalPoints ?? getPlayerTotalPoints(player.ranks);
  const avgTier = overallTier ?? getAverageTier(player.ranks);
  const avgColors = avgTier ? tierColors[avgTier] : null;
  const avgPoints = getAveragePoints(player.ranks);
  const highestTier = getHighestTier(player.ranks);
  const lowestTier = getLowestTier(player.ranks);
  const rankedCount = Object.values(player.ranks).filter((v) => v && v !== "None").length;
  const nameMcUrl = `https://namemc.com/profile/${encodeURIComponent(player.name)}`;
  return createPortal(
    /* @__PURE__ */ jsx(
      "div",
      {
        className: `fixed inset-0 z-[100] flex items-center justify-center p-4 ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`,
        style: { background: "rgba(3,6,15,0.85)", backdropFilter: "blur(12px)" },
        onClick: handleClose,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": `${player.name} player profile`,
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: (e) => e.stopPropagation(),
            className: `relative w-full max-w-md rounded-3xl border shadow-2xl ${closing ? "modal-panel-out" : "modal-panel-in"}`,
            style: {
              background: "linear-gradient(160deg, rgba(8,14,28,0.99) 0%, rgba(5,10,22,0.99) 100%)",
              borderColor: "rgba(0,191,255,0.20)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,191,255,0.07), inset 0 1px 0 rgba(255,255,255,0.05)"
            },
            children: [
              /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/45 to-transparent" }),
              /* @__PURE__ */ jsx("div", { className: "absolute -top-28 left-1/2 -translate-x-1/2 w-80 h-56 bg-[#0044AA]/18 blur-[80px] pointer-events-none rounded-full" }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: handleClose,
                  "aria-label": "Close profile",
                  className: "absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center border text-gray-500 hover:text-white hover:border-[#00BFFF]/40 transition-all duration-200",
                  style: { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.10)" },
                  children: /* @__PURE__ */ jsx("svg", { width: "12", height: "12", viewBox: "0 0 12 12", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M1 1l10 10M11 1L1 11", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" }) })
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "relative px-6 pt-7 pb-6", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-5 mb-6", children: [
                  /* @__PURE__ */ jsxs("div", { className: "relative flex-shrink-0", children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: "absolute -inset-3 rounded-full blur-2xl opacity-35 pointer-events-none",
                        style: { background: "rgba(0,191,255,0.35)" }
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        className: "relative w-20 h-20 rounded-2xl p-[2px]",
                        style: {
                          background: "linear-gradient(135deg, rgba(0,191,255,0.85), rgba(0,70,180,0.5))",
                          boxShadow: "0 0 28px rgba(0,191,255,0.32)"
                        },
                        children: /* @__PURE__ */ jsx("div", { className: "w-full h-full rounded-[14px] overflow-hidden", style: { background: "#080E1C" }, children: !imgError ? /* @__PURE__ */ jsx(
                          "img",
                          {
                            src: player.head,
                            alt: player.name,
                            width: 80,
                            height: 80,
                            className: "w-full h-full object-cover",
                            style: { imageRendering: "pixelated" },
                            onError: () => setImgError(true)
                          }
                        ) : /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center text-3xl", children: "👤" }) })
                      }
                    ),
                    overallRank && /* @__PURE__ */ jsxs(
                      "div",
                      {
                        className: "absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-black text-white",
                        style: { background: "linear-gradient(135deg,#0057c8,#003a8a)", borderColor: "#00BFFF", boxShadow: "0 0 10px rgba(0,191,255,0.5)" },
                        children: [
                          "#",
                          overallRank
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-black text-2xl text-white leading-tight truncate", children: player.name }),
                    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2 mt-2", children: [
                      avgTier && avgColors && /* @__PURE__ */ jsxs(
                        "span",
                        {
                          className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border ${avgColors.bg} ${avgColors.text} ${avgColors.border}`,
                          style: { boxShadow: "0 0 10px rgba(0,191,255,0.18)" },
                          children: [
                            /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-current opacity-70" }),
                            avgTier,
                            " Average"
                          ]
                        }
                      ),
                      player.region && /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-600 font-medium", children: [
                        "🌍 ",
                        player.region
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs(
                      "a",
                      {
                        href: nameMcUrl,
                        target: "_blank",
                        rel: "noreferrer noopener",
                        className: "mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 hover:border-[#00BFFF]/35 hover:text-[#00BFFF]",
                        style: { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.45)" },
                        children: [
                          "View on NameMC",
                          /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", className: "opacity-60", children: /* @__PURE__ */ jsx("path", { d: "M1 9L9 1M9 1H3M9 1V7", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })
                        ]
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2.5 mb-4", children: [
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: "rounded-2xl px-4 py-3 border flex flex-col gap-1 relative overflow-hidden",
                      style: {
                        background: "linear-gradient(135deg, rgba(0,100,200,0.15) 0%, rgba(0,50,120,0.09) 100%)",
                        borderColor: "rgba(0,191,255,0.22)"
                      },
                      children: [
                        /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/45 to-transparent" }),
                        /* @__PURE__ */ jsx("div", { className: "text-[10px] font-bold tracking-widest uppercase text-gray-500", children: "Points" }),
                        /* @__PURE__ */ jsx("div", { className: "font-['Space_Grotesk'] font-black text-xl leading-none text-[#00BFFF]", children: points }),
                        /* @__PURE__ */ jsx("div", { className: "text-[10px] text-gray-700", children: "total earned" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: "rounded-2xl px-4 py-3 border flex flex-col gap-1",
                      style: { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" },
                      children: [
                        /* @__PURE__ */ jsx("div", { className: "text-[10px] font-bold tracking-widest uppercase text-gray-500", children: "Rank" }),
                        /* @__PURE__ */ jsx("div", { className: "font-['Space_Grotesk'] font-black text-xl leading-none text-white", children: overallRank ? `#${overallRank}` : "—" }),
                        /* @__PURE__ */ jsx("div", { className: "text-[10px] text-gray-700", children: "globally" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: "rounded-2xl px-4 py-3 border flex flex-col gap-1",
                      style: { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" },
                      children: [
                        /* @__PURE__ */ jsx("div", { className: "text-[10px] font-bold tracking-widest uppercase text-gray-500", children: "Avg / Mode" }),
                        /* @__PURE__ */ jsx("div", { className: "font-['Space_Grotesk'] font-black text-xl leading-none text-white", children: avgPoints.toFixed(1) }),
                        /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-gray-700", children: [
                          rankedCount,
                          " ranked"
                        ] })
                      ]
                    }
                  )
                ] }),
                (highestTier || lowestTier) && /* @__PURE__ */ jsxs(
                  "div",
                  {
                    className: "flex items-center justify-center gap-6 mb-4 rounded-xl px-5 py-3 border",
                    style: { background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.06)" },
                    children: [
                      highestTier && tierColors[highestTier] && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
                        /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-[10px] font-bold uppercase tracking-wider", children: "Best" }),
                        /* @__PURE__ */ jsx("span", { className: `px-2.5 py-1 rounded-lg text-xs font-black border ${tierColors[highestTier].bg} ${tierColors[highestTier].text} ${tierColors[highestTier].border}`, children: highestTier })
                      ] }),
                      /* @__PURE__ */ jsx("div", { className: "h-5 w-px bg-white/8" }),
                      lowestTier && tierColors[lowestTier] && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
                        /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-[10px] font-bold uppercase tracking-wider", children: "Worst" }),
                        /* @__PURE__ */ jsx("span", { className: `px-2.5 py-1 rounded-lg text-xs font-black border ${tierColors[lowestTier].bg} ${tierColors[lowestTier].text} ${tierColors[lowestTier].border}`, children: lowestTier })
                      ] })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
                    /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-gradient-to-r from-transparent to-white/8" }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [
                      /* @__PURE__ */ jsx("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", className: "opacity-50", children: /* @__PURE__ */ jsx(
                        "path",
                        {
                          d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
                          stroke: "currentColor",
                          strokeWidth: "2",
                          strokeLinejoin: "round"
                        }
                      ) }),
                      /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold tracking-[0.15em] uppercase", children: "Tier Placements" }),
                      /* @__PURE__ */ jsx("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", className: "opacity-50", children: /* @__PURE__ */ jsx(
                        "path",
                        {
                          d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
                          stroke: "currentColor",
                          strokeWidth: "2",
                          strokeLinejoin: "round"
                        }
                      ) })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-gradient-to-l from-transparent to-white/8" })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 sm:grid-cols-7 gap-3 justify-items-center", children: gamemodes$1.map((gm) => /* @__PURE__ */ jsx(GamemodeTile, { gm, tier: player.ranks[gm.key] }, gm.key)) })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/7 to-transparent" })
            ]
          }
        )
      }
    ),
    document.body
  );
}
function GamemodeIcon({ gm, tier }) {
  const [hovered, setHovered] = useState(false);
  const [iconError, setIconError] = useState(false);
  const ranked = tier && tier !== "None";
  const colors = ranked ? tierColors[tier] : null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "relative",
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            className: `w-9 h-9 rounded-xl flex items-center justify-center text-lg border-2 transition-all duration-200 cursor-default
          ${ranked && colors ? `${colors.bg} ${colors.border} hover:scale-110` : "bg-white/3 border-white/8 opacity-25"}`,
            style: ranked && hovered ? { boxShadow: "0 0 14px rgba(0,191,255,0.4)" } : void 0,
            children: !iconError && gm.icon ? /* @__PURE__ */ jsx(
              "img",
              {
                src: gm.icon,
                alt: gm.label,
                width: 18,
                height: 18,
                className: "w-[18px] h-[18px] object-contain",
                style: { imageRendering: "pixelated", filter: ranked && hovered ? "drop-shadow(0 0 4px rgba(0,191,255,0.6))" : "none" },
                onError: () => setIconError(true)
              }
            ) : gm.fallback
          }
        ),
        hovered && ranked && /* @__PURE__ */ jsxs("div", { className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150", children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "relative rounded-xl px-3.5 py-2.5 text-center whitespace-nowrap border shadow-2xl shadow-black/60",
              style: {
                background: "linear-gradient(135deg, rgba(8,16,32,0.98) 0%, rgba(0,24,52,0.98) 100%)",
                borderColor: "rgba(0,191,255,0.28)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,191,255,0.12)"
              },
              children: [
                /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#00BFFF]/50 to-transparent" }),
                /* @__PURE__ */ jsx("div", { className: "text-white text-xs font-bold leading-none", children: gm.label }),
                colors && /* @__PURE__ */ jsx("div", { className: `text-[11px] font-black mt-1.5 ${colors.text}`, children: /* @__PURE__ */ jsx("span", { className: `px-2 py-0.5 rounded-md border ${colors.bg} ${colors.border}`, children: tier }) })
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(
            "div",
            {
              className: "w-2 h-2 rotate-45 border-r border-b -mt-[5px]",
              style: { background: "rgba(0,24,52,0.98)", borderColor: "rgba(0,191,255,0.28)" }
            }
          ) })
        ] })
      ]
    }
  );
}
function PlayerCard({ player, totalPoints, overallRank, overallTier, gamemodes: gamemodes$1 = gamemodes }) {
  const [imgError, setImgError] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const overallColors = overallTier ? tierColors[overallTier] : null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      onClick: () => setShowProfile(true),
      role: "button",
      tabIndex: 0,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowProfile(true);
        }
      },
      className: "player-card glass rounded-2xl border border-white/5 hover:border-[#00BFFF]/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00BFFF]/5 group cursor-pointer",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 mb-3", children: [
          /* @__PURE__ */ jsx("div", { className: "relative flex-shrink-0", children: !imgError ? /* @__PURE__ */ jsx(
            "img",
            {
              src: player.head,
              alt: player.name,
              width: 44,
              height: 44,
              className: "rounded-lg ring-2 ring-white/10 group-hover:ring-[#00BFFF]/30 transition-all duration-300",
              onError: () => setImgError(true)
            }
          ) : /* @__PURE__ */ jsx("div", { className: "w-11 h-11 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-lg", children: "👤" }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-1", children: [
              /* @__PURE__ */ jsx("div", { className: "font-['Space_Grotesk'] font-semibold text-white text-sm leading-tight truncate", children: player.name }),
              totalPoints !== void 0 && /* @__PURE__ */ jsxs("span", { className: "flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-md bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20", children: [
                totalPoints,
                " pts"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [
              overallRank !== void 0 && /* @__PURE__ */ jsxs("span", { className: "text-gray-400 text-xs font-semibold", children: [
                "#",
                overallRank,
                " Overall"
              ] }),
              overallTier && overallColors && overallRank !== void 0 && /* @__PURE__ */ jsx("span", { className: "text-gray-700 text-xs", children: "·" }),
              overallTier && overallColors && /* @__PURE__ */ jsxs("span", { className: `text-xs font-semibold ${overallColors.text}`, children: [
                overallTier,
                " Avg"
              ] })
            ] }),
            overallRank === void 0 && /* @__PURE__ */ jsxs("div", { className: "text-gray-600 text-xs mt-0.5", children: [
              Object.values(player.ranks).filter((v) => v && v !== "None").length,
              " gamemodes"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: gamemodes$1.map((gm) => /* @__PURE__ */ jsx(
          GamemodeIcon,
          {
            gm,
            tier: player.ranks[gm.key]
          },
          gm.key
        )) }),
        showProfile && /* @__PURE__ */ jsx(
          PlayerProfileModal,
          {
            player,
            totalPoints,
            overallRank,
            overallTier,
            onClose: () => setShowProfile(false),
            gamemodes: gamemodes$1
          }
        )
      ]
    }
  );
}
const PLAYERS_PER_PAGE = 24;
function RankingsPage() {
  const loaderData = Route.useLoaderData();
  const [players, setPlayers] = useState(loaderData.players);
  const [gamemodes2, setGamemodes] = useState(loaderData.gamemodes);
  const {
    q
  } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortMode, setSortMode] = useState("points-desc");
  const [minTier, setMinTier] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFading, setIsFading] = useState(false);
  const [renderPage, setRenderPage] = useState(1);
  const rankingsSectionRef = useRef(null);
  useEffect(() => {
    let active = true;
    loadAllData().then((data) => {
      if (!active) return;
      if (data.players) setPlayers(data.players);
      if (data.gamemodes) setGamemodes(data.gamemodes);
    }).catch(() => {
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (q !== void 0) {
      setSearch(q);
      setTimeout(() => rankingsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      }), 150);
    }
  }, [q]);
  const globalRankings = useMemo(() => computeRankings(players), [players]);
  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeFilter !== "all" && (!p.ranks[activeFilter] || p.ranks[activeFilter] === "None")) return false;
      if (minTier !== "all") {
        const minVal = tierSortValue(minTier);
        const bestVal = activeFilter !== "all" ? tierSortValue(p.ranks[activeFilter]) : Math.min(...Object.values(p.ranks).filter(Boolean).map((t) => tierSortValue(t)));
        if (bestVal > minVal) return false;
      }
      return true;
    }).sort((a, b) => {
      const aInfo = globalRankings.get(a.name);
      const bInfo = globalRankings.get(b.name);
      if (sortMode === "points-desc") {
        if (activeFilter !== "all") {
          return tierSortValue(a.ranks[activeFilter]) - tierSortValue(b.ranks[activeFilter]);
        }
        return bInfo.totalPoints - aInfo.totalPoints;
      }
      if (sortMode === "points-asc") {
        if (activeFilter !== "all") {
          return tierSortValue(b.ranks[activeFilter]) - tierSortValue(a.ranks[activeFilter]);
        }
        return aInfo.totalPoints - bInfo.totalPoints;
      }
      if (sortMode === "name-asc") return a.name.localeCompare(b.name);
      if (sortMode === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });
  }, [search, activeFilter, sortMode, minTier, globalRankings]);
  useEffect(() => {
    setCurrentPage(1);
    setRenderPage(1);
  }, [search, activeFilter, sortMode, minTier]);
  const totalPages = Math.ceil(filtered.length / PLAYERS_PER_PAGE) || 1;
  const paginatedPlayers = useMemo(() => {
    const startIndex = (renderPage - 1) * PLAYERS_PER_PAGE;
    const endIndex = startIndex + PLAYERS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  }, [filtered, renderPage]);
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setIsFading(true);
    setCurrentPage(newPage);
    if (rankingsSectionRef.current) {
      rankingsSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
    setTimeout(() => {
      setRenderPage(newPage);
      setIsFading(false);
    }, 200);
  };
  const sortOptions = [{
    value: "points-desc",
    label: "Points (High → Low)"
  }, {
    value: "points-asc",
    label: "Points (Low → High)"
  }, {
    value: "name-asc",
    label: "Name (A → Z)"
  }, {
    value: "name-desc",
    label: "Name (Z → A)"
  }];
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Navbar, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative pt-8 pb-12 px-4 overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-blue-900/15 to-transparent pointer-events-none" }),
      /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto text-center relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-5 tracking-wide uppercase", children: [
          /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" }),
          "Live Rankings"
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "font-black text-4xl sm:text-5xl text-white mb-3", children: [
          "Player ",
          /* @__PURE__ */ jsx("span", { className: "text-gradient", children: "Rankings" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-white/40 max-w-md mx-auto text-sm", children: "Official tier placements for the Blue Tiers network." })
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "px-4 pb-6", children: /* @__PURE__ */ jsx("div", { className: "max-w-6xl mx-auto", children: /* @__PURE__ */ jsx("div", { className: "glass rounded-xl border border-white/5 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2 justify-center", children: [
      /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs font-semibold uppercase tracking-wide mr-2", children: "Tiers:" }),
      TIER_ORDER.map((tier) => {
        const colors = tierColors[tier];
        return /* @__PURE__ */ jsxs("span", { className: `px-3 py-1 rounded-lg text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`, children: [
          tier,
          /* @__PURE__ */ jsxs("span", { className: "ml-1 opacity-60 font-normal", children: [
            TIER_POINTS[tier],
            "pt"
          ] })
        ] }, tier);
      }),
      /* @__PURE__ */ jsx("span", { className: "px-3 py-1 rounded-lg text-xs font-bold border bg-white/3 text-gray-600 border-white/10", children: "Unranked" })
    ] }) }) }) }),
    /* @__PURE__ */ jsx("section", { ref: rankingsSectionRef, className: "px-4 pb-8 scroll-mt-24", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-gray-500", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
          /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "8" }),
          /* @__PURE__ */ jsx("path", { d: "m21 21-4.35-4.35" })
        ] }) }),
        /* @__PURE__ */ jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search player...", className: "w-full bg-white/3 border border-white/8 hover:border-white/15 focus:border-[#00BFFF]/50 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-gray-600 outline-none transition-all duration-200" }),
        search && /* @__PURE__ */ jsx("button", { onClick: () => setSearch(""), className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors", children: "✕" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs font-semibold uppercase tracking-wide", children: "Sort:" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: sortOptions.map((opt) => /* @__PURE__ */ jsx("button", { onClick: () => setSortMode(opt.value), className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${sortMode === opt.value ? "bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30" : "bg-white/3 text-gray-500 border border-white/8 hover:text-white hover:border-white/20"}`, children: opt.label }, opt.value)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 ml-auto", children: [
          /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs font-semibold uppercase tracking-wide", children: "Min Tier:" }),
          /* @__PURE__ */ jsxs("select", { value: minTier, onChange: (e) => setMinTier(e.target.value), className: "bg-white/3 border border-white/8 hover:border-white/15 focus:border-[#00BFFF]/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none transition-all duration-200 cursor-pointer", children: [
            /* @__PURE__ */ jsx("option", { value: "all", className: "bg-[#111827]", children: "All Tiers" }),
            TIER_ORDER.map((t) => /* @__PURE__ */ jsxs("option", { value: t, className: "bg-[#111827]", children: [
              t,
              "+"
            ] }, t))
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setActiveFilter("all"), className: `px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${activeFilter === "all" ? "bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30" : "bg-white/3 text-gray-500 border border-white/8 hover:text-white hover:border-white/20"}`, children: "All" }),
        gamemodes2.map((gm) => /* @__PURE__ */ jsxs("button", { onClick: () => setActiveFilter(gm.key), className: `flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${activeFilter === gm.key ? "bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30" : "bg-white/3 text-gray-500 border border-white/8 hover:text-white hover:border-white/20"}`, children: [
          /* @__PURE__ */ jsx("span", { children: gm.fallback }),
          gm.label
        ] }, gm.key))
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "px-4 pb-16", children: /* @__PURE__ */ jsx("div", { className: "max-w-6xl mx-auto", children: filtered.length > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-gray-600 text-xs mb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          "Showing ",
          Math.min(filtered.length, (currentPage - 1) * PLAYERS_PER_PAGE + 1),
          "-",
          Math.min(filtered.length, currentPage * PLAYERS_PER_PAGE),
          " of ",
          filtered.length,
          " player",
          filtered.length !== 1 ? "s" : "",
          " found",
          activeFilter !== "all" && ` in ${gamemodes2.find((g) => g.key === activeFilter)?.label}`
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          "Page ",
          currentPage,
          " of ",
          totalPages
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: `transition-opacity duration-200 ease-in-out ${isFading ? "opacity-0" : "opacity-100"}`, children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger", children: paginatedPlayers.map((player) => {
        const info = globalRankings.get(player.name);
        return /* @__PURE__ */ jsx(PlayerCard, { player, totalPoints: info?.totalPoints, overallRank: info?.rank, overallTier: info?.overallTier, gamemodes: gamemodes2 }, player.name);
      }) }) }),
      totalPages > 1 && /* @__PURE__ */ jsx("div", { className: "mt-12 flex justify-center", children: /* @__PURE__ */ jsxs("nav", { className: "glass flex items-center justify-between gap-1 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/5 shadow-lg shadow-black/40 relative overflow-hidden", "aria-label": "Pagination", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-[#00BFFF]/5 to-[#0066FF]/5 pointer-events-none" }),
        /* @__PURE__ */ jsx("button", { onClick: () => handlePageChange(1), disabled: currentPage === 1, className: "p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50", "aria-label": "Go to first page", children: /* @__PURE__ */ jsx(ChevronsLeft, { className: "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:-translate-x-1" }) }),
        /* @__PURE__ */ jsx("button", { onClick: () => handlePageChange(currentPage - 1), disabled: currentPage === 1, className: "p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50", "aria-label": "Go to previous page", children: /* @__PURE__ */ jsx(ChevronLeft, { className: "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:-translate-x-1" }) }),
        /* @__PURE__ */ jsxs("div", { className: "px-3 sm:px-6 py-1 mx-1 flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px] select-none text-center", children: [
          /* @__PURE__ */ jsx("span", { className: "text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider", children: "Rankings Navigation" }),
          /* @__PURE__ */ jsxs("span", { className: "font-['Space_Grotesk'] text-sm sm:text-base font-bold text-white mt-0.5", children: [
            "Page ",
            /* @__PURE__ */ jsx("span", { className: "text-gradient font-black", children: currentPage }),
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-gray-600 font-normal", children: "/" }),
            " ",
            totalPages
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => handlePageChange(currentPage + 1), disabled: currentPage === totalPages, className: "p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50", "aria-label": "Go to next page", children: /* @__PURE__ */ jsx(ChevronRight, { className: "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:translate-x-1" }) }),
        /* @__PURE__ */ jsx("button", { onClick: () => handlePageChange(totalPages), disabled: currentPage === totalPages, className: "p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50", "aria-label": "Go to last page", children: /* @__PURE__ */ jsx(ChevronsRight, { className: "w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:translate-x-1" }) })
      ] }) })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "text-center py-24", children: [
      /* @__PURE__ */ jsx("div", { className: "text-5xl mb-4", children: "🔍" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-lg font-semibold", children: "No players found" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-700 text-sm mt-1", children: "Try a different search or filter" }),
      /* @__PURE__ */ jsx("button", { onClick: () => {
        setSearch("");
        setActiveFilter("all");
        setMinTier("all");
      }, className: "mt-4 px-5 py-2 rounded-lg bg-[#00BFFF]/10 text-[#00BFFF] text-sm hover:bg-[#00BFFF]/20 transition-colors border border-[#00BFFF]/20", children: "Clear filters" })
    ] }) }) }),
    /* @__PURE__ */ jsx(Footer, {})
  ] });
}
export {
  RankingsPage as component
};
