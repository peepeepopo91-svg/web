import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { H as HOMEPAGE_DEFAULTS, h as homepageConfigFromJSON } from "./homepageStore-KPOXxduW.js";
import { c as createServerFn } from "../server.js";
import "react";
import "./syncStore-C_ozCmAO.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
const DATA_DIR = resolve(process.cwd(), "data");
const PUBLIC_DIR = resolve(process.cwd(), "public");
function readJson(file) {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, file), "utf8"));
  } catch {
    return null;
  }
}
const loadSeoConfig_createServerFn_handler = createServerRpc({
  id: "2bfeee87903e4e8c0006779de0f385348ee7c23394b757226d4e2949ff07d10f",
  name: "loadSeoConfig",
  filename: "src/server/publishServer.ts"
}, (opts) => loadSeoConfig.__executeServer(opts));
const loadSeoConfig = createServerFn({
  method: "GET"
}).handler(loadSeoConfig_createServerFn_handler, async () => {
  const c = readJson("content.json");
  return {
    seoTitle: c?.seoTitle ?? null,
    seoDescription: c?.seoDescription ?? null,
    seoKeywords: c?.seoKeywords ?? null,
    ogImageUrl: c?.ogImageUrl ?? null,
    canonicalUrl: c?.canonicalUrl ?? null,
    ga4Id: c?.ga4Id ?? null,
    gscVerificationTag: c?.gscVerificationTag ?? null,
    // Social links (for schema.org sameAs)
    discordLink: c?.discordLink ?? null,
    twitterLink: c?.twitterLink ?? null,
    youtubeLink: c?.youtubeLink ?? null
  };
});
const loadHomepageConfig_createServerFn_handler = createServerRpc({
  id: "0d234e9817436d2c7e29533f66d1f8bb236ed72efa7698abe81b73752341abea",
  name: "loadHomepageConfig",
  filename: "src/server/publishServer.ts"
}, (opts) => loadHomepageConfig.__executeServer(opts));
const loadHomepageConfig = createServerFn({
  method: "GET"
}).handler(loadHomepageConfig_createServerFn_handler, async () => {
  const h = readJson("homepage.json");
  if (!h) return HOMEPAGE_DEFAULTS;
  return homepageConfigFromJSON(JSON.stringify(h));
});
const savePublishConfig_createServerFn_handler = createServerRpc({
  id: "725df7688608b79fe1bd4fff76b6c8d0b2da6ad706eeec1260d441037cac73bc",
  name: "savePublishConfig",
  filename: "src/server/publishServer.ts"
}, (opts) => savePublishConfig.__executeServer(opts));
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
})).handler(savePublishConfig_createServerFn_handler, async ({
  data
}) => {
  const existing = (() => {
    try {
      return JSON.parse(readFileSync(resolve(DATA_DIR, "content.json"), "utf8"));
    } catch {
      return {};
    }
  })();
  const updated = {
    ...existing,
    ...data
  };
  writeFileSync(resolve(DATA_DIR, "content.json"), JSON.stringify(updated, null, 2), "utf8");
  return {
    success: true
  };
});
const generateSitemap_createServerFn_handler = createServerRpc({
  id: "ee79ca67965882c0929be3f4752c7831e75750a551a84c064a4ba51a5d06092d",
  name: "generateSitemap",
  filename: "src/server/publishServer.ts"
}, (opts) => generateSitemap.__executeServer(opts));
const generateSitemap = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  baseUrl: z.string(),
  additionalUrls: z.array(z.string()).optional()
})).handler(generateSitemap_createServerFn_handler, async ({
  data: {
    baseUrl,
    additionalUrls = []
  }
}) => {
  const base = baseUrl.replace(/\/$/, "");
  const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const CORE_ROUTES = [{
    path: "/",
    priority: "1.0",
    changefreq: "daily"
  }, {
    path: "/rankings",
    priority: "0.9",
    changefreq: "daily"
  }, {
    path: "/tournament",
    priority: "0.8",
    changefreq: "weekly"
  }, {
    path: "/mining",
    priority: "0.7",
    changefreq: "weekly"
  }, {
    path: "/exchange",
    priority: "0.6",
    changefreq: "weekly"
  }, {
    path: "/shop",
    priority: "0.6",
    changefreq: "weekly"
  }];
  const extraRoutes = additionalUrls.filter((u) => u.trim()).map((u) => ({
    path: u.trim(),
    priority: "0.5",
    changefreq: "monthly"
  }));
  const allRoutes = [...CORE_ROUTES, ...extraRoutes];
  const urlsXml = allRoutes.map((r) => `  <url>
    <loc>${base}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlsXml}
</urlset>`;
  mkdirSync(PUBLIC_DIR, {
    recursive: true
  });
  writeFileSync(resolve(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");
  return {
    success: true,
    xml,
    count: allRoutes.length,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
});
const saveRobotsTxt_createServerFn_handler = createServerRpc({
  id: "827c1a948924faac9d80bc809fdba6fbae032472e37d1f7fe48fbf921572c693",
  name: "saveRobotsTxt",
  filename: "src/server/publishServer.ts"
}, (opts) => saveRobotsTxt.__executeServer(opts));
const saveRobotsTxt = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  content: z.string()
})).handler(saveRobotsTxt_createServerFn_handler, async ({
  data: {
    content
  }
}) => {
  mkdirSync(PUBLIC_DIR, {
    recursive: true
  });
  writeFileSync(resolve(PUBLIC_DIR, "robots.txt"), content, "utf8");
  return {
    success: true
  };
});
const loadRobotsTxt_createServerFn_handler = createServerRpc({
  id: "6cdff83579d1b6c871daa33e3f58529ce74f5af2895d96f6c612518adfe4a5c2",
  name: "loadRobotsTxt",
  filename: "src/server/publishServer.ts"
}, (opts) => loadRobotsTxt.__executeServer(opts));
const loadRobotsTxt = createServerFn({
  method: "GET"
}).handler(loadRobotsTxt_createServerFn_handler, async () => {
  try {
    return readFileSync(resolve(PUBLIC_DIR, "robots.txt"), "utf8");
  } catch {
    return null;
  }
});
const loadSitemapXml_createServerFn_handler = createServerRpc({
  id: "46d26c3385af9d72b60d4c04783b28da24f314c21a0e771be32feca4da21ba2b",
  name: "loadSitemapXml",
  filename: "src/server/publishServer.ts"
}, (opts) => loadSitemapXml.__executeServer(opts));
const loadSitemapXml = createServerFn({
  method: "GET"
}).handler(loadSitemapXml_createServerFn_handler, async () => {
  try {
    return readFileSync(resolve(PUBLIC_DIR, "sitemap.xml"), "utf8");
  } catch {
    return null;
  }
});
export {
  generateSitemap_createServerFn_handler,
  loadHomepageConfig_createServerFn_handler,
  loadRobotsTxt_createServerFn_handler,
  loadSeoConfig_createServerFn_handler,
  loadSitemapXml_createServerFn_handler,
  savePublishConfig_createServerFn_handler,
  saveRobotsTxt_createServerFn_handler
};
