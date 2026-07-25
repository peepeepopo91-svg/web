import { Link } from '@tanstack/react-router'
import { useHomepageConfig } from '../store/homepageStore'

export function Features() {
  const cfg = useHomepageConfig()
  if (!cfg.features.enabled) return null

  const visibleItems = cfg.features.items.filter(i => i.visible)
  if (visibleItems.length === 0) return null

  const isScroll = cfg.features.layout === 'scroll'
  const isCompact = cfg.features.layout === 'compact'

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-black text-4xl sm:text-5xl text-white leading-tight">
            {cfg.features.title}{cfg.features.subtitle && <br />}
            {cfg.features.subtitle && <span style={{ color: cfg.theme.brandPrimary }}>{cfg.features.subtitle}</span>}
          </h2>
          {cfg.features.description && <p className="text-white/40 text-sm mt-3">{cfg.features.description}</p>}
        </div>

        {isScroll ? (
          <div className="flex overflow-x-auto gap-4 pb-4 justify-start sm:justify-center">
            {visibleItems.map((mode) => (
              <Link
                key={mode.id}
                to={mode.link}
                className={`
                  group flex flex-col items-center justify-center gap-3 shrink-0
                  ${isCompact ? 'w-24 h-24' : 'w-32 h-32 sm:w-36 sm:h-36'}
                  rounded-2xl bg-white/4 border border-white/8
                  hover:border-white/20 hover:bg-white/8
                  transition-all duration-200 cursor-pointer
                `}
              >
                <span className="text-4xl select-none">{mode.icon}</span>
                <span className="text-white/60 text-xs font-medium group-hover:text-white transition-colors">
                  {mode.label}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`flex flex-wrap justify-center gap-4 ${isCompact ? 'max-w-3xl mx-auto' : ''}`}>
            {visibleItems.map((mode) => (
              <Link
                key={mode.id}
                to={mode.link}
                className={`
                  group flex flex-col items-center justify-center gap-3
                  ${isCompact ? 'w-24 h-24' : 'w-32 h-32 sm:w-36 sm:h-36'}
                  rounded-2xl bg-white/4 border border-white/8
                  hover:border-white/20 hover:bg-white/8
                  transition-all duration-200 cursor-pointer
                `}
              >
                <span className="text-4xl select-none">{mode.icon}</span>
                <span className="text-white/60 text-xs font-medium group-hover:text-white transition-colors">
                  {mode.label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
