// ─── HomepageManager.tsx — Enterprise CMS for the Blue Tiers landing page ─────
// Every visible element, section, style, animation, and meta tag is editable here.

import { useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowLeftRight, ArrowUp, BarChart3, Copy, Eye, GripVertical, History, Image, LayoutDashboard,
  List, Palette, Quote, Search, Server, Shapes, Sparkles, MessagesSquare, Monitor, Smartphone, Tablet,
  Trash2, Plus, Undo2, X, AlertTriangle, Check, LayoutTemplate, Wand2,
} from 'lucide-react'
import { AnnouncementBanner, EventBanner, isAnnouncementLive } from '../HomepageBanners'
import { addLog } from '../../store/adminStore'
import {
  getHomepageConfig,
  getHomepageHistory,
  homepageConfigFromJSON,
  homepageConfigToJSON,
  pushHomepageHistory,
  resetHomepageConfig,
  saveHomepageConfig,
  type AnnouncementConfig,
  type AnnouncementStyle,
  type CtaButton,
  type EventConfig,
  type EventStyle,
  type FeatureItemConfig,
  type FooterColumn,
  type HomepageConfig,
  type NavLinkConfig,
  type StatCardConfig,
} from '../../store/homepageStore'

interface Props { admin: string }

type TabId = 'dashboard' | 'layout' | 'hero' | 'theme' | 'stats' | 'features' | 'quote' | 'navigation' | 'footer' | 'announcements' | 'media' | 'seo' | 'preview' | 'history'


const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'layout', label: 'Layout', icon: <List className="h-4 w-4" /> },
  { id: 'hero', label: 'Hero', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'theme', label: 'Theme', icon: <Palette className="h-4 w-4" /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'features', label: 'Features', icon: <Shapes className="h-4 w-4" /> },
  { id: 'quote', label: 'Quote', icon: <Quote className="h-4 w-4" /> },
  { id: 'navigation', label: 'Navigation', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: 'footer', label: 'Footer', icon: <Server className="h-4 w-4" /> },
  { id: 'announcements', label: 'Announcements', icon: <MessagesSquare className="h-4 w-4" /> },
  { id: 'media', label: 'Media', icon: <Image className="h-4 w-4" /> },
  { id: 'seo', label: 'SEO', icon: <Search className="h-4 w-4" /> },
  { id: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" /> },
  { id: 'history', label: 'History & Publish', icon: <History className="h-4 w-4" /> },
]

const ICONS = ['BarChart2', 'Trophy', 'Pickaxe', 'ArrowLeftRight', 'ShoppingBag', 'Search', 'Home', 'User', 'Star', 'Zap', 'Shield', 'Swords', 'Target', 'Globe', 'MessageCircle', 'Youtube', 'Twitter', 'Github', 'Twitch', 'Discord', 'Mail', 'Settings']

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }
function id(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}` }
function formatDate(iso?: string | null) { return iso ? new Date(iso).toLocaleString() : '—' }
function downloadJson(name: string, payload: string) {
  const blob = new Blob([payload], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── Reusable UI primitives ───────────────────────────────────────────────────

function SectionCard({ title, desc, children, action }: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-['Space_Grotesk'] text-white font-bold">{title}</h3>
          {desc && <p className="text-xs text-gray-500 mt-1">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, desc, value, onChange, type = 'text', placeholder, rows, maxLength, monospace }: {
  label: string; desc?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; rows?: number; maxLength?: number; monospace?: boolean
}) {
  const cls = `w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00BFFF]/40 transition-all placeholder-gray-600 ${monospace ? 'font-mono' : ''}`
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-gray-400 flex justify-between"><span>{label}{desc && <span className="text-gray-600 ml-1">— {desc}</span>}</span>{maxLength && <span className={`${value.length > maxLength * 0.9 ? 'text-orange-400' : 'text-gray-600'}`}>{value.length}/{maxLength}</span>}</span>
      {rows ? (
        <textarea value={value} rows={rows} placeholder={placeholder} maxLength={maxLength} onChange={e => onChange(e.target.value)} className={cls + ' resize-none'} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} maxLength={maxLength} onChange={e => onChange(e.target.value)} className={cls} />
      )}
    </label>
  )
}

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-gray-400">{label}</span>
      <input type="number" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00BFFF]/40" />
    </label>
  )
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`flex items-start justify-between gap-4 w-full rounded-xl border px-4 py-3 text-left transition-all ${checked ? 'bg-[#00BFFF]/10 border-[#00BFFF]/25' : 'bg-white/5 border-white/10'}`}>
      <div>
        <div className="text-sm text-white">{label}</div>
        {desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}
      </div>
      <span className={`shrink-0 mt-0.5 w-9 h-5 rounded-full border relative transition-all ${checked ? 'bg-[#00BFFF]/30 border-[#00BFFF]/40' : 'bg-white/10 border-white/20'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${checked ? 'left-[18px] bg-[#00BFFF]' : 'left-0.5 bg-gray-500'}`} />
      </span>
    </button>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-gray-400">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#00BFFF]/40">
        {options.map(o => <option key={o} value={o} className="bg-[#0B0F17]">{o}</option>)}
      </select>
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-xl bg-transparent border border-white/10 cursor-pointer" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-[#00BFFF]/40" />
      </div>
    </label>
  )
}

function Slider({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-gray-400 flex justify-between"><span>{label}</span><span className="text-white font-mono">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[#00BFFF]" />
    </label>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-sm text-white font-semibold mt-1">{value}</div>
    </div>
  )
}

function arrayMove<T>(arr: T[], from: number, to: number) {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

const ANNOUNCEMENT_PRESETS: Array<{ value: AnnouncementStyle; label: string; description: string; className: string }> = [
  { value: 'ribbon', label: 'Ribbon', description: 'Balanced icon, copy, and action', className: 'bg-[#00BFFF]/15 border-[#00BFFF]/40' },
  { value: 'minimal', label: 'Minimal', description: 'Quiet inline notice', className: 'bg-white/8 border-white/20' },
  { value: 'ticker', label: 'Live ticker', description: 'Compact high-signal alert', className: 'bg-green-500/15 border-green-400/35' },
  { value: 'spotlight', label: 'Spotlight', description: 'Editorial card with hierarchy', className: 'bg-purple-500/15 border-purple-400/35' },
  { value: 'gradient', label: 'Gradient CTA', description: 'Bold attention-grabbing strip', className: 'bg-orange-500/15 border-orange-400/35' },
]

const EVENT_PRESETS: Array<{ value: EventStyle; label: string; description: string; className: string }> = [
  { value: 'mega', label: 'Mega feature', description: 'Hero-sized event takeover', className: 'bg-[#00BFFF]/15 border-[#00BFFF]/40' },
  { value: 'minimal', label: 'Clean bar', description: 'Compact event callout', className: 'bg-white/8 border-white/20' },
  { value: 'split', label: 'Split spotlight', description: 'Story and countdown split', className: 'bg-purple-500/15 border-purple-400/35' },
  { value: 'countdown', label: 'Countdown stage', description: 'Time is the main message', className: 'bg-orange-500/15 border-orange-400/35' },
  { value: 'neon', label: 'Arena neon', description: 'High-energy competitive mode', className: 'bg-green-500/15 border-green-400/35' },
]

function PresetPicker<T extends string>({ title, presets, value, onChange }: { title: string; presets: Array<{ value: T; label: string; description: string; className: string }>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        <span className="text-[10px] text-gray-600">Click to apply</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {presets.map(preset => (
          <button key={preset.value} type="button" onClick={() => onChange(preset.value)} className={`rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 ${value === preset.value ? `${preset.className} ring-1 ring-white/30` : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-white"><LayoutTemplate className="h-3.5 w-3.5 text-[#00BFFF]" />{preset.label}</div>
            <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl glass rounded-2xl border border-white/10 p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-['Space_Grotesk'] font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Tab panels ─────────────────────────────────────────────────────────────────

function DashboardTab({ form, onSave, onReset, onPreview, onExport }: { form: HomepageConfig; onSave: () => void; onReset: () => void; onPreview: () => void; onExport: () => void }) {
  const enabledSections = ['hero', 'stats', 'features', 'quote', 'footer', 'event'].filter(k => (form as any)[k]?.enabled).length
  const activeAnnouncements = form.announcements.filter(a => a.enabled).length
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SectionCard title="Publication Status" desc="Current homepage state at a glance.">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Status" value={form.published ? 'Published' : 'Draft'} />
          <Stat label="Version" value={`v${form.version}`} />
          <Stat label="Last edited" value={formatDate(form.lastEditedAt)} />
          <Stat label="By" value={form.lastEditedBy || '—'} />
          <Stat label="Sections" value={`${enabledSections} enabled`} />
          <Stat label="Announcements" value={`${activeAnnouncements} active`} />
        </div>
      </SectionCard>
      <SectionCard title="Quick Actions" desc="Save, reset, preview, and export.">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onSave} className="btn-primary rounded-xl px-4 py-3 text-sm font-semibold">Save</button>
          <button onClick={onReset} className="rounded-xl px-4 py-3 text-sm font-semibold border border-white/10 bg-white/5 text-white hover:border-red-500/30 hover:text-red-400 transition-all">Reset</button>
          <button onClick={onPreview} className="rounded-xl px-4 py-3 text-sm font-semibold border border-white/10 bg-white/5 text-white transition-all">Preview</button>
          <button onClick={onExport} className="rounded-xl px-4 py-3 text-sm font-semibold border border-white/10 bg-white/5 text-white transition-all">Export</button>
        </div>
      </SectionCard>
      <SectionCard title="CMS Guide" desc="Tips for managing the homepage.">
        <ul className="text-sm text-gray-400 space-y-2 leading-relaxed">
          <li>• Use <strong className="text-white">Layout</strong> to reorder or hide sections.</li>
          <li>• <strong className="text-white">Theme</strong> controls brand colors, particles, and fonts.</li>
          <li>• Changes are local until you hit <strong className="text-[#00BFFF]">Save</strong>.</li>
          <li>• Use <strong className="text-white">History</strong> to restore or publish later.</li>
        </ul>
      </SectionCard>
    </div>
  )
}

function LayoutTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const spacingY = { compact: 'py-10', normal: 'py-16', loose: 'py-24' }[form.layout.sectionSpacing]
  const paddingX = { sm: 'px-4', md: 'px-6', lg: 'px-8' }[form.layout.containerPadding]
  return (
    <div className="space-y-4">
      <SectionCard title="Section Order" desc="Reorder homepage blocks. Hidden sections are still ordered but skipped on render.">
        <div className="space-y-2">
          {form.layout.sectionOrder.map((s, i) => {
            const sectionEnabled = s === 'announcements' ? form.announcements.some(a => a.enabled) : (form as any)[s]?.enabled ?? true
            return (
              <div key={s} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${sectionEnabled ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02]'}`}>
                <GripVertical className="h-4 w-4 text-gray-500" />
                <span className={`flex-1 text-sm capitalize ${sectionEnabled ? 'text-white' : 'text-gray-600'}`}>{s}</span>
                <button onClick={() => setForm(p => ({ ...p, layout: { ...p.layout, sectionOrder: arrayMove(p.layout.sectionOrder, i, Math.max(0, i - 1)) } }))} className="p-1 rounded hover:bg-white/10"><ArrowUp className="h-4 w-4 text-gray-400" /></button>
                <button onClick={() => setForm(p => ({ ...p, layout: { ...p.layout, sectionOrder: arrayMove(p.layout.sectionOrder, i, Math.min(p.layout.sectionOrder.length - 1, i + 1)) } }))} className="p-1 rounded hover:bg-white/10"><ArrowDown className="h-4 w-4 text-gray-400" /></button>
              </div>
            )
          })}
        </div>
      </SectionCard>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Field label="Container max width" value={form.layout.maxWidth} onChange={v => setForm(p => ({ ...p, layout: { ...p.layout, maxWidth: v } }))} />
        <Select label="Section spacing" value={form.layout.sectionSpacing} onChange={v => setForm(p => ({ ...p, layout: { ...p.layout, sectionSpacing: v as any } }))} options={['compact', 'normal', 'loose']} />
        <Select label="Container padding" value={form.layout.containerPadding} onChange={v => setForm(p => ({ ...p, layout: { ...p.layout, containerPadding: v as any } }))} options={['sm', 'md', 'lg']} />
        <Toggle label="Fixed navbar" checked={form.layout.navbarFixed} onChange={v => setForm(p => ({ ...p, layout: { ...p.layout, navbarFixed: v } }))} />
        <Toggle label="Scroll hint" desc="Animated mouse indicator at the bottom of the hero." checked={form.layout.showScrollHint} onChange={v => setForm(p => ({ ...p, layout: { ...p.layout, showScrollHint: v } }))} />
      </div>
      <SectionCard title="Preview classes" desc="Tailwind classes applied from your current layout choices.">
        <code className="text-xs font-mono text-[#00BFFF] bg-white/5 rounded-lg px-3 py-2 block">{`${spacingY} ${paddingX} max-w-[${form.layout.maxWidth}]`}</code>
      </SectionCard>
    </div>
  )
}

function HeroTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const updateCta = (key: 'primaryCta' | 'secondaryCta', patch: Partial<CtaButton>) => setForm(p => ({ ...p, hero: { ...p.hero, [key]: { ...p.hero[key], ...patch } } }))
  return (
    <div className="space-y-4">
      <SectionCard title="Hero visibility" action={<span className={`text-xs font-bold px-2 py-1 rounded-full border ${form.hero.enabled ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>{form.hero.enabled ? 'Visible' : 'Hidden'}</span>}>
        <Toggle label="Show hero section" checked={form.hero.enabled} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, enabled: v } }))} />
      </SectionCard>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Title line 1" value={form.hero.title} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, title: v } }))} maxLength={30} />
        <Field label="Title line 2 (accent)" value={form.hero.titleAccent} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, titleAccent: v } }))} maxLength={30} />
      </div>
      <Field label="Subtitle" value={form.hero.subtitle} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, subtitle: v } }))} maxLength={120} />
      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard title="Primary CTA" desc="Main hero button.">
          <div className="space-y-3">
            <Field label="Text" value={form.hero.primaryCta.text} onChange={v => updateCta('primaryCta', { text: v })} />
            <Field label="Link" value={form.hero.primaryCta.link} onChange={v => updateCta('primaryCta', { link: v })} />
            <Select label="Style" value={form.hero.primaryCta.style} onChange={v => updateCta('primaryCta', { style: v as any })} options={['primary', 'discord', 'outline', 'ghost']} />
            <Toggle label="External link" checked={form.hero.primaryCta.external} onChange={v => updateCta('primaryCta', { external: v })} />
          </div>
        </SectionCard>
        <SectionCard title="Secondary CTA" desc="Secondary hero button.">
          <div className="space-y-3">
            <Field label="Text" value={form.hero.secondaryCta.text} onChange={v => updateCta('secondaryCta', { text: v })} />
            <Field label="Link" value={form.hero.secondaryCta.link} onChange={v => updateCta('secondaryCta', { link: v })} />
            <Select label="Style" value={form.hero.secondaryCta.style} onChange={v => updateCta('secondaryCta', { style: v as any })} options={['primary', 'discord', 'outline', 'ghost']} />
            <Toggle label="External link" checked={form.hero.secondaryCta.external} onChange={v => updateCta('secondaryCta', { external: v })} />
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Server IP" desc="Copy-to-clipboard address shown below the CTAs.">
        <div className="grid md:grid-cols-2 gap-4">
          <Toggle label="Show server IP" checked={form.hero.showServerIP} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, showServerIP: v } }))} />
          <Field label="Server IP" value={form.hero.serverIP} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, serverIP: v } }))} monospace />
          <Field label="Copy label" value={form.hero.ipCopyLabel} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, ipCopyLabel: v } }))} />
          <Field label="Copied label" value={form.hero.ipCopiedLabel} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, ipCopiedLabel: v } }))} />
        </div>
      </SectionCard>
      <div className="grid md:grid-cols-3 gap-4">
        <Select label="Alignment" value={form.hero.align} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, align: v as any } }))} options={['left', 'center', 'right']} />
        <Select label="Min height" value={form.hero.minHeight} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, minHeight: v as any } }))} options={['auto', 'screen', '80', '96']} />
        <Select label="Title size" value={form.hero.titleSize} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, titleSize: v as any } }))} options={['sm', 'md', 'lg', 'xl']} />
        <Select label="Entrance animation" value={form.hero.animation} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, animation: v as any } }))} options={['fade-up', 'scale', 'none']} />
      </div>
      <SectionCard title="Live ticker" desc="Rotating activity banner at the top of the hero.">
        <div className="grid md:grid-cols-3 gap-4">
          <Toggle label="Show live ticker" checked={form.hero.liveTickerEnabled} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, liveTickerEnabled: v } }))} />
          <Field label="Ticker label" value={form.hero.liveTickerLabel} onChange={v => setForm(p => ({ ...p, hero: { ...p.hero, liveTickerLabel: v } }))} />
        </div>
      </SectionCard>
    </div>
  )
}

function ThemeTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Brand colours" desc="Primary palette used across buttons, text gradients, and accents.">
        <div className="grid md:grid-cols-3 gap-4">
          <ColorField label="Brand primary" value={form.theme.brandPrimary} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, brandPrimary: v } }))} />
          <ColorField label="Brand secondary" value={form.theme.brandSecondary} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, brandSecondary: v } }))} />
          <ColorField label="Brand accent" value={form.theme.brandAccent} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, brandAccent: v } }))} />
        </div>
      </SectionCard>
      <SectionCard title="Background" desc="Page surface and backdrop settings.">
        <div className="grid md:grid-cols-3 gap-4">
          <ColorField label="Primary background" value={form.theme.bgPrimary} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, bgPrimary: v } }))} />
          <ColorField label="Secondary background" value={form.theme.bgSecondary} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, bgSecondary: v } }))} />
          <ColorField label="Surface cards" value={form.theme.surface} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, surface: v } }))} />
          <Select label="Background style" value={form.theme.backgroundStyle} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, backgroundStyle: v as any } }))} options={['gradient', 'particles', 'image']} />
          <Field label="Background image URL" value={form.theme.backgroundImage} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, backgroundImage: v } }))} />
          <Field label="Overlay colour" value={form.theme.backgroundOverlay} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, backgroundOverlay: v } }))} />
        </div>
      </SectionCard>
      <SectionCard title="Typography & surfaces" desc="Fonts, glass, and rounding.">
        <div className="grid md:grid-cols-3 gap-4">
          <Select label="Heading font" value={form.theme.fontHeading} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, fontHeading: v } }))} options={['Space Grotesk', 'Inter', 'Outfit', 'Arial', 'Georgia']} />
          <Select label="Body font" value={form.theme.fontBody} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, fontBody: v } }))} options={['Inter', 'Space Grotesk', 'Outfit', 'Arial', 'Georgia']} />
          <Select label="Border radius" value={form.theme.borderRadius} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, borderRadius: v as any } }))} options={['sm', 'md', 'lg', 'xl', '2xl']} />
          <Slider label="Glass opacity" value={form.theme.glassOpacity} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, glassOpacity: v } }))} min={0} max={0.2} step={0.01} />
        </div>
      </SectionCard>
      <SectionCard title="Gradients & effects" desc="CSS values for the hero gradient and text gradient. Preview shown below.">
        <div className="space-y-3">
          <Field label="Hero gradient CSS" value={form.theme.heroGradient} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, heroGradient: v } }))} />
          <Field label="Text gradient CSS" value={form.theme.textGradient} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, textGradient: v } }))} />
          <div className="h-16 rounded-xl" style={{ background: form.theme.heroGradient }} />
          <div className="text-2xl font-black" style={{ background: form.theme.textGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Hero Text Gradient</div>
        </div>
      </SectionCard>
      <SectionCard title="Particles" desc="Ambient background particle effects.">
        <div className="grid md:grid-cols-3 gap-4">
          <ColorField label="Particle colour" value={form.theme.particleColor} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, particleColor: v } }))} />
          <NumberField label="Particle count" value={form.theme.particleCount} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, particleCount: v } }))} min={0} max={300} step={10} />
          <Slider label="Particle speed" value={form.theme.particleSpeed} onChange={v => setForm(p => ({ ...p, theme: { ...p.theme, particleSpeed: v } }))} min={0.1} max={5} step={0.1} />
        </div>
      </SectionCard>
    </div>
  )
}

function StatsTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const updateCard = (idx: number, patch: Partial<StatCardConfig>) => setForm(p => {
    const cards = [...p.stats.cards]
    cards[idx] = { ...cards[idx], ...patch }
    return { ...p, stats: { ...p.stats, cards } }
  })
  const removeCard = (idx: number) => setForm(p => ({ ...p, stats: { ...p.stats, cards: p.stats.cards.filter((_, i) => i !== idx) } }))
  const addCard = () => setForm(p => ({ ...p, stats: { ...p.stats, cards: [...p.stats.cards, { id: id('stat'), label: 'New Stat', value: 0, source: 'manual', suffix: '', accent: false, icon: '📊', visible: true }] } }))
  return (
    <div className="space-y-4">
      <SectionCard title="Stats section" desc="Three animated stat cards. Values can be automatic or manual." action={<Toggle label="Enabled" checked={form.stats.enabled} onChange={v => setForm(p => ({ ...p, stats: { ...p.stats, enabled: v } }))} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Section title (optional)" value={form.stats.title} onChange={v => setForm(p => ({ ...p, stats: { ...p.stats, title: v } }))} />
          <Field label="Section subtitle (optional)" value={form.stats.subtitle} onChange={v => setForm(p => ({ ...p, stats: { ...p.stats, subtitle: v } }))} />
        </div>
      </SectionCard>
      <div className="space-y-3">
        {form.stats.cards.map((card, idx) => (
          <SectionCard key={card.id} title={`Stat ${idx + 1}: ${card.label || 'Untitled'}`} action={<button onClick={() => removeCard(idx)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>}>
            <div className="grid md:grid-cols-4 gap-3">
              <Field label="Label" value={card.label} onChange={v => updateCard(idx, { label: v })} />
              <Field label="Icon emoji" value={card.icon} onChange={v => updateCard(idx, { icon: v })} />
              <Select label="Value source" value={card.source} onChange={v => updateCard(idx, { source: v as any })} options={['players', 'tests', 'years', 'manual', 'mining-users', 'mining-blocks', 'shop-revenue']} />
              {card.source === 'manual' && <NumberField label="Manual value" value={card.value as number} onChange={v => updateCard(idx, { value: v })} />}
              <Field label="Suffix" value={card.suffix} onChange={v => updateCard(idx, { suffix: v })} />
              <Toggle label="Accent colour" checked={card.accent} onChange={v => updateCard(idx, { accent: v })} />
              <Toggle label="Visible" checked={card.visible} onChange={v => updateCard(idx, { visible: v })} />
            </div>
          </SectionCard>
        ))}
      </div>
      <button onClick={addCard} className="w-full py-3 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 text-sm transition-all flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add stat card</button>
    </div>
  )
}

function FeaturesTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const updateItem = (idx: number, patch: Partial<FeatureItemConfig>) => setForm(p => {
    const items = [...p.features.items]
    items[idx] = { ...items[idx], ...patch }
    return { ...p, features: { ...p.features, items } }
  })
  const move = (idx: number, dir: number) => setForm(p => ({ ...p, features: { ...p.features, items: arrayMove(p.features.items, idx, idx + dir) } }))
  const remove = (idx: number) => setForm(p => ({ ...p, features: { ...p.features, items: p.features.items.filter((_, i) => i !== idx) } }))
  const add = () => setForm(p => ({ ...p, features: { ...p.features, items: [...p.features.items, { id: id('feat'), label: 'New Mode', icon: '⭐', link: '/rankings', visible: true, color: '#00BFFF', description: '' }] } }))
  return (
    <div className="space-y-4">
      <SectionCard title="Features section" desc="Gamemode cards and layout settings." action={<Toggle label="Enabled" checked={form.features.enabled} onChange={v => setForm(p => ({ ...p, features: { ...p.features, enabled: v } }))} />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Title" value={form.features.title} onChange={v => setForm(p => ({ ...p, features: { ...p.features, title: v } }))} />
          <Field label="Subtitle" value={form.features.subtitle} onChange={v => setForm(p => ({ ...p, features: { ...p.features, subtitle: v } }))} />
        </div>
        <Field label="Description" value={form.features.description} onChange={v => setForm(p => ({ ...p, features: { ...p.features, description: v } }))} />
        <div className="grid md:grid-cols-2 gap-4">
          <Select label="Layout" value={form.features.layout} onChange={v => setForm(p => ({ ...p, features: { ...p.features, layout: v as any } }))} options={['grid', 'scroll', 'compact']} />
          <Select label="Columns" value={String(form.features.columns)} onChange={v => setForm(p => ({ ...p, features: { ...p.features, columns: Number(v) as any } }))} options={['3', '4', '5', '6']} />
        </div>
      </SectionCard>
      <div className="space-y-3">
        {form.features.items.map((item, idx) => (
          <SectionCard key={item.id} title={item.label || 'Untitled'} action={
            <div className="flex items-center gap-1">
              <button onClick={() => move(idx, -1)} className="p-1 rounded hover:bg-white/10"><ArrowUp className="h-4 w-4 text-gray-400" /></button>
              <button onClick={() => move(idx, 1)} className="p-1 rounded hover:bg-white/10"><ArrowDown className="h-4 w-4 text-gray-400" /></button>
              <button onClick={() => remove(idx)} className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          }>
            <div className="grid md:grid-cols-4 gap-3">
              <Field label="Label" value={item.label} onChange={v => updateItem(idx, { label: v })} />
              <Field label="Icon" value={item.icon} onChange={v => updateItem(idx, { icon: v })} />
              <Field label="Link" value={item.link} onChange={v => updateItem(idx, { link: v })} />
              <ColorField label="Accent colour" value={item.color} onChange={v => updateItem(idx, { color: v })} />
              <Field label="Description" value={item.description} onChange={v => updateItem(idx, { description: v })} />
              <Toggle label="Visible" checked={item.visible} onChange={v => updateItem(idx, { visible: v })} />
            </div>
          </SectionCard>
        ))}
      </div>
      <button onClick={add} className="w-full py-3 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 text-sm transition-all flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add feature</button>
    </div>
  )
}

function QuoteTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Quote block" desc="Centered testimonial / brand quote." action={<Toggle label="Enabled" checked={form.quote.enabled} onChange={v => setForm(p => ({ ...p, quote: { ...p.quote, enabled: v } }))} />}>
        <Field label="Full quote text" value={form.quote.text} onChange={v => setForm(p => ({ ...p, quote: { ...p.quote, text: v } }))} rows={3} />
        <Field label="Highlighted phrase" desc="Will use the brand text gradient." value={form.quote.highlight} onChange={v => setForm(p => ({ ...p, quote: { ...p.quote, highlight: v } }))} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Author" value={form.quote.author} onChange={v => setForm(p => ({ ...p, quote: { ...p.quote, author: v } }))} />
          <Select label="Alignment" value={form.quote.align} onChange={v => setForm(p => ({ ...p, quote: { ...p.quote, align: v as any } }))} options={['left', 'center', 'right']} />
        </div>
      </SectionCard>
      <SectionCard title="Live preview" desc="How the quote will render.">
        <div className={`text-center ${form.quote.align === 'left' ? 'text-left' : form.quote.align === 'right' ? 'text-right' : ''}`}>
          <span className="text-4xl text-white/20 font-serif">&ldquo;</span>
          <span className="text-xl font-bold text-white">
            {form.quote.text.split(form.quote.highlight).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span style={{ background: form.theme.textGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{form.quote.highlight}</span>}
              </span>
            ))}
          </span>
          <span className="text-4xl text-white/20 font-serif">&rdquo;</span>
          <p className="text-gray-500 text-sm mt-2">{form.quote.author}</p>
        </div>
      </SectionCard>
    </div>
  )
}

function NavigationTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const updateLink = (idx: number, patch: Partial<NavLinkConfig>) => setForm(p => {
    const links = [...p.nav.links]
    links[idx] = { ...links[idx], ...patch }
    return { ...p, nav: { ...p.nav, links } }
  })
  const move = (idx: number, dir: number) => setForm(p => ({ ...p, nav: { ...p.nav, links: arrayMove(p.nav.links, idx, idx + dir) } }))
  const remove = (idx: number) => setForm(p => ({ ...p, nav: { ...p.nav, links: p.nav.links.filter((_, i) => i !== idx) } }))
  const add = () => setForm(p => ({ ...p, nav: { ...p.nav, links: [...p.nav.links, { id: id('nav'), label: 'New Link', to: '/', icon: 'Home', visible: true, external: false }] } }))
  return (
    <div className="space-y-4">
      <SectionCard title="Navbar" desc="Logo, search, and discord visibility.">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Logo text" value={form.nav.logoText} onChange={v => setForm(p => ({ ...p, nav: { ...p.nav, logoText: v } }))} />
          <Field label="Logo URL" value={form.nav.logoUrl} onChange={v => setForm(p => ({ ...p, nav: { ...p.nav, logoUrl: v } }))} />
          <Field label="Discord link" value={form.nav.discordLink} onChange={v => setForm(p => ({ ...p, nav: { ...p.nav, discordLink: v } }))} />
          <Toggle label="Show search" checked={form.nav.showSearch} onChange={v => setForm(p => ({ ...p, nav: { ...p.nav, showSearch: v } }))} />
          <Toggle label="Show Discord button" checked={form.nav.showDiscord} onChange={v => setForm(p => ({ ...p, nav: { ...p.nav, showDiscord: v } }))} />
        </div>
      </SectionCard>
      <SectionCard title="Nav links" desc="Reorder, edit, add, or hide navigation links.">
        <div className="space-y-2">
          {form.nav.links.map((link, idx) => (
            <div key={link.id} className="grid md:grid-cols-6 gap-2 items-end rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex gap-1">
                <button onClick={() => move(idx, -1)} className="p-1 rounded hover:bg-white/10"><ArrowUp className="h-4 w-4 text-gray-400" /></button>
                <button onClick={() => move(idx, 1)} className="p-1 rounded hover:bg-white/10"><ArrowDown className="h-4 w-4 text-gray-400" /></button>
              </div>
              <Field label="Label" value={link.label} onChange={v => updateLink(idx, { label: v })} />
              <Field label="Path / URL" value={link.to} onChange={v => updateLink(idx, { to: v })} />
              <Select label="Icon" value={link.icon} onChange={v => updateLink(idx, { icon: v })} options={ICONS} />
              <Toggle label="External" checked={link.external} onChange={v => updateLink(idx, { external: v })} />
              <div className="flex gap-1 justify-end">
                <Toggle label="Visible" checked={link.visible} onChange={v => updateLink(idx, { visible: v })} />
                <button onClick={() => remove(idx)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={add} className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 text-sm transition-all flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add link</button>
      </SectionCard>
    </div>
  )
}

function FooterTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const updateCol = (idx: number, patch: Partial<FooterColumn>) => setForm(p => {
    const cols = [...p.footer.columns]
    cols[idx] = { ...cols[idx], ...patch }
    return { ...p, footer: { ...p.footer, columns: cols } }
  })
  const addLink = (colIdx: number) => setForm(p => {
    const cols = [...p.footer.columns]
    cols[colIdx].links.push({ label: 'New Link', url: '/', internal: true })
    return { ...p, footer: { ...p.footer, columns: cols } }
  })
  const updateColLink = (colIdx: number, linkIdx: number, patch: Partial<{ label: string; url: string; internal: boolean }>) => setForm(p => {
    const cols = clone(p.footer.columns)
    cols[colIdx].links[linkIdx] = { ...cols[colIdx].links[linkIdx], ...patch }
    return { ...p, footer: { ...p.footer, columns: cols } }
  })
  const removeColLink = (colIdx: number, linkIdx: number) => setForm(p => {
    const cols = clone(p.footer.columns)
    cols[colIdx].links.splice(linkIdx, 1)
    return { ...p, footer: { ...p.footer, columns: cols } }
  })
  const addBottom = () => setForm(p => ({ ...p, footer: { ...p.footer, bottomLinks: [...p.footer.bottomLinks, { label: 'New Link', url: '#', internal: false }] } }))
  const updateBottom = (idx: number, patch: Partial<{ label: string; url: string; internal: boolean }>) => setForm(p => {
    const links = clone(p.footer.bottomLinks)
    links[idx] = { ...links[idx], ...patch }
    return { ...p, footer: { ...p.footer, bottomLinks: links } }
  })
  const removeBottom = (idx: number) => setForm(p => ({ ...p, footer: { ...p.footer, bottomLinks: p.footer.bottomLinks.filter((_, i) => i !== idx) } }))
  return (
    <div className="space-y-4">
      <SectionCard title="Footer" desc="Bottom-of-page settings." action={<Toggle label="Enabled" checked={form.footer.enabled} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, enabled: v } }))} />}>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Logo text" value={form.footer.logoText} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, logoText: v } }))} />
          <Toggle label="Show watermark" checked={form.footer.showWatermark} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, showWatermark: v } }))} />
          <Toggle label="Show socials" checked={form.footer.showSocials} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, showSocials: v } }))} />
          <Toggle label="Show legal" checked={form.footer.showLegal} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, showLegal: v } }))} />
          <Toggle label="Show server IP" checked={form.footer.showServerIP} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, showServerIP: v } }))} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Copyright" value={form.footer.copyright} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, copyright: v } }))} />
          <Field label="Tagline" value={form.footer.tagline} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, tagline: v } }))} />
          <Field label="Extra line" value={form.footer.extra} onChange={v => setForm(p => ({ ...p, footer: { ...p.footer, extra: v } }))} />
        </div>
      </SectionCard>
      <div className="grid md:grid-cols-3 gap-4">
        {form.footer.columns.map((col, idx) => (
          <SectionCard key={idx} title={`Column ${idx + 1}: ${col.title}`} action={<Field label="Column title" value={col.title} onChange={v => updateCol(idx, { title: v })} />}>
            <div className="space-y-2">
              {col.links.map((link, li) => (
                <div key={li} className="flex gap-2">
                  <Field label="Label" value={link.label} onChange={v => updateColLink(idx, li, { label: v })} />
                  <Field label="URL / page" value={link.url} onChange={v => updateColLink(idx, li, { url: v })} />
                  <Toggle label="Internal" checked={link.internal} onChange={v => updateColLink(idx, li, { internal: v })} />
                  <button onClick={() => removeColLink(idx, li)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => addLink(idx)} className="mt-3 w-full py-2 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 text-xs transition-all flex items-center justify-center gap-1"><Plus className="h-3 w-3" /> Add link</button>
          </SectionCard>
        ))}
      </div>
      <SectionCard title="Bottom links" desc="Small links in the footer bottom bar.">
        <div className="space-y-2">
          {form.footer.bottomLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2">
              <Field label="Label" value={link.label} onChange={v => updateBottom(idx, { label: v })} />
              <Field label="URL" value={link.url} onChange={v => updateBottom(idx, { url: v })} />
              <Toggle label="Internal" checked={link.internal} onChange={v => updateBottom(idx, { internal: v })} />
              <button onClick={() => removeBottom(idx)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button onClick={addBottom} className="mt-3 w-full py-2 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 text-xs transition-all flex items-center justify-center gap-1"><Plus className="h-3 w-3" /> Add bottom link</button>
      </SectionCard>
    </div>
  )
}

function AnnouncementsTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const update = (idx: number, patch: Partial<AnnouncementConfig>) => setForm(p => {
    const list = [...p.announcements]
    list[idx] = { ...list[idx], ...patch }
    return { ...p, announcements: list }
  })
  const remove = (idx: number) => setForm(p => ({ ...p, announcements: p.announcements.filter((_, i) => i !== idx) }))
  const add = () => setForm(p => ({
    ...p,
    announcements: [...p.announcements, {
      id: id('ann'), enabled: true, text: '', title: 'New announcement',
      body: 'Share an update with your community.', eyebrow: 'News', icon: '✦',
      type: 'info', style: 'spotlight', accentColor: '#00BFFF',
      backgroundColor: '#062039', link: '', linkLabel: 'Learn more',
      startAt: null, endAt: null, dismissible: true,
    }],
  }))
  const duplicate = (idx: number) => setForm(p => ({ ...p, announcements: [...p.announcements.slice(0, idx + 1), { ...clone(p.announcements[idx]), id: id('ann') }, ...p.announcements.slice(idx + 1)] }))
  const updateEvent = (patch: Partial<EventConfig>) => setForm(p => ({ ...p, event: { ...p.event, ...patch } }))
  const event = form.event
  return (
    <div className="space-y-5">
      <SectionCard title="Banner Studio" desc="Build announcements and events that feel like part of the homepage. Pick a visual direction, then customize the content and behavior.">
        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Live announcements" value={String(form.announcements.filter(isAnnouncementLive).length)} />
          <Stat label="Scheduled" value={String(form.announcements.filter(a => a.enabled && !isAnnouncementLive(a)).length)} />
          <Stat label="Event status" value={event.enabled && event.visible ? 'Published' : 'Draft'} />
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#00BFFF]/15 bg-[#00BFFF]/5 p-4">
          <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-[#00BFFF]" />
          <p className="text-xs leading-relaxed text-gray-400">Use scheduling for planned drops, keep one announcement live at a time for a clean homepage, and use Preview to test desktop, tablet, and mobile layouts before saving.</p>
        </div>
      </SectionCard>

      {form.announcements.map((ann, idx) => (
        <SectionCard key={ann.id} title={ann.title || ann.text || `Announcement ${idx + 1}`} desc={isAnnouncementLive(ann) ? 'Live on the homepage' : ann.enabled ? 'Scheduled or missing content' : 'Hidden from visitors'} action={
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAnnouncementLive(ann) ? 'border-green-500/25 bg-green-500/10 text-green-400' : 'border-white/10 bg-white/5 text-gray-500'}`}>{isAnnouncementLive(ann) ? 'LIVE' : ann.enabled ? 'SCHEDULED' : 'OFF'}</span>
            <button onClick={() => duplicate(idx)} className="p-1 text-gray-500 hover:text-[#00BFFF]"><Copy className="h-4 w-4" /></button>
            <button onClick={() => remove(idx)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
          </div>
        }>
          <PresetPicker title="Announcement layout" presets={ANNOUNCEMENT_PRESETS} value={ann.style || 'ribbon'} onChange={style => update(idx, { style })} />
          <div className="grid gap-4 pt-2 md:grid-cols-2">
            <Toggle label="Enabled" checked={ann.enabled} onChange={v => update(idx, { enabled: v })} />
            <Select label="Type" value={ann.type} onChange={v => update(idx, { type: v as any })} options={['info', 'warning', 'success', 'event']} />
            <Field label="Eyebrow / category" value={ann.eyebrow || ''} onChange={v => update(idx, { eyebrow: v })} placeholder="News, Update, Maintenance…" />
            <Field label="Icon" value={ann.icon || ''} onChange={v => update(idx, { icon: v })} placeholder="✦" />
            <Field label="Headline" value={ann.title || ''} onChange={v => update(idx, { title: v })} maxLength={80} />
            <Field label="Supporting copy" value={ann.body || ann.text || ''} onChange={v => update(idx, { body: v, text: v })} maxLength={160} />
            <Field label="Link" value={ann.link} onChange={v => update(idx, { link: v })} />
            <Field label="Link label" value={ann.linkLabel} onChange={v => update(idx, { linkLabel: v })} />
            <ColorField label="Accent color" value={ann.accentColor || '#00BFFF'} onChange={v => update(idx, { accentColor: v })} />
            <ColorField label="Background color" value={ann.backgroundColor || '#062039'} onChange={v => update(idx, { backgroundColor: v })} />
            <Toggle label="Dismissible" checked={ann.dismissible} onChange={v => update(idx, { dismissible: v })} />
            <Field label="Start date" type="datetime-local" value={ann.startAt ? ann.startAt.slice(0, 16) : ''} onChange={v => update(idx, { startAt: v ? new Date(v).toISOString() : null })} />
            <Field label="End date" type="datetime-local" value={ann.endAt ? ann.endAt.slice(0, 16) : ''} onChange={v => update(idx, { endAt: v ? new Date(v).toISOString() : null })} />
          </div>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500"><span>Live preview</span><span className="flex items-center gap-1 text-green-400"><Check className="h-3 w-3" /> Updates instantly</span></div>
            <AnnouncementBanner announcement={ann} preview />
          </div>
        </SectionCard>
      ))}
      <button onClick={add} className="w-full py-3 rounded-xl border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 text-sm transition-all flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add announcement</button>

      <SectionCard title="Featured event" desc="A richer homepage moment for tournaments, launches, seasons, or community milestones." action={<span className={`text-xs font-bold px-2 py-1 rounded-full border ${event.enabled && event.visible ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-white/10 bg-white/5 text-gray-500'}`}>{event.enabled && event.visible ? 'VISIBLE' : 'HIDDEN'}</span>}>
        <PresetPicker title="Event layout" presets={EVENT_PRESETS} value={event.style || 'mega'} onChange={style => updateEvent({ style })} />
        {/* Banner height picker */}
        <div className="pt-2">
          <p className="mb-1 text-xs font-semibold text-white">Banner thickness</p>
          <p className="mb-2 text-[11px] text-gray-500">Controls the vertical size of the event strip.</p>
          <div className="flex gap-2">
            {([['xs','Extra thin'],['sm','Thin'],['md','Medium'],['lg','Tall']] as const).map(([val, lbl]) => (
              <button key={val} onClick={() => updateEvent({ bannerHeight: val })}
                className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-all ${
                  (event.bannerHeight || 'sm') === val
                    ? 'border-[#00BFFF]/40 bg-[#00BFFF]/10 text-[#00BFFF]'
                    : 'border-white/10 bg-white/3 text-gray-500 hover:text-gray-300'
                }`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 pt-2 md:grid-cols-2">
          <Toggle label="Enable event" desc="Allow the event to render when it is visible." checked={event.enabled} onChange={v => updateEvent({ enabled: v })} />
          <Toggle label="Show on homepage" desc="Keep enabled for drafts, hide for a quiet homepage." checked={event.visible} onChange={v => updateEvent({ visible: v })} />
          <Toggle label="Show above navbar" desc="Pin this event to the very top of the homepage, even above navigation." checked={event.showAboveNavbar === true} onChange={v => updateEvent({ showAboveNavbar: v })} />
          <Toggle label="Dismissible" desc="Show an ✕ button so visitors can close the banner." checked={event.dismissible === true} onChange={v => updateEvent({ dismissible: v })} />
          <Toggle label="Hide when expired" desc="Remove the banner completely once the countdown reaches zero." checked={event.hideWhenExpired === true} onChange={v => updateEvent({ hideWhenExpired: v })} />
          <Toggle label="Auto-hide on scroll" desc="Banner slides up and hides as the visitor scrolls down; reappears on scroll up." checked={event.hideOnScroll === true} onChange={v => updateEvent({ hideOnScroll: v })} />
          <Field label="Eyebrow / category" value={event.eyebrow || ''} onChange={v => updateEvent({ eyebrow: v })} placeholder="Featured event" />
          <Field label="Badge" value={event.badge} onChange={v => updateEvent({ badge: v })} placeholder="EVENT" />
          <Field label="Title" value={event.title} onChange={v => updateEvent({ title: v })} maxLength={70} />
          <Field label="Subtitle" value={event.subtitle} onChange={v => updateEvent({ subtitle: v })} maxLength={140} />
          <Field label="Description" value={event.description || ''} onChange={v => updateEvent({ description: v })} rows={3} maxLength={240} />
          <Field label="Icon" value={event.icon || ''} onChange={v => updateEvent({ icon: v })} placeholder="🏆" />
          <Toggle label="Show primary button" desc="Display the main call-to-action button." checked={event.showPrimaryButton !== false} onChange={v => updateEvent({ showPrimaryButton: v })} />
          <Field label="Primary button text" value={event.buttonText} onChange={v => updateEvent({ buttonText: v })} />
          <Field label="Primary button link" value={event.link} onChange={v => updateEvent({ link: v })} />
          <Toggle label="Show secondary button" desc="Display the secondary/view-details button." checked={event.showSecondaryButton !== false} onChange={v => updateEvent({ showSecondaryButton: v })} />
          <Field label="Secondary button text" value={event.secondaryButtonText || ''} onChange={v => updateEvent({ secondaryButtonText: v })} />
          <Field label="Secondary button link" value={event.secondaryLink || ''} onChange={v => updateEvent({ secondaryLink: v })} />
          <Toggle label="Show countdown" checked={event.showCountdown !== false} onChange={v => updateEvent({ showCountdown: v })} />
          <Field label="Countdown label" value={event.countdownLabel || ''} onChange={v => updateEvent({ countdownLabel: v })} />
          <Field label="End date" type="datetime-local" value={event.endDate ? event.endDate.slice(0, 16) : ''} onChange={v => updateEvent({ endDate: v ? new Date(v).toISOString() : '' })} />
          <Field label="Closed state text" desc="Shown in place of subtitle when countdown expires." value={event.closedText || ''} onChange={v => updateEvent({ closedText: v })} placeholder="Registration is now closed." />
          <Field label="Image URL (optional)" value={event.imageUrl || ''} onChange={v => updateEvent({ imageUrl: v })} />
          <Field label="Meta label" value={event.metaLabel || ''} onChange={v => updateEvent({ metaLabel: v })} placeholder="Format" />
          <Field label="Meta value" value={event.metaValue || ''} onChange={v => updateEvent({ metaValue: v })} placeholder="Open tournament" />
          <Toggle label="Show event metadata" checked={event.showMeta !== false} onChange={v => updateEvent({ showMeta: v })} />
          <ColorField label="Accent color" value={event.accentColor || '#00BFFF'} onChange={v => updateEvent({ accentColor: v })} />
          <ColorField label="Background color" value={event.backgroundColor || '#071426'} onChange={v => updateEvent({ backgroundColor: v })} />
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500"><span>Live event preview</span><span className="flex items-center gap-1 text-green-400"><Check className="h-3 w-3" /> Countdown is interactive</span></div>
          <EventBanner event={event} preview />
        </div>
      </SectionCard>
    </div>
  )
}

function MediaTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  const img = (src: string) => src ? <img src={src} alt="preview" className="w-full h-32 object-contain rounded-xl bg-white/5 border border-white/10" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} /> : <div className="w-full h-32 rounded-xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center text-xs text-gray-600">No image set</div>
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <SectionCard title="Logo" desc="Navbar and footer logo URL.">
          <Field label="Logo URL" value={form.media.logoUrl} onChange={v => setForm(p => ({ ...p, media: { ...p.media, logoUrl: v } }))} />
          {img(form.media.logoUrl)}
        </SectionCard>
        <SectionCard title="Favicon" desc="Browser tab icon.">
          <Field label="Favicon URL" value={form.media.faviconUrl} onChange={v => setForm(p => ({ ...p, media: { ...p.media, faviconUrl: v } }))} />
          {img(form.media.faviconUrl)}
        </SectionCard>
        <SectionCard title="Open Graph image" desc="Social preview (1200×630 recommended).">
          <Field label="OG image URL" value={form.media.ogImageUrl} onChange={v => setForm(p => ({ ...p, media: { ...p.media, ogImageUrl: v } }))} />
          {img(form.media.ogImageUrl)}
        </SectionCard>
        <SectionCard title="Hero background" desc="Used when Background style is set to Image.">
          <Field label="Hero background URL" value={form.media.heroBackgroundUrl} onChange={v => setForm(p => ({ ...p, media: { ...p.media, heroBackgroundUrl: v } }))} />
          {img(form.media.heroBackgroundUrl)}
        </SectionCard>
      </div>
    </div>
  )
}

function SeoTab({ form, setForm }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard title="SEO & metadata" desc="Search engine and social sharing controls.">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Page title" value={form.seo.title} onChange={v => setForm(p => ({ ...p, seo: { ...p.seo, title: v } }))} maxLength={60} />
          <Field label="Canonical URL" value={form.seo.canonical} onChange={v => setForm(p => ({ ...p, seo: { ...p.seo, canonical: v } }))} />
        </div>
        <Field label="Meta description" value={form.seo.description} onChange={v => setForm(p => ({ ...p, seo: { ...p.seo, description: v } }))} rows={3} maxLength={160} />
        <Field label="Keywords" value={form.seo.keywords} onChange={v => setForm(p => ({ ...p, seo: { ...p.seo, keywords: v } }))} />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="GA4 measurement ID" value={form.seo.ga4Id} onChange={v => setForm(p => ({ ...p, seo: { ...p.seo, ga4Id: v } }))} monospace />
          <Field label="GSC verification tag" value={form.seo.gscVerification} onChange={v => setForm(p => ({ ...p, seo: { ...p.seo, gscVerification: v } }))} monospace />
        </div>
      </SectionCard>
      <SectionCard title="Google result preview" desc="Approximate search result rendering.">
        <div className="space-y-0.5">
          <p className="text-[#00BFFF] text-base font-medium hover:underline cursor-pointer truncate">{form.seo.title || 'Blue Tiers'}</p>
          <p className="text-green-600 text-xs">{form.seo.canonical || 'https://bluetiers.bolt.host'}</p>
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{form.seo.description}</p>
        </div>
      </SectionCard>
    </div>
  )
}

function PreviewTab({ form }: { form: HomepageConfig }) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const width = { desktop: '100%', tablet: '768px', mobile: '375px' }[device]
  const titleSize = { sm: 'text-4xl', md: 'text-5xl', lg: 'text-6xl', xl: 'text-7xl' }[form.hero.titleSize]
  const align = { left: 'items-start text-left', center: 'items-center text-center', right: 'items-end text-right' }[form.hero.align]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <button onClick={() => setDevice('desktop')} className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${device === 'desktop' ? 'bg-[#00BFFF]/10 text-[#00BFFF]' : 'text-gray-500'}`}><Monitor className="h-3.5 w-3.5" /> Desktop</button>
          <button onClick={() => setDevice('tablet')} className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${device === 'tablet' ? 'bg-[#00BFFF]/10 text-[#00BFFF]' : 'text-gray-500'}`}><Tablet className="h-3.5 w-3.5" /> Tablet</button>
          <button onClick={() => setDevice('mobile')} className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 ${device === 'mobile' ? 'bg-[#00BFFF]/10 text-[#00BFFF]' : 'text-gray-500'}`}><Smartphone className="h-3.5 w-3.5" /> Mobile</button>
        </div>
        <span className="text-xs text-gray-500">Preview is approximate — rounded corners and fonts may differ slightly.</span>
      </div>
      <div className="mx-auto border border-white/10 rounded-xl overflow-hidden bg-black" style={{ width, maxWidth: '100%' }}>
        {/* Optional event pinned above everything */}
        {form.event.showAboveNavbar && <EventBanner event={form.event} preview />}
        {/* Announcement banners */}
        {form.announcements.filter(isAnnouncementLive).map(announcement => (
          <AnnouncementBanner key={announcement.id} announcement={announcement} preview />
        ))}
        {/* Navbar */}
        <div className="px-4 py-3 flex items-center justify-between bg-black/80 border-b border-white/10">
          <div className="font-bold text-sm"><span className="text-[#00BFFF]">Blue</span>Tiers</div>
          <div className="hidden sm:flex gap-4 text-xs text-gray-400">{form.nav.links.filter(l => l.visible).slice(0, 4).map(l => <span key={l.id}>{l.label}</span>)}</div>
          <div className="text-xs bg-white/10 px-2 py-1 rounded">Discord</div>
        </div>
        {/* Hero */}
        {form.hero.enabled && (
          <div className={`px-6 py-16 flex flex-col ${align} min-h-[360px]`} style={{ background: form.theme.heroGradient }}>
            <h1 className={`font-black ${titleSize} text-white`}>{form.hero.title}</h1>
            <h1 className={`font-black ${titleSize}`} style={{ background: form.theme.textGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{form.hero.titleAccent}</h1>
            <p className="text-sm text-white/70 mt-3 max-w-md">{form.hero.subtitle}</p>
            <div className="flex gap-2 mt-4">
              {form.hero.primaryCta.visible && <span className="px-4 py-2 rounded-full text-xs font-semibold bg-[#5865F2] text-white">{form.hero.primaryCta.text}</span>}
              {form.hero.secondaryCta.visible && <span className="px-4 py-2 rounded-full text-xs font-semibold border border-white/20 text-white">{form.hero.secondaryCta.text}</span>}
            </div>
            {form.hero.showServerIP && <div className="mt-4 text-xs font-mono text-white/60 bg-white/10 px-3 py-1.5 rounded-lg">{form.hero.serverIP}</div>}
          </div>
        )}
        {/* Stats */}
        {form.stats.enabled && form.stats.cards.filter(c => c.visible).length > 0 && (
          <div className="px-4 py-10 grid grid-cols-3 gap-4 text-center">
            {form.stats.cards.filter(c => c.visible).map(c => (
              <div key={c.id}>
                <div className={`text-2xl font-black ${c.accent ? 'text-[#00BFFF]' : 'text-white'}`}>{c.value}{c.suffix}</div>
                <div className="text-xs text-gray-500 mt-1">{c.label}</div>
              </div>
            ))}
          </div>
        )}
        {/* Quote */}
        {form.quote.enabled && (
          <div className={`px-6 py-10 text-center ${form.quote.align === 'left' ? 'text-left' : form.quote.align === 'right' ? 'text-right' : ''}`}>
            <span className="text-3xl text-gray-600">&ldquo;</span>
            <span className="text-lg font-bold text-white">{form.quote.text}</span>
            <span className="text-3xl text-gray-600">&rdquo;</span>
            <p className="text-xs text-gray-500 mt-2">{form.quote.author}</p>
          </div>
        )}
        {/* Features */}
        {form.features.enabled && (
          <div className="px-4 py-10 text-center">
            <h2 className="text-xl font-bold text-white">{form.features.title} <span className="text-[#00BFFF]">{form.features.subtitle}</span></h2>
            <p className="text-xs text-gray-500 mt-1">{form.features.description}</p>
            <div className={`flex flex-wrap justify-center gap-3 mt-4 ${form.features.layout === 'scroll' ? 'overflow-x-auto flex-nowrap' : ''}`}>
              {form.features.items.filter(i => i.visible).map(i => <div key={i.id} className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-1"><span className="text-2xl">{i.icon}</span><span className="text-[10px] text-gray-400">{i.label}</span></div>)}
            </div>
          </div>
        )}
        {/* Featured event */}
        {!form.event.showAboveNavbar && <EventBanner event={form.event} preview />}
        {/* Footer */}
        {form.footer.enabled && (
          <div className="px-4 py-6 bg-black border-t border-white/10 text-center">
            <p className="text-xs text-gray-600">{form.footer.copyright}</p>
            <p className="text-[10px] text-gray-700 mt-1">{form.footer.tagline}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryTab({ form, setForm, onSave }: { form: HomepageConfig; setForm: (fn: (prev: HomepageConfig) => HomepageConfig) => void; onSave: () => void }) {
  const [history, setHistory] = useState(() => getHomepageHistory())
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const refresh = () => setHistory(getHomepageHistory())
  const restore = (snap: { ts: number; data: HomepageConfig }) => { setForm(() => clone(snap.data)); refresh() }
  const doImport = () => { try { setForm(() => clone(homepageConfigFromJSON(importText))); setShowImport(false); setImportText('') } catch { /* handled by caller */ } }
  const publishNow = () => { setForm(p => ({ ...p, published: true, publishAt: null })); setTimeout(onSave, 0) }
  const unpublish = () => { setForm(p => ({ ...p, published: false })); setTimeout(onSave, 0) }
  return (
    <div className="space-y-4">
      <SectionCard title="Publishing" desc="Control whether the homepage is public or scheduled.">
        <div className="grid md:grid-cols-2 gap-4">
          <div className={`rounded-xl border p-4 ${form.published ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{form.published ? 'Published' : 'Draft'}</span>
              <span className={`w-2 h-2 rounded-full ${form.published ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            </div>
            <p className="text-xs text-gray-500 mt-1">{form.published ? 'The homepage is visible to visitors.' : 'Only admins can see the configured homepage.'}</p>
            <div className="flex gap-2 mt-3">
              {!form.published && <button onClick={publishNow} className="btn-primary px-4 py-2 rounded-xl text-xs">Publish now</button>}
              {form.published && <button onClick={unpublish} className="px-4 py-2 rounded-xl border border-white/10 text-xs text-gray-400 hover:text-white">Unpublish</button>}
            </div>
          </div>
          <div className="space-y-3">
            <Toggle label="Schedule publish" checked={!!form.publishAt} onChange={v => setForm(p => ({ ...p, publishAt: v ? new Date(Date.now() + 3600000).toISOString() : null }))} />
            {form.publishAt && <Field label="Publish at" type="datetime-local" value={form.publishAt.slice(0, 16)} onChange={v => setForm(p => ({ ...p, publishAt: new Date(v).toISOString() }))} />}
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Import / Export" desc="Move config between environments or back it up.">
        <div className="flex gap-2">
          <button onClick={() => downloadJson(`homepage-${Date.now()}.json`, homepageConfigToJSON(form))} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white hover:border-white/20 transition-all">Export JSON</button>
          <button onClick={() => setShowImport(true)} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white hover:border-white/20 transition-all">Import JSON</button>
        </div>
      </SectionCard>
      <SectionCard title="Version history" desc={`${history.length} snapshots stored in this browser.`}>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No history yet. Save the homepage to create a snapshot.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {history.map((snap, i) => (
              <div key={snap.ts} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm text-white font-semibold">{i === 0 ? 'Latest' : `Save ${history.length - i}`}</p>
                  <p className="text-xs text-gray-500">{snap.label} · v{snap.data.version}</p>
                </div>
                <button onClick={() => restore(snap)} className="px-3 py-1.5 rounded-lg text-xs text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all"><Undo2 className="h-3 w-3 inline mr-1" /> Restore</button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      {showImport && (
        <Modal title="Import homepage config" onClose={() => setShowImport(false)}>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Paste a previously exported JSON config. It will be merged with defaults.</p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={10} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white font-mono outline-none resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">Cancel</button>
              <button onClick={doImport} className="btn-primary px-4 py-2 rounded-xl text-sm">Import</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomepageManager({ admin }: Props) {
  const [form, setForm] = useState<HomepageConfig>(() => clone(getHomepageConfig()))
  const [tab, setTab] = useState<TabId>('dashboard')
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
  const [showReset, setShowReset] = useState(false)
  const timer = useRef<number | null>(null)

  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    setToast({ type, msg })
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 3000) as unknown as number
  }

  const setDraft = (fn: (prev: HomepageConfig) => HomepageConfig) => setForm(prev => fn(clone(prev)))

  const save = () => {
    const next = { ...form, version: form.version + 1, lastEditedAt: new Date().toISOString(), lastEditedBy: admin }
    saveHomepageConfig(next)
    setForm(next)
    addLog(admin, 'homepage:save', `Saved homepage v${next.version}`)
    pushHomepageHistory({ ts: Date.now(), label: `${admin} • ${new Date().toLocaleString()}`, admin, data: clone(next) })
    notify('success', 'Homepage saved')
  }

  const reset = () => {
    resetHomepageConfig()
    const fresh = clone(getHomepageConfig())
    setForm(fresh)
    addLog(admin, 'homepage:reset', 'Reset homepage to defaults')
    notify('info', 'Homepage reset to defaults')
    setShowReset(false)
  }

  const exportConfig = () => {
    downloadJson(`homepage-${Date.now()}.json`, homepageConfigToJSON(form))
    addLog(admin, 'homepage:export', 'Exported homepage config')
    notify('info', 'Export downloaded')
  }

  const panels = useMemo<Record<TabId, React.ReactNode>>(() => ({
    dashboard: <DashboardTab form={form} onSave={save} onReset={() => setShowReset(true)} onPreview={() => setTab('preview')} onExport={exportConfig} />,
    layout: <LayoutTab form={form} setForm={setDraft} />,
    hero: <HeroTab form={form} setForm={setDraft} />,
    theme: <ThemeTab form={form} setForm={setDraft} />,
    stats: <StatsTab form={form} setForm={setDraft} />,
    features: <FeaturesTab form={form} setForm={setDraft} />,
    quote: <QuoteTab form={form} setForm={setDraft} />,
    navigation: <NavigationTab form={form} setForm={setDraft} />,
    footer: <FooterTab form={form} setForm={setDraft} />,
    announcements: <AnnouncementsTab form={form} setForm={setDraft} />,
    media: <MediaTab form={form} setForm={setDraft} />,
    seo: <SeoTab form={form} setForm={setDraft} />,
    preview: <PreviewTab form={form} />,
    history: <HistoryTab form={form} setForm={setDraft} onSave={save} />,
  }), [form])

  return (
    <div className="space-y-5 text-white pb-24">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-300' : toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-[#00BFFF]/10 border-[#00BFFF]/20 text-[#00BFFF]'}`}>
          {toast.msg}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-['Space_Grotesk'] text-xl font-bold">Homepage CMS</h2>
          <p className="text-xs text-gray-500">Control every section, style, animation, and message on the landing page.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={save} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">Save</button>
          <button onClick={() => setShowReset(true)} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm hover:text-red-400 hover:border-red-500/20 transition-all">Reset</button>
          <button onClick={() => setTab('preview')} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm hover:text-[#00BFFF] hover:border-[#00BFFF]/20 transition-all">Preview</button>
          <button onClick={exportConfig} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm hover:text-white hover:border-white/20 transition-all">Export</button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm border transition-all ${tab === t.id ? 'bg-[#00BFFF]/10 border-[#00BFFF]/25 text-[#00BFFF]' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {panels[tab]}

      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0B0F17]/95 backdrop-blur-xl p-4">
        <div className="text-xs text-gray-500">Draft is local until saved. Current version: <span className="text-white">v{form.version}</span></div>
        <div className="flex gap-2">
          <button onClick={save} className="btn-primary px-4 py-2 rounded-xl text-sm">Save</button>
          <button onClick={() => setShowReset(true)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:text-red-400 transition-all">Reset</button>
          <button onClick={() => setTab('preview')} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:text-[#00BFFF] transition-all">Preview</button>
        </div>
      </div>

      {showReset && (
        <Modal title="Reset homepage?" onClose={() => setShowReset(false)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-400"><AlertTriangle className="h-5 w-5" /><p className="text-sm font-semibold">All homepage changes will be reverted to defaults.</p></div>
            <p className="text-sm text-gray-400">This affects the homepage store only. It cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReset(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm">Cancel</button>
              <button onClick={reset} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/15 transition-all">Reset</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
