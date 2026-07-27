// ─── TierTaggerManager — Admin CMS for the Tier Tagger page ─────────────────

import { useState, useEffect } from 'react'
import {
  getTierTaggerConfig,
  saveTierTaggerConfig,
  DEFAULT_TIER_TAGGER,
  type TierTaggerConfig,
  type TierTaggerFeature,
  type TierTaggerStep,
} from '../../store/tierTaggerStore'
import { addLog } from '../../store/adminStore'

interface Props { admin: string }

type Tab = 'hero' | 'screenshots' | 'features' | 'steps' | 'download' | 'release' | 'about'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hero',        label: 'Hero',        icon: '✨' },
  { id: 'screenshots', label: 'Screenshots', icon: '🖼️' },
  { id: 'features',    label: 'Features',    icon: '⚡' },
  { id: 'steps',       label: 'Steps',       icon: '📦' },
  { id: 'download',    label: 'Download CTA', icon: '⬇️' },
  { id: 'release',     label: 'Release',     icon: '🚀' },
  { id: 'about',       label: 'About',       icon: '💙' },
]

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
  const colours = {
    success: 'bg-green-500/15 border-green-500/30 text-green-400',
    error:   'bg-red-500/15 border-red-500/30 text-red-400',
    info:    'bg-[#00BFFF]/10 border-[#00BFFF]/25 text-[#00BFFF]',
  }
  const icons = { success: '✓', error: '⚠', info: 'ℹ' }
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border flex items-center gap-2 ${colours[type]}`}>
      <span>{icons[type]}</span> {msg}
    </div>
  )
}

function Field({
  label, desc, value, onChange, placeholder, multiline, type = 'text',
}: {
  label: string; desc?: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; type?: string
}) {
  const cls = 'w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700'
  return (
    <div>
      <label className="block text-white text-sm font-semibold mb-1">{label}</label>
      {desc && <p className="text-gray-600 text-xs mb-2">{desc}</p>}
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className={cls + ' resize-none'} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={cls} />
      )}
    </div>
  )
}

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
      <div className="pb-1 border-b border-white/5">
        <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">{title}</h3>
        {desc && <p className="text-gray-600 text-xs mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between gap-4 group"
      type="button"
    >
      <div className="flex-1 text-left">
        <p className="text-white text-sm font-semibold">{label}</p>
        {desc && <p className="text-gray-600 text-xs mt-0.5">{desc}</p>}
      </div>
      <div
        className="relative shrink-0 w-11 h-6 rounded-full transition-all duration-200"
        style={{ background: on ? 'linear-gradient(135deg,#00BFFF,#0066FF)' : 'rgba(255,255,255,0.1)', boxShadow: on ? '0 0 16px rgba(0,191,255,0.35)' : 'none' }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
          style={{ left: on ? 22 : 2 }}
        />
      </div>
    </button>
  )
}

// ─── Mini countdown preview ───────────────────────────────────────────────────

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState(() =>
    targetIso ? Math.max(0, new Date(targetIso).getTime() - Date.now()) : 0,
  )
  useEffect(() => {
    if (!targetIso) { setRemaining(0); return }
    function tick() { setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now())) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])
  const t = Math.floor(remaining / 1000)
  return {
    days: Math.floor(t / 86400),
    hours: Math.floor((t % 86400) / 3600),
    minutes: Math.floor((t % 3600) / 60),
    seconds: t % 60,
    expired: remaining === 0,
  }
}

function MiniDigitBlock({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, '0')
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex items-center justify-center"
        style={{
          width: 52, height: 56,
          background: 'linear-gradient(160deg, rgba(0,191,255,0.1) 0%, rgba(0,0,0,0.5) 100%)',
          border: '1px solid rgba(0,191,255,0.22)',
          borderRadius: 10,
          boxShadow: '0 0 16px rgba(0,191,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <span className="font-['Space_Grotesk'] font-black tabular-nums text-xl text-white" style={{ textShadow: '0 0 14px rgba(0,191,255,0.5)' }}>
          {str}
        </span>
      </div>
      <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/25">{label}</span>
    </div>
  )
}

function CountdownPreview({ releaseDate, heading, subtext }: { releaseDate: string; heading: string; subtext: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(releaseDate)

  return (
    <div
      className="rounded-xl p-6 text-center space-y-4"
      style={{
        background: 'linear-gradient(135deg, #080D18 0%, #0D1525 50%, #080D18 100%)',
        border: '1px solid rgba(0,191,255,0.2)',
        boxShadow: '0 0 40px rgba(0,191,255,0.06)',
      }}
    >
      <p className="text-[9px] uppercase tracking-widest text-gray-600">Live Preview</p>

      {expired && releaseDate ? (
        <div className="text-amber-400 text-xs">Release date has passed — download button will show</div>
      ) : !releaseDate ? (
        <div className="text-gray-600 text-xs">Set a release date to see the countdown</div>
      ) : (
        <>
          {/* Lock badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(0,191,255,0.07)', border: '1px solid rgba(0,191,255,0.2)', color: '#00BFFF' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            {heading || 'Coming Soon'}
          </div>

          {/* Digits */}
          <div className="flex items-end justify-center gap-2">
            <MiniDigitBlock value={days}    label="Days" />
            <span className="text-[#00BFFF]/35 font-black text-lg pb-4">:</span>
            <MiniDigitBlock value={hours}   label="Hrs" />
            <span className="text-[#00BFFF]/35 font-black text-lg pb-4">:</span>
            <MiniDigitBlock value={minutes} label="Min" />
            <span className="text-[#00BFFF]/35 font-black text-lg pb-4">:</span>
            <MiniDigitBlock value={seconds} label="Sec" />
          </div>

          {/* Subtext */}
          {subtext && (
            <p className="text-white/30 text-[11px] max-w-xs mx-auto leading-relaxed">{subtext}</p>
          )}
          {releaseDate && (
            <p className="text-[10px] font-semibold" style={{ color: 'rgba(0,191,255,0.45)', letterSpacing: '0.1em' }}>
              {new Date(releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─── Feature card editor ──────────────────────────────────────────────────────

function FeatureEditor({
  features, onChange,
}: {
  features: TierTaggerFeature[]
  onChange: (f: TierTaggerFeature[]) => void
}) {
  function update(idx: number, key: keyof TierTaggerFeature, val: string) {
    const next = features.map((f, i) => i === idx ? { ...f, [key]: val } : f)
    onChange(next)
  }
  function remove(idx: number) { onChange(features.filter((_, i) => i !== idx)) }
  function add() {
    const id = `f-${Math.random().toString(36).slice(2, 7)}`
    onChange([...features, { id, icon: '✨', title: 'New Feature', desc: 'Describe this feature.' }])
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...features]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {features.map((f, i) => (
        <div key={f.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Feature {i + 1}</span>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white border border-white/8 hover:border-white/20 disabled:opacity-30 transition-all">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === features.length - 1}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white border border-white/8 hover:border-white/20 disabled:opacity-30 transition-all">↓</button>
              <button onClick={() => remove(i)}
                className="px-2 py-1 rounded text-xs text-red-400/70 hover:text-red-400 border border-white/8 hover:border-red-500/30 transition-all">✕</button>
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Icon</label>
              <input value={f.icon} onChange={e => update(i, 'icon', e.target.value)}
                className="w-full bg-white/3 border border-white/10 rounded-lg px-2 py-2 text-center text-lg outline-none focus:border-[#00BFFF]/40 transition-all" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Title</label>
              <input value={f.title} onChange={e => update(i, 'title', e.target.value)}
                className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all placeholder-gray-700"
                placeholder="Feature title" />
            </div>
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Description</label>
            <textarea value={f.desc} onChange={e => update(i, 'desc', e.target.value)} rows={2}
              className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00BFFF]/40 resize-none transition-all placeholder-gray-700"
              placeholder="Feature description" />
          </div>
        </div>
      ))}
      <button onClick={add}
        className="w-full py-2.5 rounded-xl text-xs text-[#00BFFF] border border-dashed border-[#00BFFF]/30 hover:border-[#00BFFF]/60 hover:bg-[#00BFFF]/5 transition-all">
        + Add Feature
      </button>
    </div>
  )
}

// ─── Step editor ──────────────────────────────────────────────────────────────

function StepEditor({
  steps, onChange,
}: {
  steps: TierTaggerStep[]
  onChange: (s: TierTaggerStep[]) => void
}) {
  function update(idx: number, key: keyof TierTaggerStep, val: string) {
    onChange(steps.map((s, i) => i === idx ? { ...s, [key]: val } : s))
  }
  function remove(idx: number) { onChange(steps.filter((_, i) => i !== idx)) }
  function add() {
    const id = `s-${Math.random().toString(36).slice(2, 7)}`
    const n = String(steps.length + 1).padStart(2, '0')
    onChange([...steps, { id, n, title: 'New Step', desc: 'Describe this step.' }])
  }
  function move(idx: number, dir: -1 | 1) {
    const next = [...steps]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Step {i + 1}</span>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white border border-white/8 hover:border-white/20 disabled:opacity-30 transition-all">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === steps.length - 1}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white border border-white/8 hover:border-white/20 disabled:opacity-30 transition-all">↓</button>
              <button onClick={() => remove(i)}
                className="px-2 py-1 rounded text-xs text-red-400/70 hover:text-red-400 border border-white/8 hover:border-red-500/30 transition-all">✕</button>
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Number</label>
              <input value={s.n} onChange={e => update(i, 'n', e.target.value)}
                className="w-full bg-white/3 border border-white/10 rounded-lg px-2 py-2 text-white text-sm text-center outline-none focus:border-[#00BFFF]/40 transition-all placeholder-gray-700"
                placeholder="01" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Title</label>
              <input value={s.title} onChange={e => update(i, 'title', e.target.value)}
                className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all placeholder-gray-700"
                placeholder="Step title" />
            </div>
          </div>
          <div>
            <label className="block text-gray-500 text-xs mb-1">Description</label>
            <textarea value={s.desc} onChange={e => update(i, 'desc', e.target.value)} rows={2}
              className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#00BFFF]/40 resize-none transition-all placeholder-gray-700"
              placeholder="Step description" />
          </div>
        </div>
      ))}
      <button onClick={add}
        className="w-full py-2.5 rounded-xl text-xs text-[#00BFFF] border border-dashed border-[#00BFFF]/30 hover:border-[#00BFFF]/60 hover:bg-[#00BFFF]/5 transition-all">
        + Add Step
      </button>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TierTaggerManager({ admin }: Props) {
  const [form, setForm] = useState<TierTaggerConfig>(getTierTaggerConfig)
  const [tab, setTab] = useState<Tab>('hero')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)

  function set<K extends keyof TierTaggerConfig>(key: K, val: TierTaggerConfig[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSave() {
    saveTierTaggerConfig(form)
    addLog(admin, 'tier-tagger:save', 'Updated Tier Tagger page content')
    showMsg('Tier Tagger page saved — changes appear on next load.')
  }

  function handleReset() {
    setForm({ ...DEFAULT_TIER_TAGGER })
    saveTierTaggerConfig({ ...DEFAULT_TIER_TAGGER })
    setResetConfirm(false)
    addLog(admin, 'tier-tagger:reset', 'Reset Tier Tagger to defaults')
    showMsg('Reset to defaults.', 'info')
  }


  /** Convert datetime-local string to ISO */
  function localToISO(local: string): string {
    if (!local) return ''
    return new Date(local).toISOString()
  }

  /** Convert ISO to datetime-local string for the input */
  function isoToLocal(iso: string): string {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const pad = (x: number) => String(x).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch { return '' }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-[#00BFFF] shadow-[0_0_8px_rgba(0,191,255,0.7)]" />
          <h2 className="font-['Space_Grotesk'] font-black text-white text-lg">Tier Tagger CMS</h2>
          {form.releaseCountdownEnabled && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Countdown Active
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {resetConfirm ? (
            <>
              <button onClick={() => setResetConfirm(false)}
                className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
                Cancel
              </button>
              <button onClick={handleReset}
                className="px-3 py-2 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                Confirm Reset
              </button>
            </>
          ) : (
            <button onClick={() => setResetConfirm(true)}
              className="px-3 py-2 rounded-lg text-xs text-gray-500 border border-white/8 hover:border-white/20 hover:text-gray-300 transition-all">
              Reset Defaults
            </button>
          )}
          <a href="/tier-tagger" target="_blank" rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-[#00BFFF]/30 hover:text-[#00BFFF] transition-all">
            ↗ Preview
          </a>
          <button onClick={handleSave}
            className="btn-primary px-5 py-2 rounded-lg text-sm font-semibold text-white">
            Save All
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? t.id === 'release'
                  ? 'bg-amber-500/12 border border-amber-500/25 text-amber-400'
                  : 'bg-[#00BFFF]/12 border border-[#00BFFF]/25 text-[#00BFFF]'
                : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/3'
            }`}>
            <span>{t.icon}</span> {t.label}
            {t.id === 'release' && form.releaseCountdownEnabled && tab !== 'release' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: HERO
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'hero' && (
        <Card title="Hero Section" desc="The top of the page — badge, title, subtitle, and buttons">
          <Field label="Badge Text" desc='Small pill label above the title (e.g. "Official Blue Tiers Mod")'
            value={form.badge} onChange={v => set('badge', v)} placeholder="Official Blue Tiers Mod" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Title Prefix" desc='White part of the title (e.g. "Blue Tier")'
              value={form.titlePrefix} onChange={v => set('titlePrefix', v)} placeholder="Blue Tier" />
            <Field label="Title Accent" desc='Gradient-coloured word (e.g. "Tagger")'
              value={form.titleAccent} onChange={v => set('titleAccent', v)} placeholder="Tagger" />
          </div>

          <Field label="Subtitle" desc="Short description below the title"
            value={form.subtitle} onChange={v => set('subtitle', v)} multiline
            placeholder="See every player's Blue Tiers rank directly above their nametag…" />

          <div className="pt-2 border-t border-white/5 space-y-4">
            <p className="text-white text-sm font-semibold">Primary Button (Download)</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Label" value={form.downloadLabel} onChange={v => set('downloadLabel', v)} placeholder="Download Now" />
              <Field label="URL" value={form.downloadUrl} onChange={v => set('downloadUrl', v)} type="url" placeholder="https://modrinth.com/..." />
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 space-y-4">
            <p className="text-white text-sm font-semibold">Secondary Button</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Label" value={form.secondaryLabel} onChange={v => set('secondaryLabel', v)} placeholder="View Rankings" />
              <Field label="URL" value={form.secondaryUrl} onChange={v => set('secondaryUrl', v)} placeholder="/rankings" />
            </div>
          </div>

          {/* Live hero preview */}
          <div className="mt-2 p-5 rounded-xl bg-gradient-to-b from-[#070b12] to-[#09152a] border border-white/5 text-center">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-4">Hero Preview</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5 text-[#00BFFF] text-[10px] font-semibold mb-3 uppercase tracking-wide">
              <span className="w-1 h-1 rounded-full bg-[#00BFFF]" />
              {form.badge || 'Badge'}
            </div>
            <div className="font-black text-2xl text-white mb-2">
              {form.titlePrefix || 'Blue Tier'}{' '}
              <span style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {form.titleAccent || 'Tagger'}
              </span>
            </div>
            <p className="text-gray-500 text-xs max-w-xs mx-auto mb-4">{form.subtitle}</p>
            <div className="flex gap-2 justify-center">
              <span className="px-4 py-1.5 rounded-lg text-xs text-white font-semibold" style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)' }}>{form.downloadLabel}</span>
              <span className="px-4 py-1.5 rounded-lg text-xs text-white/60 border border-white/15">{form.secondaryLabel}</span>
            </div>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: SCREENSHOTS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'screenshots' && (
        <div className="space-y-4">
          <Card title="Nametag Screenshot" desc="Left showcase image — shows the tier label above a player nametag">
            <Field label="Image URL" desc="Path to image (e.g. /tagger-nametag.png) or full external URL"
              value={form.nametagImageUrl} onChange={v => set('nametagImageUrl', v)} placeholder="/tagger-nametag.png" />
            {form.nametagImageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/8">
                <img src={form.nametagImageUrl} alt="nametag preview" className="w-full object-cover max-h-40"
                  onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Caption" value={form.nametagCaption} onChange={v => set('nametagCaption', v)} placeholder="Tier above nametag" />
              <Field label="Sub-caption" value={form.nametagSubcaption} onChange={v => set('nametagSubcaption', v)} placeholder="Visible on any multiplayer server" />
            </div>
          </Card>

          <Card title="Player Profile Screenshot" desc="Right showcase image — shows the in-game player profile UI">
            <Field label="Image URL" desc="Path to image (e.g. /tagger-profile.webp) or full external URL"
              value={form.profileImageUrl} onChange={v => set('profileImageUrl', v)} placeholder="/tagger-profile.webp" />
            {form.profileImageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/8">
                <img src={form.profileImageUrl} alt="profile preview" className="w-full object-cover max-h-40"
                  onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Caption" value={form.profileCaption} onChange={v => set('profileCaption', v)} placeholder="In-game player profile" />
              <Field label="Sub-caption" value={form.profileSubcaption} onChange={v => set('profileSubcaption', v)} placeholder="Full tier breakdown per gamemode" />
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: FEATURES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'features' && (
        <Card title="Features Section" desc="The grid of feature cards displayed below the screenshots">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Section Eyebrow" desc="Small uppercase label above the heading"
              value={form.featuresEyebrow} onChange={v => set('featuresEyebrow', v)} placeholder="What's Included" />
            <Field label="Section Heading"
              value={form.featuresHeading} onChange={v => set('featuresHeading', v)} placeholder="Everything You Need" />
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-white text-sm font-semibold mb-3">Feature Cards</p>
            <FeatureEditor features={form.features} onChange={v => set('features', v)} />
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: STEPS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'steps' && (
        <Card title="Installation Steps" desc="The numbered step-by-step installation guide">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Section Eyebrow"
              value={form.stepsEyebrow} onChange={v => set('stepsEyebrow', v)} placeholder="Setup" />
            <Field label="Section Heading"
              value={form.stepsHeading} onChange={v => set('stepsHeading', v)} placeholder="Up in 3 Steps" />
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-white text-sm font-semibold mb-3">Steps</p>
            <StepEditor steps={form.steps} onChange={v => set('steps', v)} />
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DOWNLOAD CTA
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'download' && (
        <Card title="Download CTA Section" desc="The big call-to-action box with the main download button">
          <Field label="Heading"
            value={form.ctaHeading} onChange={v => set('ctaHeading', v)} placeholder="Ready to Install?" />
          <Field label="Body Text" multiline
            value={form.ctaBody} onChange={v => set('ctaBody', v)}
            placeholder="Download Blue Tier Tagger and start seeing every player's rank in-game." />
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <Field label="Button Label"
              value={form.ctaButtonLabel} onChange={v => set('ctaButtonLabel', v)} placeholder="Download Blue Tier Tagger" />
            <Field label="Button URL" type="url"
              value={form.ctaButtonUrl} onChange={v => set('ctaButtonUrl', v)} placeholder="https://modrinth.com/..." />
          </div>
          <Field label="Footer Note" desc='Small print below the button (e.g. "Free forever · Fabric mod · Client-side only")'
            value={form.ctaNote} onChange={v => set('ctaNote', v)} placeholder="Free forever · Fabric mod · Client-side only" />

          {/* CTA preview */}
          <div className="rounded-xl border border-[#00BFFF]/15 bg-gradient-to-b from-[#080D18] to-[#0D1525] p-6 text-center">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-3">CTA Preview</p>
            <div className="text-3xl mb-3">📦</div>
            <div className="text-white font-black text-lg mb-2">{form.ctaHeading}</div>
            <p className="text-white/35 text-xs max-w-xs mx-auto mb-4">{form.ctaBody}</p>
            <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#00BFFF,#0066FF)' }}>
              ⬇ {form.ctaButtonLabel}
            </span>
            <p className="text-white/20 text-[10px] mt-3">{form.ctaNote}</p>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: RELEASE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'release' && (
        <div className="space-y-4">

          {/* Master toggle card */}
          <div
            className="glass rounded-2xl border p-6 space-y-5 transition-all"
            style={{ borderColor: form.releaseCountdownEnabled ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)' }}
          >
            <div className="pb-1 border-b border-white/5 flex items-center gap-3">
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Release Countdown</h3>
              {form.releaseCountdownEnabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400">
                  <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                  Active
                </span>
              )}
            </div>

            <Toggle
              on={form.releaseCountdownEnabled}
              onChange={v => set('releaseCountdownEnabled', v)}
              label="Show countdown instead of download buttons"
              desc="When enabled, both download buttons on the public page are replaced with a live countdown timer. When the timer reaches zero, download buttons appear automatically."
            />

            {/* Release date picker */}
            <div className="space-y-2">
              <label className="block text-white text-sm font-semibold">Release Date & Time</label>
              <p className="text-gray-600 text-xs">The exact moment the download goes live. The countdown counts to this date.</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="datetime-local"
                  value={isoToLocal(form.releaseDate)}
                  onChange={e => set('releaseDate', localToISO(e.target.value))}
                  className="flex-1 min-w-0 bg-white/3 border border-white/10 hover:border-white/20 focus:border-amber-500/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Quick-set buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <p className="w-full text-[10px] uppercase tracking-widest text-gray-600 font-medium">Quick set</p>
                {[
                  { label: '24 hours', days: 1 / 24 * 24 },
                  { label: '3 days',   days: 3 },
                  { label: '7 days',   days: 7 },
                  { label: '14 days',  days: 14 },
                  { label: '30 days',  days: 30 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => set('releaseDate', new Date(Date.now() + days * 86400_000).toISOString())}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-gray-400 hover:border-amber-500/35 hover:text-amber-400 hover:bg-amber-500/5 transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Countdown text content */}
          <Card title="Countdown Copy" desc="Text shown on the public page while the countdown is active">
            <Field
              label="Countdown Heading"
              desc='Short label shown in the lock badge (e.g. "Coming Soon")'
              value={form.countdownHeading}
              onChange={v => set('countdownHeading', v)}
              placeholder="Coming Soon"
            />
            <Field
              label="Teaser Text"
              desc="One sentence shown below the countdown digits"
              value={form.countdownSubtext}
              onChange={v => set('countdownSubtext', v)}
              multiline
              placeholder="Blue Tier Tagger is almost here. Stay tuned."
            />
          </Card>

          {/* Live preview */}
          <CountdownPreview
            releaseDate={form.releaseDate}
            heading={form.countdownHeading}
            subtext={form.countdownSubtext}
          />

          {/* Status summary */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">Current status</p>
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${form.releaseCountdownEnabled ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
              <span className="text-sm font-semibold text-white">
                {form.releaseCountdownEnabled
                  ? form.releaseDate
                    ? `Countdown active · releasing ${new Date(form.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : 'Countdown enabled but no date set — set a release date above'
                  : 'Download buttons visible · countdown off'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ABOUT
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'about' && (
        <Card title="About Blue Tiers Section" desc="The bottom card with a description of the Blue Tiers platform">
          <Field label="Title"
            value={form.aboutTitle} onChange={v => set('aboutTitle', v)} placeholder="About Blue Tiers" />
          <Field label="Body Text" multiline
            value={form.aboutBody} onChange={v => set('aboutBody', v)}
            placeholder="Blue Tiers is a competitive Minecraft PvP ranking platform…" />
          <Field label="Credit Line" desc='Small text at the bottom (e.g. "Made with 💙 by Blue Network")'
            value={form.aboutCredit} onChange={v => set('aboutCredit', v)} placeholder="Made with 💙 by Blue Network" />

          {/* About preview */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5 flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.2)' }}>💙</div>
            <div>
              <div className="text-white font-bold text-sm mb-1">{form.aboutTitle}</div>
              <p className="text-white/35 text-xs leading-relaxed">{form.aboutBody}</p>
              <p className="text-white/20 text-[10px] mt-2">{form.aboutCredit}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Bottom save bar ─────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <button onClick={handleSave}
          className="btn-primary px-8 py-2.5 rounded-xl text-sm font-semibold text-white">
          Save All Changes
        </button>
      </div>
    </div>
  )
}
