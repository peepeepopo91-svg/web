// ─── Mining Renewal Banner ────────────────────────────────────────────────────
// Displays the current mining session status (active countdown or expired warning)
// and a Renew button. If the ad system is enabled, shows an AdModal before renewing.

import { useState, useEffect, useCallback } from 'react'
import { useMining } from '../../context/MiningContext'
import { getAdsConfig } from '../../server/earningsServer'
import type { AdsConfig } from '../../server/earningsServer'
import { AdModal } from './AdModal'

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '0h 0m 0s'
  const totalSeconds = Math.floor(msRemaining / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}h ${m}m ${s}s`
}

export function MiningRenewalBanner() {
  const { user, miningExpired, renewMining } = useMining()
  const [renewing,    setRenewing]    = useState(false)
  const [renewError,  setRenewError]  = useState<string | null>(null)
  const [msLeft,      setMsLeft]      = useState<number>(0)
  const [adConfig,    setAdConfig]    = useState<AdsConfig | null>(null)
  const [showAd,      setShowAd]      = useState(false)

  // Load ad config once on mount
  useEffect(() => {
    getAdsConfig().then(setAdConfig).catch(() => {})
  }, [])

  // Recalculate time remaining every second
  const expiresAt = user?.miningExpiresAt ?? null
  useEffect(() => {
    if (expiresAt === null) { setMsLeft(0); return }
    const update = () => setMsLeft(Math.max(0, expiresAt - Date.now()))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  // Decide whether to show an ad or go straight to renew
  const handleRenewClick = useCallback((isExpired: boolean) => {
    if (!adConfig) { doRenew(); return }
    const adsOn     = adConfig.enabled
    const needsAd   = adConfig.renewMode === 'ad-required' || adConfig.renewMode === 'ad-optional'
    const forExpiry = isExpired && adConfig.showAdOnExpired
    const forEarly  = !isExpired && adConfig.showAdOnEarlyRenew
    if (adsOn && needsAd && (forExpiry || forEarly)) {
      setShowAd(true)
    } else {
      doRenew()
    }
  }, [adConfig])

  const doRenew = useCallback(async () => {
    setRenewing(true)
    setRenewError(null)
    const result = await renewMining()
    if (result.error) setRenewError(result.error)
    setRenewing(false)
  }, [renewMining])

  const handleAdComplete = useCallback(async () => {
    setShowAd(false)
    await doRenew()
  }, [doRenew])

  const handleAdClose = useCallback(() => {
    setShowAd(false)
  }, [])

  if (!user) return null

  return (
    <>
      {/* Ad modal overlay */}
      {showAd && adConfig && (
        <AdModal config={adConfig} onComplete={handleAdComplete} onClose={handleAdClose} />
      )}

      {/* ── Expired state ── */}
      {miningExpired ? (
        <div className="px-4 pb-6">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-[#0B0F17] to-red-950/40 px-6 py-5">
              <div className="absolute inset-0 bg-red-500/3 pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                    <span className="text-red-400 text-lg">⛔</span>
                  </div>
                  <div>
                    <p className="text-red-400 font-bold text-sm font-['Space_Grotesk'] tracking-wide">
                      Mining Expired
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Renew to continue earning Blue Coins. All rigs and progress are untouched.
                    </p>
                    {renewError && (
                      <p className="text-red-400 text-xs mt-1">{renewError}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRenewClick(true)}
                  disabled={renewing}
                  className="shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm text-white
                    bg-gradient-to-r from-[#00BFFF] to-[#0066FF]
                    hover:opacity-90 active:scale-95 transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00BFFF]/20"
                >
                  {renewing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Renewing…
                    </span>
                  ) : '⛏ Renew Mining'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Active state ── */
        <div className="px-4 pb-6">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl border border-[#00BFFF]/20 bg-gradient-to-r from-[#00BFFF]/5 via-transparent to-[#00BFFF]/5 px-6 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />
                  </div>
                  <div>
                    <p className="text-green-400 font-semibold text-xs uppercase tracking-widest font-['Space_Grotesk']">
                      Mining Active
                    </p>
                    <p className="text-white text-sm font-bold font-['Space_Grotesk'] mt-0.5">
                      Time Remaining:{' '}
                      <span className="text-[#00BFFF] tabular-nums">{formatCountdown(msLeft)}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRenewClick(false)}
                  disabled={renewing}
                  className="shrink-0 px-4 py-2 rounded-xl font-semibold text-xs text-gray-400
                    border border-white/10 hover:border-[#00BFFF]/30 hover:text-[#00BFFF]
                    hover:bg-[#00BFFF]/5 transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renewing ? 'Renewing…' : '⟳ Renew Early'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
