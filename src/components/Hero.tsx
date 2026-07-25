import { useState, useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Copy, Check, ArrowRight, ChevronRight } from 'lucide-react'
import { useHomepageConfig } from '../store/homepageStore'
import { getPlayers } from '../store/playersStore'
import { computeRankings, getHighestTier } from '../data/tiers'
import type { PlayerRanks } from '../data/players'

// ─── Tier colours (mirroring tiers.ts tierColors) ────────────────────────────

const TIER_HEX: Record<string, string> = {
  HT1: '#00BFFF', LT1: '#00E5FF',
  HT2: '#7DD3FC', LT2: '#2DD4BF',
  HT3: '#34D399', LT3: '#FACC15',
  HT4: '#FB923C', LT4: '#EA580C',
  HT5: '#EF4444', LT5: '#991B1B',
}

const MODE_LABELS: Record<string, string> = {
  sword: 'Sword', crystal: 'Crystal', axe: 'Axe',
  mace: 'Mace', uhc: 'UHC', nethpot: 'Nethpot', diapot: 'Diapot',
}

type RawPlayer = { name: string; ranks: Record<string, string> }

// ─── Premium live ticker (top of hero) ───────────────────────────────────────

type Entry = { player: string; tier: string; mode: string }

function buildEntries(players: RawPlayer[]): Entry[] {
  const out: Entry[] = []
  for (const p of players) {
    for (const [mode, tier] of Object.entries(p.ranks)) {
      if (tier && tier !== 'NONE' && tier !== 'None')
        out.push({ player: p.name, tier, mode: MODE_LABELS[mode] ?? mode })
    }
  }
  return out
}

function shuffleEntries(entries: Entry[]): Entry[] {
  const shuffled = [...entries]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function PremiumTicker({ label, players }: { label?: string; players: RawPlayer[] }) {
  const entries = useMemo(() => buildEntries(players), [players])
  const [displayEntries, setDisplayEntries] = useState(entries)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    if (entries.length === 0) return
    const randomizedEntries = shuffleEntries(entries)
    setDisplayEntries(randomizedEntries)
    setIdx(Math.floor(Math.random() * randomizedEntries.length))
    const t = setInterval(() => {
      setPhase('out')
      setTimeout(() => {
        setIdx(i => (i + 1) % randomizedEntries.length)
        setPhase('in')
      }, 350)
    }, 4500)
    return () => clearInterval(t)
  }, [entries])

  if (displayEntries.length === 0) return null
  const a = displayEntries[idx % displayEntries.length]
  const tierColor = TIER_HEX[a.tier] ?? '#fff'

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full px-4 py-2"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Pulse dot */}
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
      </span>

      {/* LIVE label */}
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/50 select-none shrink-0">
        {label || 'Live'}
      </span>

      {/* Divider */}
      <span className="w-px h-3 bg-white/10 shrink-0" />

      {/* Activity text */}
      <span
        className="text-xs transition-all duration-300 whitespace-nowrap"
        style={{
          opacity: phase === 'in' ? 1 : 0,
          transform: phase === 'in' ? 'translateY(0)' : 'translateY(-3px)',
        }}
      >
        <span className="text-white/60">{a.player} </span>
        <span className="text-white/35">ranked </span>
        <span className="font-semibold" style={{ color: tierColor }}>{a.tier} </span>
        <span className="text-white/35">in {a.mode}</span>
      </span>
    </div>
  )
}

// ─── Right panel: top players by global ranking ───────────────────────────────

function TopPlayersPanel({ accent, players }: { accent: string; players: RawPlayer[] }) {
  const top = useMemo(() => {
    const rankings = computeRankings(players)

    return players
      .map(p => {
        const info = rankings.get(p.name)
        return {
          name: p.name,
          rank: info?.rank ?? 9999,
          totalPoints: info?.totalPoints ?? 0,
          bestTier: getHighestTier(p.ranks as PlayerRanks),
        }
      })
      .filter(p => p.totalPoints > 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 6)
  }, [players])

  return (
    <div className="hidden lg:flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
          Top Ranked
        </span>
        <Link
          to="/rankings"
          className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:text-white"
          style={{ color: `${accent}99` }}
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Player rows */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm overflow-hidden">
        {top.map((p, i) => {
          const tierColor = p.bestTier ? (TIER_HEX[p.bestTier] ?? '#fff') : '#6B7280'
          return (
            <div
              key={p.name}
              className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.03] transition-colors"
            >
              {/* Rank number */}
              <span
                className="w-4 text-center text-[10px] font-black shrink-0"
                style={{ color: accent }}
              >
                {i + 1}
              </span>

              {/* Avatar */}
              <div className="relative h-8 w-8 shrink-0 rounded bg-white/5 overflow-hidden">
                <img
                  src={`https://mc-heads.net/avatar/${p.name}/32`}
                  alt={p.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded"
                  onError={e => {
                    const img = e.currentTarget
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = '1'
                      img.src = `https://minotar.net/helm/${p.name}/32`
                    } else {
                      img.style.display = 'none'
                    }
                  }}
                />
              </div>

              {/* Name */}
              <span className="flex-1 min-w-0 text-sm font-semibold text-white/85 truncate">
                {p.name}
              </span>

              {/* Points badge */}
              <span
                className="shrink-0 rounded px-2 py-0.5 text-[11px] font-black tracking-wide tabular-nums"
                style={{
                  color: accent,
                  background: `${accent}15`,
                  border: `1px solid ${accent}28`,
                }}
              >
                {p.totalPoints} pts
              </span>
            </div>
          )
        })}
      </div>

      {/* Bottom accent line */}
      <div
        className="h-px w-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }}
      />
    </div>
  )
}

// ─── CTA buttons ─────────────────────────────────────────────────────────────

const DiscordIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.12 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

function CtaButton({ cfg }: { cfg: ReturnType<typeof useHomepageConfig> }) {
  const cta = cfg.hero.primaryCta
  if (!cta.visible) return null
  const isDiscord = cta.style === 'discord'
  const isOutline = cta.style === 'outline' || cta.style === 'ghost'

  const base = 'group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200'
  const cls = isDiscord
    ? `${base} text-white`
    : isOutline
    ? `${base} bg-white/5 border border-white/15 text-white hover:bg-white/10 hover:border-white/25`
    : `${base} text-black hover:brightness-110`
  const style = isDiscord
    ? { background: 'linear-gradient(135deg,#5865F2,#4752c4)' }
    : isOutline ? undefined
    : { background: cfg.theme.heroGradient || cfg.theme.brandPrimary }

  const inner = (
    <>
      {isDiscord && <DiscordIcon />}
      {cta.text}
      {!isDiscord && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
    </>
  )

  return cta.external
    ? <a href={cta.link} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{inner}</a>
    : <Link to={cta.link} className={cls} style={style}>{inner}</Link>
}

function SecondaryCtaButton({ cfg }: { cfg: ReturnType<typeof useHomepageConfig> }) {
  const cta = cfg.hero.secondaryCta
  if (!cta.visible) return null
  const isDiscord = cta.style === 'discord'
  const isOutline = cta.style === 'outline' || cta.style === 'ghost'

  const base = 'group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200'
  const cls = isDiscord
    ? `${base} text-white`
    : isOutline
    ? `${base} bg-transparent border border-white/15 text-white/70 hover:text-white hover:border-white/30`
    : `${base} text-black hover:brightness-110`
  const style = isDiscord ? { background: 'linear-gradient(135deg,#5865F2,#4752c4)' } : undefined

  const inner = (
    <>
      {isDiscord && <DiscordIcon />}
      {cta.text}
    </>
  )

  return cta.external
    ? <a href={cta.link} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{inner}</a>
    : <Link to={cta.link} className={cls} style={style}>{inner}</Link>
}

function CopyIPButton() {
  const cfg = useHomepageConfig()
  const [copied, setCopied] = useState(false)
  const ip = cfg.hero.serverIP || 'play.example.com'
  if (!cfg.hero.showServerIP) return null

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(ip); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { /* fallback */ }
  }

  return (
    <button
      onClick={handleCopy}
      className="group mt-4 inline-flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer"
    >
      <span className="font-mono text-white/50 text-xs tracking-wide">{ip}</span>
      <span className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${copied ? 'text-green-400' : 'text-white/25 group-hover:text-white/40'}`}>
        {copied ? <Check size={10} /> : <Copy size={10} />}
        {copied ? (cfg.hero.ipCopiedLabel || 'Copied!') : (cfg.hero.ipCopyLabel || 'Copy')}
      </span>
    </button>
  )
}

// ─── Main Hero export ─────────────────────────────────────────────────────────

export function Hero({ players: rawPlayers }: { players?: RawPlayer[] | null }) {
  const players: RawPlayer[] = Array.isArray(rawPlayers) ? rawPlayers : []
  const cfg = useHomepageConfig()
  if (!cfg.hero.enabled) return null

  const accent = cfg.theme.brandPrimary || '#00BFFF'
  const anim = cfg.hero.animation === 'fade-up' ? 'fade-in-up' : cfg.hero.animation === 'scale' ? 'animate-[scaleIn_0.8s_ease-out]' : ''

  return (
    <section className={`relative flex flex-col justify-center min-h-[88vh] px-5 sm:px-8 lg:px-12 py-12 overflow-hidden ${anim}`}>

      {/* Vertical accent line — left edge */}
      <div
        className="pointer-events-none absolute left-0 top-1/4 bottom-1/4 w-px"
        style={{ background: `linear-gradient(to bottom, transparent, ${accent}50, transparent)` }}
      />

      <div className="max-w-7xl mx-auto w-full">

        {/* ── Centered ticker — above the split grid ── */}
        {cfg.hero.liveTickerEnabled && (
          <div className="flex justify-center mb-10">
            <PremiumTicker label={cfg.hero.liveTickerLabel} players={players} />
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-10 xl:gap-20 items-center">

          {/* ── Left: main content ── */}
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px shrink-0" style={{ background: accent }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.28em]"
                style={{ color: `${accent}80` }}
              >
                Minecraft PvP · Tier Rankings
              </span>
            </div>

            {/* Title with left-border accent */}
            <div className="pl-5 mb-7" style={{ borderLeft: `3px solid ${accent}` }}>
              <h1 className="font-black leading-[0.92] tracking-tight select-none">
                <span className="block text-5xl sm:text-6xl xl:text-[76px] text-white drop-shadow-2xl">
                  {cfg.hero.title}
                </span>
                <span
                  className="block text-5xl sm:text-6xl xl:text-[76px]"
                  style={{
                    background: cfg.theme.heroGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {cfg.hero.titleAccent}
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-white/45 text-base sm:text-[17px] leading-relaxed mb-8 max-w-lg">
              {cfg.hero.subtitle}
            </p>

            {/* CTA row */}
            <div className="flex items-center flex-wrap gap-3">
              <CtaButton cfg={cfg} />
              <SecondaryCtaButton cfg={cfg} />
            </div>

            <CopyIPButton />
          </div>

          {/* ── Right: live player panel ── */}
          <TopPlayersPanel accent={accent} players={players} />
        </div>

        {/* Scroll hint */}
        {cfg.layout?.showScrollHint && (
          <div className="mt-12 flex justify-center opacity-20 animate-bounce">
            <div className="w-4 h-7 border border-white/40 rounded-full flex justify-center pt-1.5">
              <div className="w-0.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
