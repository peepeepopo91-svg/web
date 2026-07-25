import { useState, useMemo, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { PlayerCard, tierColors, TIER_ORDER } from '../components/PlayerCard'
import type { PlayerRanks, Player } from '../data/players'
import defaultPlayers from '../data/players'
import { gamemodes as defaultGamemodes } from '../data/gamemodes'
import type { Gamemode } from '../data/gamemodes'
import { computeRankings, tierSortValue, TIER_POINTS } from '../data/tiers'
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { loadAllData } from '../server/dataFiles'

export const Route = createFileRoute('/rankings')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  loader: async () => {
    try {
      const data = await loadAllData()
      return {
        players: (data.players as Player[] | null) ?? defaultPlayers,
        gamemodes: (data.gamemodes as Gamemode[] | null) ?? defaultGamemodes,
      }
    } catch {
      return { players: defaultPlayers, gamemodes: defaultGamemodes }
    }
  },
  component: RankingsPage,
})

type SortMode = 'points-desc' | 'points-asc' | 'name-asc' | 'name-desc'

const PLAYERS_PER_PAGE = 24

function RankingsPage() {
  const loaderData = Route.useLoaderData()
  const [players, setPlayers] = useState(loaderData.players)
  const [gamemodes, setGamemodes] = useState(loaderData.gamemodes)
  const { q } = Route.useSearch()
  const [search, setSearch] = useState(q ?? '')
  const [activeFilter, setActiveFilter] = useState<keyof PlayerRanks | 'all'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('points-desc')
  const [minTier, setMinTier] = useState<string>('all')
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [isFading, setIsFading] = useState(false)
  const [renderPage, setRenderPage] = useState(1)

  // Ref to the search/filters section so we can smooth scroll to it
  const rankingsSectionRef = useRef<HTMLDivElement>(null)

  // The admin panel persists player changes directly to data/players.json.
  // Refresh the canonical server data when rankings mounts so a client-side
  // navigation cannot keep showing the previous route-loader snapshot.
  useEffect(() => {
    let active = true
    loadAllData()
      .then((data) => {
        if (!active) return
        if (data.players) setPlayers(data.players as Player[])
        if (data.gamemodes) setGamemodes(data.gamemodes as Gamemode[])
      })
      .catch(() => {
        // Keep the already-rendered loader data if the refresh is unavailable.
      })
    return () => { active = false }
  }, [])

  // When a ?q= param is passed (e.g. from the global search modal), sync it
  useEffect(() => {
    if (q !== undefined) {
      setSearch(q)
      // Scroll to results
      setTimeout(() => rankingsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [q])

  // Compute global rankings once — these never change with filter/sort
  const globalRankings = useMemo(() => computeRankings(players), [players])

  const filtered = useMemo(() => {
    return players
      .filter((p) => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        if (activeFilter !== 'all' && (!p.ranks[activeFilter] || p.ranks[activeFilter] === 'None')) return false
        if (minTier !== 'all') {
          const minVal = tierSortValue(minTier)
          const bestVal = activeFilter !== 'all'
            ? tierSortValue(p.ranks[activeFilter])
            : Math.min(
                ...Object.values(p.ranks)
                  .filter(Boolean)
                  .map((t) => tierSortValue(t as string))
              )
          if (bestVal > minVal) return false
        }
        return true
      })
      .sort((a, b) => {
        const aInfo = globalRankings.get(a.name)!
        const bInfo = globalRankings.get(b.name)!

        if (sortMode === 'points-desc') {
          if (activeFilter !== 'all') {
            return tierSortValue(a.ranks[activeFilter]) - tierSortValue(b.ranks[activeFilter])
          }
          return bInfo.totalPoints - aInfo.totalPoints
        }
        if (sortMode === 'points-asc') {
          if (activeFilter !== 'all') {
            return tierSortValue(b.ranks[activeFilter]) - tierSortValue(a.ranks[activeFilter])
          }
          return aInfo.totalPoints - bInfo.totalPoints
        }
        if (sortMode === 'name-asc') return a.name.localeCompare(b.name)
        if (sortMode === 'name-desc') return b.name.localeCompare(a.name)
        return 0
      })
  }, [search, activeFilter, sortMode, minTier, globalRankings])

  // Reset to first page when any search, filter, or sort changes
  useEffect(() => {
    setCurrentPage(1)
    setRenderPage(1)
  }, [search, activeFilter, sortMode, minTier])

  // Calculate pages
  const totalPages = Math.ceil(filtered.length / PLAYERS_PER_PAGE) || 1

  // Get current page players
  const paginatedPlayers = useMemo(() => {
    const startIndex = (renderPage - 1) * PLAYERS_PER_PAGE
    const endIndex = startIndex + PLAYERS_PER_PAGE
    return filtered.slice(startIndex, endIndex)
  }, [filtered, renderPage])

  // Handle page changes with smooth animations and scrolling
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return

    setIsFading(true)
    setCurrentPage(newPage)

    // Smooth scroll to rankings section
    if (rankingsSectionRef.current) {
      rankingsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // After fade-out, switch data and fade back in
    setTimeout(() => {
      setRenderPage(newPage)
      setIsFading(false)
    }, 200) // Duration matching CSS transition
  }

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'points-desc', label: 'Points (High → Low)' },
    { value: 'points-asc',  label: 'Points (Low → High)' },
    { value: 'name-asc',    label: 'Name (A → Z)' },
    { value: 'name-desc',   label: 'Name (Z → A)' },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Page header */}
      <section className="relative pt-8 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/15 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs font-semibold mb-5 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
            Live Rankings
          </div>
          <h1 className="font-black text-4xl sm:text-5xl text-white mb-3">
            Player <span className="text-gradient">Rankings</span>
          </h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">
            Official tier placements for the Blue Tiers network.
          </p>
        </div>
      </section>

      {/* Tier legend */}
      <section className="px-4 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-xl border border-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="text-gray-600 text-xs font-semibold uppercase tracking-wide mr-2">Tiers:</span>
              {TIER_ORDER.map((tier) => {
                const colors = tierColors[tier]
                return (
                  <span
                    key={tier}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {tier}
                    <span className="ml-1 opacity-60 font-normal">{TIER_POINTS[tier]}pt</span>
                  </span>
                )
              })}
              <span className="px-3 py-1 rounded-lg text-xs font-bold border bg-white/3 text-gray-600 border-white/10">
                Unranked
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section ref={rankingsSectionRef} className="px-4 pb-8 scroll-mt-24">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player..."
              className="w-full bg-white/3 border border-white/8 hover:border-white/15 focus:border-[#00BFFF]/50 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-gray-600 outline-none transition-all duration-200"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Controls row: sort + min tier filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Sort:</span>
              <div className="flex flex-wrap gap-1.5">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortMode(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      sortMode === opt.value
                        ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
                        : 'bg-white/3 text-gray-500 border border-white/8 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min tier filter */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Min Tier:</span>
              <select
                value={minTier}
                onChange={(e) => setMinTier(e.target.value)}
                className="bg-white/3 border border-white/8 hover:border-white/15 focus:border-[#00BFFF]/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none transition-all duration-200 cursor-pointer"
              >
                <option value="all" className="bg-[#111827]">All Tiers</option>
                {TIER_ORDER.map((t) => (
                  <option key={t} value={t} className="bg-[#111827]">{t}+</option>
                ))}
              </select>
            </div>
          </div>

          {/* Gamemode filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeFilter === 'all'
                  ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
                  : 'bg-white/3 text-gray-500 border border-white/8 hover:text-white hover:border-white/20'
              }`}
            >
              All
            </button>
            {gamemodes.map((gm) => (
              <button
                key={gm.key}
                onClick={() => setActiveFilter(gm.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeFilter === gm.key
                    ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30'
                    : 'bg-white/3 text-gray-500 border border-white/8 hover:text-white hover:border-white/20'
                }`}
              >
                <span>{gm.fallback}</span>
                {gm.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Player grid */}
      <section className="px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          {filtered.length > 0 ? (
            <>
              <div className="flex justify-between items-center text-gray-600 text-xs mb-4">
                <div>
                  Showing {Math.min(filtered.length, (currentPage - 1) * PLAYERS_PER_PAGE + 1)}-{Math.min(filtered.length, currentPage * PLAYERS_PER_PAGE)} of {filtered.length} player{filtered.length !== 1 ? 's' : ''} found
                  {activeFilter !== 'all' && ` in ${gamemodes.find(g => g.key === activeFilter)?.label}`}
                </div>
                <div>
                  Page {currentPage} of {totalPages}
                </div>
              </div>

              {/* Player Card Container with Transition */}
              <div className={`transition-opacity duration-200 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
                  {paginatedPlayers.map((player) => {
                    const info = globalRankings.get(player.name)
                    return (
                      <PlayerCard
                        key={player.name}
                        player={player}
                        totalPoints={info?.totalPoints}
                        overallRank={info?.rank}
                        overallTier={info?.overallTier}
                        gamemodes={gamemodes}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Modern Premium Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <nav 
                    className="glass flex items-center justify-between gap-1 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-white/5 shadow-lg shadow-black/40 relative overflow-hidden"
                    aria-label="Pagination"
                  >
                    {/* Soft background glow decoration */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00BFFF]/5 to-[#0066FF]/5 pointer-events-none" />

                    {/* First Page */}
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50"
                      aria-label="Go to first page"
                    >
                      <ChevronsLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:-translate-x-1" />
                    </button>

                    {/* Previous Page */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50"
                      aria-label="Go to previous page"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:-translate-x-1" />
                    </button>

                    {/* Current Page Indicator */}
                    <div className="px-3 sm:px-6 py-1 mx-1 flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px] select-none text-center">
                      <span className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                        Rankings Navigation
                      </span>
                      <span className="font-['Space_Grotesk'] text-sm sm:text-base font-bold text-white mt-0.5">
                        Page <span className="text-gradient font-black">{currentPage}</span> <span className="text-gray-600 font-normal">/</span> {totalPages}
                      </span>
                    </div>

                    {/* Next Page */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50"
                      aria-label="Go to next page"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:translate-x-1" />
                    </button>

                    {/* Last Page */}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2.5 sm:p-3 rounded-lg text-gray-400 hover:text-white hover:bg-[#00BFFF]/10 border border-transparent hover:border-[#00BFFF]/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus:ring-1 focus:ring-[#00BFFF]/50"
                      aria-label="Go to last page"
                    >
                      <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 active:translate-x-1" />
                    </button>
                  </nav>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-500 text-lg font-semibold">No players found</p>
              <p className="text-gray-700 text-sm mt-1">Try a different search or filter</p>
              <button
                onClick={() => { setSearch(''); setActiveFilter('all'); setMinTier('all') }}
                className="mt-4 px-5 py-2 rounded-lg bg-[#00BFFF]/10 text-[#00BFFF] text-sm hover:bg-[#00BFFF]/20 transition-colors border border-[#00BFFF]/20"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

