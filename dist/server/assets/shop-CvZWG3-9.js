import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { N as Navbar } from "./Navbar-BmLqh_kL.js";
import { F as Footer } from "./Footer-BivHw4RG.js";
import { useState, useEffect, useCallback } from "react";
import { R as RARITY_NAMES, a as RARITY_COLORS, C as CATEGORY_LABELS, S as STATUS_LABELS, b as STATUS_COLORS, g as getShopItems, c as getMyPurchases, d as CATEGORY_ICONS, p as purchaseItem } from "./shopServer-DwluHy2H.js";
import { u as useMining, M as MiningProvider } from "./MiningContext-dzVrHI-J.js";
import "@tanstack/react-router";
import "lucide-react";
import "./HomepageBanners-Db1v9XpX.js";
import "react-dom";
import "./homepageStore-KPOXxduW.js";
import "./syncStore-C_ozCmAO.js";
import "./router-4Yeb1nX_.js";
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
import "./miningStore-vSM2TBEv.js";
import "./miningServer-B1jSqw9r.js";
const ITEMS_KEY = "bn_shop_items";
const PURCHASES_KEY = "bn_shop_purchases";
function safeSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function cacheShopItems(items) {
  safeSet(ITEMS_KEY, items);
}
function cachePurchases(purchases) {
  safeSet(PURCHASES_KEY, purchases);
}
function formatGems(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}
function ShopItemCard({ item, userGems, onBuy }) {
  const canAfford = userGems >= item.price;
  const rarityName = RARITY_NAMES[item.rarity] ?? "Unknown";
  const rarityColor = RARITY_COLORS[item.rarity] ?? "#9ca3af";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden group ${canAfford ? "border-white/10 hover:border-white/20 hover:shadow-lg" : "border-white/5 opacity-70"} bg-[#0D1117]`,
      style: item.featured ? {
        boxShadow: `0 0 0 1px ${rarityColor}30, 0 8px 32px ${rarityColor}15`
      } : {},
      children: [
        item.featured && /* @__PURE__ */ jsx(
          "div",
          {
            className: "absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
            style: { background: `${rarityColor}20`, color: rarityColor, border: `1px solid ${rarityColor}40` },
            children: "★ Featured"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "p-5 flex flex-col flex-1 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110",
                style: { background: `${rarityColor}15`, border: `1px solid ${rarityColor}30` },
                children: item.icon
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1",
                  style: { background: `${rarityColor}15`, color: rarityColor },
                  children: rarityName
                }
              ),
              /* @__PURE__ */ jsx("h3", { className: "text-white font-bold text-sm leading-tight truncate", children: item.name })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-xs leading-relaxed flex-1 line-clamp-3", children: item.description }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 pt-2 border-t border-white/5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx("span", { className: "text-blue-400 text-sm", children: "✨" }),
              /* @__PURE__ */ jsx("span", { className: `font-black text-sm ${canAfford ? "text-white" : "text-gray-600"}`, children: formatGems(item.price) }),
              /* @__PURE__ */ jsx("span", { className: "text-gray-600 text-[10px]", children: "Gems" })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => canAfford && onBuy(item),
                disabled: !canAfford,
                className: `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${canAfford ? "bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] hover:bg-[#00BFFF]/25 hover:border-[#00BFFF]/50 hover:shadow-[0_0_12px_rgba(0,191,255,0.2)] active:scale-95" : "bg-white/3 border border-white/5 text-gray-600 cursor-not-allowed"}`,
                children: canAfford ? "🛒 Buy" : "🔒 Locked"
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function PurchaseModal({ item, userGems, onConfirm, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  if (!item) return null;
  const totalCost = item.price * quantity;
  const canAfford = userGems >= totalCost;
  const rarityColor = RARITY_COLORS[item.rarity] ?? "#9ca3af";
  const rarityName = RARITY_NAMES[item.rarity] ?? "Unknown";
  async function handleConfirm() {
    if (!canAfford || loading) return;
    setLoading(true);
    try {
      await onConfirm(item, quantity);
    } finally {
      setLoading(false);
      setQuantity(1);
    }
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-center justify-center p-4",
      onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      },
      children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm", onClick: onClose }),
        /* @__PURE__ */ jsxs("div", { className: "relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0F17] shadow-2xl overflow-hidden", children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-[60px] pointer-events-none opacity-20",
              style: { background: rarityColor }
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "relative p-6 space-y-5", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: onClose,
                className: "absolute top-4 right-4 w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-gray-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center text-sm",
                children: "✕"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0",
                  style: { background: `${rarityColor}15`, border: `1px solid ${rarityColor}30` },
                  children: item.icon
                }
              ),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mb-1",
                    style: { background: `${rarityColor}15`, color: rarityColor },
                    children: rarityName
                  }
                ),
                /* @__PURE__ */ jsx("h3", { className: "text-white font-black text-lg leading-tight", children: item.name }),
                /* @__PURE__ */ jsxs("p", { className: "text-gray-500 text-xs mt-0.5", children: [
                  item.description.slice(0, 80),
                  "…"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx("label", { className: "text-gray-400 text-xs font-semibold uppercase tracking-wide", children: "Quantity" }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setQuantity((q) => Math.max(1, q - 1)),
                    className: "w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all font-bold text-lg flex items-center justify-center",
                    children: "−"
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "flex-1 text-center text-white font-black text-xl", children: quantity }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setQuantity((q) => q + 1),
                    className: "w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all font-bold text-lg flex items-center justify-center",
                    children: "+"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/8 bg-white/3 p-4 space-y-2.5", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
                /* @__PURE__ */ jsx("span", { className: "text-gray-500", children: "Price per item" }),
                /* @__PURE__ */ jsxs("span", { className: "text-white font-semibold", children: [
                  "✨ ",
                  item.price.toLocaleString()
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-sm", children: [
                /* @__PURE__ */ jsx("span", { className: "text-gray-500", children: "Quantity" }),
                /* @__PURE__ */ jsxs("span", { className: "text-white font-semibold", children: [
                  "× ",
                  quantity
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "border-t border-white/8 pt-2.5 flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-gray-400 font-semibold", children: "Total cost" }),
                /* @__PURE__ */ jsxs("span", { className: `font-black text-base ${canAfford ? "text-[#00BFFF]" : "text-red-400"}`, children: [
                  "✨ ",
                  totalCost.toLocaleString(),
                  " Gems"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-xs", children: [
                /* @__PURE__ */ jsx("span", { className: "text-gray-600", children: "Your balance" }),
                /* @__PURE__ */ jsxs("span", { className: `font-semibold ${canAfford ? "text-gray-400" : "text-red-500"}`, children: [
                  "✨ ",
                  Math.floor(userGems).toLocaleString(),
                  " Gems",
                  !canAfford && ` (need ${(totalCost - Math.floor(userGems)).toLocaleString()} more)`
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2.5 text-xs text-gray-500 bg-white/3 border border-white/8 rounded-xl p-3", children: [
              /* @__PURE__ */ jsx("span", { className: "shrink-0 mt-0.5", children: "ℹ️" }),
              /* @__PURE__ */ jsx("p", { children: "Your Gems will be deducted immediately. Staff will process your order and deliver in-game. Track your order in Purchase History." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: onClose,
                  className: "flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm font-semibold",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: handleConfirm,
                  disabled: !canAfford || loading,
                  className: `flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${canAfford && !loading ? "bg-[#00BFFF]/20 border border-[#00BFFF]/40 text-[#00BFFF] hover:bg-[#00BFFF]/30 hover:shadow-[0_0_20px_rgba(0,191,255,0.2)]" : "bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed"}`,
                  children: loading ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx("div", { className: "w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" }),
                    "Processing…"
                  ] }) : canAfford ? "✅ Confirm Purchase" : "🔒 Not Enough Gems"
                }
              )
            ] })
          ] })
        ] })
      ]
    }
  );
}
const PAGE_SIZE = 10;
function timeAgo(ms) {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1e3);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function formatDate(ms) {
  return new Date(ms).toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function StatusBadge({ status }) {
  const color = STATUS_COLORS[status];
  const dot = status === "pending" || status === "processing";
  return /* @__PURE__ */ jsxs(
    "span",
    {
      className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
      style: { background: `${color}15`, color, border: `1px solid ${color}30` },
      children: [
        dot && /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full animate-pulse", style: { background: color } }),
        STATUS_LABELS[status]
      ]
    }
  );
}
function PurchaseHistory({ purchases, loading }) {
  const [page, setPage] = useState(1);
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-16", children: /* @__PURE__ */ jsxs("div", { className: "text-center space-y-3", children: [
      /* @__PURE__ */ jsx("div", { className: "w-8 h-8 rounded-full border-2 border-[#00BFFF]/40 border-t-[#00BFFF] animate-spin mx-auto" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-sm", children: "Loading your purchases…" })
    ] }) });
  }
  if (purchases.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-16 gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-3xl", children: "🛒" }),
      /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-white font-semibold text-sm", children: "No purchases yet" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-1", children: "Browse the shop and spend your Gems!" })
      ] })
    ] });
  }
  const totalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = purchases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const totalSpent = purchases.reduce((s, p) => s + (p.refunded ? 0 : p.totalCost), 0);
  const refundTotal = purchases.reduce((s, p) => s + (p.refunded ? p.totalCost : 0), 0);
  const pending = purchases.filter((p) => p.status === "pending" || p.status === "processing").length;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/8 bg-[#0B0F17] p-3 text-center", children: [
        /* @__PURE__ */ jsx("p", { className: "text-white font-black text-lg", children: purchases.length }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-[10px]", children: "Total Orders" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-purple-500/15 bg-purple-500/5 p-3 text-center", children: [
        /* @__PURE__ */ jsxs("p", { className: "text-purple-400 font-black text-lg", children: [
          "✨ ",
          totalSpent >= 1e6 ? `${(totalSpent / 1e6).toFixed(1)}M` : totalSpent >= 1e3 ? `${(totalSpent / 1e3).toFixed(1)}K` : totalSpent.toLocaleString()
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-[10px]", children: "Gems Spent" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-white/8 bg-[#0B0F17] p-3 text-center", children: pending > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("p", { className: "text-amber-400 font-black text-lg", children: pending }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-[10px]", children: "Pending / Active" })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("p", { className: "text-gray-400 font-black text-lg", children: refundTotal > 0 ? `✨ ${refundTotal >= 1e3 ? `${(refundTotal / 1e3).toFixed(1)}K` : refundTotal.toLocaleString()}` : "—" }),
        /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-[10px]", children: "Gems Refunded" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("p", { className: "text-gray-600 text-xs", children: [
        purchases.length,
        " orders · Page ",
        safePage,
        " of ",
        totalPages
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "text-gray-700 text-[10px]", children: [
        "Showing ",
        (safePage - 1) * PAGE_SIZE + 1,
        "–",
        Math.min(safePage * PAGE_SIZE, purchases.length)
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-3", children: paginated.map((p) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/8 bg-[#0D1117] overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-4 flex items-center gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap mb-1", children: [
            /* @__PURE__ */ jsx("span", { className: "text-white font-bold text-sm truncate", children: p.itemName }),
            p.quantity > 1 && /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded", children: [
              "×",
              p.quantity
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded", children: CATEGORY_LABELS[p.category] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 flex-wrap text-xs text-gray-500", children: [
            /* @__PURE__ */ jsx("span", { className: "font-mono text-gray-600", children: p.id }),
            /* @__PURE__ */ jsx("span", { children: "•" }),
            /* @__PURE__ */ jsxs("span", { className: "text-purple-400 font-semibold", children: [
              "✨ ",
              p.totalCost.toLocaleString(),
              " Gems"
            ] }),
            /* @__PURE__ */ jsx("span", { children: "•" }),
            /* @__PURE__ */ jsx("span", { title: formatDate(p.createdAt), children: timeAgo(p.createdAt) })
          ] })
        ] }),
        /* @__PURE__ */ jsx(StatusBadge, { status: p.status })
      ] }),
      p.playerNotes && /* @__PURE__ */ jsx("div", { className: "px-4 pb-3", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 bg-[#00BFFF]/5 border border-[#00BFFF]/15 rounded-lg px-3 py-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-[#00BFFF] text-xs shrink-0", children: "📝" }),
        /* @__PURE__ */ jsx("p", { className: "text-[#00BFFF] text-xs", children: p.playerNotes })
      ] }) }),
      p.refunded && /* @__PURE__ */ jsx("div", { className: "px-4 pb-3", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2", children: [
        /* @__PURE__ */ jsx("span", { className: "text-amber-400 text-xs", children: "♻️" }),
        /* @__PURE__ */ jsxs("p", { className: "text-amber-400 text-xs", children: [
          "Refunded ✨ ",
          p.totalCost.toLocaleString(),
          " Gems",
          p.refundedAt ? ` · ${timeAgo(p.refundedAt)}` : ""
        ] })
      ] }) })
    ] }, p.id)) }),
    totalPages > 1 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 pt-2", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setPage((p) => Math.max(1, p - 1)),
          disabled: safePage === 1,
          className: "px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-semibold hover:text-white hover:border-white/20 disabled:opacity-30 transition-all",
          children: "← Previous"
        }
      ),
      Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setPage(p),
          className: `w-9 h-9 rounded-lg text-xs font-bold transition-all ${p === safePage ? "bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF]" : "border border-white/8 text-gray-500 hover:text-white hover:border-white/15"}`,
          children: p
        },
        p
      )),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
          disabled: safePage === totalPages,
          className: "px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-semibold hover:text-white hover:border-white/20 disabled:opacity-30 transition-all",
          children: "Next →"
        }
      )
    ] })
  ] });
}
const ICONS = {
  success: "✅",
  error: "❌",
  info: "💎",
  warning: "⚠️"
};
const COLORS = {
  success: "border-green-500/30 bg-green-500/10 text-green-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  info: "border-[#00BFFF]/30 bg-[#00BFFF]/10 text-[#00BFFF]",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400"
};
function ShopToast({ toast, onClear }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (toast) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onClear, 300);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [toast, onClear]);
  if (!toast) return null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 max-w-sm w-full mx-4 ${COLORS[toast.type]} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`,
      children: [
        /* @__PURE__ */ jsx("span", { className: "text-lg shrink-0", children: ICONS[toast.type] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium flex-1", children: toast.message }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setVisible(false);
              setTimeout(onClear, 300);
            },
            className: "text-current opacity-50 hover:opacity-100 transition-opacity shrink-0 text-xs",
            children: "✕"
          }
        )
      ]
    }
  );
}
const CATEGORIES = ["all", "ranks", "crate-keys", "amethyst-tools"];
function ShopPage() {
  const { user } = useMining();
  const userGems = user ? Math.floor(user.gems ?? 0) : 0;
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [tab, setTab] = useState("shop");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loadItems, setLoadItems] = useState(items.length === 0);
  const [loadHistory, setLoadHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);
  useEffect(() => {
    getShopItems().then((data) => {
      setItems(data);
      cacheShopItems(data);
    }).catch(() => {
    }).finally(() => setLoadItems(false));
  }, []);
  const loadPurchaseHistory = useCallback(() => {
    if (!user?.username) return;
    setLoadHistory(true);
    getMyPurchases({ data: { username: user.username } }).then((data) => {
      setPurchases(data);
      cachePurchases(data);
    }).catch(() => {
    }).finally(() => setLoadHistory(false));
  }, [user?.username]);
  useEffect(() => {
    if (user?.username) loadPurchaseHistory();
  }, [user?.username, loadPurchaseHistory]);
  useEffect(() => {
    function onShopUpdated() {
      getShopItems().then((data) => {
        setItems(data);
        cacheShopItems(data);
      }).catch(() => {
      });
      if (user?.username) {
        getMyPurchases({ data: { username: user.username } }).then((data) => {
          setPurchases(data);
          cachePurchases(data);
        }).catch(() => {
        });
      }
    }
    window.addEventListener("shop_updated", onShopUpdated);
    return () => window.removeEventListener("shop_updated", onShopUpdated);
  }, [user?.username]);
  const filtered = items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const featured = items.filter((i) => i.featured);
  async function handlePurchase(item, quantity) {
    if (!user?.username) {
      showToast("Please log in to purchase items.", "error");
      return;
    }
    try {
      const result = await purchaseItem({ data: { username: user.username, itemId: item.id, quantity } });
      if (result.success && result.purchase) {
        showToast(`🎉 Purchase successful! Order ${result.purchase.id} created.`, "success");
        setSelected(null);
        loadPurchaseHistory();
      } else {
        showToast(result.error ?? "Purchase failed. Please try again.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx("section", { className: "relative pt-8 pb-12 px-4 overflow-hidden", children: /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto text-center relative", children: [
      /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5 text-[#00BFFF] text-xs font-semibold mb-6 tracking-wide uppercase", children: [
        /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" }),
        "Gem Store"
      ] }),
      /* @__PURE__ */ jsxs("h1", { className: "font-black text-4xl sm:text-5xl text-white mb-4", children: [
        "Blue Tiers ",
        /* @__PURE__ */ jsx("span", { className: "text-gradient", children: "Shop" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-500 max-w-md mx-auto text-sm", children: "Spend your Gems on exclusive ranks, crate keys, and Amethyst tools. Mine BlueCoin → Exchange for Gems → Conquer the shop." }),
      user ? /* @__PURE__ */ jsxs("div", { className: "mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass border border-white/8", children: [
        /* @__PURE__ */ jsx("span", { className: "text-blue-400", children: "✨" }),
        /* @__PURE__ */ jsx("span", { className: "text-white font-black text-lg", children: Math.floor(userGems).toLocaleString() }),
        /* @__PURE__ */ jsx("span", { className: "text-gray-500 text-sm", children: "Gems" }),
        /* @__PURE__ */ jsx("div", { className: "w-px h-5 bg-white/10" }),
        /* @__PURE__ */ jsx("span", { className: "text-gray-500 text-xs", children: "Ready to spend" })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 text-amber-400 text-sm", children: [
        "⚠️ ",
        /* @__PURE__ */ jsxs("span", { children: [
          "Log in to the ",
          /* @__PURE__ */ jsx("a", { href: "/mining", className: "underline underline-offset-2 hover:text-amber-300", children: "Mining panel" }),
          " to see your Gems"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "max-w-6xl mx-auto px-4 mb-6", children: /* @__PURE__ */ jsx("div", { className: "flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 w-fit", children: [["shop", "🏪", "Browse Shop"], ["history", "📜", "Purchase History"]].map(([t, icon, label]) => /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => {
          setTab(t);
          if (t === "history") loadPurchaseHistory();
        },
        className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${tab === t ? "bg-[#00BFFF]/15 border border-[#00BFFF]/25 text-[#00BFFF]" : "text-gray-500 hover:text-gray-300"}`,
        children: [
          /* @__PURE__ */ jsx("span", { children: icon }),
          label,
          t === "history" && purchases.length > 0 && /* @__PURE__ */ jsx("span", { className: "px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold", children: purchases.length })
        ]
      },
      t
    )) }) }),
    /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto px-4 pb-16", children: [
      tab === "shop" && /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
        featured.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
            /* @__PURE__ */ jsx("span", { className: "text-amber-400 text-sm", children: "★" }),
            /* @__PURE__ */ jsx("h2", { className: "text-white font-bold text-sm uppercase tracking-wide", children: "Featured" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: featured.map((item) => /* @__PURE__ */ jsx(
            ShopItemCard,
            {
              item,
              userGems,
              onBuy: setSelected
            },
            item.id
          )) })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative max-w-sm", children: [
            /* @__PURE__ */ jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm", children: "🔍" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: search,
                onChange: (e) => setSearch(e.target.value),
                placeholder: "Search items…",
                className: "w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 outline-none focus:border-[#00BFFF]/30 focus:bg-[#00BFFF]/5 transition-all"
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 flex-wrap", children: CATEGORIES.map((cat) => /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setCategory(cat),
              className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${category === cat ? "bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF]" : "bg-white/4 border border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15"}`,
              children: [
                /* @__PURE__ */ jsx("span", { children: CATEGORY_ICONS[cat] }),
                CATEGORY_LABELS[cat]
              ]
            },
            cat
          )) }),
          loadItems ? /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", children: [...Array(8)].map((_, i) => /* @__PURE__ */ jsx("div", { className: "h-52 rounded-2xl border border-white/5 bg-white/2 animate-pulse" }, i)) }) : filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-16 gap-4", children: [
            /* @__PURE__ */ jsx("div", { className: "w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-2xl", children: "🔍" }),
            /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
              /* @__PURE__ */ jsx("p", { className: "text-white font-semibold text-sm", children: "No items found" }),
              /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mt-1", children: "Try a different search or category" })
            ] })
          ] }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", children: filtered.map((item) => /* @__PURE__ */ jsx(
            ShopItemCard,
            {
              item,
              userGems,
              onBuy: setSelected
            },
            item.id
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-white/5 bg-white/2 p-5 flex flex-wrap gap-6 items-center justify-center text-center", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mb-1", children: "How to earn Gems" }),
            /* @__PURE__ */ jsx("p", { className: "text-white text-sm font-semibold", children: "Mine BC → Exchange → Spend" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "w-px h-8 bg-white/8 hidden sm:block" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mb-1", children: "Purchase delivery" }),
            /* @__PURE__ */ jsx("p", { className: "text-white text-sm font-semibold", children: "Staff delivers in-game" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "w-px h-8 bg-white/8 hidden sm:block" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mb-1", children: "Refund policy" }),
            /* @__PURE__ */ jsx("p", { className: "text-white text-sm font-semibold", children: "Auto-refund if cancelled" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "w-px h-8 bg-white/8 hidden sm:block" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-gray-600 text-xs mb-1", children: "Support" }),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "https://discord.gg/DmEPAb3NFU",
                target: "_blank",
                rel: "noopener noreferrer",
                className: "text-[#00BFFF] text-sm font-semibold hover:underline",
                children: "Discord"
              }
            )
          ] })
        ] })
      ] }),
      tab === "history" && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-white font-bold text-sm", children: purchases.length > 0 ? `${purchases.length} purchase${purchases.length === 1 ? "" : "s"}` : "Purchase History" }),
          user && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: loadPurchaseHistory,
              className: "text-xs text-gray-500 hover:text-gray-300 border border-white/8 px-3 py-1.5 rounded-lg hover:border-white/15 transition-all",
              children: "↻ Refresh"
            }
          )
        ] }),
        !user ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-16 gap-4", children: [
          /* @__PURE__ */ jsx("div", { className: "w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-2xl", children: "🔒" }),
          /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsx("p", { className: "text-white font-semibold text-sm", children: "Login required" }),
            /* @__PURE__ */ jsxs("p", { className: "text-gray-600 text-xs mt-1", children: [
              /* @__PURE__ */ jsx("a", { href: "/mining", className: "text-[#00BFFF] hover:underline", children: "Log in to the Mining panel" }),
              " to see your purchases"
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsx(PurchaseHistory, { purchases, loading: loadHistory })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      PurchaseModal,
      {
        item: selected,
        userGems,
        onConfirm: handlePurchase,
        onClose: () => setSelected(null)
      }
    ),
    /* @__PURE__ */ jsx(ShopToast, { toast, onClear: () => setToast(null) })
  ] });
}
function ShopLayout() {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx(Navbar, {}),
    /* @__PURE__ */ jsx(ShopPage, {}),
    /* @__PURE__ */ jsx(Footer, {})
  ] });
}
const SplitComponent = () => /* @__PURE__ */ jsx(MiningProvider, { children: /* @__PURE__ */ jsx(ShopLayout, {}) });
export {
  SplitComponent as component
};
