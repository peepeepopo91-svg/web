import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Megaphone, Sparkles, Ticket, X, Zap } from 'lucide-react'
import type { AnnouncementConfig, EventConfig } from '../store/homepageStore'

type BannerTone = 'info' | 'warning' | 'success' | 'event'

const toneColors: Record<BannerTone, { accent: string; soft: string; border: string }> = {
  info: { accent: '#00BFFF', soft: 'rgba(0,191,255,0.12)', border: 'rgba(0,191,255,0.25)' },
  warning: { accent: '#F59E0B', soft: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.28)' },
  success: { accent: '#34D399', soft: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
  event: { accent: '#A78BFA', soft: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.28)' },
}

function isHttpLink(link: string) {
  return /^https?:\/\//i.test(link)
}

function BannerLink({ href, children, className = '', style }: { href: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  if (!href) return null
  return (
    <a
      href={href}
      target={isHttpLink(href) ? '_blank' : undefined}
      rel={isHttpLink(href) ? 'noopener noreferrer' : undefined}
      className={className}
      style={style}
    >
      {children}
    </a>
  )
}

function useDismissed(id: string, enabled: boolean) {
  const key = `blue-tiers-banner-dismissed:${id}`
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    try { setDismissed(window.localStorage.getItem(key) === '1') } catch { /* storage is optional */ }
  }, [key, enabled])

  const dismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(key, '1') } catch { /* storage is optional */ }
  }

  return { dismissed, dismiss }
}

function isWithinSchedule(startAt: string | null | undefined, endAt: string | null | undefined) {
  const now = Date.now()
  if (startAt && Number.isFinite(new Date(startAt).getTime()) && new Date(startAt).getTime() > now) return false
  if (endAt && Number.isFinite(new Date(endAt).getTime()) && new Date(endAt).getTime() < now) return false
  return true
}

export function isAnnouncementLive(announcement: AnnouncementConfig) {
  return announcement.enabled && !!(announcement.title || announcement.text) && isWithinSchedule(announcement.startAt, announcement.endAt)
}

function useCountdown(endDate: string, preview: boolean) {
  const getRemaining = () => {
    if (preview && !endDate) return { total: 2 * 86400000 + 4 * 3600000 + 18 * 60000 + 36 * 1000, expired: false }
    const target = new Date(endDate).getTime()
    if (!Number.isFinite(target)) return { total: 0, expired: true }
    const total = Math.max(0, target - Date.now())
    return { total, expired: total <= 0 }
  }
  const [remaining, setRemaining] = useState(getRemaining)

  useEffect(() => {
    setRemaining(getRemaining())
    const timer = window.setInterval(() => setRemaining(getRemaining()), 1000)
    return () => window.clearInterval(timer)
  }, [endDate, preview])

  const totalSeconds = Math.floor(remaining.total / 1000)
  return {
    ...remaining,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}


function AnnouncementIcon({ icon, tone }: { icon: string; tone: BannerTone }) {
  if (icon) return <span className="text-lg leading-none">{icon}</span>
  const Icon = tone === 'event' ? Sparkles : tone === 'warning' ? Zap : Megaphone
  return <Icon className="h-4 w-4" />
}

export function AnnouncementBanner({ announcement, preview = false }: { announcement: AnnouncementConfig; preview?: boolean }) {
  const { dismissed, dismiss } = useDismissed(announcement.id, !preview && announcement.dismissible)
  const tone = toneColors[announcement.type] ?? toneColors.info
  const accent = announcement.accentColor || tone.accent
  const background = announcement.backgroundColor || tone.soft
  const title = announcement.title || announcement.text || 'Announcement'
  const body = announcement.body || (announcement.title ? announcement.text : '')
  const style = announcement.style || 'ribbon'

  if (dismissed) return null

  const close = announcement.dismissible ? (
    <button onClick={dismiss} aria-label="Dismiss announcement" className="rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white">
      <X className="h-3.5 w-3.5" />
    </button>
  ) : null

  if (style === 'minimal') {
    return (
      <div className="relative border-b border-white/10 bg-black/40 px-4 py-2.5 text-center text-sm text-white/75">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-2">
          <AnnouncementIcon icon={announcement.icon} tone={announcement.type} />
          <span>{title}</span>
          <BannerLink href={announcement.link} className="font-semibold underline underline-offset-2" style={{ color: accent } as React.CSSProperties}>{announcement.linkLabel || 'Learn more'}</BannerLink>
          {close}
        </div>
      </div>
    )
  }

  if (style === 'ticker') {
    return (
      <div className="relative overflow-hidden border-b px-4 py-2.5" style={{ background, borderColor: `${accent}45` }}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 text-xs">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-bold uppercase tracking-widest" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} />
            {announcement.eyebrow || announcement.type}
          </span>
          <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-white/80">
            <span className="font-semibold text-white">{title}</span>{body ? <span className="text-white/45"> — {body}</span> : null}
          </div>
          <BannerLink href={announcement.link} className="hidden shrink-0 items-center gap-1 font-semibold sm:flex" style={{ color: accent } as React.CSSProperties}>{announcement.linkLabel || 'View'} <ArrowRight className="h-3 w-3" /></BannerLink>
          {close}
        </div>
      </div>
    )
  }

  if (style === 'spotlight') {
    return (
      <div className="relative overflow-hidden border-b px-4 py-4" style={{ background: `radial-gradient(circle at 15% 0%, ${accent}25, transparent 48%), ${background}`, borderColor: `${accent}45` }}>
        <div className="relative mx-auto flex max-w-6xl items-center gap-4">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:flex" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}18` }}>
            <AnnouncementIcon icon={announcement.icon} tone={announcement.type} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>{announcement.eyebrow || announcement.type}</p>
            <p className="truncate text-sm font-bold text-white">{title}</p>
            {body && <p className="mt-0.5 truncate text-xs text-white/50">{body}</p>}
          </div>
          <BannerLink href={announcement.link} className="hidden shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10 sm:flex" style={{ color: accent, borderColor: `${accent}55` } as React.CSSProperties}>{announcement.linkLabel || 'Learn more'} <ArrowRight className="h-3 w-3" /></BannerLink>
          {close}
        </div>
      </div>
    )
  }

  if (style === 'gradient') {
    return (
      <div className="relative overflow-hidden border-b px-4 py-4" style={{ background: `linear-gradient(100deg, ${accent}30, ${background}, rgba(0,0,0,0.25))`, borderColor: `${accent}55` }}>
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl" style={{ background: `${accent}35` }} />
        <div className="relative mx-auto flex max-w-5xl items-center gap-3 text-center sm:gap-5 sm:text-left">
          <AnnouncementIcon icon={announcement.icon} tone={announcement.type} />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>{announcement.eyebrow || announcement.type}</p>
            <p className="mt-0.5 text-sm font-bold text-white">{title}{body ? <span className="font-normal text-white/55"> — {body}</span> : null}</p>
          </div>
          <BannerLink href={announcement.link} className="hidden shrink-0 rounded-full px-4 py-2 text-xs font-bold text-black sm:block" style={{ background: accent } as React.CSSProperties}>{announcement.linkLabel || 'Explore'}</BannerLink>
          {close}
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden border-b px-4 py-3" style={{ background, borderColor: `${accent}40` }}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 text-sm">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ color: accent, background: `${accent}18` }}>
          <AnnouncementIcon icon={announcement.icon} tone={announcement.type} />
        </div>
        <div className="min-w-0 flex-1 truncate">
          <span className="font-semibold text-white">{title}</span>
          {body && <span className="ml-1 text-white/50">— {body}</span>}
        </div>
        <BannerLink href={announcement.link} className="hidden shrink-0 items-center gap-1 text-xs font-semibold sm:flex" style={{ color: accent } as React.CSSProperties}>{announcement.linkLabel || 'Learn more'} <ArrowRight className="h-3 w-3" /></BannerLink>
        {close}
      </div>
    </div>
  )
}

// ─── Event banner: 5 styles × 4 heights = 20 distinct layouts ────────────────

type CDState = ReturnType<typeof useCountdown>

function Ico({ icon }: { icon: string }) {
  return icon ? <span className="leading-none select-none">{icon}</span> : <Ticket className="h-4 w-4 opacity-50" />
}

function useDismissedEvent(key: string, enabled: boolean) {
  const storageKey = `bn-event-dismissed:${key}`
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    try { setDismissed(window.localStorage.getItem(storageKey) === '1') } catch { /* storage optional */ }
  }, [storageKey, enabled])
  const dismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(storageKey, '1') } catch { /* storage optional */ }
  }
  return { dismissed, dismiss }
}

// ── Countdown atoms ───────────────────────────────────────────────────────────

/** 38D:05H:44M:31S — single-line inline */
function InlineCd({ cd, accent }: { cd: CDState; accent: string }) {
  const vals = [cd.days, cd.hours, cd.minutes, cd.seconds]
  return (
    <div className="flex items-center font-['Space_Grotesk'] text-[11px] font-bold tabular-nums select-none shrink-0">
      {(['D','H','M','S'] as const).map((u, i) => (
        <span key={u}>
          <span className="text-white">{String(vals[i]).padStart(2,'0')}</span>
          <span style={{ color: accent }}>{u}</span>
          {i < 3 && <span className="mx-px text-white/20">:</span>}
        </span>
      ))}
    </div>
  )
}

/** [38D] [05H] [44M] — pill chips */
function ChipCd({ cd, accent }: { cd: CDState; accent: string }) {
  const vals = [cd.days, cd.hours, cd.minutes]
  return (
    <div className="flex items-center gap-1 shrink-0">
      {(['D','H','M'] as const).map((u, i) => (
        <div key={u} className="flex items-baseline gap-px rounded border bg-black/30 px-2 py-0.5 font-['Space_Grotesk'] text-[11px] font-bold tabular-nums text-white" style={{ borderColor: `${accent}28` }}>
          {String(vals[i]).padStart(2,'0')}
          <span className="text-[8px] font-medium" style={{ color: accent }}>{u}</span>
        </div>
      ))}
    </div>
  )
}

/** Full D/H/M/S stacked boxes with optional label */
function BoxCd({ cd, label, accent, sm = false }: { cd: CDState; label: string; accent: string; sm?: boolean }) {
  const vals = [cd.days, cd.hours, cd.minutes, cd.seconds]
  return (
    <div className="flex flex-col gap-1 shrink-0">
      {label && <span className="text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap" style={{ color: accent }}>{label}</span>}
      <div className={`flex items-end ${sm ? 'gap-1' : 'gap-1.5'}`}>
        {(['D','H','M','S'] as const).map((u, i) => (
          <div key={u} className={`rounded-lg border bg-black/25 text-center backdrop-blur-sm ${sm ? 'min-w-[30px] px-1 py-0.5' : 'min-w-[40px] px-2 py-1.5'}`} style={{ borderColor: `${accent}18` }}>
            <div className={`font-['Space_Grotesk'] font-black text-white tabular-nums leading-none ${sm ? 'text-sm' : 'text-lg'}`}>{String(vals[i]).padStart(2,'0')}</div>
            <div className={`mt-0.5 font-bold uppercase text-white/30 ${sm ? 'text-[6px]' : 'text-[8px]'}`}>{u}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Shared props type ─────────────────────────────────────────────────────────
interface BP {
  accent: string; bg: string
  title: string; subtitle: string; description: string
  icon: string; badge: string; cdLabel: string; imageUrl: string
  isExpired: boolean; closedTxt: string
  showCd: boolean; cd: CDState
  showMeta: boolean; metaLabel: string; metaValue: string
  primaryBtn: React.ReactNode; secondaryBtn: React.ReactNode; dismissBtn: React.ReactNode
}

// ════════════════════════════════════════════════════════════════════════════════
// 1 · MEGA — blue gradient, soft ambient glow left
// ════════════════════════════════════════════════════════════════════════════════
function MegaBanner({ height, ...p }: BP & { height: string }) {
  const shell = (ch: React.ReactNode) => (
    <div className="relative overflow-hidden" style={{ background: `linear-gradient(100deg,${p.bg} 0%,#020811 80%)`, borderBottom: `1px solid ${p.accent}20` }}>
      <div className="pointer-events-none absolute -left-12 inset-y-0 w-40 rounded-full blur-3xl opacity-40" style={{ background: `${p.accent}22` }} />
      {ch}
    </div>
  )
  const R = 'relative mx-auto flex max-w-7xl items-center gap-3 px-5'

  if (height === 'xs') return shell(
    <div className={`${R} py-1.5`}>
      {p.badge && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: p.accent, background: `${p.accent}18` }}>{p.badge}</span>}
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{p.title}</span>
      {p.showCd && !p.isExpired && <InlineCd cd={p.cd} accent={p.accent} />}
      {p.primaryBtn}{p.dismissBtn}
    </div>
  )

  if (height === 'sm') return shell(
    <div className={`${R} py-2.5`}>
      {p.icon && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm" style={{ color: p.accent }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2">
        {p.badge && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: p.accent, background: `${p.accent}18` }}>{p.badge}</span>}
        <span className="text-sm font-bold text-white">{p.title}</span>
        {!p.isExpired && p.subtitle && <span className="hidden truncate text-xs text-white/40 sm:block">— {p.subtitle}</span>}
        {p.isExpired && <span className="text-xs text-white/35">{p.closedTxt}</span>}
      </div>
      {p.showCd && !p.isExpired && <ChipCd cd={p.cd} accent={p.accent} />}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  if (height === 'md') return shell(
    <div className={`${R} py-4`}>
      {p.icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl" style={{ color: p.accent }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-sm font-bold leading-snug text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/45">{p.subtitle}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
      </div>
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} sm /></div>}
      <div className="flex shrink-0 flex-col gap-1">{p.primaryBtn}{p.secondaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  return shell(
    <div className={`${R} py-7`}>
      {p.icon && <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl" style={{ color: p.accent }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-base font-black text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/50">{p.subtitle}</p>}
        {!p.isExpired && p.description && <p className="mt-0.5 line-clamp-1 text-xs text-white/30">{p.description}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
        {p.showMeta && p.metaLabel && <p className="mt-1 text-[10px] text-white/35"><span style={{ color: p.accent }}>{p.metaLabel}:</span> {p.metaValue}</p>}
      </div>
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} /></div>}
      <div className="flex shrink-0 items-center gap-2">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// 2 · NEON — cyber grid, glowing neon borders
// ════════════════════════════════════════════════════════════════════════════════
function NeonBanner({ height, ...p }: BP & { height: string }) {
  const shell = (ch: React.ReactNode) => (
    <div className="relative overflow-hidden" style={{ background: p.bg, borderBottom: `1px solid ${p.accent}55`, boxShadow: `0 1px 0 ${p.accent}20` }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `linear-gradient(${p.accent}ff 1px,transparent 1px),linear-gradient(90deg,${p.accent}ff 1px,transparent 1px)`, backgroundSize: '28px 28px' }} />
      {ch}
    </div>
  )
  const R = 'relative mx-auto flex max-w-7xl items-center gap-3 px-5'
  const glow = (size: string) => `flex shrink-0 items-center justify-center rounded border-2 ${size}`

  if (height === 'xs') return shell(
    <div className={`${R} py-1.5`}>
      <span className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: p.accent, borderColor: `${p.accent}60`, background: `${p.accent}10`, boxShadow: `0 0 6px ${p.accent}30` }}>{p.badge || 'LIVE'}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-tight text-white">{p.title}</span>
      {p.showCd && !p.isExpired && <InlineCd cd={p.cd} accent={p.accent} />}
      {p.primaryBtn}{p.dismissBtn}
    </div>
  )

  if (height === 'sm') return shell(
    <div className={`${R} py-2.5`}>
      {p.icon && <span className={glow('h-7 w-7 text-sm')} style={{ color: p.accent, borderColor: p.accent, boxShadow: `0 0 10px ${p.accent}45` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2">
        {p.badge && <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest" style={{ color: p.accent }}>{p.badge}</span>}
        <span className="text-sm font-bold uppercase tracking-tight text-white">{p.title}</span>
        {!p.isExpired && p.subtitle && <span className="hidden text-xs text-white/40 sm:block">— {p.subtitle}</span>}
        {p.isExpired && <span className="text-xs text-white/35">{p.closedTxt}</span>}
      </div>
      {p.showCd && !p.isExpired && <ChipCd cd={p.cd} accent={p.accent} />}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  if (height === 'md') return shell(
    <div className={`${R} py-4`}>
      {p.icon && <span className={glow('h-10 w-10 text-xl')} style={{ color: p.accent, borderColor: p.accent, boxShadow: `0 0 16px ${p.accent}50, inset 0 0 8px ${p.accent}15` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-sm font-black uppercase tracking-tight text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/45">{p.subtitle}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
      </div>
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} sm /></div>}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  return shell(
    <div className={`${R} py-7`}>
      {p.icon && <span className={glow('h-14 w-14 text-3xl')} style={{ color: p.accent, borderColor: p.accent, boxShadow: `0 0 28px ${p.accent}55, inset 0 0 14px ${p.accent}15` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-[0.28em]" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-lg font-black uppercase tracking-tight text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/45">{p.subtitle}</p>}
        {!p.isExpired && p.description && <p className="mt-0.5 line-clamp-1 text-xs text-white/25">{p.description}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
      </div>
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} /></div>}
      <div className="flex shrink-0 items-center gap-2">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// 3 · SPLIT — diagonal gradient + image/glow fill on the right
// ════════════════════════════════════════════════════════════════════════════════
function SplitBanner({ height, ...p }: BP & { height: string }) {
  const rightFill = p.imageUrl
    ? `linear-gradient(90deg,${p.bg} 15%,transparent 55%),url(${p.imageUrl})`
    : `radial-gradient(circle at 85% 50%,${p.accent}35,transparent 60%)`
  const shell = (ch: React.ReactNode) => (
    <div className="relative overflow-hidden" style={{ background: `linear-gradient(108deg,${p.bg} 52%,#020812)`, borderBottom: `1px solid ${p.accent}28` }}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5" style={{ backgroundImage: rightFill, backgroundPosition: 'center right', backgroundSize: 'cover' }} />
      {ch}
    </div>
  )
  const R = 'relative mx-auto flex max-w-7xl items-center gap-3 px-5'

  if (height === 'xs') return shell(
    <div className={`${R} py-1.5`}>
      {p.badge && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: p.accent, background: `${p.accent}22` }}>{p.badge}</span>}
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{p.title}</span>
      {p.showCd && !p.isExpired && <InlineCd cd={p.cd} accent={p.accent} />}
      {p.primaryBtn}{p.dismissBtn}
    </div>
  )

  if (height === 'sm') return shell(
    <div className={`${R} py-2.5`}>
      {p.icon && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm" style={{ color: p.accent, background: `${p.accent}22` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2">
        {p.badge && <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest" style={{ color: p.accent }}>{p.badge}</span>}
        <span className="text-sm font-bold text-white">{p.title}</span>
        {!p.isExpired && p.subtitle && <span className="hidden text-xs text-white/40 sm:block">— {p.subtitle}</span>}
        {p.isExpired && <span className="text-xs text-white/35">{p.closedTxt}</span>}
      </div>
      {p.showCd && !p.isExpired && <ChipCd cd={p.cd} accent={p.accent} />}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  if (height === 'md') return shell(
    <div className={`${R} py-4`}>
      {p.icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl" style={{ color: p.accent, background: `${p.accent}25` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-sm font-bold text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/45">{p.subtitle}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
      </div>
      {p.showCd && !p.isExpired && (
        <div className="hidden sm:block rounded-xl border border-white/8 bg-black/25 px-3 py-2 backdrop-blur-sm" style={{ borderColor: `${p.accent}18` }}>
          <BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} sm />
        </div>
      )}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  return shell(
    <div className={`${R} py-7`}>
      {p.icon && <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ color: p.accent, background: `${p.accent}25` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-base font-black text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/50">{p.subtitle}</p>}
        {!p.isExpired && p.description && <p className="mt-0.5 line-clamp-1 text-xs text-white/30">{p.description}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
        {p.showMeta && p.metaLabel && <p className="mt-1 text-[10px] text-white/35"><span style={{ color: p.accent }}>{p.metaLabel}:</span> {p.metaValue}</p>}
      </div>
      {p.showCd && !p.isExpired && (
        <div className="hidden sm:block rounded-xl border border-white/8 bg-black/30 px-4 py-3 backdrop-blur-sm" style={{ borderColor: `${p.accent}18` }}>
          <BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} />
        </div>
      )}
      <div className="flex shrink-0 flex-col gap-1">{p.primaryBtn}{p.secondaryBtn}</div>
      {p.dismissBtn}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// 4 · SPOTLIGHT — radial glow from top, timer-centric layout
// ════════════════════════════════════════════════════════════════════════════════
function SpotlightBanner({ height, ...p }: BP & { height: string }) {
  const shell = (ch: React.ReactNode) => (
    <div className="relative overflow-hidden" style={{ background: `radial-gradient(ellipse 60% 240% at 50% -5%,${p.accent}22,transparent 65%),${p.bg}`, borderBottom: `1px solid ${p.accent}30` }}>
      {ch}
    </div>
  )
  const R = 'relative mx-auto flex max-w-7xl items-center gap-3 px-5'

  if (height === 'xs') return shell(
    <div className={`${R} py-1.5 justify-between`}>
      <div className="flex min-w-0 items-center gap-2">
        {p.badge && <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: p.accent, borderColor: `${p.accent}50`, background: `${p.accent}10` }}>{p.badge}</span>}
        <span className="truncate text-xs font-semibold text-white">{p.title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {p.showCd && !p.isExpired && <InlineCd cd={p.cd} accent={p.accent} />}
        {p.primaryBtn}{p.dismissBtn}
      </div>
    </div>
  )

  if (height === 'sm') return shell(
    <div className={`${R} py-2.5`}>
      {p.badge && <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: p.accent, borderColor: `${p.accent}55`, background: `${p.accent}12` }}>{p.badge}</span>}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-bold text-white">{p.title}</span>
        {!p.isExpired && p.subtitle && <span className="ml-2 hidden text-xs text-white/40 sm:inline">— {p.subtitle}</span>}
        {p.isExpired && <span className="ml-2 text-xs text-white/35">{p.closedTxt}</span>}
      </div>
      {p.showCd && !p.isExpired && <ChipCd cd={p.cd} accent={p.accent} />}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  if (height === 'md') return shell(
    <div className={`${R} py-4`}>
      <div className="min-w-0 flex-1">
        {p.badge && <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-sm font-bold text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/45">{p.subtitle}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
      </div>
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} sm /></div>}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  return shell(
    <div className={`${R} py-7`}>
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: p.accent }}>{p.badge}</p>}
        <p className="text-base font-black text-white">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/50">{p.subtitle}</p>}
        {!p.isExpired && p.description && <p className="mt-0.5 line-clamp-1 text-xs text-white/30">{p.description}</p>}
        {p.isExpired && <p className="text-xs text-white/35">{p.closedTxt}</p>}
      </div>
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} /></div>}
      <div className="flex shrink-0 items-center gap-2">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// 5 · MINIMAL — ultra-clean, near-invisible, typography-first
// ════════════════════════════════════════════════════════════════════════════════
function MinimalBanner({ height, ...p }: BP & { height: string }) {
  const shell = (ch: React.ReactNode) => (
    <div className="relative" style={{ background: `${p.bg}f0`, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {ch}
    </div>
  )
  const R = 'mx-auto flex max-w-7xl items-center gap-3 px-5'
  const div = <div className="mx-4 hidden h-6 w-px bg-white/8 md:block" />
  const divLg = <div className="mx-4 hidden h-8 w-px bg-white/8 lg:block" />

  if (height === 'xs') return shell(
    <div className={`${R} py-1.5`}>
      {p.badge && <span className="shrink-0 text-[9px] font-black uppercase tracking-widest" style={{ color: p.accent }}>{p.badge} ·</span>}
      <span className="min-w-0 flex-1 truncate text-xs text-white/80">{p.title}</span>
      {!p.isExpired && p.subtitle && <span className="hidden text-xs text-white/35 sm:block">— {p.subtitle}</span>}
      {p.showCd && !p.isExpired && <InlineCd cd={p.cd} accent={p.accent} />}
      {p.primaryBtn}{p.dismissBtn}
    </div>
  )

  if (height === 'sm') return shell(
    <div className={`${R} py-2.5`}>
      {p.icon && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs" style={{ color: p.accent, background: `${p.accent}12` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2">
        {p.badge && <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-white/40">{p.badge}</span>}
        <span className="text-sm font-semibold text-white/90">{p.title}</span>
        {!p.isExpired && p.subtitle && <span className="hidden text-xs text-white/35 sm:block">— {p.subtitle}</span>}
        {p.isExpired && <span className="text-xs text-white/30">{p.closedTxt}</span>}
      </div>
      {p.showCd && !p.isExpired && <InlineCd cd={p.cd} accent={p.accent} />}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  if (height === 'md') return shell(
    <div className={`${R} py-4`}>
      {p.icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base" style={{ color: p.accent, background: `${p.accent}10` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">{p.badge}</p>}
        <p className="text-sm font-semibold text-white/90">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/35">{p.subtitle}</p>}
        {p.isExpired && <p className="text-xs text-white/30">{p.closedTxt}</p>}
      </div>
      {div}
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><ChipCd cd={p.cd} accent={p.accent} /></div>}
      {div}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )

  return shell(
    <div className={`${R} py-7`}>
      {p.icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ color: p.accent, background: `${p.accent}10` }}><Ico icon={p.icon} /></span>}
      <div className="min-w-0 flex-1">
        {p.badge && <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">{p.badge}</p>}
        <p className="text-sm font-bold text-white/90">{p.title}</p>
        {!p.isExpired && p.subtitle && <p className="text-xs text-white/40">{p.subtitle}</p>}
        {!p.isExpired && p.description && <p className="mt-0.5 line-clamp-1 text-xs text-white/25">{p.description}</p>}
        {p.isExpired && <p className="text-xs text-white/30">{p.closedTxt}</p>}
        {p.showMeta && p.metaLabel && <p className="mt-1 text-[10px] text-white/30">{p.metaLabel}: <span className="text-white/50">{p.metaValue}</span></p>}
      </div>
      {divLg}
      {p.showCd && !p.isExpired && <div className="hidden sm:block"><BoxCd cd={p.cd} label={p.cdLabel} accent={p.accent} sm /></div>}
      {divLg}
      <div className="flex shrink-0 items-center gap-1.5">{p.secondaryBtn}{p.primaryBtn}</div>
      {p.dismissBtn}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// Main export — resolves hooks, builds shared props, dispatches to style fn
// ════════════════════════════════════════════════════════════════════════════════
export function EventBanner({ event, preview = false }: { event: EventConfig; preview?: boolean }) {
  const { dismissed, dismiss } = useDismissedEvent(event.title, !preview && (event.dismissible === true))
  const cd = useCountdown(event.endDate, preview)

  if (!event.enabled || (!preview && !event.visible)) return null
  if (!preview && dismissed) return null
  if (!preview && event.hideWhenExpired && cd.expired) return null

  const accent = event.accentColor || '#00BFFF'
  const bg     = event.backgroundColor || '#071426'
  const style  = event.style || 'mega'
  const height = (event.bannerHeight as string) || 'sm'

  const primaryBtn = event.showPrimaryButton !== false && event.link ? (
    <BannerLink href={event.link} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-110" style={{ background: accent } as React.CSSProperties}>
      {event.buttonText || 'Learn more'} <ArrowRight className="h-3 w-3" />
    </BannerLink>
  ) : null

  const secondaryBtn = event.showSecondaryButton !== false && event.secondaryLink && event.secondaryButtonText ? (
    <BannerLink href={event.secondaryLink} className="inline-flex shrink-0 items-center rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">
      {event.secondaryButtonText}
    </BannerLink>
  ) : null

  const dismissBtn = event.dismissible && !preview ? (
    <button onClick={dismiss} aria-label="Dismiss event banner" className="ml-1 shrink-0 rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-white">
      <X className="h-3.5 w-3.5" />
    </button>
  ) : null

  const bp: BP = {
    accent, bg,
    title: event.title || 'Featured event',
    subtitle: event.subtitle || '',
    description: event.description || '',
    icon: event.icon || '',
    badge: event.badge || '',
    cdLabel: event.countdownLabel || 'Ends in',
    imageUrl: event.imageUrl || '',
    isExpired: cd.expired && !preview,
    closedTxt: event.closedText || 'Registration is now closed.',
    showCd: event.showCountdown !== false,
    cd,
    showMeta: event.showMeta !== false && !!(event.metaLabel || event.metaValue),
    metaLabel: event.metaLabel || '',
    metaValue: event.metaValue || '',
    primaryBtn, secondaryBtn, dismissBtn,
  }

  if (style === 'neon')      return <NeonBanner      {...bp} height={height} />
  if (style === 'split')     return <SplitBanner     {...bp} height={height} />
  if (style === 'countdown') return <SpotlightBanner {...bp} height={height} />
  if (style === 'minimal')   return <MinimalBanner   {...bp} height={height} />
  return                            <MegaBanner      {...bp} height={height} />
}

export function ActiveHomepageBanners({ announcements, event }: { announcements: AnnouncementConfig[]; event: EventConfig }) {
  const active = useMemo(() => announcements.filter(isAnnouncementLive), [announcements])
  return (
    <>
      {active.map(announcement => <AnnouncementBanner key={announcement.id} announcement={announcement} />)}
      <EventBanner event={event} />
    </>
  )
}