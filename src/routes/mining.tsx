import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { LoginPanel } from '../components/mining/LoginPanel'
import { UserStatsBar } from '../components/mining/UserStatsBar'
import { BlockProgress } from '../components/mining/BlockProgress'
import { RigCard } from '../components/mining/RigCard'
import { RigShop } from '../components/mining/RigShop'
import { MiningToast } from '../components/mining/MiningToast'
import { MiningLeaderboard } from '../components/mining/MiningLeaderboard'
import { MiningProvider, useMining } from '../context/MiningContext'
import { MiningRenewalBanner } from '../components/mining/MiningRenewalBanner'
import { HardwareCatalogue } from '../components/mining/HardwareCatalogue'
import { MiningSimulator } from '../components/mining/MiningSimulator'
import { ActiveMiners } from '../components/mining/ActiveMiners'

export const Route = createFileRoute('/mining')({
  component: () => (
    <MiningProvider>
      <MiningPage />
    </MiningProvider>
  ),
})

function MiningPage() {
  const { user, isLoading } = useMining()

  return (
    <div className="min-h-screen">
      <Navbar />
      <MiningToast />

      {/* Page header */}
      <section className="relative pt-8 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/15 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-5 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
            Community Mining Network
          </div>
          <h1 className="font-black text-4xl sm:text-5xl text-white mb-3">
            BlueCoin <span className="text-gradient">Mining</span>
          </h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">
            Deploy mining rigs, solve blocks with the community, and earn BlueCoin — the Blue Network's premium cryptocurrency.
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <span className="w-8 h-8 border-2 border-white/10 border-t-[#00BFFF] rounded-full animate-spin" />
        </div>
      ) : !user ? (
        <LoginPanel />
      ) : (
        <>
          <UserStatsBar />
          <MiningRenewalBanner />
          <BlockProgress />

          {/* My Rigs */}
          <section className="px-4 pb-10">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-['Space_Grotesk'] font-bold text-xl text-white">
                    My <span className="text-gradient">Rigs</span>
                  </h2>
                  <p className="text-gray-600 text-xs mt-0.5">
                    {user.rigs.length === 0
                      ? 'No rigs yet — buy one below to start mining'
                      : `${user.rigs.filter(r => r.status === 'mining').length} of ${user.rigs.length} rigs active`}
                  </p>
                </div>

                {/* Quick-mine all / stop all */}
                {user.rigs.length > 0 && (
                  <div className="flex gap-2">
                    <QuickActionButtons />
                  </div>
                )}
              </div>

              {user.rigs.length === 0 ? (
                <div className="glass rounded-2xl border border-white/8 py-16 text-center">
                  <p className="text-5xl mb-4">⛏️</p>
                  <p className="text-gray-400 font-semibold">No rigs in your fleet yet</p>
                  <p className="text-gray-600 text-sm mt-1">Purchase a rig from the shop below to begin mining</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
                  {user.rigs.map(rig => (
                    <RigCard key={rig.id} rig={rig} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="max-w-6xl mx-auto px-4 mb-8">
            <div className="border-t border-white/5" />
          </div>

          <RigShop />
        </>
      )}

      {/* Active Miners — visible to all visitors */}
      <ActiveMiners currentUsername={user?.username ?? null} />

      {/* Global leaderboard — visible to all visitors */}
      <MiningLeaderboard currentUsername={user?.username ?? null} />

      {/* Hardware & Simulator — visible to all visitors */}
      <HardwareSimulatorSection />

      <Footer />
    </div>
  )
}

function HardwareSimulatorSection() {
  const [tab, setTab] = useState<'hardware' | 'simulator'>('hardware')

  return (
    <section className="px-4 pb-16 mt-4">
      <div className="max-w-6xl mx-auto">
        <div className="border-t border-white/5 mb-10" />

        {/* Section header + tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-['Space_Grotesk'] font-bold text-xl text-white">
              Mining <span className="text-gradient">Tools</span>
            </h2>
            <p className="text-gray-600 text-xs mt-0.5">
              Browse hardware specs and simulate your earnings before buying
            </p>
          </div>
          <div className="flex gap-2">
            {([
              { id: 'hardware',  label: '🖥️ Hardware' },
              { id: 'simulator', label: '🧪 Simulator' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  tab === t.id
                    ? 'border-[#00BFFF]/40 bg-[#00BFFF]/10 text-[#00BFFF]'
                    : 'border-white/8 text-gray-500 hover:text-white hover:border-white/20'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'hardware'  && <HardwareCatalogue />}
        {tab === 'simulator' && <MiningSimulator />}
      </div>
    </section>
  )
}

function QuickActionButtons() {
  const { user, startAllRigs, stopAllRigs } = useMining()
  if (!user) return null

  const idleCount   = user.rigs.filter(r => r.status === 'idle').length
  const miningCount = user.rigs.filter(r => r.status === 'mining').length

  return (
    <>
      {idleCount > 0 && (
        <button
          onClick={startAllRigs}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00BFFF]/10 text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/20 transition-all"
        >
          ▶ Start All ({idleCount})
        </button>
      )}
      {miningCount > 0 && (
        <button
          onClick={stopAllRigs}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:border-white/20 transition-all"
        >
          ⏸ Stop All ({miningCount})
        </button>
      )}
    </>
  )
}
