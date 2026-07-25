import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Stats } from '../components/Stats'
import { Features } from '../components/Features'
import { Quote } from '../components/Quote'
import { Footer } from '../components/Footer'
import { ActiveHomepageBanners } from '../components/HomepageBanners'
import type { Player } from '../data/players'
import defaultPlayers from '../data/players'
import { loadAllData } from '../server/dataFiles'
import { useHomepageConfig } from '../store/homepageStore'

export const Route = createFileRoute('/')({
  loader: async () => {
    try {
      const data = await loadAllData()
      return { players: (data.players as Player[] | null) ?? defaultPlayers }
    } catch {
      return { players: defaultPlayers }
    }
  },
  component: HomePage,
})

function HomePage() {
  const { players } = Route.useLoaderData()
  const cfg = useHomepageConfig()
  const eventInSection = { ...cfg.event, visible: cfg.event.visible && !cfg.event.showAboveNavbar }

  const sectionComponents: Record<string, React.ReactNode> = {
    announcement: <ActiveHomepageBanners key="announcement" announcements={cfg.announcements} event={{ ...cfg.event, visible: false }} />,
    navbar: <Navbar key="navbar" />,
    hero: <Hero key="hero" players={players as any} />,
    stats: <Stats key="stats" players={players} />,
    quote: <Quote key="quote" />,
    features: <Features key="features" />,
    event: <ActiveHomepageBanners key="event" announcements={[]} event={eventInSection} />,
    footer: <Footer key="footer" />,
  }

  return (
    <div className="min-h-screen">
      {cfg.layout.sectionOrder.map(section => sectionComponents[section]).filter(Boolean)}
    </div>
  )
}
