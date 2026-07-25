import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useHomepageConfig } from '../store/homepageStore'
import { LegalModal } from './LegalModal'
import type { LegalDoc } from './LegalModal'

// ─── Social platform detector ─────────────────────────────────────────────────

function detectPlatform(url: string): 'discord' | 'x' | 'tiktok' | 'youtube' | 'other' {
  if (/discord\.(gg|com)/i.test(url)) return 'discord'
  if (/x\.com|twitter\.com/i.test(url)) return 'x'
  if (/tiktok\.com/i.test(url)) return 'tiktok'
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  return 'other'
}

// ─── Platform SVG icons ───────────────────────────────────────────────────────

function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
    </svg>
  )
}

function YouTubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  const cfg = useHomepageConfig()
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)

  if (!cfg.footer.enabled) return null

  const visibleColumns = cfg.footer.columns.filter(col => col.links.length > 0)
  const showAdmin = cfg.footer.columns.some(col => col.links.some(l => l.url === '/admin'))

  return (
    <>
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
      <footer className="relative bg-black border-t border-[#111111] overflow-hidden">

        {/* Watermark */}
        {cfg.footer.showWatermark && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            aria-hidden
          >
            <svg
              width="640"
              height="400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="0.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.035, transform: 'translateY(-12%)' }}
            >
              <defs>
                {/*
                  Mask for the back sword: white everywhere (show) except
                  over the front sword's blade region (black = hide).
                  The front sword blade fills the quadrilateral formed by its
                  two blade edges and handle corner.
                */}
                <mask id="footerSwordMask">
                  <rect width="24" height="24" fill="white"/>
                  <polygon points="3,3 6,3 17.5,14.5 14.5,17.5 3,6" fill="black"/>
                </mask>
              </defs>

              {/* Back sword — exact horizontal mirror of front sword (x → 24-x).
                  Drawn fully; mask hides only the portion behind the front sword blade. */}
              <g mask="url(#footerSwordMask)">
                <polyline points="9.5 17.5 21 6 21 3 18 3 6.5 14.5"/>
                <line x1="11" y1="19" x2="5" y2="13"/>
                <line x1="8"  y1="16" x2="4" y2="20"/>
                <line x1="5"  y1="21" x2="3" y2="19"/>
              </g>

              {/* Front sword — drawn on top, no mask */}
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
              <line x1="13" y1="19" x2="19" y2="13"/>
              <line x1="16" y1="16" x2="20" y2="20"/>
              <line x1="19" y1="21" x2="21" y2="19"/>
            </svg>
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-8 py-16">
          {/* Three-column grid */}
          <div className="grid grid-cols-3 gap-8">

            {/* ── navigate ── */}
            {(() => {
              const nav = visibleColumns.find(c => c.title.toLowerCase() === 'navigate')
              if (!nav) return null
              return (
                <div>
                  <p className="mb-5 uppercase tracking-widest text-xs font-semibold" style={{ background: 'linear-gradient(90deg, #00BFFF, #0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>navigate</p>
                  <ul className="space-y-3">
                    {nav.links.map((link, li) => (
                      <li key={li}>
                        {link.internal ? (
                          <Link
                            to={link.url}
                            className="text-sm transition-colors duration-150"
                            style={{ color: '#888' }}
                            onMouseEnter={e => ((e.target as HTMLElement).style.color = '#ccc')}
                            onMouseLeave={e => ((e.target as HTMLElement).style.color = '#888')}
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm transition-colors duration-150"
                            style={{ color: '#888' }}
                            onMouseEnter={e => ((e.target as HTMLElement).style.color = '#ccc')}
                            onMouseLeave={e => ((e.target as HTMLElement).style.color = '#888')}
                          >
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}

            {/* ── social ── */}
            {(() => {
              const social = visibleColumns.find(c => c.title.toLowerCase() === 'social')
              if (!social) return null
              const discord = social.links.find(l => detectPlatform(l.url) === 'discord')
              const others  = social.links.filter(l => detectPlatform(l.url) !== 'discord')
              return (
                <div className="flex flex-col items-center">
                  <p className="mb-5 uppercase tracking-widest text-xs font-semibold" style={{ background: 'linear-gradient(90deg, #00BFFF, #0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>social</p>

                  {/* Discord — plain icon + text, no background */}
                  {discord && (
                    <a
                      href={discord.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 mb-5 transition-opacity duration-150 hover:opacity-70"
                      style={{ color: '#fff' }}
                    >
                      <DiscordIcon size={32} />
                      <span className="text-2xl font-semibold tracking-wider">DISCORD</span>
                    </a>
                  )}

                  {/* X · TikTok · YouTube */}
                  {others.length > 0 && (
                    <div className="flex items-center gap-5">
                      {others.map((link, i) => {
                        const platform = detectPlatform(link.url)
                        return (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.label}
                            className="transition-opacity duration-150 hover:opacity-60"
                            style={{ color: '#fff' }}
                          >
                            {platform === 'x'       && <XIcon size={20} />}
                            {platform === 'tiktok'  && <TikTokIcon size={20} />}
                            {platform === 'youtube' && <YouTubeIcon size={20} />}
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── legal ── */}
            {(() => {
              const legal = visibleColumns.find(c => c.title.toLowerCase() === 'legal')
              if (!legal) return null
              return (
                <div className="flex flex-col items-end text-right">
                  <p className="mb-5 uppercase tracking-widest text-xs font-semibold" style={{ background: 'linear-gradient(90deg, #00BFFF, #0099FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>legal</p>
                  <ul className="space-y-3">
                    {legal.links.map((link, li) => {
                      if (link.internal && ['terms', 'privacy', 'screenshare'].includes(link.url)) {
                        return (
                          <li key={li}>
                            <button
                              onClick={() => setLegalDoc(link.url as LegalDoc)}
                              className="text-sm text-right transition-colors duration-150"
                              style={{ color: '#888' }}
                              onMouseEnter={e => ((e.target as HTMLElement).style.color = '#ccc')}
                              onMouseLeave={e => ((e.target as HTMLElement).style.color = '#888')}
                            >
                              {link.label}
                            </button>
                          </li>
                        )
                      }
                      return (
                        <li key={li}>
                          {link.internal ? (
                            <Link
                              to={link.url}
                              className="text-sm transition-colors duration-150"
                              style={{ color: '#888' }}
                              onMouseEnter={e => ((e.target as HTMLElement).style.color = '#ccc')}
                              onMouseLeave={e => ((e.target as HTMLElement).style.color = '#888')}
                            >
                              {link.label}
                            </Link>
                          ) : (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm transition-colors duration-150"
                              style={{ color: '#888' }}
                              onMouseEnter={e => ((e.target as HTMLElement).style.color = '#ccc')}
                              onMouseLeave={e => ((e.target as HTMLElement).style.color = '#888')}
                            >
                              {link.label}
                            </a>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })()}

          </div>

          {/* Bottom bar */}
          <div
            className="mt-12 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="text-xs" style={{ color: '#333' }}>{cfg.footer.copyright}</span>
            {cfg.footer.tagline && (
              <span className="text-xs" style={{ color: '#333' }}>{cfg.footer.tagline}</span>
            )}
          </div>
        </div>
      </footer>
    </>
  )
}
