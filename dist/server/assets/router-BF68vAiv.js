import { useLocation, createRootRoute, useLoaderData, HeadContent, Scripts, Link, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { T as TSS_SERVER_FUNCTION, g as getServerFnById, c as createServerFn } from "../server.js";
import { z } from "zod";
import { H as HOMEPAGE_DEFAULTS, a as HomepageConfigProvider, g as gamemodes } from "./homepageStore-KPOXxduW.js";
import { useRef, useEffect } from "react";
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const loadSeoConfig = createServerFn({
  method: "GET"
}).handler(createSsrRpc("2bfeee87903e4e8c0006779de0f385348ee7c23394b757226d4e2949ff07d10f"));
const loadHomepageConfig = createServerFn({
  method: "GET"
}).handler(createSsrRpc("0d234e9817436d2c7e29533f66d1f8bb236ed72efa7698abe81b73752341abea"));
const savePublishConfig = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  canonicalUrl: z.string(),
  ga4Id: z.string(),
  gscVerificationTag: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  seoKeywords: z.string(),
  ogImageUrl: z.string()
})).handler(createSsrRpc("725df7688608b79fe1bd4fff76b6c8d0b2da6ad706eeec1260d441037cac73bc"));
const generateSitemap = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  baseUrl: z.string(),
  additionalUrls: z.array(z.string()).optional()
})).handler(createSsrRpc("ee79ca67965882c0929be3f4752c7831e75750a551a84c064a4ba51a5d06092d"));
const saveRobotsTxt = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  content: z.string()
})).handler(createSsrRpc("827c1a948924faac9d80bc809fdba6fbae032472e37d1f7fe48fbf921572c693"));
const loadRobotsTxt = createServerFn({
  method: "GET"
}).handler(createSsrRpc("6cdff83579d1b6c871daa33e3f58529ce74f5af2895d96f6c612518adfe4a5c2"));
const loadSitemapXml = createServerFn({
  method: "GET"
}).handler(createSsrRpc("46d26c3385af9d72b60d4c04783b28da24f314c21a0e771be32feca4da21ba2b"));
if (!globalThis.__growthSessions) globalThis.__growthSessions = /* @__PURE__ */ new Map();
if (!globalThis.__growthTodaySessions) globalThis.__growthTodaySessions = /* @__PURE__ */ new Set();
if (!globalThis.__growthTodayKey) globalThis.__growthTodayKey = "";
if (!("__growthCache" in globalThis)) globalThis.__growthCache = null;
if (!("__growthWriteTimer" in globalThis)) globalThis.__growthWriteTimer = null;
const recordPageView = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sessionId: z.string().max(64),
  page: z.string().max(256),
  referrer: z.string().max(512),
  ua: z.string().max(512),
  isNewSession: z.boolean()
})).handler(createSsrRpc("95844de006e2c9e2d7e983992605c64a3bd53c2c2493a031f1201548f14295ca"));
const heartbeatSession = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sessionId: z.string().max(64)
})).handler(createSsrRpc("23540e98c4b6ee3b45af87467ac670e6c58fe789d85b5a414633bff74fdfe852"));
const getGrowthStats = createServerFn({
  method: "GET"
}).handler(createSsrRpc("ac8e1029c9877c230f6e80aedc0bb5bb727246e5f9989f4b559a55dccfe8a0ad"));
const SID_KEY = "bt_sid";
const NEW_KEY = "bt_sid_new";
function getSessionId() {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}
function claimNewSession() {
  try {
    const isNew = !sessionStorage.getItem(NEW_KEY);
    if (isNew) sessionStorage.setItem(NEW_KEY, "1");
    return isNew;
  } catch {
    return false;
  }
}
function GrowthBeacon() {
  const location = useLocation();
  const firstRef = useRef(true);
  const prevPathRef = useRef(null);
  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return;
    const sid = getSessionId();
    const isNewSession = firstRef.current && claimNewSession();
    firstRef.current = false;
    const referrer = prevPathRef.current == null ? (typeof document !== "undefined" ? document.referrer : "") || "direct" : "direct";
    prevPathRef.current = location.pathname;
    recordPageView({
      data: {
        sessionId: sid,
        page: location.pathname,
        referrer,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        isNewSession
      }
    }).catch(() => {
    });
  }, [location.pathname]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const beat = () => {
      if (document.hidden) return;
      if (window.location.pathname.startsWith("/admin")) return;
      heartbeatSession({ data: { sessionId: getSessionId() } }).catch(() => {
      });
    };
    const id = setInterval(beat, 3e4);
    return () => clearInterval(id);
  }, []);
  return null;
}
function StarField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    };
    setSize();
    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.55 + 0.1,
      twinkle: Math.random() * 0.015 + 4e-3,
      offset: Math.random() * Math.PI * 2
    }));
    let animId;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.016;
      stars.forEach((s) => {
        const a = s.alpha * (0.55 + 0.45 * Math.sin(t * s.twinkle * 60 + s.offset));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => setSize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return /* @__PURE__ */ jsx(
    "canvas",
    {
      ref: canvasRef,
      className: "absolute inset-0 w-full h-full pointer-events-none"
    }
  );
}
function NotFound() {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4", children: [
    /* @__PURE__ */ jsx("p", { className: "text-7xl font-black text-blue-400", children: "404" }),
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold text-white", children: "Page Not Found" }),
    /* @__PURE__ */ jsx("p", { className: "text-zinc-400 max-w-md", children: "The page you're looking for doesn't exist or was moved." }),
    /* @__PURE__ */ jsx(Link, { to: "/", className: "px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors", children: "Go Home" })
  ] });
}
const Route$8 = createRootRoute({
  loader: async () => {
    try {
      const [seo, homepage] = await Promise.all([loadSeoConfig(), loadHomepageConfig()]);
      return { seo, homepage };
    } catch {
      return { seo: null, homepage: HOMEPAGE_DEFAULTS };
    }
  },
  head: (ctx) => {
    const d = ctx.loaderData;
    const seo = d.seo ?? {};
    const hp = d.homepage ?? HOMEPAGE_DEFAULTS;
    const title = hp.seo?.title?.trim() || seo.seoTitle?.trim() || "Blue Tiers | #1 Minecraft PvP Tier List";
    const desc = hp.seo?.description?.trim() || seo.seoDescription?.trim() || "#1 Tier List for all types of Minecraft PvP players.";
    const keywords = hp.seo?.keywords || seo.seoKeywords || "minecraft, pvp, tier list, blue tiers, rankings";
    const canonical = hp.seo?.canonical?.trim() || seo.canonicalUrl?.trim() || "https://bluetiers.bolt.host";
    const ogImage = hp.media?.ogImageUrl?.trim() || seo.ogImageUrl?.trim() || "";
    const ga4Id = hp.seo?.ga4Id?.trim() || seo.ga4Id?.trim() || "";
    const gscTag = hp.seo?.gscVerification?.trim() || seo.gscVerificationTag?.trim() || "";
    const sameAs = [hp.nav?.discordLink, seo?.twitterLink, seo?.youtubeLink].filter(Boolean);
    const schemaWebSite = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Blue Tiers",
      url: canonical,
      description: desc,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${canonical}/rankings?q={search_term_string}` },
        "query-input": "required name=search_term_string"
      },
      ...sameAs.length ? { sameAs } : {},
      publisher: {
        "@type": "Organization",
        name: "Blue Tiers",
        url: canonical,
        logo: { "@type": "ImageObject", url: `${canonical}/icons/icon-192x192.png` }
      }
    };
    const schemaBreadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: canonical },
        { "@type": "ListItem", position: 2, name: "Rankings", item: `${canonical}/rankings` },
        { "@type": "ListItem", position: 3, name: "Tournament", item: `${canonical}/tournament` },
        { "@type": "ListItem", position: 4, name: "Mining", item: `${canonical}/mining` }
      ]
    };
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title },
        { name: "description", content: desc },
        { name: "keywords", content: keywords },
        { name: "theme-color", content: "#00BFFF" },
        { name: "robots", content: "index, follow" },
        // Open Graph
        { property: "og:url", content: canonical },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...ogImage ? [{ property: "og:image", content: ogImage }] : [],
        // Twitter Card
        { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...ogImage ? [{ name: "twitter:image", content: ogImage }] : [],
        // Google Search Console verification
        ...gscTag ? [{ name: "google-site-verification", content: gscTag }] : []
      ],
      links: [
        { rel: "canonical", href: canonical },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap"
        }
      ],
      scripts: [
        // JSON-LD structured data (WebSite + BreadcrumbList)
        { type: "application/ld+json", children: JSON.stringify([schemaWebSite, schemaBreadcrumb]) },
        // Google Analytics 4
        ...ga4Id ? [
          { src: `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`, async: true },
          { children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');` }
        ] : []
      ]
    };
  },
  notFoundComponent: NotFound,
  shellComponent: RootDocument
});
function RootDocument({ children }) {
  const { homepage } = useLoaderData({ from: "__root__" });
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { className: "text-white font-['Inter'] antialiased", style: { background: "#00060f" }, children: [
      /* @__PURE__ */ jsxs(HomepageConfigProvider, { value: homepage ?? HOMEPAGE_DEFAULTS, children: [
        /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 pointer-events-none z-0", "aria-hidden": true, children: [
          /* @__PURE__ */ jsx(StarField, {}),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute inset-0",
              style: {
                background: "radial-gradient(ellipse 100% 70% at 50% -5%, rgba(0,100,255,0.22) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 15% 25%, rgba(0,60,180,0.15) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 85% 15%, rgba(0,180,255,0.10) 0%, transparent 50%)"
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "relative z-10", children }),
        /* @__PURE__ */ jsx(GrowthBeacon, {})
      ] }),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const $$splitComponentImporter$7 = () => import("./tournament-D6Zbpzfs.js");
const Route$7 = createFileRoute("/tournament")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const loadAllData = createServerFn({
  method: "GET"
}).handler(createSsrRpc("fb2978d20fe1134bdea5fda77c3454ab7fe06d6f8f25ce5810087b934cbf6d9d"));
const flushStoresToDisk = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sections: z.array(z.object({
    section: z.enum(["players", "gamemodes", "content", "event", "economy", "homepage", "tier-tagger"]),
    jsonData: z.string()
  }))
})).handler(createSsrRpc("122baba04c16401cfafde375ba7ad6643336700c3ea9139163e16817a4f8ac87"));
const fetchRepoStatus = createServerFn({
  method: "GET"
}).handler(createSsrRpc("0f21d5fdd8f8b02ab92db2f5563ffd9b0553c088bf6063ab1d5342805db5aa83"));
const validateAllData = createServerFn({
  method: "GET"
}).handler(createSsrRpc("f091b0a50c4636f6d4743812dc2225adc39a83cc84df7f264588bcf750d92a5b"));
const checkGitHubConnection = createServerFn({
  method: "GET"
}).handler(createSsrRpc("d84fa3675279ea0e17dad40462b2750bb2e4b616c1839fd9e9bb25478a5244e2"));
const getTokenInfo = createServerFn({
  method: "GET"
}).handler(createSsrRpc("0968b9e500194cfc5a1fddeda76061dfcfe12f83a9d08509cdd9df86c7aca7c9"));
const testGitHubToken = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  token: z.string().min(1)
})).handler(createSsrRpc("2abf3e9a8c1b7b7a11f8de5823636e8c40964237c69abf25ad72f518545fdcdd"));
const saveGitHubToken = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  token: z.string().min(1)
})).handler(createSsrRpc("1f7579febd4fab86592a3e93539f3f565f9671b1c540b25d737c8e8bff462a95"));
const clearGitHubToken = createServerFn({
  method: "POST"
}).handler(createSsrRpc("10ecc1d9c6f957038b8e29917d4a89402354e0da002cf941902f2aaad6df7a58"));
const fetchCommitHistory = createServerFn({
  method: "GET"
}).handler(createSsrRpc("73ea4a3c38df80c388f7c8b4ef3cad8833eefa1ea9accb2cd6242733cab06d2f"));
const restoreToCommit = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  sha: z.string().min(7),
  message: z.string().optional()
})).handler(createSsrRpc("791f5fb5291d52d6022c2fdeba15d0eb794ed38b4d702cfc3068a4ed7403776c"));
const getGitDiagnostics = createServerFn({
  method: "GET"
}).handler(createSsrRpc("336f16e34d562f78275aa7a3cc022fe8ca0edac416f1900768a9c6ffb285a4af"));
const fixGitDivergence = createServerFn({
  method: "POST"
}).handler(createSsrRpc("caaa9e2b5c5ad43cde33788c51c45fa7f3c1baa017e74bc1d8e096b2dd152807"));
createServerFn({
  method: "POST"
}).handler(createSsrRpc("d100192c84dbdf2c323ec92fe16f12f83d269027f1a297e59ca03eef4c8e8d09"));
const fetchSyncHistory = createServerFn({
  method: "GET"
}).handler(createSsrRpc("2e6f0c521503f8024b01a97c2dd6e90b2082c3432492d548bb47ca64a739e11c"));
createServerFn({
  method: "POST"
}).inputValidator(z.object({
  commitHash: z.string(),
  commitMessage: z.string(),
  filesChanged: z.array(z.string()),
  status: z.enum(["success", "failed"]),
  durationMs: z.number()
})).handler(createSsrRpc("ab83cb7f457836d6f74c694d5cfeadda8b1f3d4efb517cdda82dc99dd72f810d"));
const compareLocalToRemote = createServerFn({
  method: "GET"
}).handler(createSsrRpc("56cb769110f118349cdf266ed2c7834cb8154bfed52328cd3c8ed51d80b5ab91"));
const pullRemoteFiles = createServerFn({
  method: "POST"
}).handler(createSsrRpc("e821b6439e82f7d8bfbe6b1b0d983c1f3e9be135a8c03517106cd7d1e6087322"));
const previewRepairPlayers = createServerFn({
  method: "GET"
}).handler(createSsrRpc("0a0026775ec41c07ff6fce56a504939f56b9fff933b5e8375d7e1697dbb34629"));
const repairPlayers = createServerFn({
  method: "POST"
}).handler(createSsrRpc("20254cac3591853b5c6524a2d69bd49a61d924ce0dff10ed2eb00eafd3a0e653"));
const savePlayersToTS = createServerFn({
  method: "POST"
}).handler(createSsrRpc("eaab76e48da73d8b0c5ebbb20f376cd470bb167cbb8de5b659281ea664f3f0ee"));
const adminLoadUsers = createServerFn({
  method: "GET"
}).handler(createSsrRpc("de6707771acf05f33f3f80de52b00b542ba882a03e38764710467ce74988f0e7"));
const adminCreateUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(1),
  role: z.string().default("user"),
  addCred: z.boolean(),
  addPlayer: z.boolean(),
  addMining: z.boolean(),
  region: z.string().optional(),
  startingBC: z.number().min(0).optional(),
  startingGems: z.number().min(0).optional()
})).handler(createSsrRpc("c58b9d75bcc21687bdb01aa8732acbf31ba9ba509383e0b562d75dd5664ce9f3"));
const adminUpdateUserPlayer = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  region: z.string().optional(),
  head: z.string().optional(),
  ranks: z.record(z.string(), z.string()).optional(),
  create: z.boolean().optional()
})).handler(createSsrRpc("6d81718f1d6afbe57ef5e2a5807d8f527818d2b133218776c76788af33e21e3a"));
const adminUpdateUserCred = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  newPassword: z.string().min(1).optional(),
  role: z.string().optional(),
  enabled: z.boolean().optional()
})).handler(createSsrRpc("1e2c7ac3337193608c8b38cf66939454d885804b0cc0371e0dbe7f26e4c25c3d"));
const adminUpdateUserMining = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  balance: z.number().min(0).optional(),
  gems: z.number().min(0).optional(),
  create: z.boolean().optional(),
  startingBC: z.number().min(0).optional(),
  startingGems: z.number().min(0).optional()
})).handler(createSsrRpc("9a7797558969ec6ab39b9a0a106453ff24fd40e5d8dfb39d46da89655e270655"));
const adminCreateMiningForPlayer = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  playerName: z.string().min(1),
  // existing name in players.json — becomes the mining/login username
  password: z.string().min(1),
  startingBC: z.number().min(0).optional(),
  startingGems: z.number().min(0).optional()
})).handler(createSsrRpc("a3482b5d0e0b8bbb058a12f6893630a221cea2ebe0c186f48ef2b6917f1280fd"));
const adminRenameMiningUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  currentUsername: z.string().min(1),
  newUsername: z.string().min(1).max(32)
})).handler(createSsrRpc("36c54b2f321d22e3b47f5348ed255687dce04bd1f85a6b0eefe85e5c44a93110"));
const adminDeleteUser = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  username: z.string(),
  deleteCred: z.boolean(),
  deletePlayer: z.boolean(),
  deleteMining: z.boolean()
})).handler(createSsrRpc("8b1f9c1b45467a38c696fe005b4d5b65163dc553d2104f6804f0494aa848fdbf"));
const adminBulkDeleteUsers = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  usernames: z.array(z.string()),
  deleteCred: z.boolean(),
  deletePlayer: z.boolean(),
  deleteMining: z.boolean()
})).handler(createSsrRpc("fd27b53ba645f057b63ba6c3fc845d86f9fc2e67ee93bfe4e2467486c46afc01"));
const getBackupStatusFn = createServerFn({
  method: "GET"
}).handler(createSsrRpc("8a8b336fe65eb1a2e8629b73f2badc985dd6ab823a0e411b3e9c3d6120c51a0f"));
const setAutoBackupEnabled = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  enabled: z.boolean()
})).handler(createSsrRpc("ea6082cc957e00016cbedcb2b7376e9e76f2cdc47857ea2b79a07a6f695a1a9e"));
const setBackupDebounce = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  ms: z.number().int().min(5e3).max(18e5)
})).handler(createSsrRpc("2deb2e018fcfe19b7588e8378bbb22d97eeae36e030c9b7892bfd951502a31a3"));
const triggerBackupNow = createServerFn({
  method: "POST"
}).handler(createSsrRpc("2e5a86306780c713e09960b6674d29e921669e575d347e82484fd839a21fa174"));
const $$splitComponentImporter$6 = () => import("./tier-tagger-B9IFstWK.js");
const Route$6 = createFileRoute("/tier-tagger")({
  loader: async () => {
    try {
      const data = await loadAllData();
      return {
        tierTagger: data.tierTagger ?? null
      };
    } catch {
      return {
        tierTagger: null
      };
    }
  },
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./shop-B_rD8m9y.js");
const Route$5 = createFileRoute("/shop")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const REGIONS = [
  "North America",
  "South America",
  "Europe",
  "Asia",
  "Oceania",
  "Africa",
  "Middle East"
];
const players = [
  {
    name: "_Hollowshade_",
    head: "https://mc-heads.net/avatar/_Hollowshade_",
    region: "Asia",
    ranks: {
      sword: "LT4",
      mace: "LT3"
    }
  },
  {
    name: "A3MIR",
    head: "https://mc-heads.net/avatar/A3MIR",
    region: "Europe",
    ranks: {
      mace: "HT3"
    }
  },
  {
    name: "adambobjh22",
    head: "https://mc-heads.net/avatar/adambobjh22",
    region: "Europe",
    ranks: {
      crystal: "LT4"
    }
  },
  {
    name: "AliBicimss",
    head: "https://mc-heads.net/avatar/AliBicimss",
    region: "Europe",
    ranks: {
      nethpot: "LT3"
    }
  },
  {
    name: "bananastylze",
    head: "https://mc-heads.net/avatar/bananastylze",
    region: "North America",
    ranks: {
      sword: "HT4"
    }
  },
  {
    name: "Bav3r1",
    head: "https://mc-heads.net/avatar/Bav3r1",
    region: "Asia",
    ranks: {
      crystal: "HT4"
    }
  },
  {
    name: "Becanaldo_",
    head: "https://mc-heads.net/avatar/Becanaldo_",
    region: "Asia",
    ranks: {
      sword: "LT3",
      mace: "HT4"
    }
  },
  {
    name: "BlackTagX",
    head: "https://mc-heads.net/avatar/BlackTagX",
    region: "Asia",
    ranks: {
      sword: "HT4",
      axe: "LT4",
      uhc: "HT5",
      crystal: "LT5",
      mace: "LT4",
      nethpot: "HT4",
      diapot: "HT4"
    }
  },
  {
    name: "Blitzor_",
    head: "https://mc-heads.net/avatar/Blitzor_",
    region: "Asia",
    ranks: {
      nethpot: "LT3"
    }
  },
  {
    name: "Blue_Gaming08",
    head: "https://mc-heads.net/avatar/Blue_Gaming08",
    region: "Asia",
    ranks: {
      axe: "HT4",
      uhc: "LT4",
      crystal: "HT4",
      nethpot: "LT4"
    }
  },
  {
    name: "Caardss",
    head: "https://mc-heads.net/avatar/Caardss",
    region: "Asia",
    ranks: {
      sword: "HT4"
    }
  },
  {
    name: "cakechan",
    head: "https://mc-heads.net/avatar/cakechan",
    region: "Asia",
    ranks: {
      mace: "HT4"
    }
  },
  {
    name: "CloudScope",
    head: "https://mc-heads.net/avatar/CloudScope",
    region: "North America",
    ranks: {
      crystal: "LT3",
      diapot: "HT3"
    }
  },
  {
    name: "ClownLegPiece",
    head: "https://mc-heads.net/avatar/ClownLegPiece",
    region: "North America",
    ranks: {
      crystal: "HT4"
    }
  },
  {
    name: "cobwebmsater",
    head: "https://mc-heads.net/avatar/cobwebmsater",
    region: "Europe",
    ranks: {
      uhc: "HT4"
    }
  },
  {
    name: "Cyan_Gaming07",
    head: "https://mc-heads.net/avatar/Cyan_Gaming07",
    region: "Asia",
    ranks: {
      sword: "LT5",
      axe: "LT5",
      uhc: "LT5",
      crystal: "LT5",
      mace: "LT5",
      nethpot: "LT5",
      diapot: "LT5"
    }
  },
  {
    name: "D3n1s1",
    head: "https://mc-heads.net/avatar/D3n1s1",
    region: "Europe",
    ranks: {
      sword: "HT4",
      axe: "LT4",
      uhc: "LT5",
      crystal: "LT4",
      mace: "LT3",
      nethpot: "LT3",
      diapot: "HT4"
    }
  },
  {
    name: "D4rkzu",
    head: "https://mc-heads.net/avatar/D4rkzu",
    region: "North America",
    ranks: {
      crystal: "LT3"
    }
  },
  {
    name: "DarknzGamerz0101",
    head: "https://mc-heads.net/avatar/DarknzGamerz0101",
    region: "Asia",
    ranks: {
      sword: "HT4",
      mace: "HT4"
    }
  },
  {
    name: "datwildchild",
    head: "https://mc-heads.net/avatar/datwildchild",
    region: "North America",
    ranks: {
      sword: "HT4"
    }
  },
  {
    name: "Die_Melone1",
    head: "https://mc-heads.net/avatar/Die_Melone1",
    region: "Asia",
    ranks: {
      crystal: "HT5"
    }
  },
  {
    name: "feet_lover420",
    head: "https://mc-heads.net/avatar/feet_lover420",
    region: "Europe",
    ranks: {
      axe: "LT4",
      mace: "HT3"
    }
  },
  {
    name: "frag717",
    head: "https://mc-heads.net/avatar/frag717",
    region: "Europe",
    ranks: {
      crystal: "HT4"
    }
  },
  {
    name: "getgoonedon",
    head: "https://mc-heads.net/avatar/getgoonedon",
    region: "North America",
    ranks: {
      sword: "LT3"
    }
  },
  {
    name: "Hokfr",
    head: "https://mc-heads.net/avatar/Hokfr",
    region: "Asia",
    ranks: {
      sword: "LT4"
    }
  },
  {
    name: "Hxckster",
    head: "https://mc-heads.net/avatar/Hxckster",
    region: "Asia",
    ranks: {
      crystal: "HT4"
    }
  },
  {
    name: "IDO1299",
    head: "https://mc-heads.net/avatar/IDO1299",
    region: "Europe",
    ranks: {
      crystal: "HT5"
    }
  },
  {
    name: "IMBATMAN",
    head: "https://mc-heads.net/avatar/IMBATMAN",
    region: "Asia",
    ranks: {
      sword: "LT4"
    }
  },
  {
    name: "ItzInno",
    head: "https://mc-heads.net/avatar/ItzInno",
    region: "Asia",
    ranks: {
      crystal: "HT3"
    }
  },
  {
    name: "ItzMarlowww",
    head: "https://mc-heads.net/avatar/ItzMarlowww",
    region: "Europe",
    ranks: {
      axe: "HT4",
      uhc: "LT4",
      crystal: "HT4",
      nethpot: "LT4"
    }
  },
  {
    name: "ItzV0id_MC",
    head: "https://mc-heads.net/avatar/ItzV0id_MC",
    region: "Europe",
    ranks: {
      crystal: "LT3"
    }
  },
  {
    name: "jrizzo141",
    head: "https://mc-heads.net/avatar/jrizzo141",
    region: "North America",
    ranks: {
      sword: "LT3"
    }
  },
  {
    name: "K0N12",
    head: "https://mc-heads.net/avatar/K0N12",
    region: "Asia",
    ranks: {
      diapot: "LT3"
    }
  },
  {
    name: "Kiqyu",
    head: "https://mc-heads.net/avatar/Kiqyu",
    region: "Europe",
    ranks: {
      sword: "HT3"
    }
  },
  {
    name: "ko2o",
    head: "https://mc-heads.net/avatar/ko2o",
    region: "Europe",
    ranks: {
      sword: "LT4"
    }
  },
  {
    name: "laz_rexx",
    head: "https://mc-heads.net/avatar/laz_rexx",
    region: "North America",
    ranks: {
      crystal: "HT5"
    }
  },
  {
    name: "Letahrt",
    head: "https://mc-heads.net/avatar/Letahrt",
    region: "North America",
    ranks: {
      uhc: "LT4",
      mace: "LT2",
      nethpot: "HT4",
      diapot: "LT4"
    }
  },
  {
    name: "Matthew10999",
    head: "https://mc-heads.net/avatar/Matthew10999",
    region: "Asia",
    ranks: {
      crystal: "HT4"
    }
  },
  {
    name: "mohanazo",
    head: "https://mc-heads.net/avatar/mohanazo",
    region: "Asia",
    ranks: {
      sword: "HT4",
      crystal: "HT4",
      mace: "HT4",
      nethpot: "HT4"
    }
  },
  {
    name: "mondoster",
    head: "https://mc-heads.net/avatar/mondoster",
    region: "Europe",
    ranks: {
      mace: "LT4"
    }
  },
  {
    name: "nike_kz",
    head: "https://mc-heads.net/avatar/nike_kz",
    region: "Europe",
    ranks: {
      sword: "LT3",
      axe: "HT4",
      uhc: "LT4",
      crystal: "LT5",
      mace: "HT5",
      nethpot: "LT3",
      diapot: "LT3"
    }
  },
  {
    name: "nikkgming896",
    head: "https://mc-heads.net/avatar/nikkgming896",
    region: "Asia",
    ranks: {
      sword: "HT5",
      axe: "LT4",
      uhc: "HT5",
      crystal: "LT5",
      mace: "HT5",
      nethpot: "HT5",
      diapot: "LT4"
    }
  },
  {
    name: "noctharyx",
    head: "https://mc-heads.net/avatar/noctharyx",
    region: "Asia",
    ranks: {
      crystal: "LT3"
    }
  },
  {
    name: "Not_Darsh_Mehta",
    head: "https://mc-heads.net/avatar/Not_Darsh_Mehta",
    region: "Asia",
    ranks: {
      axe: "HT5"
    }
  },
  {
    name: "NotKenz0d",
    head: "https://mc-heads.net/avatar/NotKenz0d",
    region: "Asia",
    ranks: {
      crystal: "LT4"
    }
  },
  {
    name: "Nyxveil7",
    head: "https://mc-heads.net/avatar/Nyxveil7",
    region: "Oceania",
    ranks: {
      sword: "HT4",
      axe: "HT4",
      uhc: "HT5",
      crystal: "LT4",
      mace: "HT5",
      nethpot: "HT4",
      diapot: "HT4"
    }
  },
  {
    name: "oStingray",
    head: "https://mc-heads.net/avatar/oStingray",
    region: "North America",
    ranks: {
      crystal: "HT4"
    }
  },
  {
    name: "oWashed__",
    head: "https://mc-heads.net/avatar/oWashed__",
    region: "Asia",
    ranks: {
      uhc: "HT4"
    }
  },
  {
    name: "Prime__",
    head: "https://mc-heads.net/avatar/Prime__",
    region: "Europe",
    ranks: {
      mace: "LT3"
    }
  },
  {
    name: "PrinceMark",
    head: "https://mc-heads.net/avatar/PrinceMark",
    region: "Asia",
    ranks: {
      crystal: "LT4"
    }
  },
  {
    name: "quiezer",
    head: "https://mc-heads.net/avatar/quiezer",
    region: "North America",
    ranks: {
      sword: "LT3"
    }
  },
  {
    name: "RealKairo_",
    head: "https://mc-heads.net/avatar/RealKairo_",
    region: "Asia",
    ranks: {
      mace: "LT4"
    }
  },
  {
    name: "sentialbeing",
    head: "https://mc-heads.net/avatar/sentialbeing",
    region: "North America",
    ranks: {
      sword: "HT5",
      axe: "LT4"
    }
  },
  {
    name: "smoretastic",
    head: "https://mc-heads.net/avatar/smoretastic",
    region: "North America",
    ranks: {
      uhc: "LT4"
    }
  },
  {
    name: "SomeRandomDude54",
    head: "https://mc-heads.net/avatar/SomeRandomDude54",
    region: "Europe",
    ranks: {
      sword: "HT4",
      axe: "HT4",
      mace: "HT4",
      nethpot: "LT3",
      diapot: "LT3"
    }
  },
  {
    name: "stinklezinger4",
    head: "https://mc-heads.net/avatar/stinklezinger4",
    region: "Asia",
    ranks: {
      sword: "HT4",
      mace: "LT3"
    }
  },
  {
    name: "SWAGFORLIFE",
    head: "https://mc-heads.net/avatar/SWAGFORLIFE",
    region: "Asia",
    ranks: {
      crystal: "HT4",
      nethpot: "LT3"
    }
  },
  {
    name: "Tegress",
    head: "https://mc-heads.net/avatar/Tegress",
    region: "North America",
    ranks: {
      sword: "LT4",
      crystal: "HT5",
      mace: "HT2"
    }
  },
  {
    name: "TrionMC_",
    head: "https://mc-heads.net/avatar/TrionMC_",
    region: "Europe",
    ranks: {
      crystal: "LT4",
      nethpot: "HT5"
    }
  },
  {
    name: "Txeqym",
    head: "https://mc-heads.net/avatar/Txeqym",
    region: "Europe",
    ranks: {
      axe: "HT4"
    }
  },
  {
    name: "vertex16_",
    head: "https://mc-heads.net/avatar/vertex16_",
    region: "Europe",
    ranks: {
      axe: "LT3"
    }
  },
  {
    name: "vockzy7",
    head: "https://mc-heads.net/avatar/vockzy7",
    region: "Europe",
    ranks: {
      crystal: "LT3"
    }
  },
  {
    name: "Win_g",
    head: "https://mc-heads.net/avatar/Win_g",
    region: "Asia",
    ranks: {
      crystal: "LT4"
    }
  },
  {
    name: "Wyll_xx",
    head: "https://mc-heads.net/avatar/Wyll_xx",
    region: "Asia",
    ranks: {
      crystal: "LT3"
    }
  },
  {
    name: "WyoCold",
    head: "https://mc-heads.net/avatar/WyoCold",
    region: "Asia",
    ranks: {
      sword: "HT4"
    }
  },
  {
    name: "xstop",
    head: "https://mc-heads.net/avatar/xstop",
    region: "North America",
    ranks: {
      uhc: "LT5"
    }
  },
  {
    name: "Zano_0",
    head: "https://mc-heads.net/avatar/Zano_0",
    region: "Europe",
    ranks: {
      crystal: "LT2"
    }
  },
  {
    name: "zenith_fr",
    head: "https://mc-heads.net/avatar/zenith_fr",
    region: "Asia",
    ranks: {
      nethpot: "LT3"
    }
  },
  {
    name: "Zyr3n",
    head: "https://mc-heads.net/avatar/Zyr3n",
    region: "Europe",
    ranks: {
      sword: "HT4",
      axe: "HT4",
      uhc: "LT3",
      crystal: "HT4",
      mace: "LT4",
      nethpot: "HT4",
      diapot: "LT4"
    }
  },
  {
    name: "zyzy",
    head: "https://mc-heads.net/avatar/zyzy",
    region: "Asia",
    ranks: {
      sword: "HT4"
    }
  }
];
const $$splitComponentImporter$4 = () => import("./rankings-CLwKX9dW.js");
const Route$4 = createFileRoute("/rankings")({
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : void 0
  }),
  loader: async () => {
    try {
      const data = await loadAllData();
      return {
        players: data.players ?? players,
        gamemodes: data.gamemodes ?? gamemodes
      };
    } catch {
      return {
        players,
        gamemodes
      };
    }
  },
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./mining-BeqW61Ho.js");
const Route$3 = createFileRoute("/mining")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./exchange-CHQ5Cdof.js");
const Route$2 = createFileRoute("/exchange")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./admin-BdvZmmdC.js");
const Route$1 = createFileRoute("/admin")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./index-CLDLrwx4.js");
const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const data = await loadAllData();
      return {
        players: data.players ?? players
      };
    } catch {
      return {
        players
      };
    }
  },
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const TournamentRoute = Route$7.update({
  id: "/tournament",
  path: "/tournament",
  getParentRoute: () => Route$8
});
const TierTaggerRoute = Route$6.update({
  id: "/tier-tagger",
  path: "/tier-tagger",
  getParentRoute: () => Route$8
});
const ShopRoute = Route$5.update({
  id: "/shop",
  path: "/shop",
  getParentRoute: () => Route$8
});
const RankingsRoute = Route$4.update({
  id: "/rankings",
  path: "/rankings",
  getParentRoute: () => Route$8
});
const MiningRoute = Route$3.update({
  id: "/mining",
  path: "/mining",
  getParentRoute: () => Route$8
});
const ExchangeRoute = Route$2.update({
  id: "/exchange",
  path: "/exchange",
  getParentRoute: () => Route$8
});
const AdminRoute = Route$1.update({
  id: "/admin",
  path: "/admin",
  getParentRoute: () => Route$8
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$8
});
const rootRouteChildren = {
  IndexRoute,
  AdminRoute,
  ExchangeRoute,
  MiningRoute,
  RankingsRoute,
  ShopRoute,
  TierTaggerRoute,
  TournamentRoute
};
const routeTree = Route$8._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const router2 = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  triggerBackupNow as A,
  setAutoBackupEnabled as B,
  setBackupDebounce as C,
  getTokenInfo as D,
  testGitHubToken as E,
  saveGitHubToken as F,
  clearGitHubToken as G,
  restoreToCommit as H,
  pullRemoteFiles as I,
  compareLocalToRemote as J,
  savePublishConfig as K,
  loadSitemapXml as L,
  loadRobotsTxt as M,
  generateSitemap as N,
  saveRobotsTxt as O,
  getGrowthStats as P,
  Route as Q,
  Route$6 as R,
  router as S,
  Route$4 as a,
  REGIONS as b,
  createSsrRpc as c,
  previewRepairPlayers as d,
  adminLoadUsers as e,
  flushStoresToDisk as f,
  adminCreateUser as g,
  adminCreateMiningForPlayer as h,
  adminUpdateUserPlayer as i,
  adminUpdateUserMining as j,
  adminRenameMiningUser as k,
  loadAllData as l,
  adminUpdateUserCred as m,
  adminDeleteUser as n,
  adminBulkDeleteUsers as o,
  players as p,
  fetchRepoStatus as q,
  repairPlayers as r,
  savePlayersToTS as s,
  checkGitHubConnection as t,
  fetchSyncHistory as u,
  validateAllData as v,
  fetchCommitHistory as w,
  fixGitDivergence as x,
  getBackupStatusFn as y,
  getGitDiagnostics as z
};
