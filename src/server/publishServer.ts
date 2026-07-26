// ─── Publish Server Functions ─────────────────────────────────────────────────
// SEO config, sitemap generation, robots.txt management.

import { createServerFn } from '@tanstack/react-start'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { SiteContent } from '../store/contentStore'
import { HOMEPAGE_DEFAULTS, homepageConfigFromJSON, type HomepageConfig } from '../store/homepageStore'

const DATA_DIR   = resolve(process.cwd(), 'data')
const PUBLIC_DIR = resolve(process.cwd(), 'public')

function readJson<T>(file: string): T | null {
  try { return JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf8')) as T } catch { return null }
}

// ── Load SEO config for <head> injection ─────────────────────────────────────
export const loadSeoConfig = createServerFn({ method: 'GET' }).handler(async () => {
  const c = readJson<SiteContent>('content.json')
  return {
    seoTitle:           c?.seoTitle           ?? null,
    seoDescription:     c?.seoDescription     ?? null,
    seoKeywords:        c?.seoKeywords        ?? null,
    ogImageUrl:         c?.ogImageUrl         ?? null,
    canonicalUrl:       c?.canonicalUrl       ?? null,
    ga4Id:              c?.ga4Id              ?? null,
    gscVerificationTag: c?.gscVerificationTag ?? null,
    // Social links (for schema.org sameAs)
    discordLink:        c?.discordLink        ?? null,
    twitterLink:        c?.twitterLink        ?? null,
    youtubeLink:        c?.youtubeLink        ?? null,
  }
})

// ── Load homepage CMS config for the root provider ────────────────────────────
export const loadHomepageConfig = createServerFn({ method: 'GET' }).handler(async () => {
  const h = readJson<HomepageConfig>('homepage.json')
  if (!h) return HOMEPAGE_DEFAULTS
  return homepageConfigFromJSON(JSON.stringify(h))
})

// ── Save publish config fields directly to content.json on disk ───────────────
export const savePublishConfig = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    canonicalUrl:       z.string(),
    ga4Id:              z.string(),
    gscVerificationTag: z.string(),
    seoTitle:           z.string(),
    seoDescription:     z.string(),
    seoKeywords:        z.string(),
    ogImageUrl:         z.string(),
  }))
  .handler(async ({ data }) => {
    const contentPath = resolve(DATA_DIR, 'content.json')
    const existing = (() => {
      try { return JSON.parse(readFileSync(contentPath, 'utf8')) as Record<string, unknown> }
      catch { return {} }
    })()
    const updated = { ...existing, ...data }
    const serialized = JSON.stringify(updated, null, 2)
    writeFileSync(contentPath, serialized, 'utf8')

    // ── Push to GitHub so the Sync Center stays current ──────────────────────
    // Best-effort: never fail the save itself if the push fails.
    try {
      const { spawnSync } = await import('node:child_process')
      const gitPresent = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: process.cwd(), encoding: 'utf8' })
      const inProductionMode = (gitPresent.status ?? 1) !== 0

      if (inProductionMode) {
        // Production (no local .git): push via GitHub API
        const { commitFiles }   = await import('./github')
        const { resolveTokenSource } = await import('./tokenStore')
        if (resolveTokenSource()?.token) {
          // Also include any other data files that exist so the commit is complete
          const SYNC_FILES = [
            'data/content.json', 'data/players.json', 'data/gamemodes.json',
            'data/economy.json', 'data/event.json', 'data/homepage.json',
            'data/tier-tagger.json',
          ]
          const files: Array<{ path: string; content: string }> = []
          for (const rel of SYNC_FILES) {
            const abs = resolve(process.cwd(), rel)
            if (existsSync(abs)) {
              files.push({ path: rel, content: readFileSync(abs, 'utf8') })
            }
          }
          if (files.length > 0) {
            await commitFiles(files, `[admin] Publish config saved (${new Date().toISOString().slice(0, 10)})`)
          }
        }
      }
      // In dev mode (has .git): the local file is written; the user's next
      // manual "Sync to GitHub" push in the Sync Center will pick it up.
    } catch { /* swallow — write already succeeded */ }

    return { success: true }
  })

// ── Generate + write sitemap.xml to public/ ───────────────────────────────────
export const generateSitemap = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    baseUrl:        z.string(),
    additionalUrls: z.array(z.string()).optional(),
  }))
  .handler(async ({ data: { baseUrl, additionalUrls = [] } }) => {
    const base = baseUrl.replace(/\/$/, '')
    const now  = new Date().toISOString().split('T')[0]

    const CORE_ROUTES = [
      { path: '/',           priority: '1.0', changefreq: 'daily'   },
      { path: '/rankings',   priority: '0.9', changefreq: 'daily'   },
      { path: '/tournament', priority: '0.8', changefreq: 'weekly'  },
      { path: '/mining',     priority: '0.7', changefreq: 'weekly'  },
      { path: '/exchange',   priority: '0.6', changefreq: 'weekly'  },
      { path: '/shop',       priority: '0.6', changefreq: 'weekly'  },
    ]
    const extraRoutes = additionalUrls
      .filter(u => u.trim())
      .map(u => ({ path: u.trim(), priority: '0.5', changefreq: 'monthly' as string }))
    const allRoutes = [...CORE_ROUTES, ...extraRoutes]

    const urlsXml = allRoutes.map(r => `  <url>
    <loc>${base}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlsXml}
</urlset>`

    mkdirSync(PUBLIC_DIR, { recursive: true })
    writeFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8')
    return { success: true, xml, count: allRoutes.length, generatedAt: new Date().toISOString() }
  })

// ── Save robots.txt to public/ ────────────────────────────────────────────────
export const saveRobotsTxt = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ content: z.string() }))
  .handler(async ({ data: { content } }) => {
    mkdirSync(PUBLIC_DIR, { recursive: true })
    writeFileSync(resolve(PUBLIC_DIR, 'robots.txt'), content, 'utf8')
    return { success: true }
  })

// ── Load robots.txt from public/ ──────────────────────────────────────────────
export const loadRobotsTxt = createServerFn({ method: 'GET' }).handler(async () => {
  try { return readFileSync(resolve(PUBLIC_DIR, 'robots.txt'), 'utf8') }
  catch { return null }
})

// ── Load generated sitemap.xml ────────────────────────────────────────────────
export const loadSitemapXml = createServerFn({ method: 'GET' }).handler(async () => {
  try { return readFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), 'utf8') }
  catch { return null }
})
