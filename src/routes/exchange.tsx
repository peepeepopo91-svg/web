import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { ExchangePanel } from '../components/exchange/ExchangePanel'
import { MiningToast } from '../components/mining/MiningToast'
import { MiningProvider, useMining } from '../context/MiningContext'

export const Route = createFileRoute('/exchange')({
  component: () => (
    <MiningProvider>
      <ExchangePage />
    </MiningProvider>
  ),
})

function ExchangePage() {
  const { user } = useMining()

  return (
    <div className="min-h-screen">
      <Navbar />
      <MiningToast />

      {/* Page header */}
      <section className="relative pt-8 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/15 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-5 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Dynamic Market
          </div>
          <h1 className="font-black text-4xl sm:text-5xl text-white mb-3">
            BlueCoin <span className="text-gradient">Exchange</span>
          </h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">
            Convert your mined BlueCoin into Gems using the live dynamic exchange rate. Rate fluctuates algorithmically — time your trades wisely.
          </p>

          {user && (
            <div className="mt-6 inline-flex items-center gap-4 px-5 py-3 rounded-2xl glass border border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-[#00BFFF] text-sm">💎</span>
                <span className="text-white font-bold">{Math.floor(user.balance).toLocaleString()}</span>
                <span className="text-gray-500 text-xs">BC</span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-sm">✨</span>
                <span className="text-white font-bold">{Math.floor(user.gems ?? 0).toLocaleString()}</span>
                <span className="text-gray-500 text-xs">Gems</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <ExchangePanel />
      <Footer />
    </div>
  )
}
