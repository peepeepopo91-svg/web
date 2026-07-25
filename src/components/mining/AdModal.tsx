// ─── Ad Modal ─────────────────────────────────────────────────────────────────
// Shown when the player clicks Renew. Displays an ad for `adDurationSeconds`,
// then unlocks the "Complete & Renew" button. Tracks impression/completion/skip.

import { useState, useEffect, useRef, useCallback } from 'react'
import type { AdsConfig } from '../../server/earningsServer'
import { trackAdEvent } from '../../server/earningsServer'

interface Props {
  config: AdsConfig
  onComplete: () => void
  onClose: () => void
}

export function AdModal({ config, onComplete, onClose }: Props) {
  const duration = Math.max(1, config.adDurationSeconds)
  const [secondsLeft, setSecondsLeft] = useState(duration)
  const [done, setDone]               = useState(false)
  const [completing, setCompleting]   = useState(false)
  const trackedImpression             = useRef(false)

  // Track impression once on mount
  useEffect(() => {
    if (trackedImpression.current) return
    trackedImpression.current = true
    trackAdEvent({ data: { event: 'impression' } }).catch(() => {})
  }, [])

  // Countdown
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(id); setDone(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  const handleComplete = useCallback(async () => {
    setCompleting(true)
    await trackAdEvent({ data: { event: 'completion' } }).catch(() => {})
    onComplete()
  }, [onComplete])

  const handleSkip = useCallback(async () => {
    await trackAdEvent({ data: { event: 'skip' } }).catch(() => {})
    onClose()
  }, [onClose])

  const progress = ((duration - secondsLeft) / duration) * 100

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-white/10"
        style={{ background: 'linear-gradient(145deg, #0f1520, #111827)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="text-sm">📺</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-['Space_Grotesk']">
              Sponsored
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!done && (
              <span
                className="text-xs tabular-nums px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(0,191,255,0.12)', color: '#00BFFF' }}
              >
                {secondsLeft}s
              </span>
            )}
            {/* Skip button — only if admin allows AND enough time has passed */}
            {config.skipAllowed && secondsLeft <= (duration - config.skipAfterSeconds) && (
              <button
                onClick={handleSkip}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors px-2 py-0.5 rounded border border-white/5 hover:border-white/10"
              >
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Ad content */}
        <div className="relative" style={{ minHeight: 240 }}>
          {config.adProvider === 'adsense' && config.adsensePublisherId && config.adsenseSlotId ? (
            <div className="flex items-center justify-center p-6" style={{ minHeight: 240 }}>
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: 200 }}
                data-ad-client={config.adsensePublisherId}
                data-ad-slot={config.adsenseSlotId}
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>
          ) : config.adProvider === 'custom' && config.customAdHtml ? (
            <div
              className="p-4"
              style={{ minHeight: 240 }}
              dangerouslySetInnerHTML={{ __html: config.customAdHtml }}
            />
          ) : (
            /* Placeholder ad */
            <div
              className="flex flex-col items-center justify-center gap-4 p-8"
              style={{ minHeight: 240 }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.15)' }}
              >
                ⛏️
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-base font-['Space_Grotesk']">Blue Network</p>
                <p className="text-gray-500 text-xs mt-1">
                  Configure your ad in the Admin → Earnings panel
                </p>
              </div>
              <div
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#00BFFF]"
                style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}
              >
                play.sennahosting.com
              </div>
            </div>
          )}

          {/* Dim overlay while counting */}
          {!done && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.15)' }}
            />
          )}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-white/5">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${progress}%`,
              background: done
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #00BFFF, #0066FF)',
            }}
          />
        </div>

        {/* Footer / action */}
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <p className="text-gray-600 text-[11px] leading-tight">
            {done
              ? 'Thanks for watching! Click below to continue.'
              : `Please watch the ad to renew your session.`}
          </p>
          <button
            onClick={handleComplete}
            disabled={!done || completing}
            className="shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200"
            style={{
              background: done
                ? 'linear-gradient(135deg, #00BFFF, #0066FF)'
                : 'rgba(255,255,255,0.06)',
              color: done ? 'white' : 'rgba(255,255,255,0.25)',
              cursor: done ? 'pointer' : 'not-allowed',
              boxShadow: done ? '0 0 20px rgba(0,191,255,0.3)' : 'none',
            }}
          >
            {completing ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Renewing…
              </span>
            ) : done ? '⛏ Complete & Renew' : `Wait ${secondsLeft}s…`}
          </button>
        </div>
      </div>
    </div>
  )
}
