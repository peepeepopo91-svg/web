// ─── Earnings Manager ─────────────────────────────────────────────────────────
// Full-featured monetisation admin: 22 tabs covering every earnings feature.

import { useState, useEffect, useCallback } from 'react'
import type {
  AdsConfig, SponsorSlot,
  RevenueShareRecipient, AffiliateLink,
} from '../../server/earningsServer'
import {
  getAdsConfig, saveAdsConfig, resetAdsStats,
  resetAbTestStats, addPayoutRecord,
} from '../../server/earningsServer'
import { addLog } from '../../store/adminStore'

interface Props { admin: string }

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    icon: '💹', label: 'Overview'       },
  { id: 'ad-setup',    icon: '🎯', label: 'Ad Setup'       },
  { id: 'waterfall',   icon: '🌊', label: 'Waterfall'      },
  { id: 'renew',       icon: '🔄', label: 'Renew Button'   },
  { id: 'page-ads',    icon: '📄', label: 'Page Ads'       },
  { id: 'frequency',   icon: '⏱️', label: 'Frequency'      },
  { id: 'schedule',    icon: '🗓️', label: 'Schedule'       },
  { id: 'player-ux',   icon: '🎮', label: 'Player UX'      },
  { id: 'compliance',  icon: '🛡️', label: 'Compliance'     },
  { id: 'sponsors',    icon: '🤝', label: 'Sponsors'       },
  { id: 'ab-test',     icon: '🔬', label: 'A/B Test'       },
  { id: 'geo',         icon: '🌍', label: 'Geo'            },
  { id: 'goals',       icon: '🎯', label: 'Goals'          },
  { id: 'boosts',      icon: '🚀', label: 'Boosts'         },
  { id: 'affiliates',  icon: '🔗', label: 'Affiliates'     },
  { id: 'referrals',   icon: '👥', label: 'Referrals'      },
  { id: 'revenue',     icon: '💰', label: 'Revenue'        },
  { id: 'payout',      icon: '💸', label: 'Payout'         },
  { id: 'rev-share',   icon: '🤲', label: 'Rev Share'      },
  { id: 'analytics',   icon: '📊', label: 'Analytics'      },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'advanced',    icon: '⚙️', label: 'Advanced'       },
] as const
type Tab = typeof TABS[number]['id']

// ─── Provider catalogue ───────────────────────────────────────────────────────

type ProviderCat = 'test' | 'day1' | 'growing' | 'established'

interface ProviderInfo {
  value: AdsConfig['adProvider']
  icon: string; name: string; tagline: string
  rpm: string; traffic: string
  cat: ProviderCat; difficulty: 'none' | 'easy' | 'medium' | 'hard'
  color: string; applyUrl: string; note?: string
}

const PROVIDER_CATALOG: ProviderInfo[] = [
  // ── Test / Custom ──────────────────────────────────────────────────────────
  { value: 'placeholder', icon: '🧪', name: 'Placeholder / Test',       tagline: 'Simulate the ad experience without a real account',   rpm: '—',        traffic: 'None',     cat: 'test',        difficulty: 'none',   color: '#6b7280', applyUrl: '' },
  { value: 'custom',      icon: '✏️',  name: 'Custom HTML / Script',    tagline: 'Paste any embed code, iframe, or ad-network tag',     rpm: 'Varies',   traffic: 'None',     cat: 'test',        difficulty: 'none',   color: '#8b5cf6', applyUrl: '' },
  // ── Day 1 Ready ────────────────────────────────────────────────────────────
  { value: 'propellerads',icon: '🚀', name: 'PropellerAds',              tagline: 'Push, interstitial & OnClick — instant approval',     rpm: '$0.50–$4', traffic: 'None',     cat: 'day1',        difficulty: 'easy',   color: '#f97316', applyUrl: 'https://publishers.propellerads.com', note: 'Add zone script to __root.tsx' },
  { value: 'monetag',     icon: '💰', name: 'Monetag',                   tagline: 'Smart pop & push ads, no minimum traffic required',   rpm: '$0.50–$3', traffic: 'None',     cat: 'day1',        difficulty: 'easy',   color: '#10b981', applyUrl: 'https://monetag.com',                 note: 'Add website script to __root.tsx' },
  { value: 'adsterra',    icon: '⭐', name: 'Adsterra',                  tagline: 'Social bar, banners & popunder — quick sign-up',      rpm: '$0.50–$5', traffic: 'None',     cat: 'day1',        difficulty: 'easy',   color: '#06b6d4', applyUrl: 'https://adsterra.com',                note: 'Copy direct-link for modal, or banner script' },
  { value: 'infolinks',   icon: '🔗', name: 'Infolinks',                 tagline: 'In-text & in-fold ads — works with very low traffic', rpm: '$0.30–$3', traffic: '500/mo',   cat: 'day1',        difficulty: 'easy',   color: '#ec4899', applyUrl: 'https://infolinks.com' },
  // ── Growing Sites ──────────────────────────────────────────────────────────
  { value: 'buysellads',  icon: '💼', name: 'BuySellAds',               tagline: 'Sell your ad slots directly to advertisers',          rpm: 'Custom',   traffic: 'Any',      cat: 'growing',     difficulty: 'easy',   color: '#3b82f6', applyUrl: 'https://buysellads.com' },
  { value: 'mgid',        icon: '📡', name: 'MGID',                      tagline: 'Native advertising network with global reach',        rpm: '$1–$4',    traffic: '5k/mo',    cat: 'growing',     difficulty: 'medium', color: '#7c3aed', applyUrl: 'https://mgid.com' },
  { value: 'amazon-aps',  icon: '📦', name: 'Amazon Publisher Services', tagline: 'Header bidding — excellent fill for gaming audiences', rpm: '$1–$6',    traffic: '10k/mo',   cat: 'growing',     difficulty: 'medium', color: '#f59e0b', applyUrl: 'https://aps.amazon.com' },
  { value: 'carbon',      icon: '⚡', name: 'Carbon Ads',               tagline: 'Premium tech & gaming niche — single tasteful ad',    rpm: '$2–$8',    traffic: '10k/mo',   cat: 'growing',     difficulty: 'medium', color: '#64748b', applyUrl: 'https://carbonads.net',               note: 'Apply at carbonads.net — curated inventory' },
  // ── Established ────────────────────────────────────────────────────────────
  { value: 'adsense',     icon: '🟦', name: 'Google AdSense',            tagline: "World's largest network — best long-term option",    rpm: '$1–$10',   traffic: '3 mo old+',cat: 'established', difficulty: 'medium', color: '#4285F4', applyUrl: 'https://adsense.google.com' },
  { value: 'medianet',    icon: '🟠', name: 'Media.net',                 tagline: 'Yahoo/Bing contextual — consistently high RPM',      rpm: '$2–$8',    traffic: '5k/mo',    cat: 'established', difficulty: 'medium', color: '#f97316', applyUrl: 'https://media.net' },
  { value: 'ezoic',       icon: '🟢', name: 'Ezoic',                     tagline: 'AI-optimised ad layout & split-testing',             rpm: '$3–$15',   traffic: '10k/mo',   cat: 'established', difficulty: 'medium', color: '#22c55e', applyUrl: 'https://ezoic.com' },
  { value: 'taboola',     icon: '📰', name: 'Taboola',                   tagline: 'Native content discovery, strong CPMs worldwide',    rpm: '$1–$5',    traffic: '50k/mo',   cat: 'established', difficulty: 'hard',   color: '#1e40af', applyUrl: 'https://taboola.com' },
]

const CAT_META: Record<ProviderCat, { label: string; badge: string; color: string }> = {
  test:        { label: 'Development / Testing',                 badge: '🔧 Dev Only',       color: '#6b7280' },
  day1:        { label: 'Day 1 Ready — No traffic minimum',      badge: '🟢 Instant Signup', color: '#22c55e' },
  growing:     { label: 'Growing Sites — 1k–10k monthly visits', badge: '🟡 1k–10k/mo',      color: '#f59e0b' },
  established: { label: 'Established Sites — 5k+ monthly visits',badge: '🔵 5k+ visits',     color: '#4285F4' },
}

const DIFF_META = {
  none:   { label: '',       color: '' },
  easy:   { label: 'Easy signup',   color: '#22c55e' },
  medium: { label: 'Review needed', color: '#f59e0b' },
  hard:   { label: 'High bar',      color: '#ef4444' },
}

const CHECKLIST_ITEMS = [
  { id: 'ssl',        label: 'Site is on HTTPS (SSL)',                     desc: 'Mandatory for every ad network' },
  { id: 'privacy',    label: 'Privacy Policy page published',              desc: 'Link it in your footer — required by law & networks' },
  { id: 'terms',      label: 'Terms of Service page published',            desc: 'Strongly recommended before running ads' },
  { id: 'original',   label: 'Site has original, human-readable content',  desc: 'No scraped or thin AI content' },
  { id: 'analytics',  label: 'Google Analytics (or similar) installed',    desc: 'Networks want to verify your traffic' },
  { id: 'sitemap',    label: 'Sitemap submitted to Google Search Console',  desc: 'Helps discoverability & credibility' },
  { id: 'age',        label: 'Domain is at least 30 days old',             desc: 'Some networks require 3–6 months for approval' },
  { id: 'traffic',    label: 'Receiving regular human traffic',            desc: 'Even 100 real sessions/day opens Day-1 networks' },
  { id: 'ads-txt',    label: 'ads.txt file added to site root',            desc: 'Required by programmatic networks — list your publisher IDs' },
  { id: 'no-invalid', label: 'No invalid click sources / bots in traffic', desc: 'Fraudulent traffic gets accounts banned immediately' },
]

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  'not-applied': { label: 'Not Applied', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  'applied':     { label: 'Applied',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  'pending':     { label: 'Pending',     color: '#00BFFF', bg: 'rgba(0,191,255,0.1)'   },
  'approved':    { label: 'Approved ✓',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  'rejected':    { label: 'Rejected',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
}

const RENEW_MODES = [
  { value: 'ad-required', label: 'Ad Required',  desc: 'Players must watch the full ad to renew.', color: '#f59e0b' },
  { value: 'ad-optional', label: 'Ad Optional',  desc: 'Ad shown but can be closed early.', color: '#00BFFF' },
  { value: 'free',        label: 'Free',          desc: 'Renew works instantly — no ad shown.', color: '#22c55e' },
  { value: 'disabled',    label: 'Disabled',      desc: 'Renew button is hidden completely.', color: '#ef4444' },
] as const

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PAGE_LABELS: Record<string, string> = {
  home: '🏠 Home', rankings: '📋 Rankings', mining: '⛏️ Mining',
  exchange: '💱 Exchange', shop: '🛒 Shop', tournament: '🏆 Tournament',
}

const ALL_COUNTRIES = [
  'US','GB','CA','AU','DE','FR','NL','SE','NO','DK','FI','CH','AT','BE','IE',
  'IT','ES','PT','PL','CZ','HU','RO','BG','HR','SK','SI','LT','LV','EE',
  'JP','KR','SG','HK','TW','NZ','IN','BR','MX','AR','ZA','NG','EG','SA','AE',
]

// ─── Reusable primitives ──────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = '#00BFFF' }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5 border flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${color}14`, border: `1px solid ${color}25` }}>{icon}</div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white font-['Space_Grotesk'] tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-600">{sub}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'linear-gradient(135deg,#00BFFF,#0066FF)' : 'rgba(255,255,255,0.08)', transition: 'background .2s', boxShadow: checked ? '0 0 10px rgba(0,191,255,0.35)' : 'none' }} />
        <div style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
    </label>
  )
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</label>
      {desc && <p className="text-[11px] text-gray-600 -mt-0.5">{desc}</p>}
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', min, max, step }: { value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string; min?: number; max?: number; step?: number }) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min={min} max={max} step={step}
      className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit' }}
      onFocus={e => (e.target.style.borderColor = 'rgba(0,191,255,0.4)')}
      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
    />
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {children}
    </select>
  )
}

function Textarea({ value, onChange, placeholder, rows = 5 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-y transition-all font-mono"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      onFocus={e => (e.target.style.borderColor = 'rgba(0,191,255,0.4)')}
      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
    />
  )
}

function Slider({ min, max, value, onChange, unit = '' }: { min: number; max: number; value: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="flex-1 accent-[#00BFFF]" />
      <span className="text-base font-bold tabular-nums text-[#00BFFF] w-14 text-right font-['Space_Grotesk']">{value}{unit}</span>
    </div>
  )
}

function SectionBox({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-6 flex flex-col gap-5"
      style={{
        background: danger ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.02)',
        borderColor: danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
      }}
    >
      <h3 className={`text-sm font-bold font-['Space_Grotesk'] flex items-center gap-2 ${danger ? 'text-red-400' : 'text-white'}`}>{title}</h3>
      {children}
    </div>
  )
}

function InfoBanner({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
      <span className="text-lg shrink-0">{icon}</span>
      <div className="text-xs text-gray-400">{children}</div>
    </div>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ background: `${color}20`, color }}>
      {children}
    </span>
  )
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function SnippetBox({ label, children }: { label: string; children: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(children).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) })
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,191,255,0.15)' }}>
      <div className="flex items-center justify-between px-3.5 py-2" style={{ background: 'rgba(0,191,255,0.06)' }}>
        <span className="text-[11px] font-semibold text-gray-400">{label}</span>
        <button onClick={copy} className="text-[11px] font-bold transition-colors" style={{ color: copied ? '#22c55e' : '#00BFFF' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-3.5 py-3 text-[11px] text-[#00BFFF] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all" style={{ background: 'rgba(0,10,20,0.5)', margin: 0 }}>{children}</pre>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EarningsManager({ admin }: Props) {
  const [tab, setTab]             = useState<Tab>('overview')
  const [cfg, setCfg]             = useState<AdsConfig | null>(null)
  const [draft, setDraft]         = useState<AdsConfig | null>(null)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [loading, setLoading]     = useState(true)
  const [resetting, setResetting] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNotes, setPayoutNotes]   = useState('')
  const [payoutAdding, setPayoutAdding] = useState(false)
  const [abResetting, setAbResetting]   = useState(false)
  const [newSponsor, setNewSponsor]     = useState<Partial<SponsorSlot>>({})
  const [newAffiliate, setNewAffiliate] = useState<Partial<AffiliateLink>>({})
  const [newMilestone, setNewMilestone] = useState({ amount: '', label: '' })
  const [newRecipient, setNewRecipient] = useState<Partial<RevenueShareRecipient>>({})
  const [newCountry, setNewCountry]     = useState('')
  const [checklist, setChecklist]       = useState<Record<string, boolean>>({})

  useEffect(() => {
    getAdsConfig().then(data => { setCfg(data); setDraft(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const patch = useCallback(<K extends keyof AdsConfig>(key: K, value: AdsConfig[K]) => {
    setDraft(d => d ? { ...d, [key]: value } : d)
  }, [])

  const patchPageAd   = useCallback((page: string, v: boolean) => setDraft(d => d ? { ...d, pageAds: { ...d.pageAds, [page]: v } } : d), [])
  const patchPageHtml = useCallback((page: string, v: string) => setDraft(d => d ? { ...d, pageAdHtml: { ...d.pageAdHtml, [page]: v } } : d), [])

  const handleSave = useCallback(async () => {
    if (!draft) return
    setSaving(true)
    try {
      await saveAdsConfig({ data: { config: draft } })
      setCfg(draft)
      addLog(admin, 'earnings:save', `Saved earnings config — provider: ${draft.adProvider}, mode: ${draft.renewMode}`)
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }, [draft, admin])

  const handleReset = useCallback(async () => {
    if (!confirm('Reset all impression/revenue stats to zero? Cannot be undone.')) return
    setResetting(true)
    try {
      await resetAdsStats()
      const fresh = await getAdsConfig(); setCfg(fresh); setDraft(fresh)
      addLog(admin, 'earnings:reset-stats', 'Reset all ad statistics')
    } catch (e) { console.error(e) } finally { setResetting(false) }
  }, [admin])

  const handleAbReset = useCallback(async () => {
    if (!confirm('Reset A/B test statistics? Cannot be undone.')) return
    setAbResetting(true)
    try {
      await resetAbTestStats()
      const fresh = await getAdsConfig(); setCfg(fresh); setDraft(fresh)
    } catch (e) { console.error(e) } finally { setAbResetting(false) }
  }, [])

  const handleAddPayout = useCallback(async () => {
    const amt = parseFloat(payoutAmount)
    if (!amt || amt <= 0) return
    setPayoutAdding(true)
    try {
      await addPayoutRecord({ data: { amount: amt, method: draft?.payoutMethod ?? 'paypal', notes: payoutNotes } })
      const fresh = await getAdsConfig(); setCfg(fresh); setDraft(fresh)
      setPayoutAmount(''); setPayoutNotes('')
    } catch (e) { console.error(e) } finally { setPayoutAdding(false) }
  }, [payoutAmount, payoutNotes, draft])

  if (loading || !draft || !cfg) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-[#00BFFF]/30 border-t-[#00BFFF] rounded-full animate-spin" />
    </div>
  )

  const isDirty = JSON.stringify(draft) !== JSON.stringify(cfg)
  const ctr       = cfg.stats.totalImpressions > 0 ? ((cfg.stats.totalCompletions / cfg.stats.totalImpressions) * 100).toFixed(1) : '0.0'
  const skipRate  = cfg.stats.totalImpressions > 0 ? ((cfg.stats.totalSkips / cfg.stats.totalImpressions) * 100).toFixed(1) : '0.0'
  const days      = cfg.stats.lastReset ? Math.max(1, Math.round((Date.now() - new Date(cfg.stats.lastReset).getTime()) / 86400000)) : 1
  const projDay   = cfg.stats.estimatedRevenue / days
  const projMonth = projDay * 30

  // ── Daily revenue sparkline data (last 14 days) ────────────────────────────
  const sparkDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const key = d.toISOString().slice(0, 10)
    return { key, v: cfg.stats.dailyRevenue?.[key] ?? 0 }
  })
  const sparkMax = Math.max(...sparkDays.map(d => d.v), 0.001)

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-16">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-6 border" style={{ background: 'linear-gradient(135deg, rgba(0,191,255,0.07) 0%, rgba(0,102,255,0.05) 100%)', borderColor: 'rgba(0,191,255,0.15)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(0,191,255,0.06) 0%, transparent 70%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2.5">💹 Earnings &amp; Monetisation</h2>
            <p className="text-gray-500 text-sm mt-1">Every earning feature in one place — ads, sponsors, affiliates, payouts, A/B tests, and more.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Ads {draft.enabled ? 'ON' : 'OFF'}</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" className="sr-only" checked={draft.enabled} onChange={e => patch('enabled', e.target.checked)} />
                <div style={{ width: 40, height: 22, borderRadius: 11, background: draft.enabled ? 'linear-gradient(135deg,#00BFFF,#0066FF)' : 'rgba(255,255,255,0.08)', transition: 'background .2s', boxShadow: draft.enabled ? '0 0 10px rgba(0,191,255,0.3)' : 'none' }} />
                <div style={{ position: 'absolute', top: 2, left: draft.enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </label>
            </div>
            <button
              onClick={handleSave} disabled={saving || !isDirty}
              className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: isDirty ? 'linear-gradient(135deg,#00BFFF,#0066FF)' : 'rgba(255,255,255,0.04)', color: isDirty ? 'white' : 'rgba(255,255,255,0.25)', boxShadow: isDirty ? '0 0 20px rgba(0,191,255,0.25)' : 'none', cursor: isDirty ? 'pointer' : 'not-allowed' }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: tab === t.id ? 'rgba(0,191,255,0.12)' : 'rgba(255,255,255,0.03)', color: tab === t.id ? '#00BFFF' : 'rgba(255,255,255,0.45)', border: `1px solid ${tab === t.id ? 'rgba(0,191,255,0.3)' : 'rgba(255,255,255,0.05)'}` }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon="👁️" label="Total Impressions"  value={cfg.stats.totalImpressions.toLocaleString()} sub="Ads opened"                        color="#00BFFF" />
            <StatCard icon="✅" label="Completions"        value={cfg.stats.totalCompletions.toLocaleString()}  sub={`${ctr}% completion rate`}          color="#22c55e" />
            <StatCard icon="⏭️" label="Skips"              value={cfg.stats.totalSkips.toLocaleString()}        sub={`${skipRate}% skip rate`}           color="#f59e0b" />
            <StatCard icon="💵" label="Est. Revenue"       value={`$${cfg.stats.estimatedRevenue.toFixed(4)}`}  sub={`$${projMonth.toFixed(2)} / 30 days`} color="#a855f7" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon="🤝" label="Active Sponsors"    value={draft.sponsors.filter(s => s.active).length.toString()}                                  color="#f59e0b" />
            <StatCard icon="🔗" label="Affiliate Links"    value={draft.affiliateLinks.filter(l => l.active).length.toString()} sub="active"               color="#22c55e" />
            <StatCard icon="👥" label="Referral Clicks"    value={cfg.referralStats.totalClicks.toLocaleString()}                                            color="#00BFFF" />
            <StatCard icon="💸" label="Total Paid Out"     value={`$${cfg.payoutHistory.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0).toFixed(2)}`} color="#a855f7" />
          </div>

          {/* Sparkline */}
          <SectionBox title="📈 Last 14 Days Revenue">
            <div className="flex items-end gap-1 h-20">
              {sparkDays.map(d => (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{ height: `${Math.max(4, (d.v / sparkMax) * 72)}px`, background: d.v > 0 ? 'linear-gradient(180deg,#00BFFF,#0066FF)' : 'rgba(255,255,255,0.06)' }}
                    title={`${d.key}: $${d.v.toFixed(4)}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-600">
              <span>{sparkDays[0]?.key}</span><span>Today</span>
            </div>
          </SectionBox>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SectionBox title="📊 Revenue Projections">
              {[
                { label: 'Today (est.)',       value: `$${projDay.toFixed(4)}` },
                { label: '7-day (est.)',        value: `$${(projDay * 7).toFixed(2)}` },
                { label: '30-day (est.)',       value: `$${projMonth.toFixed(2)}` },
                { label: 'Annual (est.)',        value: `$${(projDay * 365).toFixed(2)}` },
                { label: 'RPM (current)',        value: `$${cfg.estimatedRpm.toFixed(2)}` },
                { label: 'Boost multiplier',    value: cfg.boostEnabled ? `${cfg.boostMultiplier}×` : 'Off', color: cfg.boostEnabled ? '#f59e0b' : undefined },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: row.color ?? 'white' }}>{row.value}</span>
                </div>
              ))}
            </SectionBox>

            <SectionBox title="⚙️ Active Configuration">
              {[
                { label: 'Ad Provider',    value: draft.adProvider },
                { label: 'Renew Mode',     value: draft.renewMode },
                { label: 'Duration',       value: `${draft.adDurationSeconds}s` },
                { label: 'Skip',           value: draft.skipAllowed ? `after ${draft.skipAfterSeconds}s` : 'Not allowed' },
                { label: 'Waterfall',      value: draft.waterfallEnabled ? 'Enabled' : 'Off' },
                { label: 'A/B Test',       value: draft.abTestEnabled ? draft.abTestName : 'Off' },
                { label: 'Geo Filter',     value: draft.geoEnabled ? `${draft.geoMode} (${draft.geoCountries.length})` : 'Off' },
                { label: 'Compliance',     value: [draft.gdprEnabled && 'GDPR', draft.coppaMode && 'COPPA', draft.ccpaEnabled && 'CCPA'].filter(Boolean).join(', ') || 'None' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-xs font-bold text-[#00BFFF] font-mono uppercase">{row.value || '—'}</span>
                </div>
              ))}
            </SectionBox>
          </div>

          {/* Goals progress */}
          {(cfg.goalDaily > 0 || cfg.goalMonthly > 0) && (
            <SectionBox title="🎯 Goal Progress">
              <div className="flex flex-col gap-4">
                {cfg.goalDaily > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Daily Goal</span>
                      <span className="text-white font-bold">${projDay.toFixed(4)} / ${cfg.goalDaily.toFixed(2)}</span>
                    </div>
                    <ProgressBar value={projDay} max={cfg.goalDaily} color="#22c55e" />
                  </div>
                )}
                {cfg.goalMonthly > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Monthly Goal</span>
                      <span className="text-white font-bold">${projMonth.toFixed(2)} / ${cfg.goalMonthly.toFixed(2)}</span>
                    </div>
                    <ProgressBar value={projMonth} max={cfg.goalMonthly} color="#00BFFF" />
                  </div>
                )}
              </div>
            </SectionBox>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: AD SETUP
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'ad-setup' && (
        <div className="flex flex-col gap-5">

          {/* ── New Site Roadmap ──────────────────────────────────────────── */}
          <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg,rgba(0,191,255,0.05),rgba(0,102,255,0.03))', borderColor: 'rgba(0,191,255,0.18)' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🌱</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white mb-1">New to monetisation? Start here.</p>
                <p className="text-xs text-gray-400 mb-3">Premium networks (AdSense, Ezoic, Mediavine) require months of traffic history. The green-tagged providers below accept brand-new sites with zero traffic.</p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(34,197,94,0.1)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.18)' }}>✅ Day 1 — PropellerAds, Monetag, Adsterra, Infolinks</span>
                  <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(245,158,11,0.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,0.18)' }}>📈 Month 1–3 — BuySellAds, MGID, Amazon APS</span>
                  <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background:'rgba(0,191,255,0.1)', color:'#00BFFF', border:'1px solid rgba(0,191,255,0.18)' }}>🏆 Month 6+ — AdSense, Media.net, Ezoic, Taboola</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pre-flight Checklist ──────────────────────────────────────── */}
          <SectionBox title="📋 Monetisation Pre-flight Checklist">
            <p className="text-xs text-gray-500 -mt-2">Tick everything off before applying to any network. Incomplete sites get rejected or banned.</p>
            <div className="flex flex-col gap-2">
              {CHECKLIST_ITEMS.map(item => {
                const done = !!checklist[item.id]
                return (
                  <label key={item.id} className="flex items-start gap-3 cursor-pointer rounded-xl p-3 transition-all"
                    style={{ background: done ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${done ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)'}` }}>
                    <input type="checkbox" className="mt-0.5 accent-[#22c55e] shrink-0" checked={done}
                      onChange={e => setChecklist(c => ({ ...c, [item.id]: e.target.checked }))} />
                    <div>
                      <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-white'}`}>{item.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(Object.values(checklist).filter(Boolean).length / CHECKLIST_ITEMS.length) * 100}%`, background: 'linear-gradient(90deg,#22c55e,#00BFFF)' }} />
              </div>
              <span className="text-xs font-bold text-gray-400 tabular-nums">{Object.values(checklist).filter(Boolean).length}/{CHECKLIST_ITEMS.length}</span>
            </div>
          </SectionBox>

          {/* ── Provider Grid ─────────────────────────────────────────────── */}
          <SectionBox title="🎯 Choose Ad Provider">
            {(['test','day1','growing','established'] as ProviderCat[]).map(cat => (
              <div key={cat} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: CAT_META[cat].color }}>{CAT_META[cat].badge}</span>
                  <span className="text-[11px] text-gray-600">{CAT_META[cat].label}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
                  {PROVIDER_CATALOG.filter(p => p.cat === cat).map(p => {
                    const active = draft.adProvider === p.value
                    return (
                      <button key={p.value} onClick={() => patch('adProvider', p.value)}
                        className="flex items-start gap-3 rounded-xl p-3.5 text-left transition-all"
                        style={{ background: active ? `${p.color}12` : 'rgba(255,255,255,0.02)', border: `1px solid ${active ? p.color + '50' : 'rgba(255,255,255,0.06)'}`, outline: 'none' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>{p.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white leading-tight">{p.name}</p>
                            {active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:`${p.color}25`, color: p.color }}>Selected</span>}
                            {p.difficulty !== 'none' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background:`${DIFF_META[p.difficulty].color}15`, color: DIFF_META[p.difficulty].color }}>{DIFF_META[p.difficulty].label}</span>}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{p.tagline}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-600">RPM: <span className="text-gray-400 font-medium">{p.rpm}</span></span>
                            <span className="text-[10px] text-gray-600">Min: <span className="text-gray-400 font-medium">{p.traffic}</span></span>
                            {p.applyUrl && <a href={p.applyUrl} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-[10px] font-semibold hover:underline" style={{ color: p.color }}>Apply ↗</a>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </SectionBox>

          {/* ── Per-provider Settings ─────────────────────────────────────── */}

          {draft.adProvider === 'adsense' && (
            <SectionBox title="🟦 Google AdSense Settings">
              <InfoBanner icon="⚠️" color="#4285F4">
                <span className="font-semibold text-blue-400">Requires 3–6 months of original content</span> and a real privacy policy before applying.{' '}
                <a href="https://support.google.com/adsense" target="_blank" rel="noopener" className="text-[#00BFFF] underline">AdSense Help ↗</a>
              </InfoBanner>
              <Field label="Publisher ID" desc="Format: ca-pub-XXXXXXXXXXXXXXXX">
                <Input value={draft.adsensePublisherId} onChange={v => patch('adsensePublisherId', v)} placeholder="ca-pub-1234567890123456" />
              </Field>
              <Field label="Ad Slot ID" desc="The slot ID from your AdSense ad unit">
                <Input value={draft.adsenseSlotId} onChange={v => patch('adsenseSlotId', v)} placeholder="1234567890" />
              </Field>
              <SnippetBox label="Add to <head> in src/routes/__root.tsx">
                {`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${draft.adsensePublisherId || 'ca-pub-XXXX'}" crossorigin="anonymous"></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'medianet' && (
            <SectionBox title="🟠 Media.net Settings">
              <InfoBanner icon="ℹ️" color="#f97316">Apply at <a href="https://www.media.net" target="_blank" rel="noopener" className="text-[#00BFFF] underline">media.net ↗</a>. Site must have substantial English-language content for approval.</InfoBanner>
              <Field label="Site ID" desc="Your Media.net publisher site ID">
                <Input value={draft.medianetSiteId} onChange={v => patch('medianetSiteId', v)} placeholder="123456789" />
              </Field>
              <SnippetBox label="Add to <head> in src/routes/__root.tsx">
                {`<script src="https://contextual.media.net/dmedianet.js?cid=${draft.medianetSiteId || 'XXXXXXX'}" async></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'ezoic' && (
            <SectionBox title="🟢 Ezoic Settings">
              <InfoBanner icon="ℹ️" color="#22c55e">Ezoic uses DNS-level integration — your domain nameservers point to Ezoic's CDN. Visit <a href="https://www.ezoic.com" target="_blank" rel="noopener" className="text-[#00BFFF] underline">ezoic.com ↗</a>.</InfoBanner>
              <Field label="Site ID" desc="Your numeric Ezoic site ID">
                <Input value={draft.ezoicSiteId} onChange={v => patch('ezoicSiteId', v)} placeholder="12345" />
              </Field>
              <SnippetBox label="Add to <head> after DNS switch">
                {`<script async src="https://go.ezoic.net/ezoic/ezoic-pub-ad-placeholder.js"></script>\n<script src="https://the.gatekeeperconsent.com/cmp.min.js" data-cfasync="false"></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'propellerads' && (
            <SectionBox title="🚀 PropellerAds Settings">
              <InfoBanner icon="✅" color="#f97316">Instant approval — sign up at <a href="https://publishers.propellerads.com" target="_blank" rel="noopener" className="text-[#00BFFF] underline">publishers.propellerads.com ↗</a>. Zone ID is shown in your publisher dashboard.</InfoBanner>
              <Field label="Zone ID" desc="Your PropellerAds publisher zone ID">
                <Input value={draft.propelleradsZoneId} onChange={v => patch('propelleradsZoneId', v)} placeholder="1234567" />
              </Field>
              <SnippetBox label="Push / Native script — paste into <body> of __root.tsx">
                {`<script>(function(s,u,z,p){s.src=u,s.setAttribute('data-zone',z),p.parentNode.insertBefore(s,p);})(document.createElement('script'),'https://noticer.propellerads.com/notificator.js','${draft.propelleradsZoneId || 'ZONE_ID'}',document.currentScript)</script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'monetag' && (
            <SectionBox title="💰 Monetag Settings">
              <InfoBanner icon="✅" color="#10b981">No minimum traffic — create your account at <a href="https://monetag.com" target="_blank" rel="noopener" className="text-[#00BFFF] underline">monetag.com ↗</a> and add your website to get the ID.</InfoBanner>
              <Field label="Website ID" desc="Your Monetag website/zone ID">
                <Input value={draft.monetagWebsiteId} onChange={v => patch('monetagWebsiteId', v)} placeholder="1234567" />
              </Field>
              <SnippetBox label="Add to <head> in __root.tsx">
                {`<script src="https://web.push.games/pfe/current/tag.min.js?z=${draft.monetagWebsiteId || 'WEBSITE_ID'}" data-cfasync="false" async></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'adsterra' && (
            <SectionBox title="⭐ Adsterra Settings">
              <InfoBanner icon="✅" color="#06b6d4">Accepts new sites. Sign up at <a href="https://adsterra.com" target="_blank" rel="noopener" className="text-[#00BFFF] underline">adsterra.com ↗</a>. Use the Social Bar or Direct Link for gaming audiences.</InfoBanner>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Publisher ID" desc="Your Adsterra publisher account ID">
                  <Input value={draft.adsterraPublisherId} onChange={v => patch('adsterraPublisherId', v)} placeholder="12345678" />
                </Field>
                <Field label="Direct Link URL" desc="Optional — use in the renew-button ad modal">
                  <Input value={draft.adsterraDirectLink} onChange={v => patch('adsterraDirectLink', v)} placeholder="https://www.highcpmgate.com/..." />
                </Field>
              </div>
              <SnippetBox label="Social Bar script — paste before </body> in __root.tsx">
                {`<!-- Adsterra Social Bar -->\n<script async="async" data-cfasync="false" src="//pl${draft.adsterraPublisherId || 'XXXXXXXX'}.highcpmgate.com/invoke.js"></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'infolinks' && (
            <SectionBox title="🔗 Infolinks Settings">
              <InfoBanner icon="✅" color="#ec4899">Very low approval bar — apply at <a href="https://www.infolinks.com" target="_blank" rel="noopener" className="text-[#00BFFF] underline">infolinks.com ↗</a>. Displays non-intrusive in-text & in-fold units.</InfoBanner>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Publisher ID (pid)" desc="From your Infolinks dashboard">
                  <Input value={draft.infolinksPublisherId} onChange={v => patch('infolinksPublisherId', v)} placeholder="1234567" />
                </Field>
                <Field label="Website ID (wsid)" desc="From your Infolinks dashboard">
                  <Input value={draft.infolinksWebsiteId} onChange={v => patch('infolinksWebsiteId', v)} placeholder="0" />
                </Field>
              </div>
              <SnippetBox label="Paste before </body> in __root.tsx">
                {`<script>\nvar pid = ${draft.infolinksPublisherId || 'YOUR_PID'}, wsid = ${draft.infolinksWebsiteId || 'YOUR_WSID'};\n(function() {\nvar il = document.createElement('script');\nil.type = 'text/javascript';\nil.async = true;\nil.src = '//resources.infolinks.com/js/infolinks_main.js';\nvar script = document.getElementsByTagName('script')[0];\nscript.parentNode.insertBefore(il, script);\n})();\n</script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'amazon-aps' && (
            <SectionBox title="📦 Amazon Publisher Services Settings">
              <InfoBanner icon="ℹ️" color="#f59e0b">Apply at <a href="https://aps.amazon.com" target="_blank" rel="noopener" className="text-[#00BFFF] underline">aps.amazon.com ↗</a>. Requires ~10k monthly sessions. Uses header bidding via their UAM/TAM tags.</InfoBanner>
              <Field label="Publisher ID" desc="Your Amazon APS publisher/entity ID">
                <Input value={draft.amazonApsPublisherId} onChange={v => patch('amazonApsPublisherId', v)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </Field>
              <SnippetBox label="Add to <head> in __root.tsx (TAM integration)">
                {`<script>\nvar apstag = window.apstag || {};\napstag._Q = apstag._Q || [];\napstag.cmd = function() { apstag._Q.push(arguments); };\n</script>\n<script async src="https://c.amazon-adsystem.com/aax2/apstag.js"></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'taboola' && (
            <SectionBox title="📰 Taboola Settings">
              <InfoBanner icon="ℹ️" color="#1e40af">Requires significant traffic (50k+ monthly pageviews). Apply at <a href="https://www.taboola.com/publishers" target="_blank" rel="noopener" className="text-[#00BFFF] underline">taboola.com ↗</a>. Great for content-discovery sidebar units.</InfoBanner>
              <Field label="Site ID" desc="Your Taboola publisher site ID">
                <Input value={draft.taboolaSiteId} onChange={v => patch('taboolaSiteId', v)} placeholder="your-site-name" />
              </Field>
              <SnippetBox label="Add to <head> in __root.tsx">
                {`<script type="text/javascript">\nwindow._taboola = window._taboola || [];\n_taboola.push({article:'auto'});\n!function(e,f,u,i){\nif(!document.getElementById(i)){e.async=1;e.src=u;\ne.id=i;f.parentNode.insertBefore(e,f);\n}}(document.createElement('script'),document.getElementsByTagName('script')[0],\n'//cdn.taboola.com/libtrc/${draft.taboolaSiteId || 'YOUR-SITE-ID'}/loader.js','tb_loader_script');\nif(window.performance&&typeof window.performance.mark=='function')\n{window.performance.mark('tbl_ic');}\n</script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'mgid' && (
            <SectionBox title="📡 MGID Settings">
              <InfoBanner icon="ℹ️" color="#7c3aed">Apply at <a href="https://www.mgid.com" target="_blank" rel="noopener" className="text-[#00BFFF] underline">mgid.com ↗</a>. Good native fill for gaming/entertainment sites. Minimum ~5k monthly visits.</InfoBanner>
              <Field label="Client ID" desc="Your MGID client / widget ID">
                <Input value={draft.mgidClientId} onChange={v => patch('mgidClientId', v)} placeholder="123456" />
              </Field>
              <SnippetBox label="Widget script — paste in the ad placement location">
                {`<!-- MGID Native Widget -->\n<div id="M${draft.mgidClientId || 'XXXXXX'}"></div>\n<script src="//jsc.mgid.com/d/e/${draft.mgidClientId || 'XXXXXX'}.js" async></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'buysellads' && (
            <SectionBox title="💼 BuySellAds Settings">
              <InfoBanner icon="ℹ️" color="#3b82f6">BuySellAds lets you sell ad space directly to brands. Apply at <a href="https://buysellads.com/publishers" target="_blank" rel="noopener" className="text-[#00BFFF] underline">buysellads.com ↗</a>. No traffic minimum to list — but high-traffic sites earn more.</InfoBanner>
              <Field label="Property / Zone ID" desc="From your BuySellAds publisher dashboard">
                <Input value={draft.buyselladsPropertyId} onChange={v => patch('buyselladsPropertyId', v)} placeholder="CVYYIKKN" />
              </Field>
              <SnippetBox label="Carbon-style async tag — paste in ad placement div">
                {`<!-- BuySellAds Zone -->\n<script async src="//cdn.buysellads.net/pub/\n${draft.buyselladsPropertyId || 'YOUR_PROPERTY'}.js"></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'carbon' && (
            <SectionBox title="⚡ Carbon Ads Settings">
              <InfoBanner icon="ℹ️" color="#64748b">Carbon Ads serves one tasteful ad per page — ideal for developer/gaming audiences. Apply at <a href="https://carbonads.net/publishers.html" target="_blank" rel="noopener" className="text-[#00BFFF] underline">carbonads.net ↗</a>. Invite-only — email them with your traffic stats.</InfoBanner>
              <Field label="Zone Key" desc="Your Carbon Ads zone key">
                <Input value={draft.carbonZoneKey} onChange={v => patch('carbonZoneKey', v)} placeholder="CKYIEK3W" />
              </Field>
              <SnippetBox label="Paste wherever you want the ad to appear">
                {`<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=${draft.carbonZoneKey || 'YOUR_ZONE'}&placement=yoursite" id="_carbonads_js"></script>`}
              </SnippetBox>
            </SectionBox>
          )}

          {draft.adProvider === 'custom' && (
            <SectionBox title="✏️ Custom Ad HTML">
              <p className="text-xs text-gray-500">Paste any ad network embed code, iframe, or custom HTML. Rendered inside the ad modal.</p>
              <Textarea value={draft.customAdHtml} onChange={v => patch('customAdHtml', v)}
                placeholder={'<iframe src="https://your-ad-network.com/ad?id=123" width="100%" height="250" frameborder="0"></iframe>'} rows={8} />
            </SectionBox>
          )}

          {/* ── Network Application Tracker ───────────────────────────────── */}
          <SectionBox title="📊 Network Application Tracker">
            <p className="text-xs text-gray-500 -mt-2">Track the status of your ad network applications. Saved with your config.</p>
            <div className="flex flex-col gap-2">
              {PROVIDER_CATALOG.filter(p => p.cat !== 'test').map(p => {
                const status = (draft.networkStatus?.[p.value] ?? 'not-applied') as keyof typeof STATUS_META
                const sm = STATUS_META[status]
                return (
                  <div key={p.value} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-base w-6 text-center shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-600 truncate">{p.applyUrl}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                      <select
                        value={status}
                        onChange={e => patch('networkStatus', { ...draft.networkStatus, [p.value]: e.target.value as AdsConfig['networkStatus'][string] })}
                        className="text-[11px] rounded-lg px-2 py-1 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                      >
                        <option value="not-applied">Not Applied</option>
                        <option value="applied">Applied</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      {p.applyUrl && <a href={p.applyUrl} target="_blank" rel="noopener" className="text-[11px] font-semibold text-[#00BFFF] hover:underline shrink-0">Apply ↗</a>}
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionBox>

          {/* ── Ad Duration & Format ──────────────────────────────────────── */}
          <SectionBox title="⏱️ Ad Duration & Format">
            <Field label="Duration (seconds)" desc="How long the player must watch before they can continue.">
              <Slider min={3} max={60} value={draft.adDurationSeconds} onChange={v => patch('adDurationSeconds', v)} unit="s" />
            </Field>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: WATERFALL / MULTI-PROVIDER
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'waterfall' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🌊 Multi-Provider Waterfall">
            <Toggle checked={draft.waterfallEnabled} onChange={v => patch('waterfallEnabled', v)} label="Enable provider waterfall" desc="Try providers in priority order; fall back to the next if the current one fails to fill." />
            {draft.waterfallEnabled && (
              <div className="flex flex-col gap-3 mt-2">
                {draft.waterfallProviders.map((wp, i) => (
                  <div key={wp.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-xs font-bold text-gray-600 w-5 text-center">#{wp.priority}</span>
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Field label="Provider">
                        <Input value={wp.provider} onChange={v => { const wps = [...draft.waterfallProviders]; wps[i] = { ...wps[i], provider: v }; patch('waterfallProviders', wps) }} />
                      </Field>
                      <Field label="Fill Rate (%)">
                        <Input type="number" value={wp.estimatedFillRate} onChange={v => { const wps = [...draft.waterfallProviders]; wps[i] = { ...wps[i], estimatedFillRate: Number(v) }; patch('waterfallProviders', wps) }} />
                      </Field>
                      <Field label="Custom Tag">
                        <Input value={wp.customTag} onChange={v => { const wps = [...draft.waterfallProviders]; wps[i] = { ...wps[i], customTag: v }; patch('waterfallProviders', wps) }} placeholder="Optional" />
                      </Field>
                      <Field label="Enabled">
                        <div className="pt-1">
                          <Toggle checked={wp.enabled} onChange={v => { const wps = [...draft.waterfallProviders]; wps[i] = { ...wps[i], enabled: v }; patch('waterfallProviders', wps) }} label="" />
                        </div>
                      </Field>
                    </div>
                    <div className="flex gap-1">
                      <button disabled={i === 0} onClick={() => { const wps = [...draft.waterfallProviders]; [wps[i-1], wps[i]] = [wps[i], wps[i-1]]; wps[i-1].priority = i; wps[i].priority = i+1; patch('waterfallProviders', wps) }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors disabled:opacity-20">▲</button>
                      <button disabled={i === draft.waterfallProviders.length - 1} onClick={() => { const wps = [...draft.waterfallProviders]; [wps[i], wps[i+1]] = [wps[i+1], wps[i]]; wps[i].priority = i+1; wps[i+1].priority = i+2; patch('waterfallProviders', wps) }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors disabled:opacity-20">▼</button>
                      <button onClick={() => patch('waterfallProviders', draft.waterfallProviders.filter((_, j) => j !== i))}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => patch('waterfallProviders', [...draft.waterfallProviders, { id: uid(), provider: 'New Provider', enabled: true, priority: draft.waterfallProviders.length + 1, estimatedFillRate: 80, customTag: '' }])}
                  className="text-xs font-semibold text-[#00BFFF] hover:text-white transition-colors py-2"
                >+ Add Provider</button>
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: RENEW BUTTON
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'renew' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🔄 Renew Button Mode">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RENEW_MODES.map(m => (
                <label key={m.value} className="flex items-start gap-3 cursor-pointer rounded-xl p-4 transition-all"
                  style={{ background: draft.renewMode === m.value ? `${m.color}0d` : 'rgba(255,255,255,0.02)', border: `1px solid ${draft.renewMode === m.value ? `${m.color}40` : 'rgba(255,255,255,0.05)'}` }}
                >
                  <input type="radio" name="renewMode" value={m.value} checked={draft.renewMode === m.value} onChange={() => patch('renewMode', m.value as AdsConfig['renewMode'])} className="mt-1" style={{ accentColor: m.color }} />
                  <div><p className="text-sm font-bold text-white">{m.label}</p><p className="text-xs text-gray-500 mt-0.5">{m.desc}</p></div>
                </label>
              ))}
            </div>
          </SectionBox>

          <SectionBox title="📋 When to Show Ads">
            <Toggle checked={draft.showAdOnExpired} onChange={v => patch('showAdOnExpired', v)} label="Show ad when mining is expired" desc='When the player clicks "⛏ Renew Mining" after expiry.' />
            <Toggle checked={draft.showAdOnEarlyRenew} onChange={v => patch('showAdOnEarlyRenew', v)} label="Show ad on early renew" desc='When the player clicks "⟳ Renew Early" while mining is still active.' />
          </SectionBox>

          <SectionBox title="⏭️ Skip Settings">
            <Toggle checked={draft.skipAllowed} onChange={v => patch('skipAllowed', v)} label="Allow players to skip the ad" desc="A skip button appears after the delay below." />
            {draft.skipAllowed && (
              <Field label="Skip available after (seconds)">
                <Slider min={1} max={Math.max(1, draft.adDurationSeconds - 1)} value={draft.skipAfterSeconds} onChange={v => patch('skipAfterSeconds', v)} unit="s" />
              </Field>
            )}
          </SectionBox>

          <SectionBox title="🎁 Reward on Completion">
            <Toggle checked={draft.rewardOnComplete} onChange={v => patch('rewardOnComplete', v)} label="Give players a reward for watching the full ad" desc="Bonus currency credited after they complete." />
            {draft.rewardOnComplete && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reward Currency">
                  <Select value={draft.rewardType} onChange={v => patch('rewardType', v as AdsConfig['rewardType'])}>
                    <option value="bluecoin">BlueCoin</option>
                    <option value="gems">Gems</option>
                  </Select>
                </Field>
                <Field label="Amount">
                  <Input type="number" value={draft.rewardAmount} onChange={v => patch('rewardAmount', Number(v))} placeholder="100" />
                </Field>
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PAGE ADS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'page-ads' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="📄 Banner Ads per Page">
            <Toggle checked={draft.bannerAdEnabled} onChange={v => patch('bannerAdEnabled', v)} label="Enable banner ads globally" desc="Master toggle for all page banners." />
            {draft.bannerAdEnabled && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.keys(PAGE_LABELS).map(page => (
                    <div key={page} className="rounded-xl p-4" style={{ background: draft.pageAds[page] ? 'rgba(0,191,255,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${draft.pageAds[page] ? 'rgba(0,191,255,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-white">{PAGE_LABELS[page]}</span>
                        <label className="relative cursor-pointer">
                          <input type="checkbox" className="sr-only" checked={!!draft.pageAds[page]} onChange={e => patchPageAd(page, e.target.checked)} />
                          <div style={{ width: 36, height: 20, borderRadius: 10, background: draft.pageAds[page] ? 'linear-gradient(135deg,#00BFFF,#0066FF)' : 'rgba(255,255,255,0.08)', transition: 'background .2s' }} />
                          <div style={{ position: 'absolute', top: 2, left: draft.pageAds[page] ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left .2s' }} />
                        </label>
                      </div>
                      {draft.pageAds[page] && (
                        <Textarea value={draft.pageAdHtml?.[page] ?? ''} onChange={v => patchPageHtml(page, v)} placeholder="Leave blank to use global banner HTML below" rows={3} />
                      )}
                    </div>
                  ))}
                </div>
                <Field label="Global Banner HTML" desc="Used on pages that don't have a custom override above.">
                  <Textarea value={draft.bannerAdHtml} onChange={v => patch('bannerAdHtml', v)} placeholder={'<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXX" data-ad-slot="XXXX" data-ad-format="auto"></ins>'} rows={6} />
                </Field>
                <Field label="Banner Refresh Interval (seconds)" desc="How often the banner rotates. 0 = never refresh.">
                  <Slider min={0} max={120} value={draft.bannerRefreshIntervalSeconds} onChange={v => patch('bannerRefreshIntervalSeconds', v)} unit="s" />
                </Field>
              </>
            )}
          </SectionBox>

          <SectionBox title="📌 Sticky Footer Ad">
            <Toggle checked={draft.stickyFooterEnabled} onChange={v => patch('stickyFooterEnabled', v)} label="Enable sticky footer ad" desc="Fixed bar at the bottom of every page." />
            {draft.stickyFooterEnabled && (
              <Field label="Sticky Footer HTML">
                <Textarea value={draft.stickyFooterHtml} onChange={v => patch('stickyFooterHtml', v)} placeholder="<div style='text-align:center'>Ad code here</div>" rows={5} />
              </Field>
            )}
          </SectionBox>

          <SectionBox title="🖼️ Interstitial Ads">
            <Toggle checked={draft.interstitialEnabled} onChange={v => patch('interstitialEnabled', v)} label="Enable interstitial ads" desc="Full-page ads shown between page navigations." />
            {draft.interstitialEnabled && (
              <>
                <Toggle checked={draft.interstitialOnPageChange} onChange={v => patch('interstitialOnPageChange', v)} label="Show on page change" desc="Triggers interstitial when the user navigates between pages." />
                <Field label="Frequency — every N page changes">
                  <Slider min={1} max={20} value={draft.interstitialFrequency} onChange={v => patch('interstitialFrequency', v)} unit="x" />
                </Field>
              </>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: FREQUENCY & LIMITS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'frequency' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="⏱️ Frequency Capping">
            <InfoBanner icon="💡" color="#00BFFF">Frequency caps prevent ad fatigue. 0 = unlimited. These limits are enforced client-side.</InfoBanner>
            <Field label="Daily ad cap per user" desc="Max number of modal ads shown to one user per day. 0 = no limit.">
              <Input type="number" min={0} value={draft.dailyAdCapPerUser} onChange={v => patch('dailyAdCapPerUser', Number(v))} placeholder="0" />
            </Field>
            <Field label="Cooldown between ads (seconds)" desc="Minimum wait between consecutive ad shows for the same user. 0 = no cooldown.">
              <Input type="number" min={0} value={draft.cooldownBetweenAdsSeconds} onChange={v => patch('cooldownBetweenAdsSeconds', Number(v))} placeholder="0" />
            </Field>
            <Field label="Max ads per session" desc="Maximum modal ads shown in a single browser session. 0 = no limit.">
              <Input type="number" min={0} value={draft.maxAdsPerSession} onChange={v => patch('maxAdsPerSession', Number(v))} placeholder="0" />
            </Field>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: SCHEDULE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'schedule' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🗓️ Ad Schedule">
            <Toggle checked={draft.scheduleEnabled} onChange={v => patch('scheduleEnabled', v)} label="Enable time-based scheduling" desc="Restrict when ads are shown to players." />
            {draft.scheduleEnabled && (
              <>
                <Field label="Timezone">
                  <Select value={draft.scheduleTimezone} onChange={v => patch('scheduleTimezone', v)}>
                    {['UTC','US/Eastern','US/Central','US/Pacific','Europe/London','Europe/Berlin','Asia/Tokyo','Asia/Singapore','Australia/Sydney'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Allow ads from (hour 0–23)">
                    <Input type="number" min={0} max={23} value={draft.scheduleHoursStart} onChange={v => patch('scheduleHoursStart', Math.min(23, Math.max(0, Number(v))))} />
                  </Field>
                  <Field label="Allow ads until (hour 0–23)">
                    <Input type="number" min={0} max={23} value={draft.scheduleHoursEnd} onChange={v => patch('scheduleHoursEnd', Math.min(23, Math.max(0, Number(v))))} />
                  </Field>
                </div>
                <Field label="Allowed Days">
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((day, i) => {
                      const active = draft.scheduleAllowedDays.includes(i)
                      return (
                        <button key={day} onClick={() => {
                          const days = active ? draft.scheduleAllowedDays.filter(d => d !== i) : [...draft.scheduleAllowedDays, i]
                          patch('scheduleAllowedDays', days)
                        }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background: active ? 'rgba(0,191,255,0.15)' : 'rgba(255,255,255,0.04)', color: active ? '#00BFFF' : 'rgba(255,255,255,0.3)', border: `1px solid ${active ? 'rgba(0,191,255,0.35)' : 'rgba(255,255,255,0.06)'}` }}
                        >{day}</button>
                      )
                    })}
                  </div>
                </Field>
              </>
            )}
          </SectionBox>

          <SectionBox title="🌙 Quiet Hours">
            <Toggle checked={draft.quietHoursEnabled} onChange={v => patch('quietHoursEnabled', v)} label="Enable quiet hours" desc="No ads shown during the window below — good for overnight or maintenance periods." />
            {draft.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quiet from (hour)"><Input type="number" min={0} max={23} value={draft.quietHoursStart} onChange={v => patch('quietHoursStart', Number(v))} /></Field>
                <Field label="Quiet until (hour)"><Input type="number" min={0} max={23} value={draft.quietHoursEnd} onChange={v => patch('quietHoursEnd', Number(v))} /></Field>
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PLAYER UX
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'player-ux' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🎮 Ad Display Settings">
            <Field label="Ad Label Text" desc="Shown above the ad. E.g. 'Advertisement' or 'Sponsored'.">
              <Input value={draft.adLabelText} onChange={v => patch('adLabelText', v)} placeholder="Advertisement" />
            </Field>
            <Toggle checked={draft.showAdProgressBar} onChange={v => patch('showAdProgressBar', v)} label="Show progress bar" desc="Animated bar showing how much time is left." />
            <Toggle checked={draft.showCountdownTimer} onChange={v => patch('showCountdownTimer', v)} label="Show countdown timer" desc="Numeric countdown overlaid on the ad." />
            <Toggle checked={draft.showSkipAnimation} onChange={v => patch('showSkipAnimation', v)} label="Show skip button animation" desc="Animate the skip button when it becomes available." />
            <Toggle checked={draft.muteByDefault} onChange={v => patch('muteByDefault', v)} label="Mute video ads by default" />
          </SectionBox>

          <SectionBox title="🙏 Thank You Message">
            <Toggle checked={draft.showThankYouMessage} onChange={v => patch('showThankYouMessage', v)} label="Show thank-you message after ad completion" desc="Shown briefly before the renew completes." />
            {draft.showThankYouMessage && (
              <Field label="Thank-You Message">
                <Input value={draft.thankYouMessage} onChange={v => patch('thankYouMessage', v)} placeholder="Thanks for supporting Blue Tiers! 🎉" />
              </Field>
            )}
          </SectionBox>

          <SectionBox title="😴 Fatigue Protection">
            <Toggle checked={draft.fatigueProtectionEnabled} onChange={v => patch('fatigueProtectionEnabled', v)} label="Enable fatigue protection" desc="Automatically suppress ads if the player has seen too many recently." />
            {draft.fatigueProtectionEnabled && (
              <Field label="Max ads per hour before suppression">
                <Slider min={1} max={20} value={draft.fatigueMaxAdsPerHour} onChange={v => patch('fatigueMaxAdsPerHour', v)} unit=" ads" />
              </Field>
            )}
          </SectionBox>

          <SectionBox title="🚪 Player Opt-Out">
            <Toggle checked={draft.allowPlayerOptOut} onChange={v => patch('allowPlayerOptOut', v)} label="Allow players to opt out of ads" desc="A small opt-out link appears in the ad modal footer." />
            {draft.allowPlayerOptOut && (
              <Field label="Opt-Out Confirmation Message">
                <Input value={draft.optOutMessage} onChange={v => patch('optOutMessage', v)} placeholder="Ads help keep this server free. Are you sure?" />
              </Field>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: COMPLIANCE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'compliance' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🇪🇺 GDPR (EU)">
            <Toggle checked={draft.gdprEnabled} onChange={v => patch('gdprEnabled', v)} label="GDPR mode enabled" desc="Activates consent flow for EU users." />
            {draft.gdprEnabled && (
              <>
                <Toggle checked={draft.gdprConsentRequired} onChange={v => patch('gdprConsentRequired', v)} label="Require explicit consent before showing ads" />
                <Field label="Consent Text" desc="Shown to users before the first ad.">
                  <Textarea value={draft.gdprConsentText} onChange={v => patch('gdprConsentText', v)} rows={3} />
                </Field>
              </>
            )}
          </SectionBox>

          <SectionBox title="👶 COPPA (Children's Privacy)">
            <Toggle checked={draft.coppaMode} onChange={v => patch('coppaMode', v)} label="COPPA mode" desc="Disables all personalised / behavioural ads. Required if your site may be accessed by users under 13 in the US." />
          </SectionBox>

          <SectionBox title="🇺🇸 CCPA (California)">
            <Toggle checked={draft.ccpaEnabled} onChange={v => patch('ccpaEnabled', v)} label="CCPA mode" desc='Adds a "Do Not Sell My Personal Information" link to the ad modal footer.' />
          </SectionBox>

          <SectionBox title="🍪 Cookie Consent">
            <Toggle checked={draft.cookieConsentRequired} onChange={v => patch('cookieConsentRequired', v)} label="Show cookie consent before ad cookies are set" />
            {draft.cookieConsentRequired && (
              <Field label="Cookie Consent Text">
                <Textarea value={draft.cookieConsentText} onChange={v => patch('cookieConsentText', v)} rows={2} />
              </Field>
            )}
          </SectionBox>

          <SectionBox title="📜 Legal Links & Disclosure">
            <Field label="Privacy Policy URL">
              <Input value={draft.privacyPolicyUrl} onChange={v => patch('privacyPolicyUrl', v)} placeholder="https://yoursite.com/privacy" />
            </Field>
            <Field label="Terms of Service URL">
              <Input value={draft.termsUrl} onChange={v => patch('termsUrl', v)} placeholder="https://yoursite.com/terms" />
            </Field>
            <Field label="Ad Disclosure Text" desc="Displayed below ads per FTC guidelines.">
              <Input value={draft.adDisclosureText} onChange={v => patch('adDisclosureText', v)} placeholder="This site uses advertising to fund operations." />
            </Field>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: SPONSORS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'sponsors' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🤝 Direct Sponsor Slots">
            <p className="text-xs text-gray-500">Manage direct sponsorship deals. Active sponsor ads rotate alongside network ads based on their weight.</p>
            {draft.sponsors.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-4">No sponsors yet. Add your first below.</p>
            )}
            <div className="flex flex-col gap-3">
              {draft.sponsors.map((sp, i) => (
                <div key={sp.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{sp.name || 'Unnamed Sponsor'}</span>
                      <Badge color={sp.active ? '#22c55e' : '#6b7280'}>{sp.active ? 'Active' : 'Paused'}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">👁️ {sp.impressions} imps</span>
                      <button onClick={() => { const s = [...draft.sponsors]; s[i] = { ...s[i], active: !s[i].active }; patch('sponsors', s) }} className="text-xs text-[#00BFFF] hover:text-white transition-colors px-2 py-1 rounded-lg" style={{ border: '1px solid rgba(0,191,255,0.2)' }}>{sp.active ? 'Pause' : 'Activate'}</button>
                      <button onClick={() => patch('sponsors', draft.sponsors.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>Remove</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Name"><Input value={sp.name} onChange={v => { const s = [...draft.sponsors]; s[i] = { ...s[i], name: v }; patch('sponsors', s) }} /></Field>
                    <Field label="Link URL"><Input value={sp.linkUrl} onChange={v => { const s = [...draft.sponsors]; s[i] = { ...s[i], linkUrl: v }; patch('sponsors', s) }} placeholder="https://" /></Field>
                    <Field label="Logo URL"><Input value={sp.logoUrl} onChange={v => { const s = [...draft.sponsors]; s[i] = { ...s[i], logoUrl: v }; patch('sponsors', s) }} placeholder="https://..." /></Field>
                    <Field label="Deal Value ($)"><Input type="number" value={sp.dealValue} onChange={v => { const s = [...draft.sponsors]; s[i] = { ...s[i], dealValue: Number(v) }; patch('sponsors', s) }} /></Field>
                    <Field label="Weight (higher = more frequent)"><Input type="number" value={sp.weight} onChange={v => { const s = [...draft.sponsors]; s[i] = { ...s[i], weight: Number(v) }; patch('sponsors', s) }} /></Field>
                    <Field label="End Date"><Input type="date" value={sp.endDate} onChange={v => { const s = [...draft.sponsors]; s[i] = { ...s[i], endDate: v }; patch('sponsors', s) }} /></Field>
                  </div>
                  <Field label="Custom Ad HTML (optional)">
                    <Textarea value={sp.html} onChange={v => { const s = [...draft.sponsors]; s[i] = { ...s[i], html: v }; patch('sponsors', s) }} rows={3} placeholder="Leave blank to show logo + link." />
                  </Field>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(0,191,255,0.04)', border: '1px dashed rgba(0,191,255,0.2)' }}>
              <p className="text-xs font-semibold text-[#00BFFF]">+ Add New Sponsor</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Name"><Input value={newSponsor.name ?? ''} onChange={v => setNewSponsor(s => ({ ...s, name: v }))} /></Field>
                <Field label="Link URL"><Input value={newSponsor.linkUrl ?? ''} onChange={v => setNewSponsor(s => ({ ...s, linkUrl: v }))} placeholder="https://" /></Field>
                <Field label="Deal Value ($)"><Input type="number" value={newSponsor.dealValue ?? ''} onChange={v => setNewSponsor(s => ({ ...s, dealValue: Number(v) }))} /></Field>
              </div>
              <button
                disabled={!newSponsor.name}
                onClick={() => {
                  patch('sponsors', [...draft.sponsors, { id: uid(), name: newSponsor.name!, logoUrl: newSponsor.logoUrl ?? '', linkUrl: newSponsor.linkUrl ?? '', html: '', weight: 1, active: true, startDate: new Date().toISOString().slice(0,10), endDate: '', impressions: 0, clicks: 0, dealValue: newSponsor.dealValue ?? 0 }])
                  setNewSponsor({})
                }}
                className="self-start px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)' }}
              >Add Sponsor</button>
            </div>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: A/B TEST
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'ab-test' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🔬 A/B Ad Testing">
            <Toggle checked={draft.abTestEnabled} onChange={v => patch('abTestEnabled', v)} label="Enable A/B test" desc="Split traffic between two ad variants to find which performs better." />
            {draft.abTestEnabled && (
              <>
                <Field label="Test Name">
                  <Input value={draft.abTestName} onChange={v => patch('abTestName', v)} placeholder="Summer Test 1" />
                </Field>
                <Field label={`Traffic to Variant B: ${draft.abTestSplit}%`}>
                  <Slider min={5} max={95} value={draft.abTestSplit} onChange={v => patch('abTestSplit', v)} unit="%" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-bold text-white">🅰 Variant A ({100 - draft.abTestSplit}% of traffic)</p>
                    <Field label="Custom HTML (blank = current provider)">
                      <Textarea value={draft.abTestVariantAHtml} onChange={v => patch('abTestVariantAHtml', v)} rows={5} placeholder="Leave blank to use the configured provider." />
                    </Field>
                    <Field label="Duration (seconds)">
                      <Slider min={3} max={60} value={draft.abTestVariantADuration} onChange={v => patch('abTestVariantADuration', v)} unit="s" />
                    </Field>
                  </div>
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-bold text-white">🅱 Variant B ({draft.abTestSplit}% of traffic)</p>
                    <Field label="Custom HTML">
                      <Textarea value={draft.abTestVariantBHtml} onChange={v => patch('abTestVariantBHtml', v)} rows={5} placeholder="HTML for the alternate ad variant." />
                    </Field>
                    <Field label="Duration (seconds)">
                      <Slider min={3} max={60} value={draft.abTestVariantBDuration} onChange={v => patch('abTestVariantBDuration', v)} unit="s" />
                    </Field>
                  </div>
                </div>
              </>
            )}
          </SectionBox>

          {draft.abTestEnabled && (
            <SectionBox title="📊 A/B Test Results">
              <div className="grid grid-cols-2 gap-4">
                {(['a', 'b'] as const).map(v => {
                  const imps  = v === 'a' ? cfg.abTestStats.variantAImpressions : cfg.abTestStats.variantBImpressions
                  const comps = v === 'a' ? cfg.abTestStats.variantACompletions : cfg.abTestStats.variantBCompletions
                  const rev   = v === 'a' ? cfg.abTestStats.variantARevenue     : cfg.abTestStats.variantBRevenue
                  const ctr   = imps > 0 ? ((comps / imps) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={v} className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-sm font-bold text-white">Variant {v.toUpperCase()}</p>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Impressions</span><span className="text-white">{imps.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Completions</span><span className="text-green-400">{comps.toLocaleString()} ({ctr}%)</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Revenue</span><span className="text-[#00BFFF]">${rev.toFixed(4)}</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {cfg.abTestStats.startedAt && <p className="text-[11px] text-gray-600">Test started: {new Date(cfg.abTestStats.startedAt).toLocaleString()}</p>}
              <button onClick={handleAbReset} disabled={abResetting} className="self-start text-xs text-amber-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
                {abResetting ? 'Resetting…' : '🔄 Reset A/B Stats'}
              </button>
            </SectionBox>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: GEO TARGETING
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'geo' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🌍 Geographic Targeting">
            <Toggle checked={draft.geoEnabled} onChange={v => patch('geoEnabled', v)} label="Enable geo targeting" desc="Control which countries can see ads." />
            {draft.geoEnabled && (
              <>
                <Field label="Mode">
                  <div className="flex gap-3">
                    {(['allowlist', 'blocklist'] as const).map(m => (
                      <label key={m} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="geoMode" checked={draft.geoMode === m} onChange={() => patch('geoMode', m)} className="accent-[#00BFFF]" />
                        <span className="text-sm text-white capitalize">{m}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">{draft.geoMode === 'allowlist' ? 'Only show ads to users in the listed countries.' : 'Show ads to everyone except users in the listed countries.'}</p>
                </Field>

                <Field label={`Countries (${draft.geoCountries.length})`}>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {draft.geoCountries.map(c => (
                      <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#00BFFF]" style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.2)' }}>
                        {c}
                        <button onClick={() => patch('geoCountries', draft.geoCountries.filter(x => x !== c))} className="text-gray-500 hover:text-red-400 ml-1">✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Select value={newCountry} onChange={v => setNewCountry(v)}>
                      <option value="">Select country…</option>
                      {ALL_COUNTRIES.filter(c => !draft.geoCountries.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                    <button disabled={!newCountry} onClick={() => { patch('geoCountries', [...draft.geoCountries, newCountry]); setNewCountry('') }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 shrink-0" style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)' }}>Add</button>
                  </div>
                </Field>

                <Toggle checked={draft.geoShowFallbackAd} onChange={v => patch('geoShowFallbackAd', v)} label="Show fallback ad for excluded regions" />
                {draft.geoShowFallbackAd && (
                  <Field label="Fallback Ad HTML" desc="Shown instead of the main ad to excluded users.">
                    <Textarea value={draft.geoFallbackHtml} onChange={v => patch('geoFallbackHtml', v)} rows={4} />
                  </Field>
                )}
              </>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: GOALS & MILESTONES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'goals' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🎯 Revenue Goals">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Daily Goal ($)"><Input type="number" step={0.01} value={draft.goalDaily} onChange={v => patch('goalDaily', parseFloat(v) || 0)} placeholder="0.00" /></Field>
              <Field label="Weekly Goal ($)"><Input type="number" step={0.01} value={draft.goalWeekly} onChange={v => patch('goalWeekly', parseFloat(v) || 0)} placeholder="0.00" /></Field>
              <Field label="Monthly Goal ($)"><Input type="number" step={0.01} value={draft.goalMonthly} onChange={v => patch('goalMonthly', parseFloat(v) || 0)} placeholder="0.00" /></Field>
            </div>
            <div className="flex flex-col gap-3 mt-2">
              {cfg.goalDaily   > 0 && <div className="flex flex-col gap-1.5"><div className="flex justify-between text-xs"><span className="text-gray-500">Daily</span><span className="text-white">${projDay.toFixed(4)} / ${cfg.goalDaily.toFixed(2)}</span></div><ProgressBar value={projDay} max={cfg.goalDaily} color="#22c55e" /></div>}
              {cfg.goalWeekly  > 0 && <div className="flex flex-col gap-1.5"><div className="flex justify-between text-xs"><span className="text-gray-500">Weekly</span><span className="text-white">${(projDay * 7).toFixed(2)} / ${cfg.goalWeekly.toFixed(2)}</span></div><ProgressBar value={projDay * 7} max={cfg.goalWeekly} color="#00BFFF" /></div>}
              {cfg.goalMonthly > 0 && <div className="flex flex-col gap-1.5"><div className="flex justify-between text-xs"><span className="text-gray-500">Monthly</span><span className="text-white">${projMonth.toFixed(2)} / ${cfg.goalMonthly.toFixed(2)}</span></div><ProgressBar value={projMonth} max={cfg.goalMonthly} color="#a855f7" /></div>}
            </div>
          </SectionBox>

          <SectionBox title="🏆 Milestones">
            <p className="text-xs text-gray-500">Milestone notifications fire when your total revenue crosses the target.</p>
            <div className="flex flex-col gap-2">
              {draft.milestones.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${m.achieved ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                  <span className="text-base">{m.achieved ? '✅' : '🎯'}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{m.label || `$${m.amount} milestone`}</p>
                    <p className="text-xs text-gray-600">Target: ${m.amount.toFixed(2)}{m.achievedAt ? ` · Achieved ${new Date(m.achievedAt).toLocaleDateString()}` : ''}</p>
                  </div>
                  <button onClick={() => patch('milestones', draft.milestones.filter((_, j) => j !== i))} className="text-xs text-gray-600 hover:text-red-400 transition-colors">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-end">
              <Field label="Target ($)"><Input type="number" step={0.01} value={newMilestone.amount} onChange={v => setNewMilestone(m => ({ ...m, amount: v }))} placeholder="50.00" /></Field>
              <Field label="Label"><Input value={newMilestone.label} onChange={v => setNewMilestone(m => ({ ...m, label: v }))} placeholder="First $50!" /></Field>
              <button
                disabled={!newMilestone.amount}
                onClick={() => {
                  patch('milestones', [...draft.milestones, { id: uid(), amount: parseFloat(newMilestone.amount) || 0, label: newMilestone.label || `$${newMilestone.amount} milestone`, achieved: false, achievedAt: null }])
                  setNewMilestone({ amount: '', label: '' })
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 shrink-0 mb-0.5" style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)' }}
              >Add</button>
            </div>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: BOOSTS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'boosts' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🚀 Revenue Boost Event">
            <Toggle checked={draft.boostEnabled} onChange={v => patch('boostEnabled', v)} label="Boost event active" desc="Multiplies estimated revenue per completion during the event window." />
            {draft.boostEnabled && (
              <>
                <Field label="Boost Label (shown to players)">
                  <Input value={draft.boostLabel} onChange={v => patch('boostLabel', v)} placeholder="2× Revenue Event" />
                </Field>
                <Field label="Boost Banner Text" desc="Optional banner message shown on the mining page.">
                  <Input value={draft.boostBannerText} onChange={v => patch('boostBannerText', v)} placeholder="🚀 Double earnings are live! Limited time." />
                </Field>
                <Field label="Revenue Multiplier">
                  <Slider min={1} max={10} value={draft.boostMultiplier} onChange={v => patch('boostMultiplier', v)} unit="×" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date & Time"><Input type="datetime-local" value={draft.boostStartDate} onChange={v => patch('boostStartDate', v)} /></Field>
                  <Field label="End Date & Time"><Input type="datetime-local" value={draft.boostEndDate} onChange={v => patch('boostEndDate', v)} /></Field>
                </div>
                {draft.boostStartDate && draft.boostEndDate && (
                  <InfoBanner icon="🚀" color="#f59e0b">
                    <span className="font-semibold text-amber-400">{draft.boostMultiplier}× boost</span> active from <span className="text-white">{new Date(draft.boostStartDate).toLocaleString()}</span> to <span className="text-white">{new Date(draft.boostEndDate).toLocaleString()}</span>
                  </InfoBanner>
                )}
              </>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: AFFILIATES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'affiliates' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🔗 Affiliate Link Management">
            <Toggle checked={draft.affiliateEnabled} onChange={v => patch('affiliateEnabled', v)} label="Affiliate program enabled" />
            <div className="flex flex-col gap-3">
              {draft.affiliateLinks.length === 0 && <p className="text-sm text-gray-600 text-center py-3">No affiliate links yet.</p>}
              {draft.affiliateLinks.map((lnk, i) => (
                <div key={lnk.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{lnk.name || 'Unnamed Link'}</span>
                      <Badge color={lnk.active ? '#22c55e' : '#6b7280'}>{lnk.active ? 'Active' : 'Paused'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>🖱️ {lnk.clicks} clicks</span>
                      <span>💰 ${lnk.totalEarned.toFixed(2)}</span>
                      <button onClick={() => patch('affiliateLinks', draft.affiliateLinks.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300">✕</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Name"><Input value={lnk.name} onChange={v => { const l = [...draft.affiliateLinks]; l[i] = { ...l[i], name: v }; patch('affiliateLinks', l) }} /></Field>
                    <Field label="URL"><Input value={lnk.url} onChange={v => { const l = [...draft.affiliateLinks]; l[i] = { ...l[i], url: v }; patch('affiliateLinks', l) }} /></Field>
                    <Field label="Network"><Input value={lnk.network} onChange={v => { const l = [...draft.affiliateLinks]; l[i] = { ...l[i], network: v }; patch('affiliateLinks', l) }} placeholder="Amazon, CJ, etc." /></Field>
                    <Field label="Commission">
                      <div className="flex gap-2">
                        <Select value={lnk.commissionType} onChange={v => { const l = [...draft.affiliateLinks]; l[i] = { ...l[i], commissionType: v as any }; patch('affiliateLinks', l) }}>
                          <option value="percent">%</option><option value="flat">$</option>
                        </Select>
                        <Input type="number" value={lnk.commission} onChange={v => { const l = [...draft.affiliateLinks]; l[i] = { ...l[i], commission: Number(v) }; patch('affiliateLinks', l) }} />
                      </div>
                    </Field>
                    <Field label="Placement"><Input value={lnk.placement} onChange={v => { const l = [...draft.affiliateLinks]; l[i] = { ...l[i], placement: v }; patch('affiliateLinks', l) }} placeholder="sidebar, footer…" /></Field>
                    <Field label="Active">
                      <div className="pt-1"><Toggle checked={lnk.active} onChange={v => { const l = [...draft.affiliateLinks]; l[i] = { ...l[i], active: v }; patch('affiliateLinks', l) }} label="" /></div>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(0,191,255,0.04)', border: '1px dashed rgba(0,191,255,0.2)' }}>
              <p className="text-xs font-semibold text-[#00BFFF]">+ Add Affiliate Link</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Name"><Input value={newAffiliate.name ?? ''} onChange={v => setNewAffiliate(a => ({ ...a, name: v }))} /></Field>
                <Field label="URL"><Input value={newAffiliate.url ?? ''} onChange={v => setNewAffiliate(a => ({ ...a, url: v }))} placeholder="https://" /></Field>
                <Field label="Network"><Input value={newAffiliate.network ?? ''} onChange={v => setNewAffiliate(a => ({ ...a, network: v }))} /></Field>
              </div>
              <button
                disabled={!newAffiliate.name || !newAffiliate.url}
                onClick={() => {
                  patch('affiliateLinks', [...draft.affiliateLinks, { id: uid(), name: newAffiliate.name!, url: newAffiliate.url!, network: newAffiliate.network ?? '', commission: 0, commissionType: 'percent', clicks: 0, conversions: 0, totalEarned: 0, active: true, placement: '' }])
                  setNewAffiliate({})
                }}
                className="self-start px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)' }}
              >Add Link</button>
            </div>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: REFERRALS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'referrals' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="👥 Referral Program">
            <Toggle checked={draft.referralEnabled} onChange={v => patch('referralEnabled', v)} label="Enable referral program" desc="Players earn a commission when they refer new members who watch ads." />
            {draft.referralEnabled && (
              <>
                <Field label="Commission (% of referred user's ad revenue)">
                  <Slider min={1} max={50} value={draft.referralCommissionPercent} onChange={v => patch('referralCommissionPercent', v)} unit="%" />
                </Field>
                <Field label="Click Bonus (BlueCoin per referral link click)">
                  <Input type="number" value={draft.referralClickBonus} onChange={v => patch('referralClickBonus', Number(v))} placeholder="0" />
                </Field>
                <Field label="Referral Cookie Duration (days)">
                  <Input type="number" value={draft.referralCookieDays} onChange={v => patch('referralCookieDays', Number(v))} placeholder="30" />
                </Field>
              </>
            )}
          </SectionBox>

          <SectionBox title="📊 Referral Stats">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon="👥" label="Total Referrals"    value={cfg.referralStats.totalReferrals.toString()}            color="#00BFFF" />
              <StatCard icon="🖱️" label="Total Clicks"       value={cfg.referralStats.totalClicks.toLocaleString()}         color="#22c55e" />
              <StatCard icon="✅" label="Conversions"        value={cfg.referralStats.totalConversions.toLocaleString()}    color="#f59e0b" />
              <StatCard icon="💰" label="Commission Paid"    value={`$${cfg.referralStats.totalCommission.toFixed(2)}`}     color="#a855f7" />
            </div>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: REVENUE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'revenue' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="💰 Revenue Settings">
            <Field label="Estimated RPM ($)" desc="Revenue per 1,000 impressions. Used for projections only.">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm">$</span>
                <input type="number" step="0.01" min="0" value={draft.estimatedRpm} onChange={e => patch('estimatedRpm', parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                <span className="text-gray-600 text-xs">per 1k</span>
              </div>
            </Field>
            <Field label="Payout Currency">
              <Select value={draft.payoutCurrency} onChange={v => patch('payoutCurrency', v)}>
                {['USD','EUR','GBP','CAD','AUD','JPY','SGD'].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </SectionBox>

          <SectionBox title="📊 Revenue Calculator">
            <p className="text-xs text-gray-500">Estimate earnings at different impression volumes with your current RPM.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>{['Daily Views','Monthly Views','Est. Monthly','Est. Annual'].map(h => <th key={h} className="text-left py-2 px-3 text-gray-600 font-semibold uppercase tracking-widest border-b border-white/5">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[100, 500, 1000, 5000, 10000, 50000].map(daily => {
                    const monthly = daily * 30; const rev = (monthly / 1000) * draft.estimatedRpm; const annual = rev * 12
                    return (
                      <tr key={daily} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="py-3 px-3 text-white font-medium tabular-nums">{daily.toLocaleString()}</td>
                        <td className="py-3 px-3 text-gray-400 tabular-nums">{monthly.toLocaleString()}</td>
                        <td className="py-3 px-3 text-green-400 font-bold tabular-nums">${rev.toFixed(2)}</td>
                        <td className="py-3 px-3 text-[#00BFFF] font-bold tabular-nums">${annual.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionBox>

          <SectionBox title="🔗 Ad Network Resources">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Google AdSense', url: 'https://www.google.com/adsense', desc: 'Most popular — great for content sites', icon: '🔵', rpm: '$1–$5' },
                { name: 'Media.net',      url: 'https://www.media.net',          desc: 'Yahoo/Bing network — high RPM',          icon: '🟠', rpm: '$2–$8' },
                { name: 'Ezoic',          url: 'https://www.ezoic.com',          desc: 'AI-optimised placement',                  icon: '🟢', rpm: '$3–$12' },
                { name: 'AdThrive',       url: 'https://www.adthrive.com',       desc: 'Premium publishers, top CPMs',             icon: '🟣', rpm: '$8–$30' },
                { name: 'Raptive',        url: 'https://www.raptive.com',        desc: 'Previously CafeMedia',                     icon: '🔴', rpm: '$7–$25' },
                { name: 'Monumetric',     url: 'https://www.monumetric.com',     desc: '10k+ monthly page view requirement',       icon: '⚪', rpm: '$4–$10' },
              ].map(n => (
                <a key={n.name} href={n.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 rounded-xl transition-all hover:bg-white/3"
                  style={{ border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}
                >
                  <span className="text-xl">{n.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><p className="text-sm font-semibold text-white">{n.name} ↗</p><Badge color="#22c55e">{n.rpm} RPM</Badge></div>
                    <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: PAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'payout' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="💸 Payout Settings">
            <Toggle checked={draft.payoutEnabled} onChange={v => patch('payoutEnabled', v)} label="Enable payout tracking" />
            {draft.payoutEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Payout Method">
                    <Select value={draft.payoutMethod} onChange={v => patch('payoutMethod', v as AdsConfig['payoutMethod'])}>
                      <option value="paypal">PayPal</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="crypto">Cryptocurrency</option>
                      <option value="check">Check</option>
                    </Select>
                  </Field>
                  <Field label="Minimum Payout Threshold ($)">
                    <Input type="number" step={0.01} value={draft.payoutThreshold} onChange={v => patch('payoutThreshold', parseFloat(v) || 0)} />
                  </Field>
                </div>
                <Field label="Payout Email / Address">
                  <Input value={draft.payoutEmail} onChange={v => patch('payoutEmail', v)} placeholder="paypal@yourmail.com" />
                </Field>
                <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">Available Balance</p>
                      <p className="text-2xl font-bold text-green-400 tabular-nums font-['Space_Grotesk']">${cfg.stats.estimatedRevenue.toFixed(4)}</p>
                    </div>
                    <Badge color={cfg.stats.estimatedRevenue >= cfg.payoutThreshold ? '#22c55e' : '#f59e0b'}>
                      {cfg.stats.estimatedRevenue >= cfg.payoutThreshold ? 'Ready to pay out' : `Need $${(cfg.payoutThreshold - cfg.stats.estimatedRevenue).toFixed(2)} more`}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </SectionBox>

          {draft.payoutEnabled && (
            <SectionBox title="➕ Log Payout">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount ($)"><Input type="number" step={0.01} value={payoutAmount} onChange={v => setPayoutAmount(v)} placeholder="25.00" /></Field>
                <Field label="Notes"><Input value={payoutNotes} onChange={v => setPayoutNotes(v)} placeholder="Q2 payout" /></Field>
              </div>
              <button
                disabled={payoutAdding || !payoutAmount}
                onClick={handleAddPayout}
                className="self-start px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}
              >{payoutAdding ? 'Logging…' : '💸 Log Payout'}</button>
            </SectionBox>
          )}

          <SectionBox title="📋 Payout History">
            {cfg.payoutHistory.length === 0
              ? <p className="text-sm text-gray-600 text-center py-4">No payout records yet.</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr>{['Date','Amount','Method','Status','Notes'].map(h => <th key={h} className="text-left py-2 px-3 text-gray-600 font-semibold uppercase tracking-widest border-b border-white/5">{h}</th>)}</tr></thead>
                    <tbody>
                      {cfg.payoutHistory.map(p => (
                        <tr key={p.id} className="border-b border-white/5">
                          <td className="py-3 px-3 text-gray-400">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="py-3 px-3 text-white font-bold tabular-nums">${p.amount.toFixed(2)}</td>
                          <td className="py-3 px-3 text-gray-400 capitalize">{p.method}</td>
                          <td className="py-3 px-3"><Badge color={p.status === 'paid' ? '#22c55e' : p.status === 'failed' ? '#ef4444' : '#f59e0b'}>{p.status}</Badge></td>
                          <td className="py-3 px-3 text-gray-500">{p.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: REVENUE SHARE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'rev-share' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🤲 Revenue Sharing">
            <Toggle checked={draft.revenueShareEnabled} onChange={v => patch('revenueShareEnabled', v)} label="Enable revenue sharing" desc="Automatically split ad revenue among contributors." />
            {draft.revenueShareEnabled && (
              <>
                {(() => {
                  const total = draft.revenueShareRecipients.reduce((a, r) => a + r.percentage, 0)
                  return (
                    <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: total > 100 ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.07)', border: `1px solid ${total > 100 ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)'}` }}>
                      <span className="text-xs text-gray-400">Total allocated</span>
                      <span className={`text-lg font-bold tabular-nums ${total > 100 ? 'text-red-400' : 'text-green-400'}`}>{total}%</span>
                    </div>
                  )
                })()}
                <div className="flex flex-col gap-3">
                  {draft.revenueShareRecipients.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Field label="Name"><Input value={r.name} onChange={v => { const rs = [...draft.revenueShareRecipients]; rs[i] = { ...rs[i], name: v }; patch('revenueShareRecipients', rs) }} /></Field>
                        <Field label="Role"><Input value={r.role} onChange={v => { const rs = [...draft.revenueShareRecipients]; rs[i] = { ...rs[i], role: v }; patch('revenueShareRecipients', rs) }} placeholder="Admin, Dev…" /></Field>
                        <Field label="Share (%)"><Input type="number" min={0} max={100} value={r.percentage} onChange={v => { const rs = [...draft.revenueShareRecipients]; rs[i] = { ...rs[i], percentage: Number(v) }; patch('revenueShareRecipients', rs) }} /></Field>
                        <Field label="Payout Address"><Input value={r.payoutAddress} onChange={v => { const rs = [...draft.revenueShareRecipients]; rs[i] = { ...rs[i], payoutAddress: v }; patch('revenueShareRecipients', rs) }} placeholder="PayPal / wallet" /></Field>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-gray-600">Total: ${r.totalEarned.toFixed(2)}</span>
                        <button onClick={() => patch('revenueShareRecipients', draft.revenueShareRecipients.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (!newRecipient.name) return
                    patch('revenueShareRecipients', [...draft.revenueShareRecipients, { id: uid(), name: newRecipient.name!, role: newRecipient.role ?? '', percentage: newRecipient.percentage ?? 10, payoutAddress: newRecipient.payoutAddress ?? '', totalEarned: 0 }])
                    setNewRecipient({})
                  }}
                  className="text-xs font-semibold text-[#00BFFF] hover:text-white transition-colors py-2"
                >+ Add Recipient</button>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl" style={{ background: 'rgba(0,191,255,0.04)', border: '1px dashed rgba(0,191,255,0.2)' }}>
                  <Field label="Name"><Input value={newRecipient.name ?? ''} onChange={v => setNewRecipient(r => ({ ...r, name: v }))} /></Field>
                  <Field label="Role"><Input value={newRecipient.role ?? ''} onChange={v => setNewRecipient(r => ({ ...r, role: v }))} /></Field>
                  <Field label="Share (%)"><Input type="number" value={newRecipient.percentage ?? ''} onChange={v => setNewRecipient(r => ({ ...r, percentage: Number(v) }))} /></Field>
                  <Field label="Address"><Input value={newRecipient.payoutAddress ?? ''} onChange={v => setNewRecipient(r => ({ ...r, payoutAddress: v }))} /></Field>
                </div>
              </>
            )}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon="👁️" label="Impressions" value={cfg.stats.totalImpressions.toLocaleString()}  color="#00BFFF" />
            <StatCard icon="✅" label="Completions" value={cfg.stats.totalCompletions.toLocaleString()} sub={`${ctr}% rate`} color="#22c55e" />
            <StatCard icon="⏭️" label="Skips"        value={cfg.stats.totalSkips.toLocaleString()} sub={`${skipRate}% rate`} color="#f59e0b" />
          </div>

          <SectionBox title="📋 Funnel Breakdown">
            {[
              { label: 'Impressions (ad opened)',  value: cfg.stats.totalImpressions,  color: '#00BFFF' },
              { label: 'Completions (full watch)', value: cfg.stats.totalCompletions,  color: '#22c55e' },
              { label: 'Skips',                    value: cfg.stats.totalSkips,         color: '#f59e0b' },
            ].map(row => {
              const pct = cfg.stats.totalImpressions > 0 ? (row.value / cfg.stats.totalImpressions) * 100 : 0
              return (
                <div key={row.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">{row.label}</span><span style={{ color: row.color }} className="font-bold tabular-nums">{row.value.toLocaleString()} ({pct.toFixed(1)}%)</span></div>
                  <ProgressBar value={row.value} max={Math.max(1, cfg.stats.totalImpressions)} color={row.color} />
                </div>
              )
            })}
          </SectionBox>

          <SectionBox title="🌐 Per-Page Impressions">
            <div className="flex flex-col gap-2">
              {Object.entries(cfg.stats.pageImpressions ?? {}).length === 0 && <p className="text-sm text-gray-600 text-center py-2">No per-page data yet.</p>}
              {Object.entries(cfg.stats.pageImpressions ?? {}).sort((a, b) => b[1] - a[1]).map(([page, count]) => (
                <div key={page} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">{PAGE_LABELS[page] ?? page}</span><span className="text-white font-bold">{count.toLocaleString()}</span></div>
                  <ProgressBar value={count} max={Math.max(1, ...Object.values(cfg.stats.pageImpressions ?? {}))} color="#00BFFF" />
                </div>
              ))}
            </div>
          </SectionBox>

          <SectionBox title="🕐 Hourly Distribution (Impressions)">
            <div className="flex items-end gap-0.5 h-16">
              {(cfg.stats.hourlyImpressions ?? new Array(24).fill(0)).map((v, h) => {
                const maxH = Math.max(1, ...((cfg.stats.hourlyImpressions ?? []) as number[]))
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-sm" style={{ height: `${Math.max(2, (v / maxH) * 56)}px`, background: v > 0 ? 'rgba(0,191,255,0.6)' : 'rgba(255,255,255,0.04)' }} title={`Hour ${h}: ${v}`} />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-600"><span>0:00</span><span>12:00</span><span>23:00</span></div>
          </SectionBox>

          <SectionBox title="💰 Revenue Breakdown">
            {[
              { label: 'Estimated total earned',  value: `$${cfg.stats.estimatedRevenue.toFixed(6)}` },
              { label: 'Est. per impression',     value: `$${cfg.stats.totalImpressions > 0 ? (cfg.stats.estimatedRevenue / cfg.stats.totalImpressions).toFixed(6) : '0.000000'}` },
              { label: 'Active RPM',              value: `$${cfg.estimatedRpm.toFixed(2)}` },
              { label: 'Affiliate total earned',  value: `$${draft.affiliateLinks.reduce((a, l) => a + l.totalEarned, 0).toFixed(2)}` },
              { label: 'Sponsor deal value',      value: `$${draft.sponsors.reduce((a, s) => a + s.dealValue, 0).toFixed(2)}` },
              { label: 'Stats reset on',          value: cfg.stats.lastReset ? new Date(cfg.stats.lastReset).toLocaleDateString() : 'Never' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className="text-sm font-bold text-white tabular-nums">{row.value}</span>
              </div>
            ))}
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: NOTIFICATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'notifications' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🔔 Webhook Alerts">
            <Toggle checked={draft.webhookEnabled} onChange={v => patch('webhookEnabled', v)} label="Enable webhook notifications" desc="Sends a POST request to the URL below when events fire." />
            {draft.webhookEnabled && (
              <>
                <Field label="Webhook URL">
                  <Input value={draft.webhookUrl} onChange={v => patch('webhookUrl', v)} placeholder="https://hooks.yourapp.com/earnings" />
                </Field>
                <Field label="Events to Fire">
                  <div className="flex flex-wrap gap-2">
                    {['milestone', 'reset', 'daily-digest', 'payout', 'boost-start', 'boost-end'].map(ev => {
                      const active = draft.webhookEvents.includes(ev)
                      return (
                        <button key={ev} onClick={() => patch('webhookEvents', active ? draft.webhookEvents.filter(e => e !== ev) : [...draft.webhookEvents, ev])}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: active ? 'rgba(0,191,255,0.15)' : 'rgba(255,255,255,0.04)', color: active ? '#00BFFF' : 'rgba(255,255,255,0.3)', border: `1px solid ${active ? 'rgba(0,191,255,0.35)' : 'rgba(255,255,255,0.06)'}` }}
                        >{ev}</button>
                      )
                    })}
                  </div>
                </Field>
                <InfoBanner icon="📨" color="#00BFFF">
                  Webhook payload: <code className="text-[#00BFFF]">{`{"event":"milestone","value":50,"timestamp":"..."}`}</code>
                </InfoBanner>
              </>
            )}
          </SectionBox>

          <SectionBox title="💌 Email Digest">
            <Toggle checked={draft.dailyDigestEnabled} onChange={v => patch('dailyDigestEnabled', v)} label="Send daily revenue digest email" desc="Sends a summary every 24 hours." />
            {draft.dailyDigestEnabled && (
              <Field label="Digest Email Address">
                <Input value={draft.digestEmail} onChange={v => patch('digestEmail', v)} placeholder="admin@yoursite.com" type="email" />
              </Field>
            )}
          </SectionBox>

          <SectionBox title="🚨 Revenue Alerts">
            <Toggle checked={draft.revenueAlertEnabled} onChange={v => patch('revenueAlertEnabled', v)} label="Alert when revenue crosses a threshold" />
            {draft.revenueAlertEnabled && (
              <Field label="Alert Threshold ($)" desc="Fires once when cumulative revenue exceeds this amount.">
                <Input type="number" step={0.01} value={draft.revenueAlertThreshold} onChange={v => patch('revenueAlertThreshold', parseFloat(v) || 0)} placeholder="10.00" />
              </Field>
            )}
            <Toggle checked={draft.notifyOnMilestone} onChange={v => patch('notifyOnMilestone', v)} label="Notify when a milestone is reached" />
            <Toggle checked={draft.notifyOnReset} onChange={v => patch('notifyOnReset', v)} label="Notify when stats are reset" />
          </SectionBox>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ADVANCED
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'advanced' && (
        <div className="flex flex-col gap-5">
          <SectionBox title="🔧 Global Controls">
            <Toggle checked={draft.enabled} onChange={v => patch('enabled', v)} label="Global ad system enabled" desc="Master switch. When off, no ads are shown anywhere — renew button reverts to free mode." />
          </SectionBox>

          <SectionBox title="🔌 Integration Checklist">
            {[
              { label: 'AdSense script in <head>', done: draft.adProvider !== 'adsense' || !!draft.adsensePublisherId, note: 'Add <script> tag to src/routes/__root.tsx' },
              { label: 'Publisher ID configured',  done: draft.adProvider !== 'adsense' || !!draft.adsensePublisherId, note: 'Set in Ad Setup → Google AdSense' },
              { label: 'Ad Slot ID configured',    done: draft.adProvider !== 'adsense' || !!draft.adsenseSlotId,     note: 'Set in Ad Setup → Google AdSense' },
              { label: 'Renew mode serves ads',    done: draft.renewMode !== 'free' && draft.renewMode !== 'disabled', note: 'Set in Renew Button tab' },
              { label: 'Ad duration ≥ 5s',         done: draft.adDurationSeconds >= 5, note: 'Short durations may not count as valid impressions' },
              { label: 'Privacy policy URL set',   done: !!draft.privacyPolicyUrl, note: 'Required by most ad networks — set in Compliance tab' },
              { label: 'Compliance mode set',       done: draft.gdprEnabled || draft.ccpaEnabled || draft.coppaMode || true, note: 'Review Compliance tab for your audience' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
                <span className={`text-base mt-0.5 ${item.done ? 'text-green-400' : 'text-amber-400'}`}>{item.done ? '✅' : '⚠️'}</span>
                <div>
                  <p className={`text-sm font-medium ${item.done ? 'text-white' : 'text-amber-300'}`}>{item.label}</p>
                  {!item.done && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                </div>
              </div>
            ))}
          </SectionBox>

          <SectionBox title="📤 Export Data">
            <p className="text-xs text-gray-500">Download your full earnings config and stats as JSON for backup or external analysis.</p>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'earnings-export.json'; a.click()
              }}
              className="self-start px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >📥 Download JSON</button>
          </SectionBox>

          <SectionBox title="🗑️ Danger Zone" danger>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 border-b border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">Reset All Ad Statistics</p>
                  <p className="text-xs text-gray-500 mt-0.5">Zeroes impressions, completions, skips, and revenue. Cannot be undone.</p>
                </div>
                <button onClick={handleReset} disabled={resetting} className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                  {resetting ? 'Resetting…' : '🗑️ Reset Stats'}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 border-b border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">Reset A/B Test Statistics</p>
                  <p className="text-xs text-gray-500 mt-0.5">Clears variant A and B impression/completion/revenue counters.</p>
                </div>
                <button onClick={handleAbReset} disabled={abResetting} className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all">
                  {abResetting ? 'Resetting…' : '🔬 Reset A/B Stats'}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Reset All Affiliate Click Counts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Zeroes click counters on all affiliate links.</p>
                </div>
                <button onClick={() => {
                  if (!confirm('Reset all affiliate click counts?')) return
                  patch('affiliateLinks', draft.affiliateLinks.map(l => ({ ...l, clicks: 0, conversions: 0 })))
                }} className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                  🔗 Reset Clicks
                </button>
              </div>
            </div>
          </SectionBox>
        </div>
      )}

      {/* ── Floating save bar ─────────────────────────────────────────────────── */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{ background: '#0f1520', border: '1px solid rgba(0,191,255,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 24px rgba(0,191,255,0.1)' }}>
          <span className="text-xs text-gray-400">Unsaved changes</span>
          <button onClick={() => setDraft(cfg)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-white transition-colors">Discard</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)', boxShadow: '0 0 12px rgba(0,191,255,0.3)' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
