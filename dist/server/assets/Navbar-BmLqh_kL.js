import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link } from "@tanstack/react-router";
import { Search, X, ArrowRight, Zap, Tag, Settings, Mail, Twitch, Github, Twitter, Youtube, MessageCircle, Globe, Shield, Star, User, Home, ShoppingBag, ArrowLeftRight, Pickaxe, Trophy, BarChart2 } from "lucide-react";
import { t as tierColors, T as TIER_ORDER, E as EventBanner } from "./HomepageBanners-Db1v9XpX.js";
import "react-dom";
import { u as useHomepageConfig } from "./homepageStore-KPOXxduW.js";
const playersData = /* @__PURE__ */ JSON.parse('[{"name":"_Hollowshade_","head":"https://mc-heads.net/avatar/_Hollowshade_","region":"Asia","ranks":{"mace":"LT3","sword":"LT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"A3MIR","head":"https://mc-heads.net/avatar/A3MIR","region":"Europe","ranks":{"mace":"HT3","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"adambobjh22","head":"https://mc-heads.net/avatar/adambobjh22","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT4"}},{"name":"AliBicimss","head":"https://mc-heads.net/avatar/AliBicimss","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"LT3","diapot":"NONE","crystal":"NONE"}},{"name":"bananastylze","head":"https://mc-heads.net/avatar/bananastylze","region":"North America","ranks":{"mace":"NONE","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"Bav3r1","head":"https://mc-heads.net/avatar/Bav3r1","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT4"}},{"name":"Becanaldo_","head":"https://mc-heads.net/avatar/Becanaldo_","region":"Asia","ranks":{"mace":"HT4","sword":"LT3","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"BlackTagX","head":"https://mc-heads.net/avatar/BlackTagX","region":"Asia","ranks":{"mace":"LT4","sword":"HT4","axe":"LT4","uhc":"HT5","nethpot":"HT4","diapot":"HT4","crystal":"LT5"}},{"name":"Blitzor_","head":"https://mc-heads.net/avatar/Blitzor_","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"LT3","diapot":"NONE","crystal":"NONE"}},{"name":"Blue_Gaming08","head":"https://mc-heads.net/avatar/Blue_Gaming08","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"HT4","uhc":"LT4","nethpot":"LT4","diapot":"NONE","crystal":"HT4"}},{"name":"Caardss","head":"https://mc-heads.net/avatar/Caardss","region":"Asia","ranks":{"mace":"NONE","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"cakechan","head":"https://mc-heads.net/avatar/cakechan","region":"Asia","ranks":{"mace":"HT4","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"CloudScope","head":"https://mc-heads.net/avatar/CloudScope","region":"North America","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"HT3","crystal":"LT3"}},{"name":"ClownLegPiece","head":"https://mc-heads.net/avatar/ClownLegPiece","region":"North America","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT4"}},{"name":"cobwebmsater","head":"https://mc-heads.net/avatar/cobwebmsater","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"HT4","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"Cyan_Gaming07","head":"https://mc-heads.net/avatar/Cyan_Gaming07","region":"Asia","ranks":{"mace":"LT5","sword":"LT5","axe":"LT5","uhc":"LT5","nethpot":"LT5","diapot":"LT5","crystal":"LT5"}},{"name":"D3n1s1","head":"https://mc-heads.net/avatar/D3n1s1","region":"Europe","ranks":{"mace":"LT3","sword":"HT4","axe":"LT4","uhc":"LT5","nethpot":"LT3","diapot":"HT4","crystal":"LT4"}},{"name":"D4rkzu","head":"https://mc-heads.net/avatar/D4rkzu","region":"North America","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT3"}},{"name":"DarknzGamerz0101","head":"https://mc-heads.net/avatar/DarknzGamerz0101","region":"Asia","ranks":{"mace":"HT4","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"datwildchild","head":"https://mc-heads.net/avatar/datwildchild","region":"North America","ranks":{"mace":"NONE","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"Die_Melone1","head":"https://mc-heads.net/avatar/Die_Melone1","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT5"}},{"name":"feet_lover420","head":"https://mc-heads.net/avatar/feet_lover420","region":"Europe","ranks":{"mace":"HT3","sword":"NONE","axe":"LT4","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"frag717","head":"https://mc-heads.net/avatar/frag717","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT4"}},{"name":"getgoonedon","head":"https://mc-heads.net/avatar/getgoonedon","region":"North America","ranks":{"mace":"NONE","sword":"LT3","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"Hokfr","head":"https://mc-heads.net/avatar/Hokfr","region":"Asia","ranks":{"mace":"NONE","sword":"LT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"Hxckster","head":"https://mc-heads.net/avatar/Hxckster","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT4"}},{"name":"IDO1299","head":"https://mc-heads.net/avatar/IDO1299","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT5"}},{"name":"IMBATMAN","head":"https://mc-heads.net/avatar/IMBATMAN","region":"Asia","ranks":{"mace":"NONE","sword":"LT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"ItzInno","head":"https://mc-heads.net/avatar/ItzInno","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT3"}},{"name":"ItzMarlowww","head":"https://mc-heads.net/avatar/ItzMarlowww","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"HT4","uhc":"LT4","nethpot":"LT4","diapot":"NONE","crystal":"HT4"}},{"name":"ItzV0id_MC","head":"https://mc-heads.net/avatar/ItzV0id_MC","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT3"}},{"name":"jrizzo141","head":"https://mc-heads.net/avatar/jrizzo141","region":"North America","ranks":{"mace":"NONE","sword":"LT3","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"K0N12","head":"https://mc-heads.net/avatar/K0N12","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"LT3","crystal":"NONE"}},{"name":"Kiqyu","head":"https://mc-heads.net/avatar/Kiqyu","region":"Europe","ranks":{"mace":"NONE","sword":"HT3","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"ko2o","head":"https://mc-heads.net/avatar/ko2o","region":"Europe","ranks":{"mace":"NONE","sword":"LT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"laz_rexx","head":"https://mc-heads.net/avatar/laz_rexx","region":"North America","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT5"}},{"name":"Letahrt","head":"https://mc-heads.net/avatar/Letahrt","region":"North America","ranks":{"mace":"LT2","sword":"NONE","axe":"NONE","uhc":"LT4","nethpot":"HT4","diapot":"LT4","crystal":"NONE"}},{"name":"Matthew10999","head":"https://mc-heads.net/avatar/Matthew10999","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT4"}},{"name":"mohanazo","head":"https://mc-heads.net/avatar/mohanazo","region":"Asia","ranks":{"mace":"HT4","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"HT4","diapot":"NONE","crystal":"HT4"}},{"name":"mondoster","head":"https://mc-heads.net/avatar/mondoster","region":"Europe","ranks":{"mace":"LT4","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"nike_kz","head":"https://mc-heads.net/avatar/nike_kz","region":"Europe","ranks":{"mace":"HT5","sword":"LT3","axe":"HT4","uhc":"LT4","nethpot":"LT3","diapot":"LT3","crystal":"LT5"}},{"name":"nikkgming896","head":"https://mc-heads.net/avatar/nikkgming896","region":"Asia","ranks":{"mace":"HT5","sword":"HT5","axe":"LT4","uhc":"HT5","nethpot":"HT5","diapot":"LT4","crystal":"LT5"}},{"name":"noctharyx","head":"https://mc-heads.net/avatar/noctharyx","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT3"}},{"name":"Not_Darsh_Mehta","head":"https://mc-heads.net/avatar/Not_Darsh_Mehta","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"HT5","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"NotKenz0d","head":"https://mc-heads.net/avatar/NotKenz0d","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT4"}},{"name":"Nyxveil7","head":"https://mc-heads.net/avatar/Nyxveil7","region":"Oceania","ranks":{"mace":"HT5","sword":"HT4","axe":"HT4","uhc":"HT5","nethpot":"HT4","diapot":"HT4","crystal":"LT4"}},{"name":"oStingray","head":"https://mc-heads.net/avatar/oStingray","region":"North America","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT4"}},{"name":"oWashed__","head":"https://mc-heads.net/avatar/oWashed__","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"HT4","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"Prime__","head":"https://mc-heads.net/avatar/Prime__","region":"Europe","ranks":{"mace":"LT3","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"PrinceMark","head":"https://mc-heads.net/avatar/PrinceMark","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT4"}},{"name":"quiezer","head":"https://mc-heads.net/avatar/quiezer","region":"North America","ranks":{"mace":"NONE","sword":"LT3","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"RealKairo_","head":"https://mc-heads.net/avatar/RealKairo_","region":"Asia","ranks":{"mace":"LT4","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"sentialbeing","head":"https://mc-heads.net/avatar/sentialbeing","region":"North America","ranks":{"mace":"NONE","sword":"HT5","axe":"LT4","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"smoretastic","head":"https://mc-heads.net/avatar/smoretastic","region":"North America","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"LT4","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"SomeRandomDude54","head":"https://mc-heads.net/avatar/SomeRandomDude54","region":"Europe","ranks":{"mace":"HT4","sword":"HT4","axe":"HT4","uhc":"NONE","nethpot":"LT3","diapot":"LT3","crystal":"NONE"}},{"name":"stinklezinger4","head":"https://mc-heads.net/avatar/stinklezinger4","region":"Asia","ranks":{"mace":"LT3","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"SWAGFORLIFE","head":"https://mc-heads.net/avatar/SWAGFORLIFE","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"LT3","diapot":"NONE","crystal":"HT4"}},{"name":"Tegress","head":"https://mc-heads.net/avatar/Tegress","region":"North America","ranks":{"mace":"HT2","sword":"LT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"HT5"}},{"name":"TrionMC_","head":"https://mc-heads.net/avatar/TrionMC_","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"HT5","diapot":"NONE","crystal":"LT4"}},{"name":"Txeqym","head":"https://mc-heads.net/avatar/Txeqym","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"HT4","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"vertex16_","head":"https://mc-heads.net/avatar/vertex16_","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"LT3","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"vockzy7","head":"https://mc-heads.net/avatar/vockzy7","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT3"}},{"name":"Win_g","head":"https://mc-heads.net/avatar/Win_g","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT4"}},{"name":"Wyll_xx","head":"https://mc-heads.net/avatar/Wyll_xx","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT3"}},{"name":"WyoCold","head":"https://mc-heads.net/avatar/WyoCold","region":"Asia","ranks":{"mace":"NONE","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"xstop","head":"https://mc-heads.net/avatar/xstop","region":"North America","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"LT5","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}},{"name":"Zano_0","head":"https://mc-heads.net/avatar/Zano_0","region":"Europe","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"LT2"}},{"name":"zenith_fr","head":"https://mc-heads.net/avatar/zenith_fr","region":"Asia","ranks":{"mace":"NONE","sword":"NONE","axe":"NONE","uhc":"NONE","nethpot":"LT3","diapot":"NONE","crystal":"NONE"}},{"name":"Zyr3n","head":"https://mc-heads.net/avatar/Zyr3n","region":"Europe","ranks":{"mace":"LT4","sword":"HT4","axe":"HT4","uhc":"LT3","nethpot":"HT4","diapot":"LT4","crystal":"HT4"}},{"name":"zyzy","head":"https://mc-heads.net/avatar/zyzy","region":"Asia","ranks":{"mace":"NONE","sword":"HT4","axe":"NONE","uhc":"NONE","nethpot":"NONE","diapot":"NONE","crystal":"NONE"}}]');
const MODE_LABELS = {
  sword: "Sword",
  crystal: "Crystal",
  axe: "Axe",
  mace: "Mace",
  uhc: "UHC",
  nethpot: "Nethpot",
  diapot: "Diapot"
};
function getBestRank(ranks) {
  let best = null;
  let bestIdx = Infinity;
  for (const [mode, tier] of Object.entries(ranks)) {
    if (!tier || tier === "NONE" || tier === "None") continue;
    const idx = TIER_ORDER.indexOf(tier);
    if (idx !== -1 && idx < bestIdx) {
      bestIdx = idx;
      best = { mode: MODE_LABELS[mode] ?? mode, tier };
    }
  }
  return best;
}
function getTopRanks(ranks) {
  return Object.entries(ranks).filter(([, t]) => t && t !== "NONE" && t !== "None").sort((a, b) => TIER_ORDER.indexOf(a[1]) - TIER_ORDER.indexOf(b[1])).slice(0, 3).map(([mode, tier]) => ({ mode: MODE_LABELS[mode] ?? mode, tier }));
}
function PlayerSearchModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const players = playersData;
  const results = query.trim().length === 0 ? players.slice(0, 8) : players.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  const handleClose = useCallback(() => {
    setQuery("");
    setSelected(0);
    onClose();
  }, [onClose]);
  const goToPlayer = useCallback((name) => {
    navigate({ to: "/rankings", search: { q: name } });
    handleClose();
  }, [navigate, handleClose]);
  const goToSearch = useCallback(() => {
    if (query.trim()) {
      navigate({ to: "/rankings", search: { q: query.trim() } });
      handleClose();
    }
  }, [query, navigate, handleClose]);
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelected(0);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (results[selected]) goToPlayer(results[selected].name);
        else goToSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, handleClose, goToPlayer, goToSearch]);
  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  useEffect(() => {
    setSelected(0);
  }, [query]);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4",
      style: { backdropFilter: "blur(6px)", background: "rgba(0,6,15,0.75)" },
      onClick: (e) => e.target === e.currentTarget && handleClose(),
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: "w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl",
          style: {
            background: "rgba(5, 12, 28, 0.97)",
            border: "1px solid rgba(0, 160, 255, 0.18)",
            boxShadow: "0 0 60px rgba(0, 120, 255, 0.12), 0 25px 50px rgba(0,0,0,0.6)"
          },
          children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]", children: [
              /* @__PURE__ */ jsx(Search, { size: 16, className: "text-[#00BFFF] flex-shrink-0" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  ref: inputRef,
                  value: query,
                  onChange: (e) => setQuery(e.target.value),
                  placeholder: "Search player...",
                  className: "flex-1 bg-transparent text-white text-[15px] placeholder-white/25 outline-none"
                }
              ),
              query && /* @__PURE__ */ jsx("button", { onClick: () => setQuery(""), className: "text-white/30 hover:text-white/60 transition-colors", children: /* @__PURE__ */ jsx(X, { size: 14 }) }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: handleClose,
                  className: "text-[10px] text-white/25 border border-white/10 rounded px-1.5 py-0.5 font-mono hover:text-white/50 hover:border-white/20 transition-all ml-1",
                  children: "ESC"
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { ref: listRef, className: "max-h-[420px] overflow-y-auto py-1.5", children: results.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "px-4 py-8 text-center", children: [
              /* @__PURE__ */ jsx("div", { className: "text-3xl mb-2", children: "🔍" }),
              /* @__PURE__ */ jsxs("p", { className: "text-white/30 text-sm", children: [
                'No players found for "',
                /* @__PURE__ */ jsx("span", { className: "text-white/50", children: query }),
                '"'
              ] })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              !query && /* @__PURE__ */ jsx("div", { className: "px-4 py-1.5 mb-1", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-white/25 uppercase tracking-widest", children: "Top Players" }) }),
              results.map((player, i) => {
                const best = getBestRank(player.ranks);
                const topRanks = getTopRanks(player.ranks);
                const colors = best ? tierColors[best.tier] : null;
                const isSelected = i === selected;
                return /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => goToPlayer(player.name),
                    onMouseEnter: () => setSelected(i),
                    className: `w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"}`,
                    children: [
                      /* @__PURE__ */ jsx(
                        "div",
                        {
                          className: "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-black",
                          style: {
                            background: best && colors ? `${colors.glow ?? "rgba(0,100,255,0.15)"}` : "rgba(255,255,255,0.05)",
                            border: `1px solid ${best && colors ? colors.borderHex ?? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.08)"}`,
                            color: best && colors ? colors.hex ?? "#00BFFF" : "#555"
                          },
                          children: player.name[0]?.toUpperCase()
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { className: "flex-1 text-left min-w-0", children: [
                        /* @__PURE__ */ jsx("p", { className: "text-white text-[13px] font-semibold truncate", children: player.name }),
                        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 mt-0.5 flex-wrap", children: [
                          topRanks.map(({ mode, tier }) => {
                            const tc = tierColors[tier];
                            return /* @__PURE__ */ jsxs(
                              "span",
                              {
                                className: `text-[10px] px-1.5 py-0.5 rounded font-bold border ${tc.bg} ${tc.text} ${tc.border}`,
                                children: [
                                  tier,
                                  " ",
                                  /* @__PURE__ */ jsx("span", { className: "opacity-50 font-normal", children: mode })
                                ]
                              },
                              mode
                            );
                          }),
                          topRanks.length === 0 && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-white/20", children: "No ranks" })
                        ] })
                      ] }),
                      /* @__PURE__ */ jsx(ArrowRight, { size: 12, className: `flex-shrink-0 transition-opacity ${isSelected ? "text-[#00BFFF] opacity-100" : "text-white/20 opacity-0"}` })
                    ]
                  },
                  player.name
                );
              }),
              query.trim() && /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: goToSearch,
                  className: "w-full flex items-center gap-2 px-4 py-2.5 mt-1 border-t border-white/[0.06] text-[#00BFFF]/70 hover:text-[#00BFFF] text-[12px] font-medium transition-colors hover:bg-white/[0.03]",
                  children: [
                    /* @__PURE__ */ jsx(Zap, { size: 12 }),
                    'View all results for "',
                    /* @__PURE__ */ jsx("span", { className: "font-bold", children: query }),
                    '"',
                    /* @__PURE__ */ jsx(ArrowRight, { size: 11, className: "ml-auto" })
                  ]
                }
              )
            ] }) }),
            /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-t border-white/[0.04] flex items-center gap-3 text-[10px] text-white/20", children: [
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx("kbd", { className: "font-mono", children: "↑↓" }),
                " navigate"
              ] }),
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx("kbd", { className: "font-mono", children: "↵" }),
                " select"
              ] }),
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx("kbd", { className: "font-mono", children: "Esc" }),
                " close"
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "ml-auto flex items-center gap-1", children: [
                /* @__PURE__ */ jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" }),
                players.length,
                " players"
              ] })
            ] })
          ]
        }
      )
    }
  );
}
const DiscordIcon = () => /* @__PURE__ */ jsx("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ jsx("path", { d: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" }) });
const SwordsLogo = () => /* @__PURE__ */ jsxs("svg", { width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsx("polyline", { points: "14.5 17.5 3 6 3 3 6 3 17.5 14.5" }),
  /* @__PURE__ */ jsx("line", { x1: "13", y1: "19", x2: "19", y2: "13" }),
  /* @__PURE__ */ jsx("line", { x1: "16", y1: "16", x2: "20", y2: "20" }),
  /* @__PURE__ */ jsx("line", { x1: "19", y1: "21", x2: "21", y2: "19" }),
  /* @__PURE__ */ jsx("polyline", { points: "14.5 6.5 18 3 21 3 21 6 17.5 9.5" }),
  /* @__PURE__ */ jsx("line", { x1: "5", y1: "14", x2: "9", y2: "18" }),
  /* @__PURE__ */ jsx("line", { x1: "7", y1: "21", x2: "3", y2: "21" }),
  /* @__PURE__ */ jsx("line", { x1: "3", y1: "18", x2: "5", y2: "21" })
] });
const ICON_MAP = {
  BarChart2,
  Trophy,
  Pickaxe,
  ArrowLeftRight,
  ShoppingBag,
  Search,
  Home,
  User,
  Star,
  Zap,
  Shield,
  Globe,
  MessageCircle,
  Youtube,
  Twitter,
  Github,
  Twitch,
  Mail,
  Settings,
  Tag
};
function Navbar() {
  const cfg = useHomepageConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [headerH, setHeaderH] = useState(0);
  const [bannerH, setBannerH] = useState(0);
  const headerRef = useRef(null);
  const bannerRef = useRef(null);
  const location = useLocation();
  const isActive = (to) => location.pathname === to;
  const isHomepage = location.pathname === "/";
  const visibleLinks = cfg.nav.links.filter((l) => l.visible);
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const active = isHomepage && cfg.event.showAboveNavbar && cfg.event.enabled && cfg.event.visible && cfg.event.hideOnScroll;
    if (!active) {
      setScrollOffset(0);
      return;
    }
    setScrollOffset(0);
    const handle = () => setScrollOffset(window.scrollY);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, [isHomepage, cfg.event.showAboveNavbar, cfg.event.enabled, cfg.event.visible, cfg.event.hideOnScroll]);
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBannerH(el.offsetHeight));
    ro.observe(el);
    setBannerH(el.offsetHeight);
    return () => ro.disconnect();
  }, [isHomepage, cfg.event.showAboveNavbar, cfg.event.enabled, cfg.event.visible]);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight));
    ro.observe(el);
    setHeaderH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(PlayerSearchModal, { open: searchOpen, onClose: () => setSearchOpen(false) }),
    /* @__PURE__ */ jsxs("header", { ref: headerRef, className: `${cfg.layout.navbarFixed ? "fixed" : "sticky"} top-0 left-0 right-0 z-50 w-full`, children: [
      isHomepage && cfg.event.showAboveNavbar && cfg.event.enabled && cfg.event.visible && (() => {
        const slideUp = cfg.event.hideOnScroll ? Math.min(scrollOffset, bannerH) : 0;
        return /* @__PURE__ */ jsx("div", { style: { height: Math.max(0, bannerH - slideUp), overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { ref: bannerRef, style: { transform: `translateY(-${slideUp}px)` }, children: /* @__PURE__ */ jsx(EventBanner, { event: cfg.event }) }) });
      })(),
      /* @__PURE__ */ jsx("div", { className: "bg-black/80 backdrop-blur-md border-b border-white/[0.06]", children: /* @__PURE__ */ jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between h-14", children: [
          /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2 text-white hover:opacity-80 transition-opacity flex-shrink-0", children: [
            cfg.media.logoUrl ? /* @__PURE__ */ jsx("img", { src: cfg.media.logoUrl, alt: "logo", className: "h-7 w-auto", onError: (e) => {
              e.currentTarget.style.display = "none";
            } }) : /* @__PURE__ */ jsx(SwordsLogo, {}),
            /* @__PURE__ */ jsx("span", { className: "font-bold text-[15px] tracking-tight", children: (() => {
              const [first, ...rest] = (cfg.nav.logoText || "").split(" ");
              return rest.length ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("span", { style: { background: "linear-gradient(90deg,#00BFFF,#0066FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }, children: first }),
                " ",
                rest.join(" ")
              ] }) : cfg.nav.logoText;
            })() })
          ] }),
          /* @__PURE__ */ jsxs("nav", { className: "hidden md:flex items-center bg-[#111111] border border-[#222222] rounded-xl px-1 py-1 gap-0.5", children: [
            visibleLinks.map((link) => {
              const Icon = ICON_MAP[link.icon] || BarChart2;
              const active = isActive(link.to);
              return link.external ? /* @__PURE__ */ jsxs(
                "a",
                {
                  href: link.to,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 text-[#888888] hover:text-white hover:bg-white/5",
                  children: [
                    /* @__PURE__ */ jsx(Icon, { size: 13, strokeWidth: 2 }),
                    link.label
                  ]
                },
                link.id
              ) : /* @__PURE__ */ jsxs(
                Link,
                {
                  to: link.to,
                  className: `flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${active ? "bg-[#222222] text-white" : "text-[#888888] hover:text-white hover:bg-white/5"}`,
                  children: [
                    /* @__PURE__ */ jsx(Icon, { size: 13, strokeWidth: 2 }),
                    link.label
                  ]
                },
                link.id
              );
            }),
            cfg.nav.showDiscord && /* @__PURE__ */ jsxs(
              "a",
              {
                href: cfg.nav.discordLink,
                target: "_blank",
                rel: "noopener noreferrer",
                className: "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium text-[#888888] hover:text-white hover:bg-white/5 transition-all duration-150",
                children: [
                  /* @__PURE__ */ jsx(DiscordIcon, {}),
                  "Discord"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "hidden md:flex items-center gap-2", children: cfg.nav.showSearch && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setSearchOpen(true),
              className: "flex items-center gap-2 bg-[#0a0f1a] border border-[#1a2540] rounded-xl px-3 py-1.5 min-w-[190px] cursor-pointer hover:border-[#00BFFF]/30 hover:bg-[#0d1525] transition-all duration-200 group",
              style: { boxShadow: "none" },
              children: [
                /* @__PURE__ */ jsx(Search, { size: 13, className: "text-[#00BFFF]/50 group-hover:text-[#00BFFF]/80 transition-colors flex-shrink-0" }),
                /* @__PURE__ */ jsx("span", { className: "text-[13px] text-[#555] flex-1 text-left group-hover:text-[#777] transition-colors", children: "Search Player" }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-0.5", children: [
                  /* @__PURE__ */ jsx("kbd", { className: "text-[10px] text-[#444] bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1 py-0.5 font-mono leading-none", children: "Ctrl" }),
                  /* @__PURE__ */ jsx("kbd", { className: "text-[10px] text-[#444] bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1 py-0.5 font-mono leading-none", children: "K" })
                ] })
              ]
            }
          ) }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setMobileOpen(!mobileOpen),
              className: "md:hidden p-2 rounded-lg text-[#666666] hover:text-white hover:bg-white/5 transition-colors",
              children: /* @__PURE__ */ jsxs("div", { className: "w-5 h-3.5 flex flex-col justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: `block h-0.5 bg-current transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-1.5" : ""}` }),
                /* @__PURE__ */ jsx("span", { className: `block h-0.5 bg-current transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}` }),
                /* @__PURE__ */ jsx("span", { className: `block h-0.5 bg-current transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}` })
              ] })
            }
          )
        ] }),
        mobileOpen && /* @__PURE__ */ jsxs("div", { className: "md:hidden pb-4 border-t border-[#1a1a1a] mt-1 pt-3 space-y-0.5", children: [
          cfg.nav.showSearch && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => {
                setMobileOpen(false);
                setSearchOpen(true);
              },
              className: "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#888888] hover:text-white hover:bg-white/5 transition-all",
              children: [
                /* @__PURE__ */ jsx(Search, { size: 14 }),
                "Search Player"
              ]
            }
          ),
          visibleLinks.map((link) => {
            const Icon = ICON_MAP[link.icon] || BarChart2;
            const active = isActive(link.to);
            return link.external ? /* @__PURE__ */ jsxs(
              "a",
              {
                href: link.to,
                target: "_blank",
                rel: "noopener noreferrer",
                onClick: () => setMobileOpen(false),
                className: "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#888888] hover:text-white hover:bg-white/5 transition-all",
                children: [
                  /* @__PURE__ */ jsx(Icon, { size: 14 }),
                  link.label
                ]
              },
              link.id
            ) : /* @__PURE__ */ jsxs(
              Link,
              {
                to: link.to,
                onClick: () => setMobileOpen(false),
                className: `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${active ? "text-white bg-[#1a1a1a]" : "text-[#888888] hover:text-white hover:bg-white/5"}`,
                children: [
                  /* @__PURE__ */ jsx(Icon, { size: 14 }),
                  link.label
                ]
              },
              link.id
            );
          }),
          cfg.nav.showDiscord && /* @__PURE__ */ jsxs(
            "a",
            {
              href: cfg.nav.discordLink,
              target: "_blank",
              rel: "noopener noreferrer",
              onClick: () => setMobileOpen(false),
              className: "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#888888] hover:text-white hover:bg-white/5 transition-all",
              children: [
                /* @__PURE__ */ jsx(DiscordIcon, {}),
                "Discord"
              ]
            }
          )
        ] })
      ] }) })
    ] }),
    cfg.layout.navbarFixed && /* @__PURE__ */ jsx("div", { "aria-hidden": true, style: { height: headerH } })
  ] });
}
export {
  Navbar as N
};
