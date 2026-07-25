// ─── TierTaggerManager — Admin CMS for the Tier Tagger page ─────────────────

import { useState } from 'react'
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

type Tab = 'hero' | 'screenshots' | 'features' | 'steps' | 'download' | 'about'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hero',        label: 'Hero',        icon: '✨' },
  { id: 'screenshots', label: 'Screenshots', icon: '🖼️' },
  { id: 'features',    label: 'Features',    icon: '⚡' },
  { id: 'steps',       label: 'Steps',       icon: '📦' },
  { id: 'download',    label: 'Download CTA', icon: '⬇️' },
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

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-[#00BFFF] shadow-[0_0_8px_rgba(0,191,255,0.7)]" />
          <h2 className="font-['Space_Grotesk'] font-black text-white text-lg">Tier Tagger CMS</h2>
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
                ? 'bg-[#00BFFF]/12 border border-[#00BFFF]/25 text-[#00BFFF]'
                : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/3'
            }`}>
            <span>{t.icon}</span> {t.label}
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
