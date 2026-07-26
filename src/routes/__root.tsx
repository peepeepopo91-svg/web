import { HeadContent, Scripts, createRootRoute, useLoaderData, Link } from '@tanstack/react-router'
import { loadSeoConfig, loadHomepageConfig } from '../server/publishServer'
import { HomepageConfigProvider, HOMEPAGE_DEFAULTS } from '../store/homepageStore'
import type { HomepageConfig } from '../store/homepageStore'
import { GrowthBeacon }  from '../components/GrowthBeacon'
import { StarField } from '../components/StarField'
import '../styles.css'

type SeoConfig = {
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  ogImageUrl: string | null
  canonicalUrl: string | null
  ga4Id: string | null
  gscVerificationTag: string | null
  discordLink: string | null
  twitterLink: string | null
  youtubeLink: string | null
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <p className="text-7xl font-black text-blue-400">404</p>
      <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
      <p className="text-zinc-400 max-w-md">The page you're looking for doesn't exist or was moved.</p>
      <Link to="/" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
        Go Home
      </Link>
    </div>
  )
}

export const Route = createRootRoute({
  loader: async () => {
    try {
      const [seo, homepage] = await Promise.all([loadSeoConfig(), loadHomepageConfig()])
      return { seo, homepage } as { seo: SeoConfig; homepage: HomepageConfig }
    } catch {
      return { seo: null, homepage: HOMEPAGE_DEFAULTS } as { seo: SeoConfig | null; homepage: HomepageConfig }
    }
  },

  head: (ctx) => {
    const d = ctx.loaderData as { seo: SeoConfig | null; homepage: HomepageConfig }
    const seo: Partial<SeoConfig> = d.seo ?? {}
    const hp = d.homepage ?? HOMEPAGE_DEFAULTS

    const title     = (hp.seo?.title?.trim() || seo.seoTitle?.trim() || 'Blue Tiers | #1 Minecraft PvP Tier List')
    const desc      = (hp.seo?.description?.trim() || seo.seoDescription?.trim() || '#1 Tier List for all types of Minecraft PvP players.')
    const keywords  = (hp.seo?.keywords || seo.seoKeywords || 'minecraft, pvp, tier list, blue tiers, rankings')
    const canonical = (hp.seo?.canonical?.trim() || seo.canonicalUrl?.trim() || 'https://bluetiers.bolt.host')
    const ogImage   = (hp.media?.ogImageUrl?.trim() || seo.ogImageUrl?.trim() || '')
    const ga4Id     = (hp.seo?.ga4Id?.trim() || seo.ga4Id?.trim() || '')
    const gscTag    = (hp.seo?.gscVerification?.trim() || seo.gscVerificationTag?.trim() || '')

    // ── Schema.org JSON-LD ─────────────────────────────────────────────────
    const sameAs = [hp.nav?.discordLink, seo?.twitterLink, seo?.youtubeLink].filter(Boolean)
    const schemaWebSite = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Blue Tiers',
      url: canonical,
      description: desc,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${canonical}/rankings?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
      ...(sameAs.length ? { sameAs } : {}),
      publisher: {
        '@type': 'Organization',
        name: 'Blue Tiers',
        url: canonical,
        logo: { '@type': 'ImageObject', url: `${canonical}/icons/icon-192x192.png` },
      },
    }
    const schemaBreadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',       item: canonical },
        { '@type': 'ListItem', position: 2, name: 'Rankings',   item: `${canonical}/rankings` },
        { '@type': 'ListItem', position: 3, name: 'Tournament', item: `${canonical}/tournament` },
        { '@type': 'ListItem', position: 4, name: 'Mining',     item: `${canonical}/mining` },
      ],
    }

    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport',     content: 'width=device-width, initial-scale=1' },
        { title },
        { name: 'description',  content: desc },
        { name: 'keywords',     content: keywords },
        { name: 'theme-color',  content: '#00BFFF' },
        { name: 'robots',       content: 'index, follow' },
        // Open Graph
        { property: 'og:url',         content: canonical },
        { property: 'og:type',        content: 'website' },
        { property: 'og:title',       content: title },
        { property: 'og:description', content: desc },
        ...(ogImage ? [{ property: 'og:image', content: ogImage }] : []),
        // Twitter Card
        { name: 'twitter:card',        content: ogImage ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title',       content: title },
        { name: 'twitter:description', content: desc },
        ...(ogImage ? [{ name: 'twitter:image', content: ogImage }] : []),
        // Google Search Console verification
        ...(gscTag ? [{ name: 'google-site-verification', content: gscTag }] : []),
      ],
      links: [
        { rel: 'canonical', href: canonical },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' as const },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap',
        },
      ],
      scripts: [
        // JSON-LD structured data (WebSite + BreadcrumbList)
        { type: 'application/ld+json', children: JSON.stringify([schemaWebSite, schemaBreadcrumb]) },
        // Google Analytics 4
        ...(ga4Id ? [
          { src: `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`, async: true },
          { children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}');` },
        ] : []),
      ],
    }
  },

  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { homepage } = useLoaderData({ from: '__root__' })
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="text-white font-['Inter'] antialiased" style={{ background: '#00060f' }}>
        <HomepageConfigProvider value={homepage ?? HOMEPAGE_DEFAULTS}>
          {/* Global fixed background: starfield + blue gradient glow */}
          <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
            <StarField />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 100% 70% at 50% -5%, rgba(0,100,255,0.22) 0%, transparent 60%), ' +
                  'radial-gradient(ellipse 70% 50% at 15% 25%, rgba(0,60,180,0.15) 0%, transparent 55%), ' +
                  'radial-gradient(ellipse 60% 40% at 85% 15%, rgba(0,180,255,0.10) 0%, transparent 50%)',
              }}
            />
          </div>
          {/* All page content sits above the background */}
          <div className="relative z-10">
            {children}
          </div>
          <GrowthBeacon />
        </HomepageConfigProvider>
        <Scripts />
      </body>
    </html>
  )
}
