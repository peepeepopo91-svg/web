import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { TierTaggerPage } from '../components/TierTaggerPage'
import { loadAllData } from '../server/dataFiles'
import type { TierTaggerConfig } from '../store/tierTaggerStore'

export const Route = createFileRoute('/tier-tagger')({
  loader: async () => {
    try {
      const data = await loadAllData()
      return { tierTagger: (data.tierTagger as TierTaggerConfig) ?? null }
    } catch {
      return { tierTagger: null }
    }
  },
  component: function TierTaggerRoute() {
    const { tierTagger } = Route.useLoaderData()
    return (
      <div className="min-h-screen">
        <Navbar />
        <TierTaggerPage serverData={tierTagger} />
        <Footer />
      </div>
    )
  },
})
