import { useState, useEffect, useRef } from 'react'
import type { Player } from '../data/players'
import { useHomepageConfig } from '../store/homepageStore'

function useCountUp(target: number, duration = 1600, active: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, active])
  return count
}

function StatCard({
  value,
  label,
  accent = false,
  suffix = '',
  icon,
}: {
  value: number
  label: string
  accent?: boolean
  suffix?: string
  icon?: string
}) {
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = useCountUp(value, 1600, active)
  const cfg = useHomepageConfig()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setActive(true) }, { threshold: 0.4 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="text-center">
      <div className={`text-3xl mb-1 ${accent ? 'text-[#00BFFF]' : 'text-white'}`}>{icon}</div>
      {accent ? (
        <div
          className="font-black text-5xl sm:text-6xl lg:text-7xl leading-none mb-2"
          style={{
            background: cfg.theme.textGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {count.toLocaleString()}{suffix}
        </div>
      ) : (
        <div className="font-black text-5xl sm:text-6xl lg:text-7xl leading-none mb-2 text-white">
          {count.toLocaleString()}{suffix}
        </div>
      )}
      <div className="text-white/40 text-sm font-medium">{label}</div>
    </div>
  )
}

export function Stats({ players }: { players: Player[] }) {
  const cfg = useHomepageConfig()
  if (!cfg.stats.enabled) return null

  const totalRanked = players.filter((p) =>
    Object.values(p.ranks).some((t) => t && t !== 'NONE' && t !== 'None')
  ).length

  const testsCompleted = players.reduce((acc, p) =>
    acc + Object.values(p.ranks).filter((t) => t && t !== 'NONE' && t !== 'None').length
  , 0)

  const resolveValue = (source: string, manual: number) => {
    switch (source) {
      case 'players': return totalRanked
      case 'tests': return testsCompleted
      case 'years': return 1
      case 'manual': return manual
      default: return manual
    }
  }

  const visibleCards = cfg.stats.cards.filter(c => c.visible)
  if (visibleCards.length === 0) return null

  return (
    <section className="py-16 px-4 relative">
      <div className="max-w-3xl mx-auto">
        {(cfg.stats.title || cfg.stats.subtitle) && (
          <div className="text-center mb-10">
            {cfg.stats.title && <h2 className="font-black text-3xl text-white">{cfg.stats.title}</h2>}
            {cfg.stats.subtitle && <p className="text-white/40 text-sm mt-2">{cfg.stats.subtitle}</p>}
          </div>
        )}
        <div className={`grid gap-8 sm:gap-16 ${visibleCards.length === 3 ? 'grid-cols-3' : visibleCards.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {visibleCards.map((card) => (
            <StatCard
              key={card.id}
              value={resolveValue(card.source, card.value === 'auto' ? 0 : card.value)}
              label={card.label}
              accent={card.accent}
              suffix={card.suffix}
              icon={card.icon}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
