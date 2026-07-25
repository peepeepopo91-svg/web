import { jsxs, jsx } from "react/jsx-runtime";
import { N as Navbar } from "./Navbar-BmLqh_kL.js";
import { F as Footer } from "./Footer-BivHw4RG.js";
import { useState, useEffect, useMemo } from "react";
import { u as useMining, M as MiningProvider } from "./MiningContext-CcluulaS.js";
import { g as getEconomyOverrides, E as EXCHANGE_CONSTANTS } from "./miningStore-vSM2TBEv.js";
import { M as MiningToast } from "./MiningToast-CdjChGIM.js";
import "@tanstack/react-router";
import "lucide-react";
import "./HomepageBanners-Db1v9XpX.js";
import "react-dom";
import "./homepageStore-KPOXxduW.js";
import "./syncStore-C_ozCmAO.js";
import "./router-D-1D0-Hz.js";
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
import "./miningServer-zKCKB2Hj.js";
function buildWavePoints(now, baseRate, minRate, maxRate, points = 96) {
  const { FLUCTUATION_PERIOD_MS } = EXCHANGE_CONSTANTS;
  const step = FLUCTUATION_PERIOD_MS / points;
  const amplitude = (maxRate - minRate) / 2;
  return Array.from({ length: points }, (_, i) => {
    const tMs = now - (points - 1 - i) * step;
    const t = (tMs % FLUCTUATION_PERIOD_MS + FLUCTUATION_PERIOD_MS) % FLUCTUATION_PERIOD_MS / FLUCTUATION_PERIOD_MS;
    const wave = Math.sin(2 * Math.PI * t) * 0.65 + Math.sin(2 * Math.PI * t * 2.7 + 1.2) * 0.35;
    return Math.round(baseRate + wave * amplitude);
  });
}
function RateChart({ points, min, max, base, current }) {
  const W = 600;
  const H = 120;
  const PAD = 8;
  const range = max - min || 1;
  const scaleY = (v) => PAD + (1 - (v - min) / range) * (H - PAD * 2);
  const scaleX = (i) => PAD + i / (points.length - 1) * (W - PAD * 2);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(" ");
  const area = d + ` L${scaleX(points.length - 1).toFixed(1)},${H} L${PAD},${H} Z`;
  const baseY = scaleY(base);
  const curX = scaleX(points.length - 1);
  const curY = scaleY(current);
  return /* @__PURE__ */ jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full h-28", preserveAspectRatio: "none", children: [
    /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: "exchRateGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [
      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#00BFFF", stopOpacity: "0.25" }),
      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#00BFFF", stopOpacity: "0.02" })
    ] }) }),
    /* @__PURE__ */ jsx("path", { d: area, fill: "url(#exchRateGrad)" }),
    /* @__PURE__ */ jsx(
      "line",
      {
        x1: PAD,
        y1: baseY,
        x2: W - PAD,
        y2: baseY,
        stroke: "#ffffff",
        strokeOpacity: "0.12",
        strokeWidth: "1",
        strokeDasharray: "4 4"
      }
    ),
    /* @__PURE__ */ jsx(
      "line",
      {
        x1: PAD,
        y1: scaleY(min),
        x2: W - PAD,
        y2: scaleY(min),
        stroke: "#ef4444",
        strokeOpacity: "0.2",
        strokeWidth: "1",
        strokeDasharray: "2 4"
      }
    ),
    /* @__PURE__ */ jsx(
      "line",
      {
        x1: PAD,
        y1: scaleY(max),
        x2: W - PAD,
        y2: scaleY(max),
        stroke: "#22c55e",
        strokeOpacity: "0.2",
        strokeWidth: "1",
        strokeDasharray: "2 4"
      }
    ),
    /* @__PURE__ */ jsx("path", { d, fill: "none", stroke: "#00BFFF", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }),
    /* @__PURE__ */ jsx("circle", { cx: curX, cy: curY, r: "5", fill: "#00BFFF" }),
    /* @__PURE__ */ jsx("circle", { cx: curX, cy: curY, r: "9", fill: "#00BFFF", fillOpacity: "0.2" })
  ] });
}
function TxLimitBadge({ used, limit }) {
  const remaining = limit - used;
  const exhausted = remaining <= 0;
  return /* @__PURE__ */ jsxs("div", { className: `flex items-center gap-3 px-4 py-2.5 rounded-xl border ${exhausted ? "bg-red-500/8 border-red-500/20" : "bg-[#00BFFF]/5 border-[#00BFFF]/15"}`, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
      /* @__PURE__ */ jsx("p", { className: `text-[10px] uppercase tracking-widest font-semibold ${exhausted ? "text-red-400" : "text-gray-500"}`, children: "Daily Exchanges Remaining" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-1.5 mt-0.5", children: [
        /* @__PURE__ */ jsx("span", { className: `font-black text-2xl font-['Space_Grotesk'] ${exhausted ? "text-red-400" : "text-white"}`, children: remaining }),
        /* @__PURE__ */ jsxs("span", { className: "text-gray-600 text-sm", children: [
          "/ ",
          limit
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-1", children: Array.from({ length: limit }, (_, i) => /* @__PURE__ */ jsx(
      "div",
      {
        className: `w-2 h-2 rounded-full transition-all duration-300 ${i < remaining ? "bg-[#00BFFF] shadow-[0_0_6px_rgba(0,191,255,0.8)]" : "bg-white/10"}`
      },
      i
    )) })
  ] });
}
function ExchangePanel() {
  const { user, currentRate, exchange } = useMining();
  const [direction, setDirection] = useState("bc-to-gems");
  const [inputValue, setInputValue] = useState("");
  const [lastTx, setLastTx] = useState(null);
  const [txError, setTxError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);
  const ov = getEconomyOverrides();
  const minRate = ov.MIN_RATE ?? EXCHANGE_CONSTANTS.MIN_RATE;
  const maxRate = ov.MAX_RATE ?? EXCHANGE_CONSTANTS.MAX_RATE;
  const baseRate = ov.BASE_RATE ?? EXCHANGE_CONSTANTS.BASE_RATE;
  const feePct = ov.FEE_PCT ?? EXCHANGE_CONSTANTS.FEE_PCT;
  const txLimit = ov.DAILY_TX_LIMIT ?? EXCHANGE_CONSTANTS.DAILY_TX_LIMIT;
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(id);
  }, []);
  const wavePoints = useMemo(
    () => now > 0 ? buildWavePoints(now, baseRate, minRate, maxRate) : Array(96).fill(baseRate),
    [now, baseRate, minRate, maxRate]
  );
  wavePoints.length > 1 ? wavePoints[1] : currentRate;
  const deviation = currentRate - baseRate;
  const amount = parseFloat(inputValue) || 0;
  const isBC2Gems = direction === "bc-to-gems";
  const gross = isBC2Gems ? amount * currentRate : amount / currentRate;
  const fee = gross * feePct;
  const net = gross - fee;
  const txUsed = Math.floor(user?.exchangeUsedToday ?? 0);
  const txRemaining = txLimit - txUsed;
  const txExhausted = txRemaining <= 0;
  const timeToReset = user ? Math.max(0, user.exchangeResetAt - Date.now()) : 0;
  const resetHours = Math.floor(timeToReset / 36e5);
  const resetMins = Math.floor(timeToReset % 36e5 / 6e4);
  const maxBC = Math.floor(user?.balance ?? 0);
  const maxGems = Math.floor(user?.gems ?? 0);
  function switchDirection(d) {
    setDirection(d);
    setInputValue("");
    setTxError("");
    setLastTx(null);
  }
  async function handleExchange() {
    if (!amount || amount <= 0) return;
    setTxError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    const result = exchange(amount, direction);
    if (result.error) {
      setTxError(result.error);
    } else {
      setLastTx({ gained: result.gained, fee: result.feePaid, direction, at: Date.now() });
      setInputValue("");
    }
    setLoading(false);
  }
  const canSubmit = !!user && amount > 0 && !loading && !txExhausted && (isBC2Gems ? amount <= maxBC : amount <= maxGems);
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto px-4 pb-16 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "glass rounded-2xl border border-[#00BFFF]/15 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4 mb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs uppercase tracking-widest mb-1", children: "Live Exchange Rate" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: "font-['Space_Grotesk'] font-black text-5xl text-[#00BFFF]", children: currentRate }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-400 text-lg mb-1", children: "Gems / BC" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mt-2 text-xs text-gray-600", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              "↓ Min ",
              /* @__PURE__ */ jsx("strong", { className: "text-red-400", children: minRate })
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              "◆ Base ",
              /* @__PURE__ */ jsx("strong", { className: "text-white", children: baseRate })
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              "↑ Max ",
              /* @__PURE__ */ jsx("strong", { className: "text-green-400", children: maxRate })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
          /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs mb-1", children: "4-hour wave cycle" }),
          /* @__PURE__ */ jsxs("div", { className: `px-3 py-1.5 rounded-lg text-xs font-bold border ${currentRate > baseRate ? "bg-green-500/10 border-green-500/20 text-green-400" : currentRate < baseRate ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/10 text-gray-400"}`, children: [
            currentRate > baseRate ? "▲ Above base" : currentRate < baseRate ? "▼ Below base" : "◆ At base",
            " ",
            "(",
            deviation >= 0 ? "+" : "",
            deviation,
            ")"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        RateChart,
        {
          points: wavePoints,
          min: minRate,
          max: maxRate,
          base: baseRate,
          current: currentRate
        }
      ),
      /* @__PURE__ */ jsx("p", { className: "text-gray-700 text-[10px] mt-1 text-center", children: "Full 4-hour wave cycle — current position at right" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-px mt-4 pt-4 border-t border-white/6 -mx-6 px-0", children: [
        { label: "Fee", value: `${(feePct * 100).toFixed(0)}%`, color: "text-pink-400" },
        { label: "Daily Limit", value: `${txLimit} trades`, color: "text-purple-400" },
        { label: "Remaining", value: `${txRemaining} / ${txLimit}`, color: txRemaining > 0 ? "text-[#00BFFF]" : "text-red-400" }
      ].map((s) => /* @__PURE__ */ jsxs("div", { className: "py-2 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: `font-['Space_Grotesk'] font-black text-base ${s.color}`, children: s.value }),
        /* @__PURE__ */ jsx("p", { className: "text-[9px] text-gray-600 uppercase tracking-wide mt-0.5", children: s.label })
      ] }, s.label)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "glass rounded-2xl border border-white/8 p-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-5", children: [
        /* @__PURE__ */ jsx("div", { className: "flex rounded-xl border border-white/8 overflow-hidden bg-white/2 p-0.5 gap-0.5 flex-1", children: ["bc-to-gems", "gems-to-bc"].map((d) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => switchDirection(d),
            className: `flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${direction === d ? "bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/25" : "text-gray-500 hover:text-gray-300"}`,
            children: d === "bc-to-gems" ? "💎 BC → Gems" : "💰 Gems → BC"
          },
          d
        )) }),
        /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-gray-500 tabular-nums whitespace-nowrap", children: [
          "1 BC = ",
          /* @__PURE__ */ jsxs("span", { className: "text-[#00BFFF] font-semibold", children: [
            currentRate,
            " 💎"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-5", children: [
        /* @__PURE__ */ jsx(TxLimitBadge, { used: txUsed, limit: txLimit }),
        user && txRemaining > 0 && /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-gray-700 mt-1.5 text-right", children: [
          "Resets in ",
          resetHours,
          "h ",
          resetMins,
          "m"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-[10px] text-gray-500 uppercase tracking-wide mb-2", children: [
            "You Pay (",
            isBC2Gems ? "BlueCoin" : "Gems",
            ")"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                min: "1",
                value: inputValue,
                onChange: (e) => {
                  setInputValue(e.target.value);
                  setTxError("");
                },
                placeholder: "0",
                className: "w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/50 rounded-xl px-4 py-3 pr-16 text-white text-sm outline-none transition-all"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-semibold", children: isBC2Gems ? "BC" : "💎" })
          ] }),
          user && /* @__PURE__ */ jsx("div", { className: "flex gap-1.5 mt-1.5", children: [25, 50, 100, "Max"].map((v) => {
            const maxVal = isBC2Gems ? maxBC : maxGems;
            const val = v === "Max" ? maxVal : Math.min(v, maxVal);
            return /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setInputValue(String(val)),
                className: "px-2 py-0.5 rounded text-[9px] text-gray-500 bg-white/3 border border-white/8 hover:text-white hover:border-white/20 transition-all",
                children: v === "Max" ? `Max (${maxVal})` : `${v}`
              },
              v
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-[10px] text-gray-500 uppercase tracking-wide mb-2", children: [
            "You Receive (",
            isBC2Gems ? "Gems" : "BlueCoin",
            ")"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "w-full bg-white/2 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: `text-sm font-bold ${net > 0 ? "text-[#00BFFF]" : "text-gray-600"}`, children: net > 0 ? net.toFixed(2) : "0" }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-500 font-semibold", children: isBC2Gems ? "💎 Gems" : "BC" })
          ] }),
          amount > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-1.5 space-y-0.5", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-gray-600", children: [
              "Gross: ",
              gross.toFixed(2),
              " ",
              isBC2Gems ? "💎" : "BC"
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-gray-700", children: [
              "Fee (2%): −",
              fee.toFixed(2),
              " ",
              isBC2Gems ? "💎" : "BC"
            ] })
          ] })
        ] })
      ] }),
      amount > 0 && /* @__PURE__ */ jsxs("div", { className: "mb-4 p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/15 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: isBC2Gems ? `1 BC = ${currentRate} 💎` : `${currentRate} 💎 = 1 BC` }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-400", children: isBC2Gems ? `${amount} BC → ${net.toFixed(2)} 💎` : `${amount} 💎 → ${net.toFixed(2)} BC` })
      ] }),
      txExhausted && /* @__PURE__ */ jsxs("div", { className: "mb-4 p-3 rounded-xl bg-red-500/8 border border-red-500/20 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-red-400 text-sm", children: "🔒" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-red-400 text-xs font-semibold", children: "Exchange limit reached" }),
          /* @__PURE__ */ jsxs("p", { className: "text-red-400/60 text-[10px] mt-0.5", children: [
            "You have used all ",
            txLimit,
            " exchanges today. Resets in ",
            resetHours,
            "h ",
            resetMins,
            "m."
          ] })
        ] })
      ] }),
      txError && /* @__PURE__ */ jsxs("p", { className: "mb-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2", children: [
        "⚠ ",
        txError
      ] }),
      lastTx && /* @__PURE__ */ jsxs("div", { className: "mb-4 p-3 rounded-xl bg-green-500/8 border border-green-500/20 flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("span", { className: "text-green-400 text-xs", children: "✓ Exchange complete" }),
        /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-400", children: [
          "+",
          Math.floor(lastTx.gained).toLocaleString(),
          " ",
          lastTx.direction === "bc-to-gems" ? "💎 Gems" : "BC",
          " received"
        ] })
      ] }),
      !user ? /* @__PURE__ */ jsx("div", { className: "w-full py-3 rounded-xl text-sm text-center text-gray-600 border border-white/8", children: "Log in to exchange" }) : /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleExchange,
          disabled: !canSubmit,
          className: "btn-primary w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:pointer-events-none",
          children: loading ? /* @__PURE__ */ jsxs("span", { className: "flex items-center justify-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
            "Processing…"
          ] }) : isBC2Gems ? `Exchange ${amount || 0} BC → ${net > 0 ? net.toFixed(2) : "0"} 💎 Gems` : `Exchange ${amount || 0} 💎 → ${net > 0 ? net.toFixed(2) : "0"} BC`
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "glass rounded-2xl border border-white/8 p-6", children: [
      /* @__PURE__ */ jsx("h3", { className: "font-semibold text-sm text-white mb-4", children: "How the Exchange Works" }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [
        {
          icon: "📈",
          title: "Dynamic Rate",
          body: `The rate fluctuates between ${minRate}–${maxRate} Gems/BC using two overlapping wave cycles, stabilizing around ${baseRate} Gems/BC base.`
        },
        {
          icon: "⚖️",
          title: "Trading Fee",
          body: `A ${(feePct * 100).toFixed(0)}% transaction fee is deducted from the output. This helps stabilize the market and maintain reserve liquidity.`
        },
        {
          icon: "🔒",
          title: "Daily Limit",
          body: `Each account can perform up to ${txLimit} exchange transactions per 24-hour window, in either direction. The limit resets automatically.`
        }
      ].map((item) => /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xl", children: item.icon }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-gray-300", children: item.title })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[11px] text-gray-600 leading-relaxed", children: item.body })
      ] }, item.title)) })
    ] })
  ] });
}
function ExchangePage() {
  const {
    user
  } = useMining();
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Navbar, {}),
    /* @__PURE__ */ jsx(MiningToast, {}),
    /* @__PURE__ */ jsxs("section", { className: "relative pt-8 pb-12 px-4 overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-blue-900/15 to-transparent pointer-events-none" }),
      /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto text-center relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-5 tracking-wide uppercase", children: [
          /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" }),
          "Dynamic Market"
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "font-black text-4xl sm:text-5xl text-white mb-3", children: [
          "BlueCoin ",
          /* @__PURE__ */ jsx("span", { className: "text-gradient", children: "Exchange" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-white/40 max-w-md mx-auto text-sm", children: "Convert your mined BlueCoin into Gems using the live dynamic exchange rate. Rate fluctuates algorithmically — time your trades wisely." }),
        user && /* @__PURE__ */ jsxs("div", { className: "mt-6 inline-flex items-center gap-4 px-5 py-3 rounded-2xl glass border border-white/8", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[#00BFFF] text-sm", children: "💎" }),
            /* @__PURE__ */ jsx("span", { className: "text-white font-bold", children: Math.floor(user.balance).toLocaleString() }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-500 text-xs", children: "BC" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "w-px h-5 bg-white/10" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-blue-400 text-sm", children: "✨" }),
            /* @__PURE__ */ jsx("span", { className: "text-white font-bold", children: Math.floor(user.gems ?? 0).toLocaleString() }),
            /* @__PURE__ */ jsx("span", { className: "text-gray-500 text-xs", children: "Gems" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(ExchangePanel, {}),
    /* @__PURE__ */ jsx(Footer, {})
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsx(MiningProvider, { children: /* @__PURE__ */ jsx(ExchangePage, {}) });
export {
  SplitComponent as component
};
