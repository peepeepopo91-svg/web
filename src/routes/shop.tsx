import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { ShopPage } from '../components/shop/ShopPage'
import { MiningProvider } from '../context/MiningContext'

export const Route = createFileRoute('/shop')({
  component: () => (
    <MiningProvider>
      <ShopLayout />
    </MiningProvider>
  ),
})

function ShopLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <ShopPage />
      <Footer />
    </div>
  )
}
