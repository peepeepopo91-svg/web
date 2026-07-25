import { useHomepageConfig } from '../store/homepageStore'

export function Quote() {
  const cfg = useHomepageConfig()
  if (!cfg.quote.enabled) return null

  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' }[cfg.quote.align]
  const parts = cfg.quote.text.split(cfg.quote.highlight)

  return (
    <section className="py-20 px-4 relative">
      <div className={`max-w-4xl mx-auto ${alignClass}`}>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="text-6xl text-white/20 font-serif leading-none select-none">&ldquo;</span>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {parts.map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && cfg.quote.highlight && (
                  <span
                    className="relative inline-block"
                    style={{
                      background: cfg.theme.textGradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {cfg.quote.highlight}
                    <span className="absolute bottom-0 left-0 right-0 h-px" style={{ background: cfg.theme.textGradient }} />
                  </span>
                )}
              </span>
            ))}
          </p>
          <span className="text-6xl text-white/20 font-serif leading-none select-none">&rdquo;</span>
        </div>
        <p className="text-[#555555] text-sm mt-4" style={{ textAlign: cfg.quote.align as any }}>{cfg.quote.author}</p>
      </div>
    </section>
  )
}
