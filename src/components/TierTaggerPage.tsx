// ─── Tier Tagger landing page ─────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useTierTaggerConfig, type TierTaggerConfig } from '../store/tierTaggerStore'

interface Props {
  serverData?: Partial<TierTaggerConfig> | null
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(targetIso).getTime() - Date.now()),
  )

  useEffect(() => {
    if (!targetIso) { setRemaining(0); return }
    function tick() {
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])

  const totalSec = Math.floor(remaining / 1000)
  return {
    days:    Math.floor(totalSec / 86400),
    hours:   Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    expired: remaining === 0,
  }
}

// ─── Digit block ──────────────────────────────────────────────────────────────

function Digit({ value, label, size }: { value: number; label: string; size: 'lg' | 'sm' }) {
  const str = String(value).padStart(2, '0')
  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 76, height: 80,
            background: 'linear-gradient(160deg, rgba(0,191,255,0.08) 0%, rgba(0,0,0,0.6) 100%)',
            border: '1px solid rgba(0,191,255,0.22)',
            borderRadius: 14,
            boxShadow: '0 0 24px rgba(0,191,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* inner shine line */}
          <div className="absolute top-0 inset-x-3 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(0,191,255,0.4),transparent)' }} />
          <span
            className="font-['Space_Grotesk'] font-black tabular-nums"
            style={{ fontSize: 34, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(0,191,255,0.5)' }}
          >
            {str}
          </span>
        </div>
        <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
    )
  }
  // sm
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex items-center justify-center"
        style={{
          width: 42, height: 44,
          background: 'linear-gradient(160deg, rgba(0,191,255,0.08) 0%, rgba(0,0,0,0.6) 100%)',
          border: '1px solid rgba(0,191,255,0.2)',
          borderRadius: 9,
          boxShadow: '0 0 14px rgba(0,191,255,0.1)',
        }}
      >
        <span
          className="font-['Space_Grotesk'] font-black tabular-nums"
          style={{ fontSize: 18, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 0 12px rgba(0,191,255,0.4)' }}
        >
          {str}
        </span>
      </div>
      <span style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function Separator({ size }: { size: 'lg' | 'sm' }) {
  return (
    <div
      className="flex flex-col gap-2 pb-4"
      style={{ color: 'rgba(0,191,255,0.35)', fontWeight: 900, fontSize: size === 'lg' ? 22 : 14, letterSpacing: 0 }}
    >
      <span>:</span>
    </div>
  )
}

// ─── Release Countdown ────────────────────────────────────────────────────────

interface CountdownProps {
  heading: string
  subtext: string
  releaseDate: string
  variant: 'hero' | 'cta'
  // fallback rendered when expired
  fallback: React.ReactNode
}

function ReleaseCountdown({ heading, subtext, releaseDate, variant, fallback }: CountdownProps) {
  const { days, hours, minutes, seconds, expired } = useCountdown(releaseDate)

  if (expired && releaseDate) return <>{fallback}</>

  const releaseLabel = releaseDate
    ? new Date(releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  if (variant === 'hero') {
    return (
      <div className="flex flex-col items-center gap-3">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)', color: '#00BFFF' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
          {heading}
        </div>

        {/* Compact digits */}
        <div className="flex items-end gap-1.5">
          <Digit value={days}    label="Days" size="sm" />
          <Separator size="sm" />
          <Digit value={hours}   label="Hrs"  size="sm" />
          <Separator size="sm" />
          <Digit value={minutes} label="Min"  size="sm" />
          <Separator size="sm" />
          <Digit value={seconds} label="Sec"  size="sm" />
        </div>

        {releaseLabel && (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>
            Releasing {releaseLabel}
          </p>
        )}
      </div>
    )
  }

  // cta — full size
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Lock badge */}
      <div
        className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em]"
        style={{ background: 'rgba(0,191,255,0.07)', border: '1px solid rgba(0,191,255,0.22)', color: '#00BFFF' }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        {heading}
      </div>

      {/* Digits */}
      <div className="flex items-end gap-3">
        <Digit value={days}    label="Days"    size="lg" />
        <Separator size="lg" />
        <Digit value={hours}   label="Hours"   size="lg" />
        <Separator size="lg" />
        <Digit value={minutes} label="Minutes" size="lg" />
        <Separator size="lg" />
        <Digit value={seconds} label="Seconds" size="lg" />
      </div>

      {/* Subtext */}
      <div className="space-y-1.5 text-center">
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>
          {subtext}
        </p>
        {releaseLabel && (
          <p style={{ fontSize: 11, color: 'rgba(0,191,255,0.5)', letterSpacing: '0.12em', fontWeight: 600 }}>
            {releaseLabel}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TierTaggerPage({ serverData }: Props = {}) {
  const cfg = useTierTaggerConfig(serverData)

  const showCountdown = cfg.releaseCountdownEnabled && !!cfg.releaseDate

  return (
    <main className="min-h-screen" style={{ background: '#080c14' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-12 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5 text-[#00BFFF] text-xs font-semibold mb-6 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
            {cfg.badge}
          </div>

          {/* Title */}
          <h1 className="font-black text-4xl sm:text-5xl text-white mb-4">
            {cfg.titlePrefix} <span className="text-gradient">{cfg.titleAccent}</span>
          </h1>

          <p className="text-gray-500 max-w-md mx-auto text-sm mb-8">
            {cfg.subtitle}
          </p>

          {/* CTA — countdown or download */}
          <div className="flex flex-wrap gap-3 justify-center">
            {showCountdown ? (
              <ReleaseCountdown
                heading={cfg.countdownHeading}
                subtext={cfg.countdownSubtext}
                releaseDate={cfg.releaseDate}
                variant="hero"
                fallback={
                  <a
                    href={cfg.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #00BFFF, #0066FF)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {cfg.downloadLabel}
                  </a>
                }
              />
            ) : (
              <>
                <a
                  href={cfg.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #00BFFF, #0066FF)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {cfg.downloadLabel}
                </a>
                <a
                  href={cfg.secondaryUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-white/5 border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all duration-200"
                >
                  {cfg.secondaryLabel}
                </a>
              </>
            )}
          </div>

          {/* Secondary button always visible when countdown is active */}
          {showCountdown && (
            <div className="mt-4">
              <a
                href={cfg.secondaryUrl}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-white/5 border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-all duration-200"
              >
                {cfg.secondaryLabel}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Showcase screenshots ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-5">

          {/* Nametag screenshot */}
          <div
            className="relative rounded-2xl overflow-hidden group"
            style={{ border: '1px solid rgba(0,191,255,0.15)', background: 'rgba(0,0,0,0.3)' }}
          >
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.5), transparent)' }} />
            <img
              src={cfg.nametagImageUrl}
              alt="Blue Tier Tagger nametag showcase"
              className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              style={{ aspectRatio: '16/9', objectPosition: 'center' }}
            />
            <div
              className="absolute bottom-0 inset-x-0 p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
            >
              <p className="text-white font-semibold text-sm">{cfg.nametagCaption}</p>
              <p className="text-white/40 text-xs mt-0.5">{cfg.nametagSubcaption}</p>
            </div>
          </div>

          {/* Profile screenshot */}
          <div
            className="relative rounded-2xl overflow-hidden group"
            style={{ border: '1px solid rgba(0,191,255,0.15)', background: 'rgba(0,0,0,0.3)' }}
          >
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.5), transparent)' }} />
            <img
              src={cfg.profileImageUrl}
              alt="Blue Tier Tagger player profile"
              className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              style={{ aspectRatio: '16/9', objectPosition: 'top center' }}
            />
            <div
              className="absolute bottom-0 inset-x-0 p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
            >
              <p className="text-white font-semibold text-sm">{cfg.profileCaption}</p>
              <p className="text-white/40 text-xs mt-0.5">{cfg.profileSubcaption}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p
            className="text-[10px] uppercase tracking-[0.25em] font-bold mb-3"
            style={{ background: 'linear-gradient(90deg,#00BFFF,#0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            {cfg.featuresEyebrow}
          </p>
          <h2 className="font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white">
            {cfg.featuresHeading}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cfg.features.map(f => (
            <div
              key={f.id}
              className="rounded-xl p-6 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(0,191,255,0.04) 0%, rgba(0,0,0,0) 100%)',
                border: '1px solid rgba(0,191,255,0.1)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,191,255,0.25)'
                ;(e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, rgba(0,191,255,0.07) 0%, rgba(0,0,0,0) 100%)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,191,255,0.1)'
                ;(e.currentTarget as HTMLDivElement).style.background = 'linear-gradient(135deg, rgba(0,191,255,0.04) 0%, rgba(0,0,0,0) 100%)'
              }}
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-white font-bold text-sm mb-1.5">{f.title}</h3>
              <p className="text-white/35 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Installation ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p
            className="text-[10px] uppercase tracking-[0.25em] font-bold mb-3"
            style={{ background: 'linear-gradient(90deg,#00BFFF,#0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            {cfg.stepsEyebrow}
          </p>
          <h2 className="font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white">
            {cfg.stepsHeading}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {cfg.steps.map((s, i) => (
            <div
              key={s.id}
              className="relative rounded-xl p-7"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {i < cfg.steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-10 -right-2 w-4 h-px"
                  style={{ background: 'rgba(0,191,255,0.3)' }}
                />
              )}
              <div
                className="font-['Space_Grotesk'] font-black text-4xl mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(0,191,255,0.4), rgba(0,102,255,0.2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {s.n}
              </div>
              <h3 className="text-white font-bold text-sm mb-2">{s.title}</h3>
              <p className="text-white/35 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Download CTA ──────────────────────────────────────────────────── */}
      <section id="download" className="max-w-6xl mx-auto px-6 pb-28">
        <div
          className="relative rounded-2xl overflow-hidden px-8 md:px-16 py-14 text-center"
          style={{
            background: 'linear-gradient(135deg, #080D18 0%, #0D1525 50%, #080D18 100%)',
            border: showCountdown ? '1px solid rgba(0,191,255,0.25)' : '1px solid rgba(0,191,255,0.18)',
            boxShadow: showCountdown ? '0 0 100px rgba(0,191,255,0.1)' : '0 0 80px rgba(0,191,255,0.06)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,191,255,0.1) 0%, transparent 70%)' }} />
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)' }} />

          <div className="relative">
            {showCountdown ? (
              <>
                <div className="text-4xl mb-5">⏳</div>
                <h2 className="font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white mb-3">
                  {cfg.ctaHeading}
                </h2>
                <p className="text-white/35 text-sm max-w-md mx-auto mb-10 leading-relaxed">
                  {cfg.ctaBody}
                </p>
                <ReleaseCountdown
                  heading={cfg.countdownHeading}
                  subtext={cfg.countdownSubtext}
                  releaseDate={cfg.releaseDate}
                  variant="cta"
                  fallback={
                    <>
                      <a
                        href={cfg.ctaButtonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-sm text-white transition-all duration-200"
                        style={{ background: 'linear-gradient(135deg, #00BFFF, #0066FF)', boxShadow: '0 0 40px rgba(0,191,255,0.4)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 56px rgba(0,191,255,0.6)'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 40px rgba(0,191,255,0.4)'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {cfg.ctaButtonLabel}
                      </a>
                      <p className="text-white/20 text-[11px] mt-5">{cfg.ctaNote}</p>
                    </>
                  }
                />
              </>
            ) : (
              <>
                <div className="text-4xl mb-5">📦</div>
                <h2 className="font-['Space_Grotesk'] font-black text-3xl md:text-4xl text-white mb-3">
                  {cfg.ctaHeading}
                </h2>
                <p className="text-white/35 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                  {cfg.ctaBody}
                </p>

                <a
                  href={cfg.ctaButtonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-sm text-white transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #00BFFF, #0066FF)',
                    boxShadow: '0 0 40px rgba(0,191,255,0.4)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 56px rgba(0,191,255,0.6)'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 40px rgba(0,191,255,0.4)'; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {cfg.ctaButtonLabel}
                </a>

                <p className="text-white/20 text-[11px] mt-5">{cfg.ctaNote}</p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── About Blue Tiers ──────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div
          className="rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, rgba(0,191,255,0.15), rgba(0,102,255,0.08))', border: '1px solid rgba(0,191,255,0.25)' }}>
            💙
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-['Space_Grotesk'] font-black text-xl text-white mb-2">{cfg.aboutTitle}</h3>
            <p className="text-white/35 text-sm leading-relaxed max-w-2xl">{cfg.aboutBody}</p>
            <p className="text-white/20 text-xs mt-4">{cfg.aboutCredit}</p>
          </div>
        </div>
      </section>

    </main>
  )
}
