import { useState, useEffect, type CSSProperties } from 'react'
import { getEventConfig, saveEventConfig, resetEventConfig } from '../../store/contentStore'
import type { EventConfig } from '../../data/event'
import { addLog } from '../../store/adminStore'

interface Props { admin: string }

type EventTab = 'identity' | 'schedule' | 'details' | 'display' | 'preview' | 'history'

interface EventSnapshot {
  ts: number
  label: string
  data: EventConfig
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
  const colours = {
    success: 'bg-green-500/15 border-green-500/30 text-green-400',
    error:   'bg-red-500/15 border-red-500/30 text-red-400',
    info:    'bg-[#00BFFF]/10 border-[#00BFFF]/25 text-[#00BFFF]',
  }
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border flex items-center gap-2 ${colours[type]}`}>
      {type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'} {msg}
    </div>
  )
}

function Field({
  label, desc, value, onChange, placeholder, multiline, maxLength, type = 'text', monospace = false
}: {
  label: string; desc: string; value: string | number; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; maxLength?: number; type?: string; monospace?: boolean
}) {
  const cls = `w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700 ${monospace ? 'font-mono' : ''}`
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-white text-sm font-semibold">{label}</label>
        {maxLength && (
          <span className={`text-[10px] ${String(value).length > maxLength * 0.9 ? 'text-orange-400' : 'text-gray-700'}`}>
            {String(value).length}/{maxLength}
          </span>
        )}
      </div>
      <p className="text-gray-600 text-xs mb-2">{desc}</p>
      {multiline ? (
        <textarea value={String(value)} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          maxLength={maxLength} rows={4}
          className={cls + ' resize-none'} />
      ) : (
        <input type={type} value={String(value)} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLength}
          className={cls} />
      )}
    </div>
  )
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-4">
      <button onClick={() => onChange(!value)}
        className={`relative mt-0.5 w-11 h-6 rounded-full border transition-all duration-300 shrink-0 ${
          value ? 'bg-[#00BFFF]/20 border-[#00BFFF]/40' : 'bg-white/5 border-white/10'
        }`}>
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

const EVENT_TYPES = [
  { value: 'pvp',       label: '⚔️ PvP Tournament', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  { value: 'community', label: '🌐 Community',       color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  { value: 'update',    label: '🚀 Update Launch',   color: 'text-[#00BFFF]',  bg: 'bg-[#00BFFF]/10 border-[#00BFFF]/20' },
  { value: 'seasonal',  label: '🌸 Seasonal',        color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  { value: 'custom',    label: '✨ Custom',           color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
] as const

const BANNER_STYLES = [
  { value: 'default', label: 'Default',  gradient: 'from-[#070b12] via-[#09152a] to-[#070b12]',  accent: '#00BFFF' },
  { value: 'gold',    label: 'Gold',     gradient: 'from-[#120e02] via-[#1c1505] to-[#120e02]',   accent: '#F5A623' },
  { value: 'red',     label: 'Red',      gradient: 'from-[#120205] via-[#1c0508] to-[#120205]',   accent: '#FF4D4F' },
  { value: 'green',   label: 'Green',    gradient: 'from-[#021209] via-[#051c0f] to-[#021209]',   accent: '#52C41A' },
  { value: 'purple',  label: 'Purple',   gradient: 'from-[#09021c] via-[#120533] to-[#09021c]',   accent: '#7B2FBE' },
  { value: 'orange',  label: 'Orange',   gradient: 'from-[#120602] via-[#1c0e05] to-[#120602]',   accent: '#FA8C16' },
] as const

const TAB_LIST: { id: EventTab; label: string; icon: string }[] = [
  { id: 'identity', label: 'Identity',  icon: '🎯' },
  { id: 'schedule', label: 'Schedule',  icon: '📅' },
  { id: 'details',  label: 'Details',   icon: '📋' },
  { id: 'display',  label: 'Display',   icon: '🎨' },
  { id: 'preview',  label: 'Preview',   icon: '👁' },
  { id: 'history',  label: 'History',   icon: '🕓' },
]

function toLocalDatetime(iso: string) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  } catch { return '' }
}

function fromLocalDatetime(local: string) {
  if (!local) return ''
  try { return new Date(local).toISOString() } catch { return local }
}

function Countdown({ target }: { target: string }) {
  const [diff, setDiff] = useState(0)
  useEffect(() => {
    const update = () => setDiff(new Date(target).getTime() - Date.now())
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [target])
  if (!target || diff <= 0) return null
  const s = Math.floor(diff / 1000)
  const days = Math.floor(s / 86400)
  const hrs  = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  return (
    <div className="flex items-center gap-2">
      {[{ v: days, l: 'D' }, { v: hrs, l: 'H' }, { v: mins, l: 'M' }, { v: secs, l: 'S' }].map(({ v, l }) => (
        <div key={l} className="text-center">
          <div className="font-['Space_Grotesk'] font-black text-xl text-[#00BFFF] w-10 h-10 rounded-xl bg-[#00BFFF]/8 border border-[#00BFFF]/15 flex items-center justify-center">
            {String(v).padStart(2, '0')}
          </div>
          <div className="text-[9px] text-gray-600 mt-0.5">{l}</div>
        </div>
      ))}
    </div>
  )
}

function BannerPreview({ form }: { form: EventConfig }) {
  const style = BANNER_STYLES.find(s => s.value === (form.bannerStyle ?? 'default')) ?? BANNER_STYLES[0]
  const typeInfo = EVENT_TYPES.find(t => t.value === form.eventType)
  const endDate = form.registrationEnds ? new Date(form.registrationEnds) : null
  const isExpired = endDate ? endDate <= new Date() : false
  return (
    <div className={`rounded-xl border bg-gradient-to-r ${style.gradient} overflow-hidden`}
      style={{ borderColor: style.accent + '26' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: style.accent + '1A' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isExpired ? '#4B5563' : style.accent }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: style.accent }}>
            {typeInfo?.label ?? 'EVENT'} — {isExpired ? 'Closed' : 'Open'}
          </span>
        </div>
        {!isExpired && form.registrationEnds && <Countdown target={form.registrationEnds} />}
      </div>
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-['Space_Grotesk'] font-black text-base text-white uppercase tracking-wide">{form.title}</p>
          <p className="text-gray-400 text-xs mt-0.5">{isExpired ? 'Registrations are now closed.' : form.subtitle}</p>
          {form.prizePool && <p className="text-xs mt-1" style={{ color: style.accent }}>🏆 Prize Pool: {form.prizePool}</p>}
        </div>
        <a href={form.buttonLink || '#'} target="_blank" rel="noopener noreferrer"
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-bold text-[#0b0f17] transition-all"
          style={{ background: isExpired ? '#4B5563' : style.accent }}>
          {isExpired ? form.closedButtonText : form.buttonText}
        </a>
      </div>
    </div>
  )
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export function EventManager({ admin }: Props) {
  const [form, setForm] = useState<EventConfig>(getEventConfig)
  const [tab, setTab] = useState<EventTab>('identity')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [history, setHistory] = useState<EventSnapshot[]>([])
  const [copied, setCopied] = useState('')

  function set<K extends keyof EventConfig>(key: K, val: EventConfig[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function showMsg(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  function handleSave() {
    saveEventConfig(form)
    addLog(admin, 'event:save', `Updated event: "${form.title}"`)
    setHistory(prev => [{
      ts: Date.now(),
      label: `${admin} · ${new Date().toLocaleTimeString()}`,
      data: { ...form },
    }, ...prev.slice(0, 9)])
    showMsg('Event saved — changes appear on next page load.')
  }

  function handleReset() {
    resetEventConfig()
    setForm(getEventConfig())
    setShowResetConfirm(false)
    addLog(admin, 'event:reset', 'Reset event config to defaults')
    showMsg('Event reset to defaults.')
  }

  function handleDuplicate() {
    setForm(prev => ({ ...prev, title: prev.title + ' (Copy)', visible: false }))
    showMsg('Event duplicated — edit and save.', 'info')
  }

  function handleCopyShareText() {
    const endDate = form.registrationEnds ? new Date(form.registrationEnds).toLocaleDateString() : 'TBD'
    const text = [
      `🎉 ${form.title}`,
      form.subtitle,
      form.description ? `\n${form.description}` : '',
      `\n📅 Registration ends: ${endDate}`,
      form.prizePool ? `🏆 Prize pool: ${form.prizePool}` : '',
      form.maxParticipants ? `👥 Max participants: ${form.maxParticipants}` : '',
      form.streamLink ? `📺 Stream: ${form.streamLink}` : '',
      `\n🔗 Register: ${form.buttonLink}`,
    ].filter(Boolean).join('\n')
    copyToClipboard(text)
    setCopied('share')
    setTimeout(() => setCopied(''), 2000)
    showMsg('Event announcement copied to clipboard!', 'info')
  }

  const endDate = form.registrationEnds ? new Date(form.registrationEnds) : null
  const startDate = form.eventStartDate ? new Date(form.eventStartDate) : null
  const isExpired = endDate ? endDate <= new Date() : false
  const _isStarted = startDate ? startDate <= new Date() : false; void _isStarted

  let phase = 'Pending'
  let phaseColor = 'text-gray-400 bg-white/5 border-white/10'
  if (form.visible === false) { phase = 'Hidden'; phaseColor = 'text-gray-500 bg-white/3 border-white/5' }
  else if (!isExpired) { phase = 'Registration Open'; phaseColor = 'text-green-400 bg-green-500/8 border-green-500/20' }
  else if (isExpired && (!form.eventEndDate || new Date(form.eventEndDate) > new Date())) { phase = 'In Progress'; phaseColor = 'text-[#00BFFF] bg-[#00BFFF]/8 border-[#00BFFF]/20' }
  else { phase = 'Ended'; phaseColor = 'text-red-400 bg-red-500/8 border-red-500/20' }

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-[#00BFFF] shadow-[0_0_8px_rgba(0,191,255,0.7)]" />
          <h2 className="font-['Space_Grotesk'] font-black text-white text-lg">Event Manager</h2>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ml-1 ${phaseColor}`}>{phase}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopyShareText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            {copied === 'share' ? '✓ Copied' : '📋 Copy Announcement'}
          </button>
          <button onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            ⎘ Duplicate
          </button>
          <button onClick={handleSave}
            className="btn-primary px-5 py-2 rounded-lg text-sm font-semibold text-white">
            Save Event
          </button>
        </div>
      </div>

      {/* ── Status strip ─────────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${phaseColor}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${!isExpired && form.visible !== false ? 'animate-pulse' : ''}`}
            style={{ background: !isExpired && form.visible !== false ? '#4ade80' : '#6B7280' }} />
          <span>Phase: <strong>{phase}</strong></span>
        </div>
        <div className="flex items-center gap-4 text-xs opacity-70">
          {endDate && !isExpired && (
            <span>Reg. ends {endDate.toLocaleDateString()} {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          {form.maxParticipants ? <span>Cap: {form.currentParticipants ?? 0}/{form.maxParticipants}</span> : null}
        </div>
      </div>

      {/* ── Live countdown ───────────────────────────────────────────────────── */}
      {form.registrationEnds && !isExpired && (
        <div className="glass rounded-2xl border border-white/8 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-600">Registration closes in</p>
            <p className="text-gray-400 text-xs mt-0.5">{endDate?.toLocaleString()}</p>
          </div>
          <Countdown target={form.registrationEnds} />
        </div>
      )}

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
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: IDENTITY
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'identity' && (
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <span className="text-base">🎯</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Event Identity</h3>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-1">Event Type</label>
            <p className="text-gray-600 text-xs mb-3">Sets the badge and tone of the event banner.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENT_TYPES.map(t => (
                <button key={t.value} onClick={() => set('eventType', t.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.eventType === t.value
                      ? `${t.bg} ${t.color} ring-1 ring-inset ring-current/20`
                      : 'bg-white/3 border-white/10 text-gray-500 hover:text-gray-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.eventType === 'custom' && (
            <Field label="Custom Type Label" desc="Shown in the banner type badge when Event Type is Custom."
              value={form.customTypeLabel ?? ''} onChange={v => set('customTypeLabel', v)}
              placeholder="e.g. Build Contest" maxLength={30} />
          )}

          <Field label="Event Title" desc="Main event name — shown large in the banner. Usually all-caps reads well."
            value={form.title} onChange={v => set('title', v)}
            placeholder="Blue Network PvP World Cup" maxLength={60} />

          <Field label="Subtitle" desc="Small text shown below the title when registrations are open."
            value={form.subtitle} onChange={v => set('subtitle', v)}
            placeholder="Registrations are now open!" maxLength={100} />

          <Field label="Description" desc="Longer description shown in event detail pages and share text. Optional."
            value={form.description ?? ''} onChange={v => set('description', v)}
            placeholder="Compete against the best players on the network for prizes and glory. All skill levels welcome." maxLength={400} multiline />

          <Field label="Organiser Name" desc="Person or team running the event. Optional."
            value={form.organizerName ?? ''} onChange={v => set('organizerName', v)}
            placeholder="Blue Tiers Staff" maxLength={60} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: SCHEDULE
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'schedule' && (
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <span className="text-base">📅</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Event Schedule</h3>
            <p className="text-gray-600 text-xs ml-1">All dates use your local timezone and are stored in UTC.</p>
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-1">Registration End Date & Time <span className="text-red-400">*</span></label>
            <p className="text-gray-600 text-xs mb-2">When this passes, the banner automatically switches to the "closed" state. Required.</p>
            <input type="datetime-local" value={toLocalDatetime(form.registrationEnds)}
              onChange={e => set('registrationEnds', fromLocalDatetime(e.target.value))}
              className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" />
            {endDate && (
              <p className="text-gray-600 text-[10px] mt-1">
                UTC: {endDate.toUTCString()} · {isExpired ? '⛔ Already expired' : `⏳ ${Math.ceil((endDate.getTime() - Date.now()) / 86400000)} days remaining`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-1">Event Start Date & Time</label>
            <p className="text-gray-600 text-xs mb-2">When the actual event begins (can differ from registration end). Optional.</p>
            <input type="datetime-local" value={toLocalDatetime(form.eventStartDate ?? '')}
              onChange={e => set('eventStartDate', fromLocalDatetime(e.target.value))}
              className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" />
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-1">Event End Date & Time</label>
            <p className="text-gray-600 text-xs mb-2">When the event fully wraps up. Once passed, the phase shows "Ended". Optional.</p>
            <input type="datetime-local" value={toLocalDatetime(form.eventEndDate ?? '')}
              onChange={e => set('eventEndDate', fromLocalDatetime(e.target.value))}
              className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" />
          </div>

          {/* Timeline visual */}
          {(form.registrationEnds || form.eventStartDate || form.eventEndDate) && (
            <div className="mt-2 p-4 rounded-xl bg-white/2 border border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">Timeline</p>
              <div className="space-y-2">
                {[
                  { label: 'Registration closes', date: form.registrationEnds,  color: '#00BFFF' },
                  { label: 'Event starts',         date: form.eventStartDate,    color: '#52C41A' },
                  { label: 'Event ends',           date: form.eventEndDate,      color: '#FF4D4F' },
                ].filter(r => r.date).map(row => {
                  const d = new Date(row.date!)
                  const past = d <= new Date()
                  return (
                    <div key={row.label} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 border-2" style={{ borderColor: row.color, background: past ? row.color : 'transparent' }} />
                      <span className="text-gray-500 text-xs w-36 shrink-0">{row.label}</span>
                      <span className="text-white text-xs">{d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {past && <span className="text-[10px] text-gray-600">· passed</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: DETAILS
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'details' && (
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-white/5">
            <span className="text-base">📋</span>
            <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Event Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="CTA Button Text" desc="Button label when registration is open."
              value={form.buttonText} onChange={v => set('buttonText', v)}
              placeholder="Participate Now!" maxLength={40} />
            <Field label="Closed Button Text" desc="Button label after registration closes."
              value={form.closedButtonText} onChange={v => set('closedButtonText', v)}
              placeholder="Registrations Closed" maxLength={40} />
          </div>

          <div>
            <label className="block text-white text-sm font-semibold mb-1">CTA Button Link</label>
            <p className="text-gray-600 text-xs mb-2">URL the button opens — usually your Discord registration channel.</p>
            <div className="flex gap-2">
              <input type="url" value={form.buttonLink} onChange={e => set('buttonLink', e.target.value)}
                placeholder="https://discord.gg/..."
                className="flex-1 bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder-gray-700" />
              {form.buttonLink && (
                <a href={form.buttonLink} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs border border-white/10 hover:border-[#00BFFF]/30 text-gray-400 hover:text-[#00BFFF] transition-all">
                  ↗ Test
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prize Pool" desc="Total prizes on offer — shown in the banner & share text."
              value={form.prizePool ?? ''} onChange={v => set('prizePool', v)}
              placeholder="$500 + in-game perks" maxLength={60} />
            <Field label="Stream Link" desc="Twitch/YouTube stream URL for the event broadcast."
              value={form.streamLink ?? ''} onChange={v => set('streamLink', v)}
              placeholder="https://twitch.tv/..." type="url" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-semibold mb-1">Max Participants</label>
              <p className="text-gray-600 text-xs mb-2">Participant cap. Set to 0 for unlimited.</p>
              <input type="number" min={0} value={form.maxParticipants ?? 0}
                onChange={e => set('maxParticipants', parseInt(e.target.value) || 0)}
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" />
            </div>
            <div>
              <label className="block text-white text-sm font-semibold mb-1">Current Participants</label>
              <p className="text-gray-600 text-xs mb-2">Manually tracked sign-up count.</p>
              <input type="number" min={0} value={form.currentParticipants ?? 0}
                onChange={e => set('currentParticipants', parseInt(e.target.value) || 0)}
                className="w-full bg-white/3 border border-white/10 hover:border-white/20 focus:border-[#00BFFF]/40 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all" />
            </div>
          </div>

          {(form.maxParticipants ?? 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Participants</span>
                <span className="text-white font-semibold">{form.currentParticipants ?? 0} / {form.maxParticipants}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-[#00BFFF] transition-all"
                  style={{ width: `${Math.min(100, ((form.currentParticipants ?? 0) / (form.maxParticipants!)) * 100)}%` }} />
              </div>
            </div>
          )}

          <Field label="Rules & Format" desc="Event rules, bracket format, or any info players need to know. Shown in detail views."
            value={form.rulesText ?? ''} onChange={v => set('rulesText', v)}
            placeholder="1v1 elimination bracket. Best of 3. UHC rules apply..." maxLength={1000} multiline />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: DISPLAY
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'display' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
              <span className="text-base">🎨</span>
              <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">Banner Display</h3>
            </div>

            <Toggle label="Show Event Banner" desc="When off, the event banner is completely hidden from the site."
              value={form.visible !== false} onChange={v => set('visible', v)} />

            <Toggle label="Pin Banner to Top" desc="When pinned, the event banner appears above everything including the nav."
              value={form.pinned === true} onChange={v => set('pinned', v)} />

            <div>
              <label className="block text-white text-sm font-semibold mb-1">Banner Style</label>
              <p className="text-gray-600 text-xs mb-3">Colour theme of the event banner strip.</p>
              <div className="grid grid-cols-3 gap-2">
                {BANNER_STYLES.map(s => (
                  <button key={s.value} onClick={() => set('bannerStyle', s.value)}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all bg-gradient-to-r ${s.gradient} ${
                      form.bannerStyle === s.value
                        ? 'ring-2 ring-offset-1 ring-offset-[#0B0F17]'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                    style={form.bannerStyle === s.value ? { '--tw-ring-color': s.accent } as CSSProperties : {}}>
                    <div className="w-4 h-4 rounded-full mx-auto mb-1.5" style={{ background: s.accent }} />
                    <span style={{ color: s.accent }}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="glass rounded-2xl border border-white/8 p-5 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600">Live Banner Preview</p>
            <BannerPreview form={form} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB: PREVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      {tab === 'preview' && (
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/8 p-5 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600">Full Banner Preview</p>
            {form.visible !== false ? (
              <BannerPreview form={form} />
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-gray-600 text-sm">
                Banner is hidden. Enable it in the Display tab.
              </div>
            )}
          </div>

          {/* Event info card */}
          <div className="glass rounded-2xl border border-white/8 p-5 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">Event Summary</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {[
                { l: 'Title',        v: form.title },
                { l: 'Type',         v: EVENT_TYPES.find(t => t.value === form.eventType)?.label ?? form.eventType },
                { l: 'Reg. Ends',    v: endDate ? endDate.toLocaleDateString() : '—' },
                { l: 'Starts',       v: startDate ? startDate.toLocaleDateString() : '—' },
                { l: 'Prize Pool',   v: form.prizePool || '—' },
                { l: 'Participants', v: (form.maxParticipants ?? 0) > 0 ? `${form.currentParticipants ?? 0}/${form.maxParticipants}` : 'Unlimited' },
                { l: 'Organiser',    v: form.organizerName || '—' },
                { l: 'Phase',        v: phase },
              ].map(r => (
                <div key={r.l} className="flex gap-2">
                  <span className="text-gray-600 w-24 shrink-0">{r.l}:</span>
                  <span className="text-white">{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleCopyShareText}
            className="w-full py-3 rounded-xl text-sm text-gray-300 border border-white/10 hover:border-[#00BFFF]/25 hover:text-[#00BFFF] transition-all">
            {copied === 'share' ? '✓ Copied to clipboard!' : '📋 Copy Event Announcement for Discord'}
          </button>
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
              <p className="text-gray-600 text-xs ml-1">Restore any version from this session</p>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-700 text-sm">
                <div className="text-3xl mb-2 opacity-30">🕓</div>
                No saves yet — history builds here as you save.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((snap, i) => (
                  <div key={snap.ts} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/3 border border-white/8 hover:border-white/12 transition-all">
                    <div>
                      <p className="text-white text-sm font-semibold">{snap.data.title}</p>
                      <p className="text-gray-600 text-xs">{snap.label} · {i === 0 ? 'latest' : new Date(snap.ts).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => { setForm({ ...snap.data }); showMsg('Snapshot restored — review and save.', 'info') }}
                      className="px-3 py-1.5 rounded-lg text-xs text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all">
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/8 transition-all">
            Reset Event to Defaults
          </button>
        </div>
      )}

      {/* ── Bottom action bar ─────────────────────────────────────────────────── */}
      {tab !== 'preview' && tab !== 'history' && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
          <button onClick={handleSave} className="btn-primary px-8 py-2.5 rounded-xl text-sm font-semibold text-white">
            Save Event
          </button>
          <button onClick={() => setShowResetConfirm(true)} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 hover:text-white transition-all">
            Reset
          </button>
          <button onClick={() => setTab('preview')} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-[#00BFFF]/20 hover:text-[#00BFFF] transition-all">
            👁 Preview
          </button>
          <button onClick={handleCopyShareText} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 hover:text-white transition-all ml-auto">
            {copied === 'share' ? '✓ Copied' : '📋 Copy Announcement'}
          </button>
        </div>
      )}

      {/* ── Reset confirm modal ──────────────────────────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-red-500/20 p-7 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-white font-bold text-lg mb-2">Reset Event Config?</h3>
            <p className="text-gray-500 text-sm mb-6">All event settings will revert to the defaults. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10">Cancel</button>
              <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition-all">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
