// ─── Tier Tagger landing page ─────────────────────────────────────────────────

import { useTierTaggerConfig, type TierTaggerConfig } from '../store/tierTaggerStore'

interface Props {
  serverData?: Partial<TierTaggerConfig> | null
}

export function TierTaggerPage({ serverData }: Props = {}) {
  const cfg = useTierTaggerConfig(serverData)

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

          {/* CTA */}
          <div className="flex flex-wrap gap-3 justify-center">
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
          </div>
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
            border: '1px solid rgba(0,191,255,0.18)',
            boxShadow: '0 0 80px rgba(0,191,255,0.06)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,191,255,0.1) 0%, transparent 70%)' }} />
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.6), transparent)' }} />

          <div className="relative">
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
