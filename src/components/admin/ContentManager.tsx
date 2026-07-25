import { useState, useRef } from 'react'
import { getSiteContent, saveSiteContent, resetSiteContent } from '../../store/contentStore'
import type { SiteContent } from '../../store/contentStore'
import { addLog } from '../../store/adminStore'

interface Props { admin: string }

type Tab = 'homepage' | 'announcement' | 'social' | 'seo' | 'footer' | 'preview' | 'history'

interface SaveSnapshot {
  ts: number
  label: string
  data: Required<SiteContent>
}

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
  label, desc, value, onChange, placeholder, multiline, maxLength, type = 'text', monospace = false, prefix
}: {
  label: string; desc: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; maxLength?: number; type?: string
  monospace?: boolean; prefix?: string
}) {
  const cls = `w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700 ${monospace ? 'font-mono' : ''}`
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-white text-sm font-semibold">{label}</label>
        {maxLength && <span className={`text-[10px] ${value.length > maxLength * 0.9 ? 'text-orange-400' : 'text-gray-700'}`}>{value.length}/{maxLength}</span>}
      </div>
      <p className="text-gray-600 text-xs mb-2">{desc}</p>
      {prefix ? (
        <div className="flex items-center bg-white/3 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden focus-within:border-[#00BFFF]/40 transition-all">
          <span className="px-3 text-gray-600 text-sm border-r border-white/10 select-none">{prefix}</span>
          <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="flex-1 bg-transparent px-3 py-3 text-white text-sm outline-none placeholder-gray-700" />
        </div>
      ) : multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          maxLength={maxLength} rows={3}
          className={cls + ' resize-none'} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLength}
          className={cls} />
      )}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-4">
      <button
        onClick={() => onChange(!value)}
        className={`relative mt-0.5 w-11 h-6 rounded-full border transition-all duration-300 shrink-0 ${
          value ? 'bg-[#00BFFF]/20 border-[#00BFFF]/40' : 'bg-white/5 border-white/10'
        }`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 shadow ${
          value ? 'left-5 bg-[#00BFFF]' : 'left-0.5 bg-gray-600'
        }`} />
      </button>
      <div>
        <p className="text-white text-sm font-semibold">{label}</p>
        <p className="text-gray-600 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

const ANNOUNCEMENT_TYPES = [
  { value: 'info',    label: 'Info',    color: 'text-[#00BFFF]',  bg: 'bg-[#00BFFF]/10 border-[#00BFFF]/20' },
  { value: 'warning', label: 'Warning', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { value: 'success', label: 'Success', color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  { value: 'event',   label: 'Event',   color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
] as const

const TAB_LIST: { id: Tab; label: string; icon: string }[] = [
  { id: 'homepage',     label: 'Homepage',     icon: '🏠' },
  { id: 'announcement', label: 'Announcement', icon: '📢' },
  { id: 'social',       label: 'Social',       icon: '🔗' },
  { id: 'seo',          label: 'SEO & Meta',   icon: '🔍' },
  { id: 'footer',       label: 'Footer',       icon: '🦶' },
  { id: 'preview',      label: 'Preview',      icon: '👁' },
  { id: 'history',      label: 'History',      icon: '🕓' },
]

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export function ContentManager({ admin }: Props) {
  const [form, setForm] = useState<Required<SiteContent>>(getSiteContent)
  const [tab, setTab] = useState<Tab>('homepage')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [history, setHistory] = useState<SaveSnapshot[]>([])
  const [copied, setCopied] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof Required<SiteContent>>(key: K, val: Required<SiteContent>[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSave() {
    saveSiteContent(form)
    addLog(admin, 'content:save', 'Updated site content settings')
    setHistory(prev => [{
      ts: Date.now(),
      label: `${admin} • ${new Date().toLocaleTimeString()}`,
      data: { ...form },
    }, ...prev.slice(0, 9)])
    showMsg('Content saved — changes will appear on next page load.')
  }

  function handleReset() {
    resetSiteContent()
    setForm(getSiteContent())
    setShowResetConfirm(false)
    addLog(admin, 'content:reset', 'Reset site content to defaults')
    showMsg('Content reset to defaults.')
  }

  function handleRestoreSnapshot(snap: SaveSnapshot) {
    setForm({ ...snap.data })
    showMsg(`Restored snapshot from ${new Date(snap.ts).toLocaleTimeString()}`, 'info')
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `blue-tiers-content-${Date.now()}.json`
    a.click()
    showMsg('Config exported as JSON.', 'info')
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText)
      setForm(prev => ({ ...prev, ...parsed }))
      setShowImport(false)
      setImportText('')
      showMsg('Config imported — review and save when ready.', 'info')
    } catch {
      showMsg('Invalid JSON — check your file.', 'error')
    }
  }

  function handleCopy(text: string, key: string) {
    copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1800)
  }

  const announcementStyle = ANNOUNCEMENT_TYPES.find(t => t.value === form.announcementType)

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-[#00BFFF] shadow-[0_0_8px_rgba(0,191,255,0.7)]" />
          <h2 className="font-['Space_Grotesk'] font-black text-white text-lg">Site Content</h2>
          <span className="text-xs text-gray-600 ml-1">Manage every piece of text &amp; metadata across the site</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            ↓ Export
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            ↑ Import
          </button>
          <button onClick={handleSave}
            className="btn-primary px-5 py-2 rounded-lg text-sm font-semibold text-white">
            Save All
          </button>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {TAB_LIST.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-[#00BFFF]/12 border border-[#00BFFF]/25 text-[#00BFFF]'
                : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/3'
            }`}>
            <span>{t.icon}</span> {t.label}
            {t.id === 'announcement' && form.announcementEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: HOMEPAGE
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'homepage' && (
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <span className="text-base">🏠</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Homepage Settings</h3>
            <p className="text-gray-600 text-xs ml-1">Hero section, server IP, and Discord link</p>
          </div>

          <Field label="Hero Title" desc="Large heading displayed on the homepage hero. Usually all-caps." value={form.heroTitle}
            onChange={v => set('heroTitle', v)} placeholder="BLUE TIERS" maxLength={40} />

          <Field label="Hero Subtitle" desc="Tagline shown below the title — keep it punchy and short."
            value={form.heroSubtitle} onChange={v => set('heroSubtitle', v)}
            placeholder="#1 Tier List for all types of players." maxLength={80} />

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="text-white text-sm font-semibold">Server IP</label>
            </div>
            <p className="text-gray-600 text-xs mb-2">Minecraft server address shown in the hero copy pill and footer.</p>
            <div className="flex gap-2">
              <input type="text" value={form.serverIP} onChange={e => set('serverIP', e.target.value)}
                placeholder="play.sennahosting.com"
                className="flex-1 bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm font-mono outline-none transition-all placeholder-gray-700" />
              <button onClick={() => handleCopy(form.serverIP, 'serverIP')}
                className="px-4 py-2 rounded-xl text-xs border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all">
                {copied === 'serverIP' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-1">Discord Invite Link</label>
            <p className="text-gray-600 text-xs mb-2">Used for all "Join Discord" buttons throughout the site.</p>
            <div className="flex gap-2">
              <input type="url" value={form.discordLink} onChange={e => set('discordLink', e.target.value)}
                placeholder="https://discord.gg/..."
                className="flex-1 bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700" />
              <button onClick={() => handleCopy(form.discordLink, 'discordLink')}
                className="px-4 py-2 rounded-xl text-xs border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all">
                {copied === 'discordLink' ? '✓ Copied' : 'Copy'}
              </button>
              {form.discordLink && (
                <a href={form.discordLink} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs border border-white/10 hover:border-[#00BFFF]/30 text-gray-400 hover:text-[#00BFFF] transition-all">
                  ↗ Test
                </a>
              )}
            </div>
          </div>

          {/* Inline hero preview */}
          <div className="mt-2 p-5 rounded-xl bg-gradient-to-b from-[#070b12] to-[#09152a] border border-white/5">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 mb-3">Hero Preview</p>
            <div className="font-['Space_Grotesk'] font-black text-3xl text-[#00BFFF] tracking-wider">{form.heroTitle || 'BLUE TIERS'}</div>
            <div className="text-gray-400 text-sm mt-1">{form.heroSubtitle || '#1 Tier List'}</div>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[#00BFFF] text-xs font-mono">{form.serverIP || 'play.example.com'}</span>
              <span className="text-gray-600 text-xs">· Click to Copy</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: ANNOUNCEMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'announcement' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">📢</span>
                <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Site-wide Announcement Banner</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                form.announcementEnabled
                  ? 'bg-green-500/10 border-green-500/20 text-green-400'
                  : 'bg-white/5 border-white/10 text-gray-600'
              }`}>{form.announcementEnabled ? 'LIVE' : 'OFF'}</span>
            </div>

            <Toggle label="Enable Announcement Banner" desc="Shows a dismissible banner at the very top of every page."
              value={form.announcementEnabled} onChange={v => set('announcementEnabled', v)} />

            <Field label="Announcement Text" desc="Main message displayed in the banner. Keep under 120 characters for best display."
              value={form.announcementText} onChange={v => set('announcementText', v)}
              placeholder="Server maintenance scheduled for Friday 8PM UTC." maxLength={160} />

            <div>
              <label className="block text-white text-sm font-semibold mb-1">Banner Type</label>
              <p className="text-gray-600 text-xs mb-3">Controls the colour and icon of the banner.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ANNOUNCEMENT_TYPES.map(t => (
                  <button key={t.value} onClick={() => set('announcementType', t.value)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.announcementType === t.value
                        ? `${t.bg} ${t.color} ring-1 ring-inset ring-current/30`
                        : 'bg-white/3 border-white/10 text-gray-500 hover:text-gray-300'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Action Link URL" desc="Optional — URL the 'Learn more' link opens."
                value={form.announcementLink} onChange={v => set('announcementLink', v)}
                placeholder="https://..." type="url" />
              <Field label="Action Link Label" desc="Text of the clickable link in the banner."
                value={form.announcementLinkLabel} onChange={v => set('announcementLinkLabel', v)}
                placeholder="Learn more" maxLength={30} />
            </div>
          </div>

          {/* Banner preview */}
          {form.announcementEnabled && (
            <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${announcementStyle?.bg ?? ''}`}>
              <span className={`text-sm ${announcementStyle?.color ?? 'text-white'}`}>
                {form.announcementType === 'info' ? 'ℹ️' : form.announcementType === 'warning' ? '⚠️' : form.announcementType === 'success' ? '✅' : '🎉'}
              </span>
              <p className={`text-sm flex-1 ${announcementStyle?.color ?? 'text-white'}`}>
                {form.announcementText || 'Your announcement text will appear here.'}
                {form.announcementLink && form.announcementLinkLabel && (
                  <span className="ml-2 underline underline-offset-2 cursor-pointer">{form.announcementLinkLabel}</span>
                )}
              </p>
              <span className="text-gray-500 text-sm cursor-pointer">✕</span>
            </div>
          )}
          {!form.announcementEnabled && (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-4 text-center text-gray-600 text-xs">
              Enable the banner above to see a live preview here.
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: SOCIAL LINKS
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'social' && (
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <span className="text-base">🔗</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Social Links</h3>
            <p className="text-gray-600 text-xs ml-1">Shown in the footer and share prompts</p>
          </div>

          {([
            { key: 'discordLink' as const,  label: 'Discord',  icon: '💬', placeholder: 'https://discord.gg/...',       prefix: 'discord.gg/' },
            { key: 'twitterLink' as const,  label: 'Twitter/X', icon: '𝕏', placeholder: 'https://x.com/...',          prefix: 'x.com/' },
            { key: 'youtubeLink' as const,  label: 'YouTube',  icon: '▶', placeholder: 'https://youtube.com/@...',    prefix: 'youtube.com/' },
            { key: 'twitchLink' as const,   label: 'Twitch',   icon: '🎮', placeholder: 'https://twitch.tv/...',       prefix: 'twitch.tv/' },
            { key: 'githubLink' as const,   label: 'GitHub',   icon: '⌥', placeholder: 'https://github.com/...',     prefix: 'github.com/' },
          ]).map(s => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-white text-sm font-semibold flex items-center gap-2">
                  <span>{s.icon}</span> {s.label}
                </label>
                {form[s.key] && (
                  <a href={form[s.key]} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-[#00BFFF] hover:underline">↗ open</a>
                )}
              </div>
              <div className="flex gap-2">
                <input type="url" value={form[s.key]} onChange={e => set(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  className="flex-1 bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700" />
                {form[s.key] && (
                  <button onClick={() => handleCopy(form[s.key], s.key)}
                    className="px-3 py-2 rounded-xl text-xs border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all">
                    {copied === s.key ? '✓' : '⎘'}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="pt-2 border-t border-white/5">
            <p className="text-gray-600 text-xs">Leave a field blank to hide that platform from the site. Discord is also used as the default invite link.</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: SEO & META
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'seo' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
              <span className="text-base">🔍</span>
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">SEO &amp; Open Graph</h3>
              <p className="text-gray-600 text-xs ml-1">Control how your site appears in search &amp; social previews</p>
            </div>

            <Field label="Page Title" desc="Browser tab title and Google search result headline. Keep under 60 characters."
              value={form.seoTitle} onChange={v => set('seoTitle', v)}
              placeholder="Blue Tiers — #1 Minecraft PvP Tier List" maxLength={60} />

            <Field label="Meta Description" desc="Shown in Google results and social shares. Aim for 140–160 characters."
              value={form.seoDescription} onChange={v => set('seoDescription', v)}
              placeholder="The definitive tier list for Minecraft PvP players." maxLength={160} multiline />

            <Field label="Keywords" desc="Comma-separated keywords for meta tags (less critical for modern SEO but useful)."
              value={form.seoKeywords} onChange={v => set('seoKeywords', v)}
              placeholder="minecraft, pvp, tier list, blue tiers" maxLength={200} />

            <Field label="OG Image URL" desc="Social preview image shown when the site is shared on Discord, Twitter, etc. Recommended: 1200×630 px."
              value={form.ogImageUrl} onChange={v => set('ogImageUrl', v)}
              placeholder="https://your-cdn.com/og-image.png" type="url" />

            {form.ogImageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/8">
                <img src={form.ogImageUrl} alt="OG preview" className="w-full object-cover max-h-40" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          {/* Google SERP preview */}
          <div className="glass rounded-2xl border border-white/8 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">Google Result Preview</p>
            <div className="space-y-0.5">
              <p className="text-[#00BFFF] text-base font-medium hover:underline cursor-pointer truncate">{form.seoTitle || 'Blue Tiers — #1 Minecraft PvP Tier List'}</p>
              <p className="text-green-600 text-xs">https://bluetiers.com</p>
              <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{form.seoDescription || 'The definitive tier list for Minecraft PvP players.'}</p>
            </div>
          </div>

          {/* Twitter Card preview */}
          <div className="glass rounded-2xl border border-white/8 p-5">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">Twitter Card Preview</p>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              {form.ogImageUrl
                ? <img src={form.ogImageUrl} alt="OG" className="w-full object-cover h-36" onError={e => (e.currentTarget.style.display='none')} />
                : <div className="w-full h-36 bg-white/3 flex items-center justify-center text-gray-700 text-xs">OG image will appear here</div>
              }
              <div className="px-4 py-3 bg-[#070b12] border-t border-white/5">
                <p className="text-white text-sm font-semibold truncate">{form.seoTitle || 'Blue Tiers'}</p>
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{form.seoDescription || 'No description set.'}</p>
                <p className="text-gray-700 text-[10px] mt-1">bluetiers.com</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: FOOTER
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'footer' && (
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <span className="text-base">🦶</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Footer Settings</h3>
            <p className="text-gray-600 text-xs ml-1">Bottom-of-page copyright, tagline, and visible elements</p>
          </div>

          <Field label="Copyright Line" desc="Legal text shown at the bottom of the footer."
            value={form.footerCopyright} onChange={v => set('footerCopyright', v)}
            placeholder="© 2026 Blue Tiers. All rights reserved." maxLength={100} />

          <Field label="Footer Tagline" desc="Second line under the copyright — typically a disclaimer."
            value={form.footerTagline} onChange={v => set('footerTagline', v)}
            placeholder="Not affiliated with Mojang or Microsoft." maxLength={100} />

          <Field label="Extra Footer Note" desc="Optional third line for announcements, credits, or additional disclaimers."
            value={form.footerExtra} onChange={v => set('footerExtra', v)}
            placeholder="Powered by Blue Tiers v2.0" maxLength={120} />

          <div className="pt-2 border-t border-white/5 space-y-4">
            <p className="text-white text-sm font-semibold">Visible Elements</p>
            <Toggle label="Show Server IP" desc="Displays the Minecraft server IP address in the footer."
              value={form.footerShowServerIP} onChange={v => set('footerShowServerIP', v)} />
            <Toggle label="Show Discord Button" desc="Shows the Discord invite link / button in the footer."
              value={form.footerShowDiscord} onChange={v => set('footerShowDiscord', v)} />
            <Toggle label="Show Social Icons" desc="Displays Twitter, YouTube, Twitch etc. icon links in the footer."
              value={form.footerShowSocials} onChange={v => set('footerShowSocials', v)} />
          </div>

          {/* Footer mini-preview */}
          <div className="mt-2 p-4 rounded-xl bg-[#070b12] border border-white/5 text-center space-y-1">
            <p className="text-gray-600 text-xs">{form.footerCopyright || '© 2026 Blue Tiers.'}</p>
            <p className="text-gray-700 text-xs">{form.footerTagline}</p>
            {form.footerExtra && <p className="text-gray-700 text-xs">{form.footerExtra}</p>}
            <div className="flex justify-center gap-3 pt-1">
              {form.footerShowServerIP && <span className="text-[10px] text-[#00BFFF]/60 font-mono">{form.serverIP}</span>}
              {form.footerShowDiscord && <span className="text-[10px] text-[#00BFFF]/60">Discord</span>}
              {form.footerShowSocials && (
                <>
                  {form.twitterLink && <span className="text-[10px] text-gray-600">𝕏</span>}
                  {form.youtubeLink && <span className="text-[10px] text-gray-600">▶</span>}
                  {form.twitchLink  && <span className="text-[10px] text-gray-600">🎮</span>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: LIVE PREVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'preview' && (
        <div className="space-y-4">
          {/* Announcement */}
          {form.announcementEnabled && form.announcementText && (
            <div className={`rounded-xl border px-4 py-2.5 flex items-center gap-2.5 ${announcementStyle?.bg ?? ''}`}>
              <span className="text-sm">{form.announcementType === 'info' ? 'ℹ️' : form.announcementType === 'warning' ? '⚠️' : form.announcementType === 'success' ? '✅' : '🎉'}</span>
              <p className={`text-sm flex-1 ${announcementStyle?.color ?? ''}`}>{form.announcementText}</p>
            </div>
          )}

          {/* Navbar */}
          <div className="rounded-xl bg-[#0b0f17] border border-white/8 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✕</span>
              <span className="font-['Space_Grotesk'] font-bold text-sm">
                <span className="text-[#00BFFF]">Blue</span> Tiers
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
              <span>Home</span><span>Rankings</span><span>Mining</span><span>Shop</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#00BFFF] text-xs font-semibold text-[#0b0f17]">
              Join Discord
            </div>
          </div>

          {/* Hero */}
          <div className="rounded-xl bg-gradient-to-b from-[#0b1120] to-[#070b12] border border-white/5 px-6 py-10 text-center space-y-3">
            <div className="font-['Space_Grotesk'] font-black text-4xl text-[#00BFFF] tracking-widest">{form.heroTitle || 'BLUE TIERS'}</div>
            <div className="text-gray-400 text-sm">{form.heroSubtitle}</div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 mt-2">
              <span className="text-[#00BFFF] text-xs font-mono">{form.serverIP}</span>
              <span className="text-gray-700 text-xs">Click to Copy</span>
            </div>
            <div className="flex justify-center gap-3 mt-3">
              <div className="px-5 py-2 rounded-lg bg-[#00BFFF] text-xs font-semibold text-[#070b12]">View Rankings</div>
              <a href={form.discordLink || '#'} className="px-5 py-2 rounded-lg bg-white/8 border border-white/10 text-xs text-gray-300">Join Discord</a>
            </div>
          </div>

          {/* Footer */}
          <div className="rounded-xl bg-[#070b12] border border-white/5 px-5 py-4 text-center space-y-1.5">
            <div className="flex justify-center gap-4 text-xs text-gray-500 mb-2">
              {form.footerShowServerIP && <span className="font-mono text-[#00BFFF]/60">{form.serverIP}</span>}
              {form.footerShowDiscord && <span className="text-[#00BFFF]/60">Discord</span>}
            </div>
            <p className="text-gray-600 text-xs">{form.footerCopyright}</p>
            <p className="text-gray-700 text-xs">{form.footerTagline}</p>
            {form.footerExtra && <p className="text-gray-700 text-xs">{form.footerExtra}</p>}
          </div>

          {/* SEO summary */}
          <div className="glass rounded-xl border border-white/8 p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">SEO Summary</p>
            <p className="text-xs"><span className="text-gray-600 w-28 inline-block">Title:</span><span className="text-white">{form.seoTitle || '—'}</span></p>
            <p className="text-xs"><span className="text-gray-600 w-28 inline-block">Description:</span><span className="text-gray-400">{form.seoDescription || '—'}</span></p>
            <p className="text-xs"><span className="text-gray-600 w-28 inline-block">Keywords:</span><span className="text-gray-400">{form.seoKeywords || '—'}</span></p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: HISTORY
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="space-y-3">
          <div className="glass rounded-2xl border border-white/8 p-6">
            <div className="flex items-center gap-2 pb-1 border-b border-white/5 mb-5">
              <span className="text-base">🕓</span>
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Save History</h3>
              <p className="text-gray-600 text-xs ml-1">Restore any previous configuration from this session</p>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-700 text-sm">
                <div className="text-3xl mb-2 opacity-30">🕓</div>
                No saves yet this session. History builds up as you save.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((snap, i) => (
                  <div key={snap.ts} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/3 border border-white/8 hover:border-white/12 transition-all">
                    <div>
                      <p className="text-white text-sm font-semibold">
                        {i === 0 ? 'Latest save' : `Save ${history.length - i}`}
                      </p>
                      <p className="text-gray-600 text-xs">{snap.label} · {new Date(snap.ts).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleRestoreSnapshot(snap)}
                      className="px-3 py-1.5 rounded-lg text-xs text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all">
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl border border-white/8 p-5">
            <p className="text-white text-sm font-semibold mb-1">Export / Import Config</p>
            <p className="text-gray-600 text-xs mb-4">Download your current settings as JSON, or paste a previously exported config to restore it.</p>
            <div className="flex gap-2">
              <button onClick={handleExport} className="flex-1 py-2.5 rounded-xl text-sm text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">↓ Export JSON</button>
              <button onClick={() => setShowImport(true)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">↑ Import JSON</button>
            </div>
          </div>

          <button onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/8 transition-all">
            Reset All Content to Defaults
          </button>
        </div>
      )}

      {/* ── Bottom action bar (always visible except on preview/history) ─── */}
      {tab !== 'preview' && tab !== 'history' && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
          <button onClick={handleSave} className="btn-primary px-8 py-2.5 rounded-xl text-sm font-semibold text-white">
            Save Content
          </button>
          <button onClick={() => setShowResetConfirm(true)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            Reset to Defaults
          </button>
          <button onClick={() => setTab('preview')} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-[#00BFFF]/20 hover:text-[#00BFFF] transition-all">
            👁 Preview
          </button>
        </div>
      )}

      {/* ── Reset confirm modal ─────────────────────────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-red-500/20 p-7 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-white font-bold text-lg mb-2">Reset All Content?</h3>
            <p className="text-gray-500 text-sm mb-6">Every field will revert to the hardcoded defaults. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:text-white transition-all">Cancel</button>
              <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition-all">Reset Everything</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import modal ─────────────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-white/12 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-white font-bold text-base mb-2">Import Content Config</h3>
            <p className="text-gray-500 text-xs mb-3">Paste a previously exported JSON blob. Only valid keys will be applied.</p>
            <textarea value={importText} onChange={e => setImportText(e.target.value)}
              rows={8} placeholder='{ "heroTitle": "...", ... }'
              className="w-full bg-white/3 border border-white/10 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-xs font-mono outline-none transition-all resize-none" />
            <div className="flex gap-3 mt-3">
              <button onClick={() => { setShowImport(false); setImportText('') }} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10">Cancel</button>
              <button onClick={handleImport} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#00BFFF] border border-[#00BFFF]/30 bg-[#00BFFF]/8 hover:bg-[#00BFFF]/15 transition-all">Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => {
        const file = e.target.files?.[0]; if (!file) return
        const reader = new FileReader()
        reader.onload = ev => { setImportText(ev.target?.result as string); setShowImport(true) }
        reader.readAsText(file)
      }} />
    </div>
  )
}
