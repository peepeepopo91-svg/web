import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { r as registerTeam, g as getTournamentData } from "./tournamentServer-BJqH0w6S.js";
import { S as STATUS_LABEL, b as STATUS_COLOR, M as MATCH_STATUS_LABEL } from "./tournament-BY9twqTI.js";
import { toJpeg } from "html-to-image";
import { N as Navbar } from "./Navbar-BmLqh_kL.js";
import "./router-4Yeb1nX_.js";
import "@tanstack/react-router";
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
import "./homepageStore-KPOXxduW.js";
import "./syncStore-C_ozCmAO.js";
import "lucide-react";
import "./HomepageBanners-Db1v9XpX.js";
import "react-dom";
function Countdown({ target, label }) {
  const [diff, setDiff] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1e3);
    return () => clearInterval(id);
  }, [target]);
  if (diff <= 0) return null;
  const d = Math.floor(diff / 864e5);
  const h = Math.floor(diff % 864e5 / 36e5);
  const m = Math.floor(diff % 36e5 / 6e4);
  const s = Math.floor(diff % 6e4 / 1e3);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-[0.25em] text-white/30 text-center", children: label }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-2 justify-center", children: [["D", d], ["H", h], ["M", m], ["S", s]].map(([unit, val]) => /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center", children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "relative w-14 h-14 flex items-center justify-center rounded-xl font-black text-2xl tabular-nums font-['Space_Grotesk'] text-white",
          style: {
            background: "linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(0,102,255,0.06) 100%)",
            border: "1px solid rgba(0,191,255,0.25)",
            boxShadow: "0 0 18px rgba(0,191,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)"
          },
          children: String(val).padStart(2, "0")
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "text-[9px] text-white/25 uppercase tracking-widest mt-1.5", children: unit })
    ] }, unit)) })
  ] });
}
const PLACEMENT_STYLES$1 = {
  1: { glow: "rgba(255,196,0,0.15)", border: "rgba(255,196,0,0.35)", bg: "rgba(255,196,0,0.07)", text: "#FFD700", label: "1ST" },
  2: { glow: "rgba(192,192,192,0.12)", border: "rgba(192,192,192,0.3)", bg: "rgba(192,192,192,0.05)", text: "#C0C0C0", label: "2ND" },
  3: { glow: "rgba(205,127,50,0.12)", border: "rgba(205,127,50,0.3)", bg: "rgba(205,127,50,0.06)", text: "#CD7F32", label: "3RD" }
};
function TournamentHome({ active, onRegisterClick: _onRegisterClick }) {
  if (!active) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-40 text-center", children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6",
          style: {
            background: "linear-gradient(135deg, rgba(0,191,255,0.08), rgba(0,102,255,0.04))",
            border: "1px solid rgba(0,191,255,0.15)"
          },
          children: "🏆"
        }
      ),
      /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-2xl text-white mb-3", children: "No Active Tournament" }),
      /* @__PURE__ */ jsx("p", { className: "text-white/30 max-w-md text-sm leading-relaxed", children: "There are currently no active tournaments. Check the Announcements tab or come back soon." })
    ] });
  }
  const approvedTeams = active.teams.filter((t) => t.status === "approved");
  const totalPlayers = approvedTeams.reduce((n, t) => n + t.players.length, 0);
  const canRegister = active.status === "registration_open" || active.status === "live";
  const deadline = active.registrationDeadline;
  const start = active.startDate;
  const statCards = [
    { label: "Teams", value: approvedTeams.length, icon: "👥", accent: "#00BFFF" },
    { label: "Players", value: totalPlayers, icon: "⚔️", accent: "#0099FF" },
    { label: "Gamemode", value: active.gamemode || "—", icon: "🎮", accent: "#00BFFF" },
    {
      label: "Team Size",
      value: active.maxTeamSize === active.minTeamSize ? `${active.maxTeamSize}v${active.maxTeamSize}` : `${active.minTeamSize}–${active.maxTeamSize}`,
      icon: "🧩",
      accent: "#0099FF"
    }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "relative rounded-2xl overflow-hidden",
        style: {
          background: "linear-gradient(135deg, #080D18 0%, #0D1525 50%, #080D18 100%)",
          border: "1px solid rgba(0,191,255,0.15)",
          boxShadow: "0 0 60px rgba(0,191,255,0.06), 0 32px 64px rgba(0,0,0,0.5)"
        },
        children: [
          active.banner && /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute inset-0 bg-cover bg-center",
              style: { backgroundImage: `url(${active.banner})`, opacity: 0.08 }
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute inset-0 pointer-events-none",
              style: { background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,191,255,0.1) 0%, transparent 70%)" }
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute top-0 inset-x-0 h-px",
              style: { background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)" }
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "relative px-8 md:px-14 py-12 text-center space-y-6", children: [
            /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs("div", { className: `inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${STATUS_COLOR[active.status]}`, children: [
              active.status === "live" && /* @__PURE__ */ jsxs("span", { className: "relative flex h-2 w-2", children: [
                /* @__PURE__ */ jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" }),
                /* @__PURE__ */ jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-red-400" })
              ] }),
              STATUS_LABEL[active.status]
            ] }) }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
              /* @__PURE__ */ jsx(
                "h2",
                {
                  className: "font-['Space_Grotesk'] font-black text-3xl md:text-5xl text-white leading-tight tracking-tight",
                  children: active.name
                }
              ),
              active.description && /* @__PURE__ */ jsx("p", { className: "text-white/35 max-w-lg mx-auto text-sm leading-relaxed", children: active.description })
            ] }),
            deadline && canRegister && /* @__PURE__ */ jsx(Countdown, { target: deadline, label: "Registration closes in" }),
            start && (active.status === "upcoming" || canRegister || active.status === "registration_closed") && /* @__PURE__ */ jsx(Countdown, { target: start, label: "Tournament starts in" }),
            active.serverIp && /* @__PURE__ */ jsx("div", { className: "flex justify-center pt-1", children: /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => navigator.clipboard.writeText(active.serverIp),
                className: "group flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-mono font-medium transition-all",
                style: {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.55)"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(0,191,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(0,191,255,0.3)";
                  e.currentTarget.style.color = "#fff";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                },
                children: [
                  /* @__PURE__ */ jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }),
                    /* @__PURE__ */ jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })
                  ] }),
                  active.serverIp
                ]
              }
            ) })
          ] }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute bottom-0 inset-x-0 h-20 pointer-events-none",
              style: { background: "linear-gradient(to top, rgba(8,13,24,0.6), transparent)" }
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: statCards.map((c) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: "relative rounded-xl p-5 text-center overflow-hidden",
        style: {
          background: "linear-gradient(135deg, rgba(0,191,255,0.05) 0%, rgba(0,0,0,0) 100%)",
          border: "1px solid rgba(0,191,255,0.12)"
        },
        children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute top-0 inset-x-0 h-px",
              style: { background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)" }
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "text-xl mb-2", children: c.icon }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "font-['Space_Grotesk'] font-black text-xl",
              style: { color: c.accent },
              children: c.value
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "text-white/30 text-[10px] uppercase tracking-widest mt-1", children: c.label })
        ]
      },
      c.label
    )) }),
    /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "rounded-xl p-6 space-y-5",
          style: {
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)"
          },
          children: [
            /* @__PURE__ */ jsx(
              "h3",
              {
                className: "text-[10px] uppercase tracking-[0.2em] font-bold",
                style: { background: "linear-gradient(90deg,#00BFFF,#0099FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
                children: "Tournament Details"
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "space-y-3", children: [
              { label: "Status", value: STATUS_LABEL[active.status] },
              { label: "Gamemode", value: active.gamemode || "—" },
              { label: "Server IP", value: active.serverIp || "—" },
              {
                label: "Team Size",
                value: active.maxTeamSize === active.minTeamSize ? `${active.maxTeamSize} players` : `${active.minTeamSize}–${active.maxTeamSize} players`
              },
              { label: "Prize Pool", value: active.prizePool || "—" },
              ...deadline ? [{ label: "Reg. Deadline", value: new Date(deadline).toLocaleString() }] : [],
              ...start ? [{ label: "Start Date", value: new Date(start).toLocaleString() }] : []
            ].map(({ label, value }) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
              /* @__PURE__ */ jsx("span", { className: "text-white/30 text-xs shrink-0", children: label }),
              /* @__PURE__ */ jsx("div", { className: "flex-1 border-b border-dashed border-white/[0.06]" }),
              /* @__PURE__ */ jsx("span", { className: "text-white text-xs font-semibold shrink-0", children: value })
            ] }, label)) })
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "rounded-xl p-6 space-y-5",
          style: {
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)"
          },
          children: [
            /* @__PURE__ */ jsx(
              "h3",
              {
                className: "text-[10px] uppercase tracking-[0.2em] font-bold",
                style: { background: "linear-gradient(90deg,#00BFFF,#0099FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
                children: "Top Prizes"
              }
            ),
            active.prizes.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-white/20 text-xs", children: "Prizes will be announced soon." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2.5", children: active.prizes.slice(0, 3).map((prize) => {
              const s = PLACEMENT_STYLES$1[prize.placement] ?? PLACEMENT_STYLES$1[3];
              const parts = prize.label.split(" ");
              const emoji = parts[0];
              const name = parts.slice(1).join(" ");
              return /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "flex items-center gap-3 px-4 py-3 rounded-xl",
                  style: {
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    boxShadow: `0 0 20px ${s.glow}`
                  },
                  children: [
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                        style: { background: `${s.text}18`, color: s.text, border: `1px solid ${s.border}` },
                        children: s.label
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                      /* @__PURE__ */ jsxs("p", { className: "text-white text-xs font-bold", children: [
                        emoji,
                        " ",
                        name
                      ] }),
                      /* @__PURE__ */ jsx("p", { className: "text-white/35 text-[10px] mt-0.5 truncate", children: prize.rewards.map((r) => `${r.amount} ${r.label}`).join(" + ") })
                    ] })
                  ]
                },
                prize.placement
              );
            }) })
          ]
        }
      )
    ] }),
    approvedTeams.length > 0 && /* @__PURE__ */ jsxs(
      "div",
      {
        className: "rounded-xl p-6 space-y-5",
        style: {
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)"
        },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx(
              "h3",
              {
                className: "text-[10px] uppercase tracking-[0.2em] font-bold",
                style: { background: "linear-gradient(90deg,#00BFFF,#0099FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
                children: "Competing Teams"
              }
            ),
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "text-[10px] font-bold px-2.5 py-1 rounded-full",
                style: { background: "rgba(0,191,255,0.1)", border: "1px solid rgba(0,191,255,0.2)", color: "#00BFFF" },
                children: approvedTeams.length
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: approvedTeams.map((team, idx) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "group rounded-xl overflow-hidden transition-all duration-200",
              style: {
                background: "linear-gradient(135deg, rgba(0,191,255,0.04) 0%, rgba(0,0,0,0) 100%)",
                border: "1px solid rgba(0,191,255,0.1)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)"
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.borderColor = "rgba(0,191,255,0.28)";
                e.currentTarget.style.boxShadow = "0 4px 32px rgba(0,191,255,0.08)";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.borderColor = "rgba(0,191,255,0.1)";
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.3)";
              },
              children: [
                /* @__PURE__ */ jsx("div", { className: "h-px w-full", style: { background: "linear-gradient(90deg, transparent, rgba(0,191,255,0.35), transparent)" } }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-4 pt-4 pb-3", children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                      style: {
                        background: "linear-gradient(135deg, rgba(0,191,255,0.2), rgba(0,102,255,0.12))",
                        border: "1px solid rgba(0,191,255,0.3)",
                        color: "#00BFFF",
                        textShadow: "0 0 12px rgba(0,191,255,0.6)"
                      },
                      children: team.name.slice(0, 2).toUpperCase()
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsx("p", { className: "text-white text-sm font-bold truncate", children: team.name }),
                    /* @__PURE__ */ jsxs("p", { className: "text-white/30 text-[10px] uppercase tracking-widest mt-0.5", children: [
                      team.players.length,
                      " player",
                      team.players.length !== 1 ? "s" : ""
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs(
                    "span",
                    {
                      className: "text-[9px] font-black tabular-nums shrink-0 px-1.5 py-0.5 rounded",
                      style: { background: "rgba(0,191,255,0.08)", border: "1px solid rgba(0,191,255,0.15)", color: "rgba(0,191,255,0.5)" },
                      children: [
                        "#",
                        idx + 1
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx("div", { className: "mx-4 h-px", style: { background: "rgba(255,255,255,0.05)" } }),
                /* @__PURE__ */ jsx("div", { className: "px-4 py-3 space-y-1.5", children: team.players.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-white/20 text-[11px] italic", children: "No players listed" }) : team.players.map((player, pi) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: `https://mc-heads.net/avatar/${encodeURIComponent(typeof player === "string" ? player : player.name ?? "")}/16`,
                      alt: "",
                      width: 16,
                      height: 16,
                      className: "w-4 h-4 rounded shrink-0",
                      style: { imageRendering: "pixelated" },
                      onError: (e) => {
                        e.currentTarget.style.display = "none";
                      }
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: "text-white/70 text-[11px] font-medium truncate", children: typeof player === "string" ? player : player.name ?? "—" })
                ] }, pi)) })
              ]
            },
            team.id
          )) })
        ]
      }
    )
  ] });
}
function MatchDetailModal({ match, teams, onClose }) {
  const t1 = teams.find((t) => t.id === match.team1Id);
  const t2 = teams.find((t) => t.id === match.team2Id);
  const fields = [
    ["Match #", String(match.matchNumber)],
    ["Bracket", match.bracketSide.replace("_", " ")],
    ["Round", String(match.round + 1)],
    ["Status", MATCH_STATUS_LABEL[match.status]],
    ["Gamemode", match.gamemode || "—"],
    ["Arena", match.arena || "—"],
    ["Referee", match.referee || "—"],
    ["Scheduled", match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : "—"],
    ["Completed", match.completedAt ? new Date(match.completedAt).toLocaleString() : "—"]
  ];
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-lg", children: "Match Details" }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "text-gray-600 hover:text-white transition-colors text-xl", children: "✕" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-6", children: [
      /* @__PURE__ */ jsx("div", { className: "bg-[#0B0F17] rounded-xl p-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4", children: [
        /* @__PURE__ */ jsx(TeamSide, { team: t1, score: match.score1, winner: match.winnerId === match.team1Id }),
        /* @__PURE__ */ jsx("div", { className: "text-gray-600 font-bold text-sm uppercase tracking-widest", children: "VS" }),
        /* @__PURE__ */ jsx(TeamSide, { team: t2, score: match.score2, winner: match.winnerId === match.team2Id, align: "right" })
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2", children: fields.map(([label, value]) => /* @__PURE__ */ jsxs("div", { className: "bg-white/3 rounded-lg px-3 py-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-[10px] uppercase tracking-wider", children: label }),
        /* @__PURE__ */ jsx("p", { className: "text-white text-xs font-medium capitalize mt-0.5", children: value })
      ] }, label)) }),
      /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 gap-4", children: [t1, t2].map((team, idx) => team && /* @__PURE__ */ jsxs("div", { className: "bg-white/3 rounded-xl p-4 space-y-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-gray-400 text-xs font-bold uppercase tracking-wider", children: team.name }),
        team.players.map((p) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            "img",
            {
              src: `https://mc-heads.net/avatar/${p}/16`,
              onError: (e) => {
                e.target.style.display = "none";
              },
              className: "w-4 h-4 rounded-sm",
              alt: ""
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "text-white text-xs", children: p }),
          p === team.captain && /* @__PURE__ */ jsx("span", { className: "text-[9px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded", children: "Captain" })
        ] }, p))
      ] }, idx)) }),
      match.notes && /* @__PURE__ */ jsxs("div", { className: "bg-[#00BFFF]/5 border border-[#00BFFF]/10 rounded-xl p-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-gray-400 text-xs font-bold uppercase tracking-wider mb-2", children: "Notes" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-300 text-sm", children: match.notes })
      ] }),
      match.replayLink && /* @__PURE__ */ jsx(
        "a",
        {
          href: match.replayLink,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-[#00BFFF] font-medium transition-all",
          children: "🎬 View Replay →"
        }
      )
    ] })
  ] }) });
}
function TeamSide({ team, score, winner, align = "left" }) {
  return /* @__PURE__ */ jsxs("div", { className: `flex-1 ${align === "right" ? "text-right" : "text-left"}`, children: [
    /* @__PURE__ */ jsx("p", { className: `font-['Space_Grotesk'] font-black text-3xl ${winner ? "text-[#00BFFF]" : "text-white"}`, children: score }),
    /* @__PURE__ */ jsx("p", { className: `text-sm font-semibold mt-1 ${winner ? "text-white" : "text-gray-400"}`, children: team?.name ?? /* @__PURE__ */ jsx("span", { className: "italic text-gray-600", children: "TBD" }) }),
    winner && /* @__PURE__ */ jsx("p", { className: "text-[10px] text-[#00BFFF] font-bold mt-0.5 uppercase tracking-wider", children: "Winner ✓" })
  ] });
}
const CARD_W = 172;
const CARD_H = 86;
const CONN_W = 40;
const SLOT_H = 108;
const LABEL_H = 24;
const LABEL_MB = 8;
const OUTER_PAD = 24;
const colHeight = (n) => n * SLOT_H;
const matchCY = (i, total, colH) => colH / total * i + colH / total / 2;
const matchTop = (i, total, colH) => colH / total * i + (colH / total - CARD_H) / 2;
const THEMES = [
  {
    id: "esports",
    name: "Esports",
    icon: "⚔️",
    containerBg: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(245,158,11,.05) 0%, rgba(14,21,34,.92) 55%, rgba(9,13,21,.97) 100%)",
    containerBorder: "rgba(245,158,11,.08)",
    cardBg: "linear-gradient(135deg,rgba(14,21,34,.97),rgba(9,13,21,.99))",
    cardBgLive: "linear-gradient(135deg,rgba(30,8,8,.97),rgba(18,5,5,.99))",
    cardBorderNormal: "rgba(255,255,255,.08)",
    cardBorderLive: "rgba(239,68,68,.45)",
    cardBorderDone: "rgba(34,197,94,.25)",
    cardShadowLive: "0 0 18px rgba(239,68,68,.18)",
    cardRadius: 10,
    winnerColor: "#86efac",
    loserColor: "rgba(255,255,255,.5)",
    tbdColor: "rgba(255,255,255,.2)",
    winnerScoreColor: "#4ade80",
    loserScoreColor: "rgba(255,255,255,.18)",
    dividerColor: "rgba(255,255,255,.05)",
    statusLive: "#ef4444",
    statusDone: "rgba(34,197,94,.75)",
    statusPending: "rgba(255,255,255,.18)",
    liveBarGrad: "linear-gradient(90deg,transparent,#ef4444,transparent)",
    connColor: "rgba(245,158,11,.38)",
    connColorFaint: "rgba(245,158,11,.18)",
    connDot: "rgba(245,158,11,.6)",
    labelBg: "rgba(245,158,11,.08)",
    labelBorder: "rgba(245,158,11,.22)",
    labelColor: "rgba(245,158,11,.85)",
    finalsRingBg: "radial-gradient(circle,rgba(245,158,11,.14) 0%,transparent 100%)",
    finalsRingBorder: "rgba(245,158,11,.28)",
    pillActive: "rgba(245,158,11,.18)",
    pillText: "rgba(245,158,11,.9)"
  },
  {
    id: "blue",
    name: "Blue Network",
    icon: "🌐",
    containerBg: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,191,255,.05) 0%, rgba(11,15,23,.92) 55%, rgba(7,10,17,.97) 100%)",
    containerBorder: "rgba(0,191,255,.1)",
    cardBg: "linear-gradient(135deg,rgba(11,18,30,.97),rgba(7,11,20,.99))",
    cardBgLive: "linear-gradient(135deg,rgba(28,8,8,.97),rgba(18,5,5,.99))",
    cardBorderNormal: "rgba(0,191,255,.1)",
    cardBorderLive: "rgba(239,68,68,.45)",
    cardBorderDone: "rgba(34,197,94,.25)",
    cardShadowLive: "0 0 18px rgba(239,68,68,.18)",
    cardRadius: 10,
    winnerColor: "#7dd3fc",
    loserColor: "rgba(255,255,255,.5)",
    tbdColor: "rgba(255,255,255,.2)",
    winnerScoreColor: "#00bfff",
    loserScoreColor: "rgba(255,255,255,.18)",
    dividerColor: "rgba(0,191,255,.06)",
    statusLive: "#ef4444",
    statusDone: "rgba(34,197,94,.75)",
    statusPending: "rgba(255,255,255,.18)",
    liveBarGrad: "linear-gradient(90deg,transparent,#ef4444,transparent)",
    connColor: "rgba(0,191,255,.35)",
    connColorFaint: "rgba(0,191,255,.12)",
    connDot: "rgba(0,191,255,.65)",
    labelBg: "rgba(0,191,255,.07)",
    labelBorder: "rgba(0,191,255,.2)",
    labelColor: "rgba(0,191,255,.85)",
    finalsRingBg: "radial-gradient(circle,rgba(0,191,255,.12) 0%,transparent 100%)",
    finalsRingBorder: "rgba(0,191,255,.3)",
    pillActive: "rgba(0,191,255,.15)",
    pillText: "#00bfff"
  },
  {
    id: "neon",
    name: "Neon",
    icon: "⚡",
    containerBg: "linear-gradient(180deg,rgba(5,6,10,.99) 0%,rgba(3,4,8,1) 100%)",
    containerBorder: "rgba(0,255,200,.08)",
    cardBg: "linear-gradient(135deg,rgba(5,12,25,.98),rgba(3,8,18,.99))",
    cardBgLive: "linear-gradient(135deg,rgba(18,3,28,.97),rgba(12,2,20,.99))",
    cardBorderNormal: "rgba(0,255,200,.14)",
    cardBorderLive: "rgba(255,50,180,.55)",
    cardBorderDone: "rgba(0,255,120,.3)",
    cardShadowLive: "0 0 20px rgba(255,50,180,.2)",
    cardRadius: 8,
    winnerColor: "#00ff88",
    loserColor: "rgba(200,220,255,.5)",
    tbdColor: "rgba(100,150,200,.22)",
    winnerScoreColor: "#00ff88",
    loserScoreColor: "rgba(100,150,200,.18)",
    dividerColor: "rgba(0,255,200,.06)",
    statusLive: "#ff32b4",
    statusDone: "rgba(0,255,120,.75)",
    statusPending: "rgba(100,150,200,.25)",
    liveBarGrad: "linear-gradient(90deg,transparent,#ff32b4,transparent)",
    connColor: "rgba(0,255,200,.42)",
    connColorFaint: "rgba(0,255,200,.15)",
    connDot: "rgba(0,255,200,.75)",
    labelBg: "rgba(0,255,200,.06)",
    labelBorder: "rgba(0,255,200,.22)",
    labelColor: "rgba(0,255,200,.9)",
    finalsRingBg: "radial-gradient(circle,rgba(0,255,200,.1) 0%,transparent 100%)",
    finalsRingBorder: "rgba(0,255,200,.3)",
    pillActive: "rgba(0,255,200,.12)",
    pillText: "rgba(0,255,200,.95)"
  },
  {
    id: "championship",
    name: "Championship",
    icon: "🏆",
    containerBg: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(212,175,55,.04) 0%, rgba(10,9,6,.93) 55%, rgba(7,6,3,.98) 100%)",
    containerBorder: "rgba(212,175,55,.1)",
    cardBg: "linear-gradient(135deg,rgba(20,16,8,.97),rgba(13,10,4,.99))",
    cardBgLive: "linear-gradient(135deg,rgba(30,8,6,.97),rgba(20,5,4,.99))",
    cardBorderNormal: "rgba(212,175,55,.12)",
    cardBorderLive: "rgba(239,68,68,.4)",
    cardBorderDone: "rgba(212,175,55,.35)",
    cardShadowLive: "0 0 18px rgba(239,68,68,.18)",
    cardRadius: 6,
    winnerColor: "#ffd700",
    loserColor: "rgba(212,175,55,.55)",
    tbdColor: "rgba(212,175,55,.2)",
    winnerScoreColor: "#ffd700",
    loserScoreColor: "rgba(212,175,55,.18)",
    dividerColor: "rgba(212,175,55,.07)",
    statusLive: "#ef4444",
    statusDone: "rgba(212,175,55,.8)",
    statusPending: "rgba(212,175,55,.22)",
    liveBarGrad: "linear-gradient(90deg,transparent,#ef4444,transparent)",
    connColor: "rgba(212,175,55,.4)",
    connColorFaint: "rgba(212,175,55,.15)",
    connDot: "rgba(212,175,55,.65)",
    labelBg: "rgba(212,175,55,.08)",
    labelBorder: "rgba(212,175,55,.25)",
    labelColor: "rgba(212,175,55,.88)",
    finalsRingBg: "radial-gradient(circle,rgba(212,175,55,.14) 0%,transparent 100%)",
    finalsRingBorder: "rgba(212,175,55,.3)",
    pillActive: "rgba(212,175,55,.15)",
    pillText: "rgba(212,175,55,.9)"
  },
  {
    id: "minimal",
    name: "Minimal",
    icon: "◻",
    containerBg: "#0d1117",
    containerBorder: "#21262d",
    cardBg: "#161b22",
    cardBgLive: "#1c1014",
    cardBorderNormal: "#30363d",
    cardBorderLive: "rgba(239,68,68,.5)",
    cardBorderDone: "rgba(63,185,80,.4)",
    cardShadowLive: "0 0 12px rgba(239,68,68,.12)",
    cardRadius: 8,
    winnerColor: "#3fb950",
    loserColor: "#8b949e",
    tbdColor: "#484f58",
    winnerScoreColor: "#3fb950",
    loserScoreColor: "#484f58",
    dividerColor: "#21262d",
    statusLive: "#f85149",
    statusDone: "#3fb950",
    statusPending: "#484f58",
    liveBarGrad: "linear-gradient(90deg,transparent,#f85149,transparent)",
    connColor: "#30363d",
    connColorFaint: "#21262d",
    connDot: "#58a6ff",
    labelBg: "rgba(88,166,255,.07)",
    labelBorder: "rgba(88,166,255,.2)",
    labelColor: "#58a6ff",
    finalsRingBg: "radial-gradient(circle,rgba(88,166,255,.1) 0%,transparent 100%)",
    finalsRingBorder: "rgba(88,166,255,.3)",
    pillActive: "rgba(88,166,255,.15)",
    pillText: "#58a6ff"
  }
];
function getTheme(id) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
function useAutoScale(naturalW) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(9999);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = naturalW > 0 ? Math.min(1, (containerW - OUTER_PAD * 2) / naturalW) : 1;
  return { containerRef, scale, containerW };
}
function TeamRow({ team, score, winner, rtl, theme }) {
  return /* @__PURE__ */ jsxs("div", { style: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    flexDirection: rtl ? "row-reverse" : "row",
    justifyContent: "space-between"
  }, children: [
    /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      flex: 1,
      minWidth: 0,
      flexDirection: rtl ? "row-reverse" : "row"
    }, children: [
      /* @__PURE__ */ jsx(
        "img",
        {
          src: `https://mc-heads.net/avatar/${team?.captain ?? "Steve"}/14`,
          alt: "",
          onError: (e) => {
            e.target.style.opacity = "0.1";
          },
          style: {
            width: 14,
            height: 14,
            borderRadius: 3,
            flexShrink: 0,
            filter: winner ? "drop-shadow(0 0 5px rgba(34,197,94,.7)) drop-shadow(0 0 2px rgba(34,197,94,.4))" : team ? "drop-shadow(0 0 3px rgba(0,191,255,.35)) brightness(1.05)" : "opacity(.25)"
          }
        }
      ),
      team ? /* @__PURE__ */ jsxs("span", { style: {
        fontSize: 10.5,
        fontWeight: winner ? 700 : 600,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: 88,
        background: winner ? "linear-gradient(90deg, #22c55e, #86efac)" : "linear-gradient(90deg, #00BFFF, #60a5fa)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        fontFamily: "'Space Grotesk',sans-serif",
        letterSpacing: "0.01em"
      }, children: [
        winner ? "👑 " : "",
        team.name
      ] }) : /* @__PURE__ */ jsx("span", { style: {
        fontSize: 10.5,
        fontWeight: 400,
        fontStyle: "italic",
        maxWidth: 112,
        color: theme.tbdColor,
        fontFamily: "'Space Grotesk',sans-serif"
      }, children: "TBD" })
    ] }),
    /* @__PURE__ */ jsx("span", { style: {
      fontSize: 14,
      fontWeight: 900,
      flexShrink: 0,
      minWidth: 18,
      textAlign: "right",
      color: winner ? theme.winnerScoreColor : theme.loserScoreColor,
      fontFamily: "'Space Grotesk',sans-serif",
      textShadow: winner ? `0 0 10px ${theme.winnerScoreColor}55` : "none"
    }, children: score })
  ] });
}
function MatchCard({ match, teams, onClick, rtl = false, theme }) {
  const [hover, setHover] = useState(false);
  const t1 = teams.find((t) => t.id === match.team1Id);
  const t2 = teams.find((t) => t.id === match.team2Id);
  const live = match.status === "live";
  const done = match.status === "completed";
  const borderColor = live ? theme.cardBorderLive : done ? theme.cardBorderDone : theme.cardBorderNormal;
  const shadow = [
    live ? theme.cardShadowLive : "",
    hover ? `0 4px 20px rgba(0,0,0,.4)` : ""
  ].filter(Boolean).join(", ");
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        width: CARD_W,
        display: "block",
        textAlign: "left",
        cursor: "pointer",
        background: live ? theme.cardBgLive : theme.cardBg,
        border: `1.5px solid ${hover ? borderColor.replace(/[\d.]+\)$/, (s) => String(Math.min(1, parseFloat(s) * 2) + ")")) : borderColor}`,
        borderRadius: theme.cardRadius,
        padding: "7px 9px",
        boxShadow: shadow,
        transition: "all .18s ease",
        position: "relative",
        overflow: "hidden",
        transform: hover ? "translateY(-1px)" : "none"
      },
      children: [
        live && /* @__PURE__ */ jsx("div", { style: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: theme.liveBarGrad,
          animation: "bt-pbar 2s ease-in-out infinite"
        } }),
        /* @__PURE__ */ jsx(TeamRow, { team: t1, score: match.score1, winner: match.winnerId !== null && match.winnerId === match.team1Id, rtl, theme }),
        /* @__PURE__ */ jsx("div", { style: { height: 1, background: theme.dividerColor, margin: "5px 0" } }),
        /* @__PURE__ */ jsx(TeamRow, { team: t2, score: match.score2, winner: match.winnerId !== null && match.winnerId === match.team2Id, rtl, theme }),
        /* @__PURE__ */ jsx("div", { style: { marginTop: 5, display: "flex", alignItems: "center" }, children: /* @__PURE__ */ jsx("span", { style: {
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: "0.07em",
          color: live ? theme.statusLive : done ? theme.statusDone : theme.statusPending
        }, children: live ? "● LIVE" : MATCH_STATUS_LABEL[match.status].toUpperCase() }) })
      ]
    }
  );
}
function RoundColumn({ name, matches, teams, onSelect, rtl = false, colH, theme, showLabel }) {
  return /* @__PURE__ */ jsx("div", { style: { flexShrink: 0 }, children: /* @__PURE__ */ jsxs("div", { style: { position: "relative", width: CARD_W, height: colH + LABEL_H + LABEL_MB }, children: [
    showLabel && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ jsx("div", { style: {
      padding: "2px 10px",
      height: LABEL_H,
      display: "flex",
      alignItems: "center",
      background: theme.labelBg,
      border: `1px solid ${theme.labelBorder}`,
      borderRadius: 20,
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: "0.12em",
      color: theme.labelColor,
      textTransform: "uppercase",
      whiteSpace: "nowrap"
    }, children: name }) }),
    matches.map((m, i) => /* @__PURE__ */ jsx("div", { style: {
      position: "absolute",
      top: matchTop(i, matches.length, colH) + LABEL_H + LABEL_MB,
      left: 0
    }, children: /* @__PURE__ */ jsx(
      MatchCard,
      {
        match: m,
        teams,
        onClick: () => onSelect(m),
        rtl,
        theme
      }
    ) }, m.id))
  ] }) });
}
function Connector({ leftCount, rightCount, colH, offsetTop, theme, connId }) {
  if (!leftCount || !rightCount) return null;
  const W = CONN_W;
  const lCY = (i) => matchCY(i, leftCount, colH);
  const rCY = (i) => matchCY(i, rightCount, colH);
  const filterId = `bt-glow-${connId}`;
  const segs = [];
  if (leftCount === rightCount) {
    for (let i = 0; i < leftCount; i++) segs.push(
      /* @__PURE__ */ jsxs("g", { children: [
        /* @__PURE__ */ jsx("line", { x1: 0, y1: lCY(i), x2: W, y2: rCY(i), stroke: theme.connColor, strokeWidth: "1.4" }),
        /* @__PURE__ */ jsx("circle", { cx: 0, cy: lCY(i), r: 2, fill: theme.connDot }),
        /* @__PURE__ */ jsx("circle", { cx: W, cy: rCY(i), r: 2, fill: theme.connDot })
      ] }, i)
    );
  } else if (leftCount > rightCount) {
    for (let ri = 0; ri < rightCount; ri++) {
      const li1 = ri * 2, li2 = ri * 2 + 1;
      if (li2 >= leftCount) {
        segs.push(/* @__PURE__ */ jsx(
          "line",
          {
            x1: 0,
            y1: lCY(li1),
            x2: W,
            y2: rCY(ri),
            stroke: theme.connColor,
            strokeWidth: "1.4"
          },
          `s${ri}`
        ));
        continue;
      }
      const midX = W * 0.55, midY = (lCY(li1) + lCY(li2)) / 2;
      segs.push(
        /* @__PURE__ */ jsxs("g", { children: [
          /* @__PURE__ */ jsx("line", { x1: 0, y1: lCY(li1), x2: midX, y2: lCY(li1), stroke: theme.connColor, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("line", { x1: 0, y1: lCY(li2), x2: midX, y2: lCY(li2), stroke: theme.connColor, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("line", { x1: midX, y1: lCY(li1), x2: midX, y2: lCY(li2), stroke: theme.connColorFaint, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("line", { x1: midX, y1: midY, x2: W, y2: rCY(ri), stroke: theme.connColor, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("circle", { cx: midX, cy: midY, r: 2.5, fill: theme.connDot }),
          /* @__PURE__ */ jsx("circle", { cx: 0, cy: lCY(li1), r: 1.6, fill: theme.connDot, style: { opacity: 0.6 } }),
          /* @__PURE__ */ jsx("circle", { cx: 0, cy: lCY(li2), r: 1.6, fill: theme.connDot, style: { opacity: 0.6 } })
        ] }, ri)
      );
    }
  } else {
    for (let li = 0; li < leftCount; li++) {
      const ri1 = li * 2, ri2 = li * 2 + 1;
      if (ri2 >= rightCount) {
        segs.push(/* @__PURE__ */ jsx(
          "line",
          {
            x1: 0,
            y1: lCY(li),
            x2: W,
            y2: rCY(ri1),
            stroke: theme.connColor,
            strokeWidth: "1.4"
          },
          `s${li}`
        ));
        continue;
      }
      const midX = W * 0.45, midY = (rCY(ri1) + rCY(ri2)) / 2;
      segs.push(
        /* @__PURE__ */ jsxs("g", { children: [
          /* @__PURE__ */ jsx("line", { x1: W, y1: rCY(ri1), x2: midX, y2: rCY(ri1), stroke: theme.connColor, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("line", { x1: W, y1: rCY(ri2), x2: midX, y2: rCY(ri2), stroke: theme.connColor, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("line", { x1: midX, y1: rCY(ri1), x2: midX, y2: rCY(ri2), stroke: theme.connColorFaint, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("line", { x1: midX, y1: midY, x2: 0, y2: lCY(li), stroke: theme.connColor, strokeWidth: "1.4" }),
          /* @__PURE__ */ jsx("circle", { cx: midX, cy: midY, r: 2.5, fill: theme.connDot }),
          /* @__PURE__ */ jsx("circle", { cx: W, cy: rCY(ri1), r: 1.6, fill: theme.connDot, style: { opacity: 0.6 } }),
          /* @__PURE__ */ jsx("circle", { cx: W, cy: rCY(ri2), r: 1.6, fill: theme.connDot, style: { opacity: 0.6 } })
        ] }, li)
      );
    }
  }
  return /* @__PURE__ */ jsxs("svg", { width: W, height: colH, style: { flexShrink: 0, overflow: "visible", marginTop: offsetTop }, children: [
    /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("filter", { id: filterId, x: "-80%", y: "-80%", width: "260%", height: "260%", children: [
      /* @__PURE__ */ jsx("feGaussianBlur", { stdDeviation: "1.8", result: "b" }),
      /* @__PURE__ */ jsxs("feMerge", { children: [
        /* @__PURE__ */ jsx("feMergeNode", { in: "b" }),
        /* @__PURE__ */ jsx("feMergeNode", { in: "SourceGraphic" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("g", { filter: `url(#${filterId})`, children: segs })
  ] });
}
function FinalsColumn({ match, teams, onSelect, colH, theme }) {
  const cardTop = matchTop(0, 1, colH);
  const lblTop = cardTop - LABEL_H - LABEL_MB - 4;
  const emblTop = lblTop - 48 - 6;
  const wrapH = colH + LABEL_H + LABEL_MB;
  return /* @__PURE__ */ jsx("div", { style: { flexShrink: 0 }, children: /* @__PURE__ */ jsxs("div", { style: { position: "relative", width: CARD_W + 16, height: wrapH }, children: [
    /* @__PURE__ */ jsx("div", { style: {
      position: "absolute",
      top: emblTop + LABEL_H + LABEL_MB,
      left: "50%",
      transform: "translateX(-50%)",
      width: 44,
      height: 44,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(245,158,11,.14) 0%, transparent 100%)",
      border: "1px solid rgba(245,158,11,.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20
    }, children: "🏆" }),
    /* @__PURE__ */ jsx("div", { style: {
      position: "absolute",
      top: lblTop + LABEL_H + LABEL_MB + 4,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center"
    }, children: /* @__PURE__ */ jsx("div", { style: {
      padding: "2px 10px",
      height: LABEL_H,
      display: "flex",
      alignItems: "center",
      background: "rgba(245,158,11,.08)",
      border: "1px solid rgba(245,158,11,.2)",
      borderRadius: 20,
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: "0.13em",
      color: "rgba(245,158,11,.8)",
      textTransform: "uppercase"
    }, children: "Finals" }) }),
    /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: cardTop + LABEL_H + LABEL_MB, left: 8 }, children: /* @__PURE__ */ jsx(MatchCard, { match, teams, onClick: onSelect, theme }) })
  ] }) });
}
function TournamentBracket({ tournament }) {
  if (!tournament) return /* @__PURE__ */ jsx(EmptyState$1, { msg: "No active tournament." });
  if (!tournament.bracket) return /* @__PURE__ */ jsx(EmptyState$1, { msg: "Bracket has not been generated yet." });
  const rounds = tournament.bracket.rounds;
  if (!rounds.length) return /* @__PURE__ */ jsx(EmptyState$1, { msg: "Bracket has no rounds." });
  return /* @__PURE__ */ jsx(BracketView, { tournament });
}
function BracketView({ tournament }) {
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const bracketRef = useRef(null);
  async function handleExport() {
    if (!bracketRef.current || exporting) return;
    setExporting(true);
    try {
      const el = bracketRef.current;
      const prevTransform = el.style.transform;
      const prevWidth = el.style.width;
      el.style.transform = "none";
      el.style.width = "max-content";
      const dataUrl = await toJpeg(el, {
        quality: 0.96,
        pixelRatio: 2,
        backgroundColor: "#09080d",
        cacheBust: true
      });
      el.style.transform = prevTransform;
      el.style.width = prevWidth;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${tournament.name.replace(/\s+/g, "-").toLowerCase()}-bracket.jpg`;
      a.click();
    } catch (err) {
      console.error("Bracket export failed:", err);
    } finally {
      setExporting(false);
    }
  }
  const display = tournament.bracketDisplay;
  const themeId = display?.theme ?? "esports";
  const scaleMode = display?.scaleMode ?? "auto";
  const manualScale = Math.max(0.3, Math.min(2, display?.manualScale ?? 1));
  const theme = getTheme(themeId);
  const { bracket, matches, teams } = tournament;
  const rounds = bracket.rounds;
  const getMs = (ids) => ids.map((id) => matches.find((m) => m.id === id)).filter((m) => !!m);
  const finalsRound = rounds[rounds.length - 1];
  const bracketRounds = rounds.slice(0, rounds.length - 1);
  const finalsMatch = getMs(finalsRound.matchIds)[0];
  const leftCols = bracketRounds.map((r) => {
    const ms = getMs(r.matchIds);
    return { name: r.name, matches: ms.slice(0, Math.ceil(ms.length / 2)) };
  });
  const rightColsOuter = bracketRounds.map((r) => {
    const ms = getMs(r.matchIds);
    return { name: r.name, matches: ms.slice(Math.ceil(ms.length / 2)) };
  });
  const rightCols = [...rightColsOuter].reverse();
  const maxMatches = Math.max(...leftCols.map((c) => c.matches.length), ...rightCols.map((c) => c.matches.length), 1);
  const colH = colHeight(maxMatches);
  const connOffTop = LABEL_H + LABEL_MB;
  const leftW = leftCols.length * (CARD_W + CONN_W);
  const rightW = rightCols.length * (CONN_W + CARD_W);
  const finalsW = CARD_W + 16;
  const naturalW = leftW + finalsW + rightW + 24;
  const naturalH = colH + LABEL_H + LABEL_MB + 16;
  const { containerRef, scale: autoScale } = useAutoScale(naturalW);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("style", { children: KEYFRAMES }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 12 }, children: /* @__PURE__ */ jsx(
      "button",
      {
        onClick: handleExport,
        disabled: exporting,
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 16px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: exporting ? "not-allowed" : "pointer",
          opacity: exporting ? 0.6 : 1,
          transition: "all 0.15s",
          background: "linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(0,102,255,0.07) 100%)",
          border: "1px solid rgba(0,191,255,0.3)",
          color: "#00BFFF",
          boxShadow: "0 0 18px rgba(0,191,255,0.08)"
        },
        onMouseEnter: (e) => {
          if (!exporting) {
            e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,191,255,0.2) 0%, rgba(0,102,255,0.12) 100%)";
            e.currentTarget.style.boxShadow = "0 0 24px rgba(0,191,255,0.18)";
            e.currentTarget.style.borderColor = "rgba(0,191,255,0.5)";
          }
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(0,102,255,0.07) 100%)";
          e.currentTarget.style.boxShadow = "0 0 18px rgba(0,191,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(0,191,255,0.3)";
        },
        children: exporting ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            "svg",
            {
              width: "13",
              height: "13",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2.5",
              strokeLinecap: "round",
              style: { animation: "spin 0.8s linear infinite" },
              children: /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" })
            }
          ),
          "Exporting…"
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
            /* @__PURE__ */ jsx("polyline", { points: "7 10 12 15 17 10" }),
            /* @__PURE__ */ jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
          ] }),
          "Download Bracket"
        ] })
      }
    ) }),
    /* @__PURE__ */ jsx("style", { children: `@keyframes spin { to { transform: rotate(360deg); } }` }),
    (() => {
      const bracketContent = /* @__PURE__ */ jsx(
        "div",
        {
          ref: bracketRef,
          style: {
            borderRadius: 14,
            padding: "14px 12px",
            background: theme.containerBg,
            border: `1px solid ${theme.containerBorder}`,
            transition: "background .3s, border-color .3s"
          },
          children: /* @__PURE__ */ jsxs("div", { style: { display: "inline-flex", alignItems: "flex-start", gap: 0, minWidth: "max-content" }, children: [
            leftCols.map((col, ci) => {
              const nextCount = ci < leftCols.length - 1 ? leftCols[ci + 1].matches.length : 1;
              return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start" }, children: [
                /* @__PURE__ */ jsx(
                  RoundColumn,
                  {
                    name: col.name,
                    matches: col.matches,
                    teams,
                    onSelect: setSelected,
                    rtl: false,
                    colH,
                    theme,
                    showLabel: false
                  }
                ),
                /* @__PURE__ */ jsx(
                  Connector,
                  {
                    leftCount: col.matches.length,
                    rightCount: nextCount,
                    colH,
                    offsetTop: connOffTop,
                    theme,
                    connId: `l${ci}`
                  }
                )
              ] }, `l${ci}`);
            }),
            finalsMatch ? /* @__PURE__ */ jsx(
              FinalsColumn,
              {
                match: finalsMatch,
                teams,
                onSelect: () => setSelected(finalsMatch),
                colH,
                theme
              }
            ) : /* @__PURE__ */ jsx("div", { style: {
              width: CARD_W + 16,
              height: colH + LABEL_H + LABEL_MB,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,.12)",
              fontSize: 11
            }, children: "Finals TBD" }),
            rightCols.map((col, ci) => {
              const leftCount = ci === 0 ? 1 : rightCols[ci - 1].matches.length;
              return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start" }, children: [
                /* @__PURE__ */ jsx(
                  Connector,
                  {
                    leftCount,
                    rightCount: col.matches.length,
                    colH,
                    offsetTop: connOffTop,
                    theme,
                    connId: `r${ci}`
                  }
                ),
                /* @__PURE__ */ jsx(
                  RoundColumn,
                  {
                    name: col.name,
                    matches: col.matches,
                    teams,
                    onSelect: setSelected,
                    rtl: true,
                    colH,
                    theme,
                    showLabel: false
                  }
                )
              ] }, `r${ci}`);
            })
          ] })
        }
      );
      if (scaleMode === "auto") {
        return /* @__PURE__ */ jsx("div", { ref: containerRef, style: { width: "100%", overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: {
          width: naturalW,
          transformOrigin: "top center",
          transform: `scale(${autoScale})`,
          marginBottom: `${(autoScale - 1) * naturalH}px`,
          marginLeft: `max(0px, calc(50% - ${naturalW / 2}px))`
        }, children: bracketContent }) });
      } else {
        return /* @__PURE__ */ jsx("div", { style: { width: "100%", overflowX: "auto", overflowY: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: {
          width: naturalW * manualScale,
          height: naturalH * manualScale,
          position: "relative",
          flexShrink: 0
        }, children: /* @__PURE__ */ jsx("div", { style: {
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "top left",
          transform: `scale(${manualScale})`,
          width: naturalW
        }, children: bracketContent }) }) });
      }
    })(),
    selected && /* @__PURE__ */ jsx(MatchDetailModal, { match: selected, teams: tournament.teams, onClose: () => setSelected(null) })
  ] });
}
function EmptyState$1({ msg }) {
  return /* @__PURE__ */ jsxs("div", { style: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 0",
    textAlign: "center"
  }, children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: 52, marginBottom: 14, opacity: 0.1 }, children: "⚔️" }),
    /* @__PURE__ */ jsx("p", { style: { color: "rgba(255,255,255,.28)", margin: 0, fontSize: 14 }, children: msg })
  ] });
}
const KEYFRAMES = `
@keyframes bt-pbar { 0%,100%{opacity:.35} 50%{opacity:1} }
`;
function MatchCountdown({ target }) {
  const [diff, setDiff] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1e3);
    return () => clearInterval(id);
  }, [target]);
  if (diff <= 0) return /* @__PURE__ */ jsx("span", { className: "text-green-400 font-bold text-xs", children: "Starting soon" });
  const h = Math.floor(diff / 36e5);
  const m = Math.floor(diff % 36e5 / 6e4);
  const s = Math.floor(diff % 6e4 / 1e3);
  return /* @__PURE__ */ jsxs("span", { className: "text-[#00BFFF] font-mono text-xs", children: [
    h > 0 && `${h}h `,
    m,
    "m ",
    s,
    "s"
  ] });
}
function TournamentSchedule({ tournament }) {
  if (!tournament) {
    return /* @__PURE__ */ jsx(EmptyState, {});
  }
  const { matches, teams } = tournament;
  const scheduled = [...matches].filter((m) => m.status !== "bye").sort((a, b) => {
    const order = { live: 0, scheduled: 1, pending: 2, completed: 3, bye: 4 };
    const ao = order[a.status] ?? 5;
    const bo = order[b.status] ?? 5;
    if (ao !== bo) return ao - bo;
    return (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0);
  });
  if (scheduled.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "📅" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No matches scheduled yet." })
    ] });
  }
  const getTeam = (id) => teams.find((t) => t.id === id);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl", children: [
        tournament.name,
        " — Schedule"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-gray-500 text-sm mt-0.5", children: [
        scheduled.length,
        " match(es) total"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-3", children: scheduled.map((match) => {
      const t1 = getTeam(match.team1Id);
      const t2 = getTeam(match.team2Id);
      const statusColors = {
        live: "border-l-red-400",
        scheduled: "border-l-[#00BFFF]",
        completed: "border-l-green-500",
        pending: "border-l-gray-700"
      };
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: `bg-[#111827] border border-white/5 rounded-xl p-4 border-l-4 ${statusColors[match.status] || "border-l-gray-700"}`,
          children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-20", children: /* @__PURE__ */ jsx("span", { className: `text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${match.status === "live" ? "bg-red-500/15 text-red-400" : match.status === "completed" ? "bg-green-500/10 text-green-400" : match.status === "scheduled" ? "bg-[#00BFFF]/10 text-[#00BFFF]" : "bg-white/5 text-gray-600"}`, children: MATCH_STATUS_LABEL[match.status] }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 flex items-center gap-3 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                t1 && /* @__PURE__ */ jsx("img", { src: `https://mc-heads.net/avatar/${t1.captain}/16`, className: "w-5 h-5 rounded-sm flex-shrink-0", alt: "", onError: (e) => {
                  e.target.style.display = "none";
                } }),
                /* @__PURE__ */ jsx("span", { className: `text-sm font-semibold truncate ${match.winnerId === match.team1Id ? "text-[#00BFFF]" : "text-white"}`, children: t1?.name ?? "TBD" }),
                match.status === "completed" && /* @__PURE__ */ jsx("span", { className: "font-['Space_Grotesk'] font-black text-white", children: match.score1 })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs flex-shrink-0", children: "vs" }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                match.status === "completed" && /* @__PURE__ */ jsx("span", { className: "font-['Space_Grotesk'] font-black text-white", children: match.score2 }),
                /* @__PURE__ */ jsx("span", { className: `text-sm font-semibold truncate ${match.winnerId === match.team2Id ? "text-[#00BFFF]" : "text-white"}`, children: t2?.name ?? "TBD" }),
                t2 && /* @__PURE__ */ jsx("img", { src: `https://mc-heads.net/avatar/${t2.captain}/16`, className: "w-5 h-5 rounded-sm flex-shrink-0", alt: "", onError: (e) => {
                  e.target.style.display = "none";
                } })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-xs text-gray-500 flex-shrink-0", children: [
              match.arena && /* @__PURE__ */ jsx("span", { children: match.arena }),
              match.gamemode && /* @__PURE__ */ jsx("span", { children: match.gamemode }),
              match.scheduledAt && match.status === "scheduled" && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end gap-0.5", children: [
                /* @__PURE__ */ jsx("span", { children: new Date(match.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }),
                /* @__PURE__ */ jsx(MatchCountdown, { target: match.scheduledAt })
              ] }),
              match.completedAt && match.status === "completed" && /* @__PURE__ */ jsx("span", { children: new Date(match.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }),
              /* @__PURE__ */ jsxs("span", { className: "text-gray-700", children: [
                "M",
                match.matchNumber
              ] })
            ] })
          ] })
        },
        match.id
      );
    }) })
  ] });
}
function EmptyState() {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "📅" }),
    /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No active tournament." })
  ] });
}
function TournamentRules({ tournament }) {
  if (!tournament) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "📜" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No active tournament." })
    ] });
  }
  const { rules, name } = tournament;
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl", children: [
        name,
        " — Rules"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm mt-0.5", children: "All participants must follow these rules. Staff decisions are final." })
    ] }),
    /* @__PURE__ */ jsx(RuleSection, { icon: "✅", title: "Allowed Mods", items: rules.allowedMods, color: "green" }),
    /* @__PURE__ */ jsx(RuleSection, { icon: "🖥️", title: "Allowed Clients", items: rules.allowedClients, color: "blue" }),
    /* @__PURE__ */ jsx(RuleSection, { icon: "⛔", title: "Banned Modifications", items: rules.bannedMods, color: "red" }),
    /* @__PURE__ */ jsx(TextRule, { icon: "🎬", title: "Replay Requirements", text: rules.replayRequirements }),
    /* @__PURE__ */ jsx(TextRule, { icon: "🔌", title: "Disconnect Rules", text: rules.disconnectRules }),
    /* @__PURE__ */ jsx(TextRule, { icon: "⚖️", title: "Staff Decisions", text: rules.staffDecisions }),
    rules.custom.length > 0 && /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-6 space-y-3", children: [
      /* @__PURE__ */ jsxs("h3", { className: "font-['Space_Grotesk'] font-semibold text-white flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { children: "📋" }),
        " Tournament-Specific Rules"
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: rules.custom.map((rule, i) => /* @__PURE__ */ jsxs("li", { className: "flex gap-3 text-sm", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-[#00BFFF] font-bold flex-shrink-0", children: [
          i + 1,
          "."
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-gray-300", children: rule })
      ] }, i)) })
    ] })
  ] });
}
function RuleSection({ icon, title, items, color }) {
  const colorMap = {
    green: "text-green-400 bg-green-400/5 border-green-400/15",
    blue: "text-[#00BFFF] bg-[#00BFFF]/5 border-[#00BFFF]/15",
    red: "text-red-400 bg-red-400/5 border-red-400/15"
  };
  const dotColor = { green: "bg-green-400", blue: "bg-[#00BFFF]", red: "bg-red-400" };
  return /* @__PURE__ */ jsxs("div", { className: `rounded-xl border p-6 space-y-3 ${colorMap[color]}`, children: [
    /* @__PURE__ */ jsxs("h3", { className: "font-['Space_Grotesk'] font-semibold flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("span", { children: icon }),
      " ",
      title
    ] }),
    items.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-sm italic", children: "None specified." }) : /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: items.map((item, i) => /* @__PURE__ */ jsxs("span", { className: `flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 text-white text-xs font-medium`, children: [
      /* @__PURE__ */ jsx("span", { className: `w-1.5 h-1.5 rounded-full ${dotColor[color]}` }),
      item
    ] }, i)) })
  ] });
}
function TextRule({ icon, title, text }) {
  return /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-6 space-y-2", children: [
    /* @__PURE__ */ jsxs("h3", { className: "font-['Space_Grotesk'] font-semibold text-white flex items-center gap-2", children: [
      /* @__PURE__ */ jsx("span", { children: icon }),
      " ",
      title
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-gray-400 text-sm leading-relaxed", children: text || "Not specified." })
  ] });
}
const PLACEMENT_STYLES = [
  { bg: "from-yellow-500/20 to-yellow-600/5", border: "border-yellow-500/30", accent: "text-yellow-400", glow: "shadow-yellow-500/10" },
  { bg: "from-gray-400/15 to-gray-500/5", border: "border-gray-400/25", accent: "text-gray-300", glow: "shadow-gray-400/10" },
  { bg: "from-orange-700/20 to-orange-800/5", border: "border-orange-700/30", accent: "text-orange-400", glow: "shadow-orange-700/10" }
];
const REWARD_ICONS = {
  coins: "💰",
  gems: "💎",
  rank: "👑",
  crate_keys: "🗝️",
  custom: "🎁"
};
function TournamentPrizes({ tournament }) {
  if (!tournament) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "🎁" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No active tournament." })
    ] });
  }
  const { prizes, name, prizePool } = tournament;
  const sorted = [...prizes].sort((a, b) => a.placement - b.placement);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-black text-3xl text-white", children: name }),
      prizePool && /* @__PURE__ */ jsxs("p", { className: "text-[#00BFFF] font-semibold text-lg mt-1", children: [
        "Total Prize Pool: ",
        prizePool
      ] })
    ] }),
    sorted.length >= 1 && /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-3 gap-4", children: [sorted[0], sorted[1], sorted[2]].map((prize, idx) => {
      if (!prize) return null;
      const style = PLACEMENT_STYLES[idx] ?? PLACEMENT_STYLES[2];
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: `bg-gradient-to-b ${style.bg} border ${style.border} rounded-2xl p-6 text-center space-y-4 shadow-xl ${style.glow} ${idx === 0 ? "md:order-2" : idx === 1 ? "md:order-1" : "md:order-3"}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: "text-5xl", children: prize.label.split(" ")[0] }),
            /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("p", { className: `font-['Space_Grotesk'] font-black text-xl ${style.accent}`, children: prize.label.split(" ").slice(1).join(" ") }) }),
            /* @__PURE__ */ jsx("div", { className: "space-y-2", children: prize.rewards.map((r, ri) => /* @__PURE__ */ jsxs("div", { className: "bg-black/20 rounded-lg px-4 py-2.5 flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("span", { children: REWARD_ICONS[r.type] ?? "🎁" }),
                /* @__PURE__ */ jsx("span", { className: "text-white text-sm font-medium", children: r.label })
              ] }),
              /* @__PURE__ */ jsx("span", { className: `font-['Space_Grotesk'] font-black text-sm ${style.accent}`, children: r.amount })
            ] }, ri)) })
          ]
        },
        prize.placement
      );
    }) }),
    sorted.length > 3 && /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-['Space_Grotesk'] font-semibold text-white text-lg", children: "Other Prizes" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: sorted.slice(3).map((prize) => /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-4 flex items-center gap-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-2xl w-10 text-center", children: prize.label.split(" ")[0] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-white font-semibold text-sm", children: prize.label.split(" ").slice(1).join(" ") }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs mt-1", children: prize.rewards.map((r) => `${REWARD_ICONS[r.type]} ${r.amount} ${r.label}`).join(" · ") })
        ] })
      ] }, prize.placement)) })
    ] }),
    prizes.length === 0 && /* @__PURE__ */ jsx("div", { className: "text-center py-16 text-gray-500", children: "No prizes configured yet." })
  ] });
}
function TournamentStats({ tournament }) {
  if (!tournament) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "📊" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No active tournament." })
    ] });
  }
  const { matches, teams } = tournament;
  const totalMatches = matches.filter((m) => m.status !== "bye").length;
  const completedMatches = matches.filter((m) => m.status === "completed").length;
  const liveMatches = matches.filter((m) => m.status === "live").length;
  const remainingMatches = matches.filter((m) => m.status === "scheduled" || m.status === "pending").length;
  const approvedTeams = teams.filter((t) => t.status === "approved").length;
  const totalPlayers = teams.filter((t) => t.status === "approved").reduce((n, t) => n + t.players.length, 0);
  const pct = totalMatches > 0 ? Math.round(completedMatches / totalMatches * 100) : 0;
  const stats = [
    { label: "Approved Teams", value: approvedTeams, icon: "👥", color: "text-[#00BFFF]" },
    { label: "Total Players", value: totalPlayers, icon: "⚔️", color: "text-purple-400" },
    { label: "Total Matches", value: totalMatches, icon: "🎮", color: "text-white" },
    { label: "Completed", value: completedMatches, icon: "✅", color: "text-green-400" },
    { label: "Remaining", value: remainingMatches, icon: "⏳", color: "text-yellow-400" },
    { label: "Live Now", value: liveMatches, icon: "🔴", color: "text-red-400" }
  ];
  const teamStats = teams.filter((t) => t.status === "approved" || t.status === "eliminated").map((team) => {
    const teamMatches = matches.filter(
      (m) => (m.team1Id === team.id || m.team2Id === team.id) && m.status === "completed"
    );
    const wins = teamMatches.filter((m) => m.winnerId === team.id).length;
    const losses = teamMatches.length - wins;
    const wr = teamMatches.length > 0 ? Math.round(wins / teamMatches.length * 100) : null;
    return { team, wins, losses, played: teamMatches.length, wr };
  }).sort((a, b) => b.wins - a.wins || (b.wr ?? 0) - (a.wr ?? 0));
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl", children: [
      tournament.name,
      " — Statistics"
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: stats.map((s) => /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-5 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-2xl mb-2", children: s.icon }),
      /* @__PURE__ */ jsx("div", { className: `font-['Space_Grotesk'] font-black text-3xl ${s.color}`, children: s.value }),
      /* @__PURE__ */ jsx("div", { className: "text-gray-500 text-xs mt-1", children: s.label })
    ] }, s.label)) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-6 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-white font-semibold text-sm", children: "Tournament Progress" }),
        /* @__PURE__ */ jsxs("span", { className: "font-['Space_Grotesk'] font-black text-xl text-[#00BFFF]", children: [
          pct,
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "h-3 bg-white/5 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: "h-full bg-gradient-to-r from-[#00BFFF] to-[#0066FF] rounded-full transition-all duration-700",
          style: { width: `${pct}%` }
        }
      ) }),
      /* @__PURE__ */ jsxs("p", { className: "text-gray-600 text-xs", children: [
        completedMatches,
        " of ",
        totalMatches,
        " matches completed"
      ] })
    ] }),
    teamStats.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-['Space_Grotesk'] font-semibold text-white text-lg", children: "Team Standings" }),
      /* @__PURE__ */ jsx("div", { className: "bg-[#111827] border border-white/5 rounded-xl overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-white/5 text-gray-600 text-[11px] uppercase tracking-wider", children: [
          /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3", children: "#" }),
          /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3", children: "Team" }),
          /* @__PURE__ */ jsx("th", { className: "text-center px-3 py-3", children: "Played" }),
          /* @__PURE__ */ jsx("th", { className: "text-center px-3 py-3", children: "W" }),
          /* @__PURE__ */ jsx("th", { className: "text-center px-3 py-3", children: "L" }),
          /* @__PURE__ */ jsx("th", { className: "text-center px-3 py-3", children: "Win %" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: teamStats.map(({ team, wins, losses, played, wr }, i) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-white/3 hover:bg-white/2 transition-colors", children: [
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-gray-500 text-sm font-bold", children: i + 1 }),
          /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("img", { src: `https://mc-heads.net/avatar/${team.captain}/16`, className: "w-5 h-5 rounded-sm", alt: "", onError: (e) => {
              e.target.style.display = "none";
            } }),
            /* @__PURE__ */ jsx("span", { className: "text-white text-sm font-semibold", children: team.name })
          ] }) }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-center text-gray-400 text-sm", children: played }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-center text-green-400 text-sm font-bold", children: wins }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-center text-red-400 text-sm font-bold", children: losses }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: `font-['Space_Grotesk'] font-bold text-sm ${wr !== null ? wr >= 50 ? "text-[#00BFFF]" : "text-gray-400" : "text-gray-600"}`, children: wr !== null ? `${wr}%` : "—" }) })
        ] }, team.id)) })
      ] }) })
    ] })
  ] });
}
function TournamentArchive({ archives }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  if (selected) {
    return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setSelected(null);
              setView("list");
            },
            className: "text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1",
            children: "← Back to Archive"
          }
        ),
        /* @__PURE__ */ jsx("div", { className: "h-4 w-px bg-white/10" }),
        /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-white", children: selected.name })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: ["list", "bracket", "stats"].map((v) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setView(v),
          className: `px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${view === v ? "bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30" : "text-gray-500 hover:text-white border border-white/5"}`,
          children: v === "list" ? "Overview" : v
        },
        v
      )) }),
      view === "list" && /* @__PURE__ */ jsx(ArchiveDetail, { tournament: selected }),
      view === "bracket" && /* @__PURE__ */ jsx(TournamentBracket, { tournament: selected }),
      view === "stats" && /* @__PURE__ */ jsx(TournamentStats, { tournament: selected })
    ] });
  }
  if (archives.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "🗃️" }),
      /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl mb-2", children: "No Archived Tournaments" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "Completed tournaments will appear here." })
    ] });
  }
  const sorted = [...archives].sort((a, b) => b.createdAt - a.createdAt);
  const total = sorted.length;
  const pages = Math.ceil(total / PER_PAGE);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl", children: "Tournament Archive" }),
      /* @__PURE__ */ jsxs("p", { className: "text-gray-500 text-sm mt-0.5", children: [
        total,
        " tournament(s) on record"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-4", children: paged.map((t) => {
      const winner = getWinner(t);
      const approvedCt = t.teams.filter((tm) => tm.status === "approved").length;
      return /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setSelected(t),
          className: "w-full bg-[#111827] border border-white/5 hover:border-white/15 rounded-xl p-5 text-left transition-all group",
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-2xl flex-shrink-0", children: "🏆" }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                /* @__PURE__ */ jsx("h3", { className: "font-['Space_Grotesk'] font-bold text-white group-hover:text-[#00BFFF] transition-colors", children: t.name }),
                /* @__PURE__ */ jsx("span", { className: `text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${STATUS_COLOR[t.status]}`, children: STATUS_LABEL[t.status] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 mt-2 text-xs text-gray-500", children: [
                t.startDate && /* @__PURE__ */ jsxs("span", { children: [
                  "📅 ",
                  new Date(t.startDate).toLocaleDateString()
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "👥 ",
                  approvedCt,
                  " teams"
                ] }),
                /* @__PURE__ */ jsxs("span", { children: [
                  "🎮 ",
                  t.matches.filter((m) => m.status === "completed").length,
                  " matches"
                ] }),
                t.gamemode && /* @__PURE__ */ jsxs("span", { children: [
                  "⚔️ ",
                  t.gamemode
                ] }),
                winner && /* @__PURE__ */ jsxs("span", { className: "text-yellow-400 font-semibold", children: [
                  "🥇 ",
                  winner
                ] })
              ] }),
              t.description && /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-2 truncate", children: t.description })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-600 group-hover:text-[#00BFFF] transition-colors flex-shrink-0", children: "→" })
          ] })
        },
        t.id
      );
    }) }),
    pages > 1 && /* @__PURE__ */ jsxs("div", { className: "flex justify-center gap-2", children: [
      /* @__PURE__ */ jsx("button", { onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page === 1, className: "px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-500 hover:text-white disabled:opacity-30", children: "← Prev" }),
      /* @__PURE__ */ jsxs("span", { className: "px-3 py-1.5 text-xs text-gray-500", children: [
        page,
        " / ",
        pages
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => setPage((p) => Math.min(pages, p + 1)), disabled: page === pages, className: "px-3 py-1.5 rounded-lg text-xs border border-white/10 text-gray-500 hover:text-white disabled:opacity-30", children: "Next →" })
    ] })
  ] });
}
function getWinner(t) {
  if (!t.bracket) return null;
  const lastRound = t.bracket.rounds[t.bracket.rounds.length - 1];
  if (!lastRound) return null;
  const finalMatchId = lastRound.matchIds[0];
  const finalMatch = t.matches.find((m) => m.id === finalMatchId);
  if (!finalMatch?.winnerId) return null;
  return t.teams.find((tm) => tm.id === finalMatch.winnerId)?.name ?? null;
}
function ArchiveDetail({ tournament: t }) {
  const winner = getWinner(t);
  const runnerUp = getRunnerUp(t);
  const approvedTeams = t.teams.filter((tm) => tm.status === "approved");
  const totalPlayers = approvedTeams.reduce((n, tm) => n + tm.players.length, 0);
  const completed = t.matches.filter((m) => m.status === "completed").length;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
      { label: "Teams", value: approvedTeams.length, icon: "👥" },
      { label: "Players", value: totalPlayers, icon: "⚔️" },
      { label: "Matches", value: completed, icon: "🎮" },
      { label: "Gamemode", value: t.gamemode || "—", icon: "🎯" }
    ].map((c) => /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-4 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-2xl mb-1", children: c.icon }),
      /* @__PURE__ */ jsx("div", { className: "font-['Space_Grotesk'] font-bold text-white text-xl", children: c.value }),
      /* @__PURE__ */ jsx("div", { className: "text-gray-500 text-xs", children: c.label })
    ] }, c.label)) }),
    (winner || runnerUp) && /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-br from-yellow-950/30 to-[#111827] border border-yellow-500/20 rounded-xl p-6 space-y-4", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-['Space_Grotesk'] font-bold text-white text-lg", children: "Final Results" }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        winner && /* @__PURE__ */ jsx(ResultRow, { icon: "🥇", label: "Champion", name: winner }),
        runnerUp && /* @__PURE__ */ jsx(ResultRow, { icon: "🥈", label: "Runner-up", name: runnerUp })
      ] })
    ] }),
    t.prizes.length > 0 && /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-6 space-y-3", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-['Space_Grotesk'] font-semibold text-white", children: "Prize Distribution" }),
      t.prizes.map((p) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm", children: [
        /* @__PURE__ */ jsx("span", { children: p.label.split(" ")[0] }),
        /* @__PURE__ */ jsx("span", { className: "text-white font-medium", children: p.label.split(" ").slice(1).join(" ") }),
        /* @__PURE__ */ jsxs("span", { className: "text-gray-500", children: [
          "— ",
          p.rewards.map((r) => `${r.amount} ${r.label}`).join(" + ")
        ] })
      ] }, p.placement))
    ] })
  ] });
}
function getRunnerUp(t) {
  if (!t.bracket) return null;
  const lastRound = t.bracket.rounds[t.bracket.rounds.length - 1];
  const finalMatch = t.matches.find((m) => m.id === lastRound?.matchIds[0]);
  if (!finalMatch?.winnerId) return null;
  const loserId = finalMatch.team1Id === finalMatch.winnerId ? finalMatch.team2Id : finalMatch.team1Id;
  return t.teams.find((tm) => tm.id === loserId)?.name ?? null;
}
function ResultRow({ icon, label, name }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsx("span", { className: "text-2xl", children: icon }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs uppercase tracking-wider", children: label }),
      /* @__PURE__ */ jsx("p", { className: "text-white font-bold", children: name })
    ] })
  ] });
}
const TYPE_STYLES = {
  info: { border: "border-[#00BFFF]/20", bg: "bg-[#00BFFF]/5", icon: "ℹ️", accent: "text-[#00BFFF]" },
  warning: { border: "border-yellow-500/20", bg: "bg-yellow-500/5", icon: "⚠️", accent: "text-yellow-400" },
  success: { border: "border-green-500/20", bg: "bg-green-500/5", icon: "✅", accent: "text-green-400" }
};
function TournamentAnnouncements({ tournament }) {
  if (!tournament) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "📣" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No active tournament." })
    ] });
  }
  const { announcements, name } = tournament;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6 max-w-3xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl", children: [
        name,
        " — Announcements"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-gray-500 text-sm mt-0.5", children: [
        announcements.length,
        " announcement(s)"
      ] })
    ] }),
    announcements.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-5xl mb-4 opacity-20", children: "📣" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No announcements yet. Check back soon!" })
    ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-4", children: announcements.map((ann, i) => {
      const style = TYPE_STYLES[ann.type] ?? TYPE_STYLES.info;
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: `border ${style.border} ${style.bg} rounded-xl p-5 space-y-2 ${i === 0 ? "ring-1 ring-white/5" : ""}`,
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xl flex-shrink-0", children: style.icon }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
                /* @__PURE__ */ jsx("h3", { className: `font-['Space_Grotesk'] font-bold text-white text-base`, children: ann.title }),
                i === 0 && /* @__PURE__ */ jsx("span", { className: "text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-gray-400", children: "Latest" })
              ] }),
              ann.body && /* @__PURE__ */ jsx("p", { className: "text-gray-400 text-sm mt-2 leading-relaxed", children: ann.body }),
              /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-2", children: new Date(ann.createdAt).toLocaleString() })
            ] })
          ] })
        },
        ann.id
      );
    }) })
  ] });
}
function LiveTournament({ tournament }) {
  const [selected, setSelected] = useState(null);
  if (!tournament || tournament.status !== "live") {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-32 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "text-6xl mb-4 opacity-20", children: "🔴" }),
      /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl mb-2", children: "Not Live" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "There is no tournament running right now. Check back soon!" })
    ] });
  }
  const { matches, teams } = tournament;
  const liveMatches = matches.filter((m) => m.status === "live");
  const scheduledMatches = matches.filter((m) => m.status === "scheduled").slice(0, 5);
  const completedCount = matches.filter((m) => m.status === "completed").length;
  const remaining = matches.filter((m) => m.status !== "completed" && m.status !== "bye").length;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-r from-red-950/50 to-red-900/20 border border-red-500/20 rounded-2xl p-6 flex items-center gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl", children: "🔴" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-red-400 animate-pulse" }),
          /* @__PURE__ */ jsx("span", { className: "text-red-400 text-xs font-bold uppercase tracking-widest", children: "Tournament Live" })
        ] }),
        /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-xl mt-1", children: tournament.name })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "ml-auto grid grid-cols-2 gap-4 text-center", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-['Space_Grotesk'] font-black text-2xl text-white", children: completedCount }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs", children: "Completed" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-['Space_Grotesk'] font-black text-2xl text-[#00BFFF]", children: remaining }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs", children: "Remaining" })
        ] })
      ] })
    ] }),
    liveMatches.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("h3", { className: "font-['Space_Grotesk'] font-bold text-white text-lg flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-red-400 animate-pulse" }),
        "Live Now"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 gap-4", children: liveMatches.map((m) => /* @__PURE__ */ jsx(LiveMatchCard, { match: m, teams, onClick: () => setSelected(m) }, m.id)) })
    ] }),
    liveMatches.length === 0 && /* @__PURE__ */ jsx("div", { className: "bg-[#111827] border border-white/5 rounded-xl p-8 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: "No matches are currently live. Check the schedule for upcoming matches." }) }),
    scheduledMatches.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-['Space_Grotesk'] font-bold text-white text-lg", children: "Up Next" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: scheduledMatches.map((m) => /* @__PURE__ */ jsx(ScheduledMatchRow, { match: m, teams, onClick: () => setSelected(m) }, m.id)) })
    ] }),
    selected && /* @__PURE__ */ jsx(MatchDetailModal, { match: selected, teams: tournament.teams, onClose: () => setSelected(null) })
  ] });
}
function LiveMatchCard({ match, teams, onClick }) {
  const t1 = teams.find((t) => t.id === match.team1Id);
  const t2 = teams.find((t) => t.id === match.team2Id);
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick,
      className: "w-full bg-gradient-to-br from-red-950/30 to-[#111827] border border-red-500/30 rounded-xl p-5 text-left hover:border-red-500/50 transition-all",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-red-400 animate-pulse" }),
          /* @__PURE__ */ jsx("span", { className: "text-red-400 text-xs font-bold uppercase tracking-wider", children: "Live" }),
          match.arena && /* @__PURE__ */ jsxs("span", { className: "text-gray-600 text-xs", children: [
            "· ",
            match.arena
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center flex-1", children: [
            /* @__PURE__ */ jsx("p", { className: "text-white font-bold text-sm truncate", children: t1?.name ?? "TBD" }),
            /* @__PURE__ */ jsx("p", { className: "font-['Space_Grotesk'] font-black text-4xl text-white mt-1", children: match.score1 })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-gray-600 font-bold text-sm px-4", children: "VS" }),
          /* @__PURE__ */ jsxs("div", { className: "text-center flex-1", children: [
            /* @__PURE__ */ jsx("p", { className: "text-white font-bold text-sm truncate", children: t2?.name ?? "TBD" }),
            /* @__PURE__ */ jsx("p", { className: "font-['Space_Grotesk'] font-black text-4xl text-white mt-1", children: match.score2 })
          ] })
        ] })
      ]
    }
  );
}
function ScheduledMatchRow({ match, teams, onClick }) {
  const t1 = teams.find((t) => t.id === match.team1Id);
  const t2 = teams.find((t) => t.id === match.team2Id);
  return /* @__PURE__ */ jsxs(
    "button",
    {
      onClick,
      className: "w-full bg-[#111827] border border-white/5 hover:border-white/10 rounded-xl p-4 flex items-center gap-4 transition-all text-left",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "text-gray-600 text-sm w-8 text-center font-bold", children: [
          "M",
          match.matchNumber
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "text-white text-sm font-semibold", children: t1?.name ?? "TBD" }),
          /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs", children: "vs" }),
          /* @__PURE__ */ jsx("span", { className: "text-white text-sm font-semibold", children: t2?.name ?? "TBD" })
        ] }),
        match.scheduledAt && /* @__PURE__ */ jsx("span", { className: "text-gray-500 text-xs", children: new Date(match.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }),
        match.arena && /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-xs", children: match.arena }),
        /* @__PURE__ */ jsx("span", { className: "text-[#00BFFF] text-xs font-semibold", children: "Scheduled" })
      ]
    }
  );
}
function TeamRegistration({ tournament, onClose }) {
  const requireCaptain = tournament.requireCaptain !== false;
  const [teamName, setTeamName] = useState("");
  const [captain, setCaptain] = useState("");
  const [players, setPlayers] = useState([""]);
  const [submitting, setSubmit] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const maxExtraSlots = requireCaptain ? tournament.maxTeamSize - 1 : tournament.maxTeamSize;
  const totalPlayers = requireCaptain ? [captain, ...players].filter((p) => p.trim()).length : players.filter((p) => p.trim()).length;
  function addPlayer() {
    if (players.length < maxExtraSlots) setPlayers((p) => [...p, ""]);
  }
  function setPlayer(idx, val) {
    setPlayers((p) => p.map((v, i) => i === idx ? val : v));
  }
  function removePlayer(idx) {
    setPlayers((p) => p.filter((_, i) => i !== idx));
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!teamName.trim()) return setError("Team name is required");
    if (requireCaptain && !captain.trim()) return setError("Captain name is required");
    const allPlayers = requireCaptain ? [captain.trim(), ...players.map((p) => p.trim()).filter(Boolean)] : players.map((p) => p.trim()).filter(Boolean);
    if (allPlayers.length < tournament.minTeamSize) {
      return setError(`Minimum team size is ${tournament.minTeamSize} player(s)`);
    }
    if (allPlayers.length > tournament.maxTeamSize) {
      return setError(`Maximum team size is ${tournament.maxTeamSize} player(s)`);
    }
    setSubmit(true);
    try {
      const res = await registerTeam({
        data: {
          tournamentId: tournament.id,
          teamName: teamName.trim(),
          captain: requireCaptain ? captain.trim() : "",
          players: requireCaptain ? players.map((p) => p.trim()).filter(Boolean) : players.map((p) => p.trim()).filter(Boolean)
        }
      });
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "Registration failed");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setSubmit(false);
    }
  }
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm", children: /* @__PURE__ */ jsxs("div", { className: "bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "font-['Space_Grotesk'] font-bold text-white text-lg", children: "Register Your Team" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs mt-0.5", children: tournament.name })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "text-gray-600 hover:text-white transition-colors text-xl", children: "✕" })
    ] }),
    success ? /* @__PURE__ */ jsxs("div", { className: "p-8 text-center space-y-4", children: [
      /* @__PURE__ */ jsx("div", { className: "text-5xl", children: "✅" }),
      /* @__PURE__ */ jsx("h3", { className: "font-bold text-white text-lg", children: "Registration Submitted!" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-400 text-sm", children: "Your team has been submitted for review. You'll be notified once approved." }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "mt-4 px-6 py-2.5 rounded-xl bg-[#00BFFF] text-black font-bold text-sm", children: "Close" })
    ] }) : /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "p-6 space-y-5", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider", children: "Team Name" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            value: teamName,
            onChange: (e) => setTeamName(e.target.value),
            placeholder: "e.g. Blue Dynasty",
            maxLength: 50,
            className: "w-full bg-[#0B0F17] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00BFFF]/50"
          }
        )
      ] }),
      requireCaptain && /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("label", { className: "block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider", children: [
          "Captain Username ",
          /* @__PURE__ */ jsx("span", { className: "text-[#00BFFF]", children: "👑" })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            value: captain,
            onChange: (e) => setCaptain(e.target.value),
            placeholder: "Minecraft username",
            maxLength: 50,
            className: "w-full bg-[#0B0F17] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00BFFF]/50"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-gray-400 font-semibold mb-1.5 uppercase tracking-wider", children: requireCaptain ? `Teammates (${Math.max(0, tournament.minTeamSize - 1)}–${tournament.maxTeamSize - 1})` : `Players (${tournament.minTeamSize}–${tournament.maxTeamSize})` }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          players.map((p, i) => /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                value: p,
                onChange: (e) => setPlayer(i, e.target.value),
                placeholder: requireCaptain ? `Player ${i + 2} username` : `Player ${i + 1} username`,
                maxLength: 50,
                className: "flex-1 bg-[#0B0F17] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#00BFFF]/50"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => removePlayer(i),
                className: "px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs",
                children: "✕"
              }
            )
          ] }, i)),
          players.length < maxExtraSlots && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: addPlayer,
              className: "w-full py-2 rounded-lg border border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-white/20 text-xs transition-all",
              children: [
                "+ Add ",
                requireCaptain ? "Teammate" : "Player"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-[#0B0F17] rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { children: "👥" }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Total: ",
          /* @__PURE__ */ jsx("strong", { className: "text-white", children: totalPlayers }),
          " player(s) · Min ",
          tournament.minTeamSize,
          ", Max ",
          tournament.maxTeamSize
        ] })
      ] }),
      error && /* @__PURE__ */ jsx("div", { className: "bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-3", children: error }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "submit",
          disabled: submitting,
          className: "w-full py-3 rounded-xl bg-[#00BFFF] hover:bg-[#00BFFF]/80 disabled:opacity-50 text-black font-bold text-sm transition-all",
          children: submitting ? "Submitting…" : "Submit Registration"
        }
      )
    ] })
  ] }) });
}
const TABS = [{
  id: "home",
  label: "Home",
  icon: "🏆"
}, {
  id: "bracket",
  label: "Bracket",
  icon: "⚔️"
}, {
  id: "schedule",
  label: "Schedule",
  icon: "📅"
}, {
  id: "live",
  label: "Live",
  icon: "🔴"
}, {
  id: "prizes",
  label: "Prizes",
  icon: "🎁"
}, {
  id: "rules",
  label: "Rules",
  icon: "📜"
}, {
  id: "stats",
  label: "Statistics",
  icon: "📊"
}, {
  id: "announcements",
  label: "Announcements",
  icon: "📣"
}, {
  id: "archive",
  label: "Archive",
  icon: "🗃️"
}];
function TournamentPage() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReg, setShowReg] = useState(false);
  const esRef = useRef(null);
  async function load() {
    try {
      const d = await getTournamentData();
      setData(d);
    } catch {
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const es = new EventSource("/api/tournament-events");
    esRef.current = es;
    es.addEventListener("tournament_updated", () => load());
    return () => es.close();
  }, []);
  const active = data?.activeTournamentId ? data.tournaments.find((t) => t.id === data.activeTournamentId) ?? null : null;
  const archives = data?.tournaments.filter((t) => t.status === "archived" || t.status === "completed") ?? [];
  const canRegister = active?.status === "registration_open";
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "w-8 h-8 border-2 border-white/10 border-t-[#00BFFF] rounded-full animate-spin" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen text-white", children: [
    /* @__PURE__ */ jsx(Navbar, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative pt-8 pb-10 px-4 overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-blue-900/15 to-transparent pointer-events-none" }),
      /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto text-center relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-5 tracking-wide uppercase", children: [
          active?.status === "live" ? /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" }) : /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" }),
          active ? `${STATUS_LABEL[active.status]} · ${active.name}` : "Tournament Hub"
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "font-black text-4xl sm:text-5xl text-white mb-3", children: [
          "Blue Network ",
          /* @__PURE__ */ jsx("span", { className: "text-gradient", children: "Tournaments" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-white/40 max-w-md mx-auto text-sm", children: "Register your team, track live brackets, and compete for glory on the Blue Network." }),
        active && /* @__PURE__ */ jsxs("div", { className: "mt-6 inline-flex items-center gap-3 flex-wrap justify-center", children: [
          /* @__PURE__ */ jsxs("span", { className: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${STATUS_COLOR[active.status]}`, children: [
            active.status === "live" && /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" }),
            STATUS_LABEL[active.status]
          ] }),
          active.prizePool && /* @__PURE__ */ jsxs("span", { className: "text-gray-500 text-xs", children: [
            "🏆 Prize Pool: ",
            /* @__PURE__ */ jsx("span", { className: "text-white font-semibold", children: active.prizePool })
          ] }),
          active.gamemode && /* @__PURE__ */ jsxs("span", { className: "text-gray-500 text-xs", children: [
            "🎮 ",
            /* @__PURE__ */ jsx("span", { className: "text-white font-semibold", children: active.gamemode })
          ] })
        ] }),
        active && (() => {
          if (active.status === "live") return /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
            /* @__PURE__ */ jsxs("button", { onClick: () => setTab("bracket"), className: "inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105", style: {
              background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)",
              boxShadow: "0 0 32px rgba(220,38,38,0.4), 0 4px 16px rgba(0,0,0,0.4)"
            }, onMouseEnter: (e) => {
              e.currentTarget.style.boxShadow = "0 0 48px rgba(220,38,38,0.6), 0 4px 20px rgba(0,0,0,0.5)";
            }, onMouseLeave: (e) => {
              e.currentTarget.style.boxShadow = "0 0 32px rgba(220,38,38,0.4), 0 4px 16px rgba(0,0,0,0.4)";
            }, children: [
              /* @__PURE__ */ jsxs("span", { className: "relative flex h-2 w-2", children: [
                /* @__PURE__ */ jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" }),
                /* @__PURE__ */ jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-red-300" })
              ] }),
              "Watch Now",
              /* @__PURE__ */ jsx("span", { className: "opacity-70", children: "→" })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-2", children: "Tournament is live — follow the bracket in real time" })
          ] });
          if (canRegister) return /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
            /* @__PURE__ */ jsxs("button", { onClick: () => setShowReg(true), className: "inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#00BFFF] hover:bg-[#00BFFF]/85 text-black font-bold text-sm transition-all shadow-lg shadow-[#00BFFF]/25 hover:scale-105 hover:shadow-[#00BFFF]/40", children: [
              "⚔️ Register Your Team",
              /* @__PURE__ */ jsx("span", { className: "opacity-70", children: "→" })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-2", children: "Registrations are open — spots are limited" })
          ] });
          if (active.status === "upcoming") return /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
            /* @__PURE__ */ jsx("div", { className: "inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm cursor-default", children: "🔔 Registration Opening Soon" }),
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-2", children: "Stay tuned — watch the Announcements tab for updates" })
          ] });
          if (active.status === "registration_closed") return /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
            /* @__PURE__ */ jsx("div", { className: "inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/10 text-gray-500 font-bold text-sm cursor-default", children: "🚫 Registration Closed" }),
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-2", children: "The bracket is set — follow the matches in the Bracket tab" })
          ] });
          return null;
        })()
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "sticky top-16 z-30 bg-[#0B0F17]/95 backdrop-blur-md border-b border-white/5", children: /* @__PURE__ */ jsx("div", { className: "max-w-7xl mx-auto px-4", children: /* @__PURE__ */ jsx("div", { className: "flex gap-1 overflow-x-auto scrollbar-hide py-2", children: TABS.map((t) => /* @__PURE__ */ jsxs("button", { onClick: () => setTab(t.id), className: `flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${tab === t.id ? "bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"}`, children: [
      /* @__PURE__ */ jsx("span", { children: t.icon }),
      t.label,
      t.id === "live" && active?.status === "live" && /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" })
    ] }, t.id)) }) }) }),
    /* @__PURE__ */ jsxs("main", { className: "max-w-7xl mx-auto px-4 py-8", children: [
      tab === "home" && /* @__PURE__ */ jsx(TournamentHome, { active, onRegisterClick: canRegister ? () => setShowReg(true) : void 0 }),
      tab === "bracket" && /* @__PURE__ */ jsx(TournamentBracket, { tournament: active }),
      tab === "schedule" && /* @__PURE__ */ jsx(TournamentSchedule, { tournament: active }),
      tab === "live" && /* @__PURE__ */ jsx(LiveTournament, { tournament: active }),
      tab === "prizes" && /* @__PURE__ */ jsx(TournamentPrizes, { tournament: active }),
      tab === "rules" && /* @__PURE__ */ jsx(TournamentRules, { tournament: active }),
      tab === "stats" && /* @__PURE__ */ jsx(TournamentStats, { tournament: active }),
      tab === "announcements" && /* @__PURE__ */ jsx(TournamentAnnouncements, { tournament: active }),
      tab === "archive" && /* @__PURE__ */ jsx(TournamentArchive, { archives })
    ] }),
    /* @__PURE__ */ jsx("footer", { className: "border-t border-white/5 py-8 text-center text-gray-600 text-sm", children: "Blue Tiers · Tournament Hub · All results are final" }),
    showReg && active && /* @__PURE__ */ jsx(TeamRegistration, { tournament: active, onClose: () => setShowReg(false) })
  ] });
}
export {
  TournamentPage as component
};
