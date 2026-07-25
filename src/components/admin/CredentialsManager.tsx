// ─── Credentials Manager — Grand Section ─────────────────────────────────────
// Comprehensive admin credential management system featuring:
//   • 6 tabs: Full Rotation, Username, Password 1, Password 2, Generator, Security
//   • Password Generator with length/charset controls, entropy + crack-time display
//   • Security Grade card (A-F), Rate Limit Monitor, Security Settings Editor
//   • Confirmation modal before every change, clipboard with auto-clear timer
//   • Admin Notes (localStorage), Activity Timeline, Password Comparison panel
//   • Inline entropy/crack-time on every new-password field

import {
  useState, useEffect, useRef, useCallback, useMemo, type ReactNode, type FormEvent,
} from 'react'
import {
  updateAdminCredentials, getAdminInfo,
  getAdminRateLimitStatus, getSecuritySettings, updateSecuritySettings,
} from '../../server/adminAuth'
import { getAdminSession, setAdminSession, addLog, getLogs } from '../../store/adminStore'

interface Props { admin: string }

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrengthResult { score: number; label: string; color: string; tips: string[] }

interface GenOptions {
  length:  number
  upper:   boolean
  lower:   boolean
  nums:    boolean
  syms:    boolean
  noAmbig: boolean
}

interface RotationEntry { ts: number; changed: string[] }

interface SecuritySettings {
  maxAttempts:    number
  lockoutMinutes: number
  sessionHours:   number
}

interface ConfirmState {
  title:    string
  changes:  string[]
  onConfirm: () => void
}

type ActiveTab = 'full-rotation' | 'username' | 'password1' | 'password2' | 'generator' | 'security'

// ─── Constants ────────────────────────────────────────────────────────────────

const HIST_KEY  = 'bn_cred_history'
const NOTES_KEY = 'bn_cred_notes'

const AMBIG = new Set(['0','O','l','1','I','i','o'])

// ─── Utility: Password Strength ───────────────────────────────────────────────

function measureStrength(pw: string): StrengthResult {
  if (!pw) return { score: 0, label: 'None', color: 'bg-gray-800', tips: [] }
  const tips: string[] = []
  let score = 0
  if (pw.length >= 8)  score++; else tips.push('Use at least 8 characters')
  if (pw.length >= 14) score++; else if (pw.length >= 8) tips.push('14+ characters recommended')
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++; else tips.push('Mix upper and lowercase')
  if (/\d/.test(pw)) score++; else tips.push('Add numbers')
  if (/[^A-Za-z0-9]/.test(pw)) { if (score < 4) score++ } else tips.push('Add symbols (!@#$…)')
  const capped = Math.min(score, 4) as 0|1|2|3|4
  return {
    score: capped,
    label: ['None','Weak','Fair','Good','Strong'][capped],
    color: ['bg-gray-800','bg-red-500','bg-orange-400','bg-yellow-400','bg-green-400'][capped],
    tips,
  }
}

// ─── Utility: Entropy & Crack Time ────────────────────────────────────────────

function calcEntropy(pw: string): number {
  if (!pw) return 0
  let cs = 0
  if (/[a-z]/.test(pw)) cs += 26
  if (/[A-Z]/.test(pw)) cs += 26
  if (/\d/.test(pw))    cs += 10
  if (/[^a-zA-Z0-9]/.test(pw)) cs += 32
  return Math.floor(pw.length * Math.log2(cs || 1))
}

function estimateCrackTime(bits: number): string {
  // Assume 1 billion guesses / second (GPU cracking)
  const secs = Math.pow(2, bits) / 1e9
  if (secs < 1)          return '< 1 second'
  if (secs < 60)         return `${Math.floor(secs)}s`
  if (secs < 3_600)      return `${Math.floor(secs / 60)}min`
  if (secs < 86_400)     return `${Math.floor(secs / 3_600)}h`
  if (secs < 864_000)    return `${Math.floor(secs / 86_400)}d`
  if (secs < 2_592_000)  return `${Math.floor(secs / 86_400)}d`
  if (secs < 31_536_000) return `${Math.floor(secs / 2_592_000)}mo`
  const yrs = secs / 31_536_000
  if (yrs < 1_000)       return `${Math.floor(yrs)}yr`
  if (yrs < 1e6)         return `${(yrs / 1000).toFixed(1)}k yr`
  if (yrs < 1e9)         return `${(yrs / 1e6).toFixed(1)}M yr`
  return `${yrs.toExponential(1)} yr`
}

// ─── Utility: Password Generator ─────────────────────────────────────────────

function generatePassword(opts: GenOptions): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const nums  = '0123456789'
  const syms  = '!@#$%^&*-_=+?'

  const filterAmbig = (s: string) => opts.noAmbig ? s.split('').filter(c => !AMBIG.has(c)).join('') : s

  const pools: string[] = []
  if (opts.lower) pools.push(filterAmbig(lower))
  if (opts.upper) pools.push(filterAmbig(upper))
  if (opts.nums)  pools.push(filterAmbig(nums))
  if (opts.syms)  pools.push(syms)
  if (pools.length === 0) pools.push(lower)

  const full = pools.join('')
  const arr  = new Uint8Array(opts.length)
  crypto.getRandomValues(arr)
  let pw = Array.from(arr).map(b => full[b % full.length]).join('')

  // Guarantee at least one char from each active pool
  const rnd = new Uint8Array(pools.length)
  crypto.getRandomValues(rnd)
  const chars = pw.split('')
  pools.forEach((pool, i) => {
    chars[i % opts.length] = pool[rnd[i] % pool.length]
  })
  // Shuffle with Fisher-Yates
  const sh = new Uint8Array(chars.length)
  crypto.getRandomValues(sh)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = sh[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// ─── Utility: Security Grade ──────────────────────────────────────────────────

function calcGrade(factors: {
  p1Score: number; p2Score: number
  p1Hashed: boolean; p2Hashed: boolean
  daysSince: number | null
  histLen: number
}): { grade: string; label: string; color: string; bg: string; score: number } {
  let s = 0
  s += factors.p1Score * 8    // 0–32
  s += factors.p2Score * 8    // 0–32
  if (factors.p1Hashed) s += 10
  if (factors.p2Hashed) s += 10
  if (factors.histLen > 0) s += 5
  if (factors.daysSince !== null && factors.daysSince <= 90) s += 5
  if (factors.daysSince !== null && factors.daysSince <= 30) s += 5  // bonus for recent rotation
  const pct = Math.min(100, s)
  if (pct >= 88) return { grade: 'A', label: 'Excellent',  color: 'text-green-400',    bg: 'bg-green-500/10 border-green-500/25',     score: pct }
  if (pct >= 72) return { grade: 'B', label: 'Good',       color: 'text-[#00BFFF]',    bg: 'bg-[#00BFFF]/10 border-[#00BFFF]/25',    score: pct }
  if (pct >= 56) return { grade: 'C', label: 'Fair',       color: 'text-yellow-400',   bg: 'bg-yellow-500/10 border-yellow-500/25',   score: pct }
  if (pct >= 40) return { grade: 'D', label: 'Weak',       color: 'text-orange-400',   bg: 'bg-orange-500/10 border-orange-500/25',   score: pct }
  return               { grade: 'F', label: 'Critical',   color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/25',         score: pct }
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadHistory(): RotationEntry[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]') } catch { return [] }
}
function pushHistory(changed: string[]) {
  try {
    const h = loadHistory()
    h.unshift({ ts: Date.now(), changed })
    localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 30)))
  } catch { /* quota */ }
}
function loadNotes(): string {
  try { return localStorage.getItem(NOTES_KEY) ?? '' } catch { return '' }
}
function saveNotes(notes: string) {
  try { localStorage.setItem(NOTES_KEY, notes) } catch { /* quota */ }
}
function timeAgo(ts: number): string {
  const d = Date.now() - ts
  if (d < 60_000)        return `${Math.floor(d / 1000)}s ago`
  if (d < 3_600_000)     return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000)    return `${Math.floor(d / 3_600_000)}h ago`
  if (d < 30*86_400_000) return `${Math.floor(d / 86_400_000)}d ago`
  return new Date(ts).toLocaleDateString()
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning'
interface ToastMsg { id: number; msg: string; type: ToastType }

function Toast({ toasts, remove }: { toasts: ToastMsg[]; remove: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={`pointer-events-auto px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl border backdrop-blur-sm cursor-pointer transition-all duration-200 max-w-sm ${
            t.type === 'success' ? 'bg-green-500/15 border-green-500/30 text-green-300' :
            t.type === 'error'   ? 'bg-red-500/15 border-red-500/30 text-red-300' :
            t.type === 'warning' ? 'bg-orange-500/15 border-orange-500/30 text-orange-300' :
            'bg-[#00BFFF]/12 border-[#00BFFF]/30 text-[#00BFFF]'
          }`}
        >
          <span className="mr-2">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const ctr = useRef(0)
  const push   = useCallback((msg: string, type: ToastType = 'info') => {
    const id = ++ctr.current
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])
  return { toasts, push, remove }
}

// ─── Clipboard Button with Auto-Clear ────────────────────────────────────────

function ClipboardBtn({ text, label = 'Copy', size = 'sm' }: { text: string; label?: string; size?: 'sm'|'xs' }) {
  const [state, setState] = useState<'idle'|'copied'|number>('idle')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function handleCopy() {
    if (!text) return
    navigator.clipboard.writeText(text).catch(() => {})
    setState(30)
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (typeof prev === 'number') {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            navigator.clipboard.writeText('').catch(() => {})
            return 'idle'
          }
          return prev - 1
        }
        return 'idle'
      })
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const isCounting = typeof state === 'number'
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs'

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className={`shrink-0 ${textSize} font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
        isCounting
          ? 'bg-orange-500/10 border-orange-500/25 text-orange-400'
          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200'
      }`}
    >
      {isCounting ? `🕐 ${state}s` : `📋 ${label}`}
    </button>
  )
}

// ─── Entropy Badge ────────────────────────────────────────────────────────────

function EntropyBadge({ password }: { password: string }) {
  if (!password) return null
  const bits = calcEntropy(password)
  const time = estimateCrackTime(bits)
  const color = bits >= 60 ? 'text-green-400' : bits >= 40 ? 'text-yellow-400' : bits >= 25 ? 'text-orange-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-3 text-[10px] mt-1">
      <span className={`font-mono font-bold ${color}`}>{bits} bits</span>
      <span className="text-gray-700">·</span>
      <span className="text-gray-600">Crack @ 1B/s: <span className={color}>{time}</span></span>
    </div>
  )
}

// ─── Strength Bar ──────────────────────────────────────────────────────────────

function StrengthBar({ password, showEntropy }: { password: string; showEntropy?: boolean }) {
  const s = measureStrength(password)
  return (
    <div className="space-y-1">
      <div className="flex gap-1 h-1.5">
        {[1,2,3,4].map(i => (
          <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= s.score ? s.color : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold ${
          s.score === 4 ? 'text-green-400' : s.score === 3 ? 'text-yellow-400' :
          s.score === 2 ? 'text-orange-400' : s.score >= 1 ? 'text-red-400' : 'text-gray-700'
        }`}>{password ? s.label : ''}</span>
        {s.tips[0] && <span className="text-[10px] text-gray-600 truncate max-w-[60%]">Tip: {s.tips[0]}</span>}
      </div>
      {showEntropy && <EntropyBadge password={password} />}
    </div>
  )
}

// ─── Password Input ───────────────────────────────────────────────────────────

function PasswordInput({
  label, value, onChange, placeholder, showStrength, showEntropy, disabled, autoComplete, onInsert,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; showStrength?: boolean; showEntropy?: boolean
  disabled?: boolean; autoComplete?: string; onInsert?: (pw: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="relative flex gap-1.5">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder ?? '••••••••••'}
            disabled={disabled}
            autoComplete={autoComplete}
            className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 focus:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-mono"
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors text-base"
          >{show ? '🙈' : '👁'}</button>
        </div>
        {onInsert && (
          <button
            type="button"
            onClick={() => onInsert(value)}
            title="Use this value from the Generator"
            className="px-2.5 rounded-xl border border-dashed border-[#00BFFF]/20 text-[#00BFFF]/50 hover:border-[#00BFFF]/50 hover:text-[#00BFFF] transition-all text-xs"
          >✨</button>
        )}
      </div>
      {showStrength && <StrengthBar password={value} showEntropy={showEntropy} />}
      {!showStrength && showEntropy && <EntropyBadge password={value} />}
    </div>
  )
}

// ─── Card + CardHeader ────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white/2 border border-white/6 rounded-2xl p-6 space-y-5 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ icon, title, subtitle, badge }: {
  icon: string; title: string; subtitle: string; badge?: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/8 border border-[#00BFFF]/15 flex items-center justify-center text-lg shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-['Space_Grotesk'] font-bold text-white text-sm">{title}</h3>
          {badge}
        </div>
        <p className="text-gray-600 text-xs mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({ state, onConfirm, onCancel }: {
  state: ConfirmState; onConfirm: () => void; onCancel: () => void
}) {
  const [input, setInput] = useState('')
  const ok = input.trim().toUpperCase() === 'CONFIRM'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="bg-[#0a0e17] border border-white/12 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <div>
            <h3 className="font-['Space_Grotesk'] font-bold text-white">{state.title}</h3>
            <p className="text-gray-500 text-xs">This action will revoke all existing sessions</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 space-y-2">
          <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">What will change</p>
          {state.changes.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-orange-300">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              {c}
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 text-[11px] text-red-400 leading-relaxed">
          You will be signed out immediately. Log in with the new credentials to continue.
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-500">Type <span className="font-mono text-orange-400">CONFIRM</span> to proceed:</label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ok && onConfirm()}
            placeholder="CONFIRM"
            autoFocus
            className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 transition-all font-mono"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 text-sm font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ok}
            className="flex-1 py-2.5 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold transition-all"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Password Generator Panel ─────────────────────────────────────────────────

function PasswordGenerator({ onInsertP1, onInsertP2 }: {
  onInsertP1: (pw: string) => void
  onInsertP2: (pw: string) => void
}) {
  const [opts, setOpts] = useState<GenOptions>({
    length: 20, upper: true, lower: true, nums: true, syms: true, noAmbig: true,
  })
  const [generated, setGenerated] = useState('')
  const [show, setShow] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  function gen() {
    const pw = generatePassword(opts)
    setGenerated(pw)
    setHistory(p => [pw, ...p].slice(0, 5))
  }

  useEffect(() => { gen() }, [])  // generate on mount

  const bits    = calcEntropy(generated)
  const crackT  = estimateCrackTime(bits)
  const entropy = bits
  const entropyColor = bits >= 60 ? 'text-green-400' : bits >= 40 ? 'text-yellow-400' : bits >= 25 ? 'text-orange-400' : 'text-red-400'
  const strength = measureStrength(generated)

  function toggle(key: keyof GenOptions) {
    setOpts(p => {
      const next = { ...p, [key]: !p[key] }
      // Ensure at least one charset is active
      if (!next.upper && !next.lower && !next.nums && !next.syms) return p
      return next
    })
  }

  useEffect(() => { if (generated) gen() }, [opts])

  return (
    <Card>
      <CardHeader icon="✨" title="Password Generator" subtitle="Cryptographically secure random passwords with configurable options" />

      {/* Generated Password Display */}
      <div className="space-y-2">
        <div className="relative group">
          <div className={`w-full bg-black/30 border border-[#00BFFF]/20 rounded-xl px-4 py-4 pr-24 font-mono text-sm break-all leading-relaxed tracking-wider ${show ? 'text-white' : 'text-transparent select-none'}`}
            style={show ? {} : { textShadow: '0 0 8px rgba(255,255,255,0.5)' }}>
            {generated || '—'}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button type="button" onClick={() => setShow(v => !v)}
              className="px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-200 transition-colors text-sm">
              {show ? '🙈' : '👁'}
            </button>
            <ClipboardBtn text={generated} label="Copy" />
          </div>
        </div>

        {/* Strength + Entropy */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 h-1.5 flex-1">
            {[1,2,3,4].map(i => (
              <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-white/10'}`} />
            ))}
          </div>
          <span className={`text-[10px] font-bold ${entropyColor}`}>{entropy} bits</span>
          <span className="text-[10px] text-gray-600">·</span>
          <span className="text-[10px] text-gray-500">crack: <span className={entropyColor}>{crackT}</span></span>
        </div>
      </div>

      {/* Length Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Length</label>
          <span className="font-mono text-sm font-bold text-[#00BFFF]">{opts.length}</span>
        </div>
        <input
          type="range" min={8} max={64} step={1} value={opts.length}
          onChange={e => setOpts(p => ({ ...p, length: Number(e.target.value) }))}
          className="w-full accent-[#00BFFF] h-1.5 rounded-full cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>8</span><span>16</span><span>24</span><span>32</span><span>48</span><span>64</span>
        </div>
      </div>

      {/* Charset Toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {([
          { key: 'upper',   icon: '🔠', label: 'Uppercase',   sub: 'A-Z'  },
          { key: 'lower',   icon: '🔡', label: 'Lowercase',   sub: 'a-z'  },
          { key: 'nums',    icon: '🔢', label: 'Numbers',     sub: '0-9'  },
          { key: 'syms',    icon: '🔣', label: 'Symbols',     sub: '!@#…' },
          { key: 'noAmbig', icon: '👁', label: 'No Ambiguous',sub: '0/O/l/1' },
        ] as { key: keyof GenOptions; icon: string; label: string; sub: string }[]).map(({ key, icon, label, sub }) => {
          const active = !!opts[key]
          return (
            <button key={key} type="button"
              onClick={() => toggle(key)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all duration-200 ${
                active ? 'bg-[#00BFFF]/10 border-[#00BFFF]/25 text-[#00BFFF]' : 'bg-white/2 border-white/6 text-gray-600 hover:border-white/12 hover:text-gray-400'
              }`}
            >
              <span className="text-sm">{icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold truncate">{label}</p>
                <p className="text-[9px] opacity-60">{sub}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button" onClick={gen}
          className="col-span-3 sm:col-span-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00BFFF]/12 border border-[#00BFFF]/25 text-[#00BFFF] text-xs font-bold hover:bg-[#00BFFF]/20 transition-all"
        >
          ↺ Regenerate
        </button>
        <button
          type="button" onClick={() => { onInsertP1(generated); }}
          className="py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold hover:bg-purple-500/18 transition-all"
        >
          → P1
        </button>
        <button
          type="button" onClick={() => { onInsertP2(generated); }}
          className="py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/18 transition-all"
        >
          → P2
        </button>
      </div>

      {/* Generator History */}
      {history.length > 1 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Recent Generations</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.slice(1).map((pw, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/2 border border-white/5 group">
                <span className="font-mono text-[10px] text-gray-600 flex-1 truncate blur-sm group-hover:blur-none transition-all">{pw}</span>
                <ClipboardBtn text={pw} label="Copy" size="xs" />
                <button type="button" onClick={() => setGenerated(pw)}
                  className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors px-1.5 py-1 rounded border border-white/8 hover:border-white/15">
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-3 rounded-xl bg-[#00BFFF]/4 border border-[#00BFFF]/10 text-[11px] text-gray-600 leading-relaxed space-y-1">
        <p className="text-[#00BFFF]/70 font-semibold text-[10px]">ℹ Generator Notes</p>
        <p>Uses <span className="font-mono text-gray-400">crypto.getRandomValues()</span> — cryptographically secure. Each charset is guaranteed to appear at least once. Clipboard auto-clears after 30 seconds.</p>
      </div>
    </Card>
  )
}

// ─── Security Grade Card ──────────────────────────────────────────────────────

function SecurityGradeCard({ p1Score, p2Score, p1Hashed, p2Hashed, history }: {
  p1Score: number; p2Score: number; p1Hashed: boolean; p2Hashed: boolean; history: RotationEntry[]
}) {
  const daysSince = history.length > 0 ? Math.floor((Date.now() - history[0].ts) / 86_400_000) : null
  const g = calcGrade({ p1Score, p2Score, p1Hashed, p2Hashed, daysSince, histLen: history.length })

  const factors: { label: string; ok: boolean; detail: string }[] = [
    { label: 'Password 1 strength', ok: p1Score >= 3, detail: ['—','Weak','Fair','Good','Strong'][p1Score] },
    { label: 'Password 2 strength', ok: p2Score >= 3, detail: ['—','Weak','Fair','Good','Strong'][p2Score] },
    { label: 'Password 1 hashed',   ok: p1Hashed, detail: p1Hashed ? 'scrypt' : 'Plaintext!' },
    { label: 'Password 2 hashed',   ok: p2Hashed, detail: p2Hashed ? 'scrypt' : 'Plaintext!' },
    { label: 'Rotation history',    ok: history.length > 0, detail: history.length > 0 ? `${history.length} rotation(s)` : 'None' },
    {
      label: 'Rotation recency', ok: daysSince !== null && daysSince <= 90,
      detail: daysSince !== null ? `${daysSince}d ago` : 'Never rotated'
    },
  ]

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`w-20 h-20 rounded-2xl border-2 ${g.bg} flex flex-col items-center justify-center shrink-0`}>
          <span className={`text-4xl font-black font-['Space_Grotesk'] ${g.color}`}>{g.grade}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-['Space_Grotesk'] font-bold text-white">Security Grade</h3>
          <p className={`text-sm font-bold mt-0.5 ${g.color}`}>{g.label}</p>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${g.color.replace('text-','bg-').replace('-400','-500')} transition-all duration-700`} style={{ width: `${g.score}%` }} />
          </div>
          <p className="text-[10px] text-gray-600 mt-1">{g.score}/100 points</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {factors.map(f => (
          <div key={f.label} className={`flex items-center gap-2 p-2.5 rounded-xl border ${f.ok ? 'bg-green-500/5 border-green-500/15' : 'bg-orange-500/5 border-orange-500/15'}`}>
            <span className="text-sm shrink-0">{f.ok ? '✅' : '⚠️'}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-300 truncate">{f.label}</p>
              <p className={`text-[10px] ${f.ok ? 'text-gray-600' : 'text-orange-400'}`}>{f.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {daysSince !== null && daysSince > 90 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-500/8 border border-orange-500/20 text-orange-400 text-xs">
          <span>⚠</span>
          <span>Last rotated {daysSince} days ago — consider rotating credentials (recommended: every 90 days).</span>
        </div>
      )}
    </Card>
  )
}

// ─── Rate Limit Monitor ───────────────────────────────────────────────────────

function RateLimitMonitor({ session }: { session: ReturnType<typeof getAdminSession> }) {
  const [status, setStatus] = useState<{
    attempts: number; maxAttempts: number; blocked: boolean; remainingMs: number; ip?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  async function refresh() {
    if (!session) return
    setLoading(true)
    try {
      const res = await getAdminRateLimitStatus({ data: { token: session.token, username: session.username, loginAt: session.loginAt } })
      if (res.ok) {
        setStatus({ attempts: res.attempts, maxAttempts: res.maxAttempts, blocked: res.blocked, remainingMs: res.remainingMs, ip: res.ip })
        setCountdown(Math.ceil(res.remainingMs / 1000))
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!status?.blocked) return
    const id = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) { refresh(); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [status?.blocked])

  const attemptsLeft = status ? status.maxAttempts - status.attempts : null
  const pct = status ? (status.attempts / status.maxAttempts) * 100 : 0

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardHeader icon="🚫" title="Rate Limit Monitor" subtitle="Login attempt tracking for your IP" />
        <button onClick={refresh} disabled={loading}
          className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors shrink-0 disabled:opacity-40">
          {loading ? '…' : '↺ Refresh'}
        </button>
      </div>

      {!status ? (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="w-3 h-3 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {status.blocked ? (
            <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 space-y-1">
              <p className="text-xs font-bold text-red-400">🔒 IP Locked Out</p>
              <p className="text-[11px] text-red-400/70">
                Unlocks in <span className="font-mono font-bold">{Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}</span>
              </p>
            </div>
          ) : (
            <div className={`p-3 rounded-xl border ${status.attempts === 0 ? 'bg-green-500/5 border-green-500/15' : 'bg-orange-500/5 border-orange-500/15'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-bold ${status.attempts === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                  {status.attempts === 0 ? '✅ No Failed Attempts' : `⚠ ${status.attempts} Failed Attempt${status.attempts>1?'s':''}`}
                </p>
                <span className={`text-[10px] font-mono ${status.attempts === 0 ? 'text-green-400' : 'text-orange-400'}`}>
                  {attemptsLeft} / {status.maxAttempts} remaining
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct === 0 ? 'bg-green-500' : pct < 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-white/2 border border-white/5 space-y-0.5">
              <p className="text-gray-700 uppercase tracking-widest">Attempts Used</p>
              <p className="font-mono font-bold text-white">{status.attempts} / {status.maxAttempts}</p>
            </div>
            <div className="p-2 rounded-lg bg-white/2 border border-white/5 space-y-0.5">
              <p className="text-gray-700 uppercase tracking-widest">Your IP</p>
              <p className="font-mono font-bold text-gray-300 truncate">{status.ip ?? '—'}</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-700">
            Rate limit resets automatically after {status.maxAttempts} failed attempts trigger a lockout.
            Successful logins reset the counter.
          </p>
        </div>
      )}
    </Card>
  )
}

// ─── Security Settings Panel ──────────────────────────────────────────────────

function SecuritySettingsPanel({ session, onSaved }: {
  session: ReturnType<typeof getAdminSession>
  onSaved: (s: SecuritySettings) => void
}) {
  const [current, setCurrent]  = useState<SecuritySettings | null>(null)
  const [draft, setDraft]      = useState<SecuritySettings | null>(null)
  const [curP1, setCurP1]      = useState('')
  const [curP2, setCurP2]      = useState('')
  const [saving, setSaving]    = useState(false)
  const [err, setErr]          = useState('')
  const [ok, setOk]            = useState(false)

  useEffect(() => {
    if (!session) return
    getSecuritySettings({ data: { token: session.token, username: session.username, loginAt: session.loginAt } })
      .then(res => {
        if (res.ok) {
          setCurrent(res.settings)
          setDraft(res.settings)
        }
      }).catch(() => {})
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!draft || !curP1 || !curP2) return
    setSaving(true); setErr(''); setOk(false)
    try {
      const res = await updateSecuritySettings({ data: { currentPassword1: curP1, currentPassword2: curP2, settings: draft } })
      if (!res.ok) { setErr(res.error ?? 'Failed'); return }
      setCurrent(res.settings)
      setDraft(res.settings)
      setOk(true)
      setCurP1(''); setCurP2('')
      onSaved(res.settings)
      setTimeout(() => setOk(false), 3000)
    } catch (e: any) { setErr(e?.message ?? 'Network error') }
    finally { setSaving(false) }
  }

  const dirty = draft && current && JSON.stringify(draft) !== JSON.stringify(current)

  return (
    <Card>
      <CardHeader icon="⚙️" title="Security Settings" subtitle="Tune rate limiting and session behaviour. Both passwords required to save." />

      {!draft ? (
        <p className="text-xs text-gray-600">Loading settings…</p>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {/* Max Attempts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Max Login Attempts</label>
              <span className="font-mono text-sm font-bold text-white">{draft.maxAttempts}</span>
            </div>
            <input type="range" min={1} max={20} step={1} value={draft.maxAttempts}
              onChange={e => setDraft(p => p ? { ...p, maxAttempts: Number(e.target.value) } : p)}
              className="w-full accent-[#00BFFF] h-1.5 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-700">
              <span>1 (strict)</span><span>5 (default)</span><span>20 (relaxed)</span>
            </div>
          </div>

          {/* Lockout Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Lockout Duration</label>
              <span className="font-mono text-sm font-bold text-white">
                {draft.lockoutMinutes < 60 ? `${draft.lockoutMinutes}min` : `${Math.floor(draft.lockoutMinutes/60)}h ${draft.lockoutMinutes%60>0?draft.lockoutMinutes%60+'min':''}`}
              </span>
            </div>
            <input type="range" min={1} max={120} step={1} value={draft.lockoutMinutes}
              onChange={e => setDraft(p => p ? { ...p, lockoutMinutes: Number(e.target.value) } : p)}
              className="w-full accent-[#00BFFF] h-1.5 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-700">
              <span>1min</span><span>15min</span><span>1hr</span><span>2hr</span>
            </div>
          </div>

          {/* Session TTL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Session TTL</label>
              <span className="font-mono text-sm font-bold text-white">{draft.sessionHours}h</span>
            </div>
            <input type="range" min={1} max={168} step={1} value={draft.sessionHours}
              onChange={e => setDraft(p => p ? { ...p, sessionHours: Number(e.target.value) } : p)}
              className="w-full accent-[#00BFFF] h-1.5 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-700">
              <span>1h</span><span>8h</span><span>24h</span><span>72h</span><span>168h</span>
            </div>
          </div>

          {dirty && (
            <>
              <div className="h-px bg-white/5" />
              <p className="text-[11px] text-gray-600">Enter current passwords to authorize settings change:</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <PasswordInput label="Current Password 1" value={curP1} onChange={setCurP1} autoComplete="current-password" />
                <PasswordInput label="Current Password 2" value={curP2} onChange={setCurP2} autoComplete="current-password" />
              </div>
              {err && <p className="text-xs text-red-400">{err}</p>}
              {ok  && <p className="text-xs text-green-400">✓ Settings saved</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(current)}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-gray-500 text-xs font-semibold hover:bg-white/5 transition-all">
                  Reset
                </button>
                <button type="submit" disabled={saving || !curP1 || !curP2}
                  className="flex-1 py-2 rounded-xl bg-[#00BFFF]/12 border border-[#00BFFF]/25 text-[#00BFFF] text-xs font-bold hover:bg-[#00BFFF]/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {saving ? <span className="w-3 h-3 border-2 border-[#00BFFF]/30 border-t-[#00BFFF] rounded-full animate-spin" /> : null}
                  Save Settings
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </Card>
  )
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

function ActivityTimeline() {
  const logs = useMemo(() => {
    try {
      return getLogs()
        .filter(l => l.action.startsWith('credentials') || l.action === 'auth:login' || l.action === 'auth:logout')
        .slice(0, 20)
    } catch { return [] }
  }, [])

  const iconFor = (action: string) => {
    if (action === 'credentials:update') return '🔄'
    if (action === 'auth:login')  return '🔓'
    if (action === 'auth:logout') return '🔒'
    return '📋'
  }

  return (
    <Card>
      <CardHeader icon="📡" title="Activity Timeline" subtitle="Recent credential & auth events" />
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <p className="text-center text-gray-700 text-xs py-4">No events recorded yet</p>
        ) : logs.map((l, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/2 border border-white/5">
            <span className="text-sm shrink-0 mt-0.5">{iconFor(l.action)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-300 truncate">
                {l.action.replace('credentials:', '').replace('auth:', '')}
              </p>
              {l.details && <p className="text-[10px] text-gray-600 truncate">{l.details}</p>}
              <p className="text-[10px] text-gray-700 mt-0.5">{timeAgo(l.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Admin Notes ──────────────────────────────────────────────────────────────

function AdminNotes() {
  const [notes, setNotes]   = useState(() => loadNotes())
  const [saved, setSaved]   = useState(false)
  const [editing, setEditing] = useState(false)

  function handleSave() {
    saveNotes(notes)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClear() {
    setNotes('')
    saveNotes('')
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardHeader icon="📝" title="Admin Notes" subtitle="Private notes about this account (stored locally)" />
        {saved && <span className="text-[10px] text-green-400 shrink-0">✓ Saved</span>}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder="e.g. Password manager entry: BlueTiers_Admin&#10;Last rotated: [date]&#10;Emergency contact: ..."
            className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 transition-all resize-none font-mono leading-relaxed"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 py-2 rounded-xl border border-white/10 text-gray-500 text-xs font-semibold hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="button" onClick={handleClear}
              className="py-2 px-3 rounded-xl border border-red-500/20 text-red-500/60 text-xs hover:text-red-400 hover:border-red-500/30 transition-all">
              Clear
            </button>
            <button type="button" onClick={handleSave}
              className="flex-1 py-2 rounded-xl bg-[#00BFFF]/12 border border-[#00BFFF]/25 text-[#00BFFF] text-xs font-bold hover:bg-[#00BFFF]/20 transition-all">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="min-h-[60px] p-3 rounded-xl bg-white/2 border border-dashed border-white/8 cursor-text hover:border-white/15 transition-all"
        >
          {notes ? (
            <p className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">{notes}</p>
          ) : (
            <p className="text-xs text-gray-700 italic">Click to add notes…</p>
          )}
        </div>
      )}
      <p className="text-[10px] text-gray-700">Notes are stored in your browser's localStorage — not sent to the server.</p>
    </Card>
  )
}

// ─── Password Comparison ──────────────────────────────────────────────────────

function PasswordComparison({ p1, p2 }: { p1: string; p2: string }) {
  if (!p1 && !p2) return null

  const s1 = measureStrength(p1)
  const s2 = measureStrength(p2)
  const e1 = calcEntropy(p1)
  const e2 = calcEntropy(p2)
  const same = p1 === p2

  // Detect high similarity (common prefix)
  const shortLen = Math.min(p1.length, p2.length)
  let commonPfx = 0
  for (let i = 0; i < shortLen; i++) {
    if (p1[i] === p2[i]) commonPfx++; else break
  }
  const similarityPct = shortLen > 0 ? Math.floor((commonPfx / shortLen) * 100) : 0
  const tooPct = similarityPct >= 50 && shortLen >= 4

  return (
    <div className="p-4 rounded-2xl border border-white/6 bg-white/2 space-y-3">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Password Comparison</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Password 1', pw: p1, s: s1, e: e1, color: 'border-purple-500/30 bg-purple-500/4' },
          { label: 'Password 2', pw: p2, s: s2, e: e2, color: 'border-green-500/30 bg-green-500/4' },
        ].map(col => (
          <div key={col.label} className={`rounded-xl border p-3 space-y-2 ${col.color}`}>
            <p className="text-[10px] font-bold text-gray-400">{col.label}</p>
            <div className="flex gap-1 h-1.5">
              {[1,2,3,4].map(i => (
                <div key={i} className={`flex-1 rounded-full ${i <= col.s.score ? col.s.color : 'bg-white/10'}`} />
              ))}
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="font-semibold text-gray-400">{col.pw ? col.s.label : '—'}</span>
              <span className="text-gray-600">{col.e > 0 ? `${col.e} bits` : '—'}</span>
            </div>
            <p className="text-[10px] text-gray-600">{col.pw.length} chars · {estimateCrackTime(col.e)}</p>
          </div>
        ))}
      </div>
      {same && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400 text-[11px]">
          <span>✕</span> Passwords 1 and 2 are identical — they must be different.
        </div>
      )}
      {!same && tooPct && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/8 border border-orange-500/20 text-orange-400 text-[11px]">
          <span>⚠</span> Passwords share a {similarityPct}% common prefix — consider making them more distinct.
        </div>
      )}
      {!same && !tooPct && p1 && p2 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/6 border border-green-500/15 text-green-400 text-[11px]">
          <span>✓</span> Passwords are distinct.
        </div>
      )}
    </div>
  )
}

// ─── Session Timer ────────────────────────────────────────────────────────────

function SessionTimer({ loginAt, sessionHours }: { loginAt: number; sessionHours: number }) {
  const [remaining, setRemaining] = useState(0)
  const TTL = sessionHours * 60 * 60 * 1000

  useEffect(() => {
    function tick() { setRemaining(Math.max(0, loginAt + TTL - Date.now())) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [loginAt, TTL])

  const h = Math.floor(remaining / 3_600_000)
  const m = Math.floor((remaining % 3_600_000) / 60_000)
  const s = Math.floor((remaining % 60_000) / 1000)
  const pct = Math.min(100, (remaining / TTL) * 100)
  const urgent = pct < 10

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Session expires in</span>
        <span className={`font-mono font-bold ${urgent ? 'text-red-400 animate-pulse' : 'text-[#00BFFF]'}`}>
          {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-500' : pct < 30 ? 'bg-orange-400' : 'bg-[#00BFFF]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-700">Logged in {timeAgo(loginAt)}. Session TTL: {sessionHours}h.</p>
    </div>
  )
}

// ─── Security Policy ──────────────────────────────────────────────────────────

function SecurityPolicy({ settings }: { settings: SecuritySettings | null }) {
  const rules = [
    { icon: '🔐', label: 'Dual-password system', desc: 'Two separate passwords required to log in — both must match.' },
    { icon: '🔑', label: 'scrypt hashing', desc: 'All passwords stored as scrypt hashes (salt + 64-byte key). Never plaintext.' },
    { icon: '🛡️', label: 'HMAC-SHA256 sessions', desc: 'Session tokens are signed with SESSION_SECRET. Tampering is detected on every page load.' },
    { icon: '⏱️', label: `${settings?.sessionHours ?? 8}-hour session TTL`, desc: `Sessions expire automatically. Re-authentication required after ${settings?.sessionHours ?? 8} hours.` },
    { icon: '🚫', label: `Rate limiting: ${settings?.maxAttempts ?? 5} attempts / ${settings?.lockoutMinutes ?? 15}min`, desc: `${settings?.maxAttempts ?? 5} failed login attempts trigger a ${settings?.lockoutMinutes ?? 15}-minute IP lockout.` },
    { icon: '⚡', label: 'Constant-time compare', desc: 'All credential comparisons use timingSafeEqual to prevent timing attacks.' },
    { icon: '📏', label: 'Password minimums', desc: 'Each password must be ≥ 8 characters. Passwords 1 & 2 must differ from each other.' },
    { icon: '🔄', label: 'Auto hash upgrade', desc: 'Plaintext passwords are automatically upgraded to scrypt on first login.' },
    { icon: '🕐', label: 'Session revocation', desc: 'Credential changes bump sessionInvalidBefore in admin.yml, rejecting all prior sessions server-side.' },
  ]
  return (
    <div className="grid gap-2">
      {rules.map(r => (
        <div key={r.label} className="flex items-start gap-3 p-3 rounded-xl bg-white/2 border border-white/5">
          <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
          <div>
            <p className="text-xs font-semibold text-gray-300">{r.label}</p>
            <p className="text-[11px] text-gray-600 leading-relaxed">{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CredentialsManager({ admin }: Props) {
  const { toasts, push, remove } = useToasts()
  const session = getAdminSession()

  // ── Server-fetched state ─────────────────────────────────────────────────
  const [serverUsername, setServerUsername] = useState<string>(admin)
  const [p1Hashed, setP1Hashed]             = useState(true)
  const [p2Hashed, setP2Hashed]             = useState(true)
  const [loadingInfo, setLoadingInfo]        = useState(true)
  const [settings, setSettings]             = useState<SecuritySettings | null>(null)

  // ── Local state ──────────────────────────────────────────────────────────
  const [history, setHistory] = useState<RotationEntry[]>([])
  const [tab, setTab]         = useState<ActiveTab>('full-rotation')
  const [busy, setBusy]       = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)

  // UI toggles
  const [showPolicy,  setShowPolicy]  = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [showDanger,  setShowDanger]  = useState(false)

  // ── Form: Full Rotation ─────────────────────────────────────────────────
  const [frCurP1,  setFrCurP1]  = useState('')
  const [frCurP2,  setFrCurP2]  = useState('')
  const [frNewUser,setFrNewUser] = useState('')
  const [frNewP1,  setFrNewP1]  = useState('')
  const [frNewP1c, setFrNewP1c] = useState('')
  const [frNewP2,  setFrNewP2]  = useState('')
  const [frNewP2c, setFrNewP2c] = useState('')

  // ── Form: Username ──────────────────────────────────────────────────────
  const [uNewUsername, setUNewUsername] = useState('')
  const [uCurP1,       setUCurP1]       = useState('')
  const [uCurP2,       setUCurP2]       = useState('')

  // ── Form: Password 1 ────────────────────────────────────────────────────
  const [p1CurP1,  setP1CurP1]  = useState('')
  const [p1CurP2,  setP1CurP2]  = useState('')
  const [p1New,    setP1New]    = useState('')
  const [p1Confirm,setP1Confirm]= useState('')

  // ── Form: Password 2 ────────────────────────────────────────────────────
  const [p2CurP1,  setP2CurP1]  = useState('')
  const [p2CurP2,  setP2CurP2]  = useState('')
  const [p2New,    setP2New]    = useState('')
  const [p2Confirm,setP2Confirm]= useState('')

  // Generator-inserted passwords (fed into forms)
  const [genP1, setGenP1] = useState('')
  const [genP2, setGenP2] = useState('')

  // Security grade inputs
  const p1Score = useMemo(() => measureStrength(genP1 || p1New || frNewP1).score, [genP1, p1New, frNewP1])
  const p2Score = useMemo(() => measureStrength(genP2 || p2New || frNewP2).score, [genP2, p2New, frNewP2])
  const grade   = useMemo(() => calcGrade({ p1Score, p2Score, p1Hashed, p2Hashed, daysSince: history.length > 0 ? Math.floor((Date.now()-history[0].ts)/86_400_000) : null, histLen: history.length }), [p1Score, p2Score, p1Hashed, p2Hashed, history])

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    setHistory(loadHistory())
    if (!session) { setLoadingInfo(false); return }
    const auth = { token: session.token, username: session.username, loginAt: session.loginAt }
    Promise.all([
      getAdminInfo({ data: auth }),
      getSecuritySettings({ data: auth }),
    ]).then(([info, sett]) => {
      if (info.ok) {
        setServerUsername(info.username)
        setP1Hashed(info.password1Hashed)
        setP2Hashed(info.password2Hashed)
      }
      if (sett.ok) setSettings(sett.settings)
    }).catch(() => {}).finally(() => setLoadingInfo(false))
  }, [])

  // ── call(): show confirm modal ───────────────────────────────────────────
  function prepareCall(
    payload: { currentPassword1: string; currentPassword2: string; newUsername?: string; newPassword1?: string; newPassword2?: string },
    logLabel: string,
  ) {
    if (busy) return
    const changes: string[] = []
    if (payload.newUsername)  changes.push(`Username → ${payload.newUsername}`)
    if (payload.newPassword1) changes.push('Password 1 updated')
    if (payload.newPassword2) changes.push('Password 2 updated')
    setConfirm({
      title: `Apply ${logLabel} Change`,
      changes,
      onConfirm: () => executeCall(payload, logLabel),
    })
  }

  async function executeCall(
    payload: { currentPassword1: string; currentPassword2: string; newUsername?: string; newPassword1?: string; newPassword2?: string },
    logLabel: string,
  ) {
    setConfirm(null)
    if (busy) return
    setBusy(true)
    try {
      const res = await updateAdminCredentials({ data: payload })
      if (!res.ok) { push(res.error, 'error'); return }
      const changed = res.changed ?? []
      pushHistory(changed)
      setHistory(loadHistory())
      addLog(admin, 'credentials:update', `Changed: ${changed.join(', ')}`)
      push(`${logLabel} updated — signing you out now…`, 'success')
      setTimeout(() => { setAdminSession(null); window.location.href = '/admin' }, 1800)
    } catch (e: any) {
      push(e?.message ?? 'Network error', 'error')
    } finally {
      setBusy(false)
    }
  }

  // ── Form handlers ─────────────────────────────────────────────────────────

  function handleFullRotation(e: FormEvent) {
    e.preventDefault()
    if (!frCurP1 || !frCurP2) { push('Enter both current passwords', 'warning'); return }
    if (frNewP1 && frNewP1 !== frNewP1c) { push('New Password 1 confirmation does not match', 'error'); return }
    if (frNewP2 && frNewP2 !== frNewP2c) { push('New Password 2 confirmation does not match', 'error'); return }
    if (frNewP1 && frNewP1.length < 8)   { push('Password 1 must be ≥ 8 characters', 'error'); return }
    if (frNewP2 && frNewP2.length < 8)   { push('Password 2 must be ≥ 8 characters', 'error'); return }
    if (frNewP1 && frNewP2 && frNewP1 === frNewP2) { push('Password 1 and 2 must differ', 'error'); return }
    const pl: Parameters<typeof prepareCall>[0] = { currentPassword1: frCurP1, currentPassword2: frCurP2 }
    if (frNewUser.trim()) pl.newUsername  = frNewUser.trim()
    if (frNewP1)          pl.newPassword1 = frNewP1
    if (frNewP2)          pl.newPassword2 = frNewP2
    if (!pl.newUsername && !pl.newPassword1 && !pl.newPassword2) { push('Fill at least one new field', 'warning'); return }
    prepareCall(pl, 'Credentials')
  }

  function handleChangeUsername(e: FormEvent) {
    e.preventDefault()
    if (!uNewUsername.trim()) { push('Enter a new username', 'warning'); return }
    if (uNewUsername.trim().length < 3) { push('Username must be ≥ 3 characters', 'error'); return }
    if (!uCurP1 || !uCurP2)  { push('Enter both current passwords to confirm', 'warning'); return }
    prepareCall({ currentPassword1: uCurP1, currentPassword2: uCurP2, newUsername: uNewUsername.trim() }, 'Username')
  }

  function handleChangeP1(e: FormEvent) {
    e.preventDefault()
    if (!p1New) { push('Enter a new password', 'warning'); return }
    if (p1New !== p1Confirm) { push('Passwords do not match', 'error'); return }
    if (p1New.length < 8) { push('Password must be ≥ 8 characters', 'error'); return }
    prepareCall({ currentPassword1: p1CurP1, currentPassword2: p1CurP2, newPassword1: p1New }, 'Password 1')
  }

  function handleChangeP2(e: FormEvent) {
    e.preventDefault()
    if (!p2New) { push('Enter a new password', 'warning'); return }
    if (p2New !== p2Confirm) { push('Passwords do not match', 'error'); return }
    if (p2New.length < 8) { push('Password must be ≥ 8 characters', 'error'); return }
    prepareCall({ currentPassword1: p2CurP1, currentPassword2: p2CurP2, newPassword2: p2New }, 'Password 2')
  }

  // When user clicks "→ P1" in generator, pre-fill full-rotation p1 and switch tab
  function handleInsertP1(pw: string) {
    setGenP1(pw)
    setFrNewP1(pw)
    setFrNewP1c(pw)
    setP1New(pw)
    setP1Confirm(pw)
    push('Inserted into Password 1 fields', 'info')
    setTab('full-rotation')
  }

  function handleInsertP2(pw: string) {
    setGenP2(pw)
    setFrNewP2(pw)
    setFrNewP2c(pw)
    setP2New(pw)
    setP2Confirm(pw)
    push('Inserted into Password 2 fields', 'info')
    setTab('full-rotation')
  }

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'full-rotation', label: 'Full Rotation', icon: '🔄' },
    { id: 'username',      label: 'Username',      icon: '👤' },
    { id: 'password1',     label: 'Password 1',    icon: '🔑' },
    { id: 'password2',     label: 'Password 2',    icon: '🗝️' },
    { id: 'generator',     label: 'Generator',     icon: '✨' },
    { id: 'security',      label: 'Security',      icon: '🛡️' },
  ]

  const sessionHours = settings?.sessionHours ?? 8

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Toast toasts={toasts} remove={remove} />
      {confirm && <ConfirmModal state={confirm} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00BFFF]/15 bg-gradient-to-br from-[#00BFFF]/6 via-transparent to-blue-900/10 p-6">
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="absolute w-px bg-gradient-to-b from-transparent via-[#00BFFF]/10 to-transparent"
              style={{ left: `${8 + i * 9}%`, height: '100%', top: 0, opacity: 0.3 + (i % 3) * 0.2 }} />
          ))}
        </div>
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/25 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(0,191,255,0.12)]">🔐</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-['Space_Grotesk'] font-black text-white text-xl tracking-tight">Admin Credentials</h2>
            <p className="text-gray-500 text-xs mt-0.5">Manage username, dual-password auth, rate limits, and session settings</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Security Grade */}
            <div className={`flex flex-col items-center px-4 py-2 rounded-xl border ${grade.bg}`}>
              <span className={`text-2xl font-black font-['Space_Grotesk'] ${grade.color}`}>{grade.grade}</span>
              <span className={`text-[10px] font-bold ${grade.color}`}>{grade.label}</span>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {loadingInfo ? (
                <div className="w-24 h-6 rounded bg-white/5 animate-pulse" />
              ) : (
                <>
                  <span className="px-3 py-1 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] text-xs font-bold">{serverUsername}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p1Hashed && p2Hashed ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                    {p1Hashed && p2Hashed ? '🔒 scrypt' : '⚠ Upgrade needed'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/5">
          {[
            { label: 'Auth Mode',      value: 'Dual Password',                                         icon: '🔑' },
            { label: 'Hash Algorithm', value: 'scrypt (64-byte)',                                       icon: '🧮' },
            { label: 'Session TTL',    value: settings ? `${settings.sessionHours}h` : '8h',           icon: '⏱️' },
            { label: 'Rate Limit',     value: settings ? `${settings.maxAttempts} att / ${settings.lockoutMinutes}min` : '5 / 15min', icon: '🚫' },
          ].map(s => (
            <div key={s.label} className="bg-white/3 border border-white/5 rounded-xl px-3 py-2.5">
              <p className="text-gray-700 text-[10px] uppercase tracking-widest">{s.icon} {s.label}</p>
              <p className="text-white text-xs font-bold mt-0.5 truncate">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Left col — forms (2/3) ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tab bar */}
          <div className="flex gap-1 p-1.5 bg-white/3 rounded-xl border border-white/6 flex-wrap sm:flex-nowrap overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200 whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/25 text-[#00BFFF] shadow-sm'
                    : 'text-gray-600 hover:text-gray-400 border border-transparent'
                }`}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── Full Rotation ──────────────────────────────────────────── */}
          {tab === 'full-rotation' && (
            <Card>
              <CardHeader
                icon="🔄" title="Full Credential Rotation"
                subtitle="Change username and/or both passwords in one operation. Leave any new field blank to keep it unchanged."
                badge={<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF]">Recommended</span>}
              />
              <form onSubmit={handleFullRotation} className="space-y-5">
                <div className="p-4 rounded-xl bg-white/2 border border-white/6 space-y-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-4 h-px bg-gray-700 inline-block" /> Verify Identity <span className="w-4 h-px bg-gray-700 inline-block" />
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <PasswordInput label="Current Password 1" value={frCurP1} onChange={setFrCurP1} autoComplete="current-password" />
                    <PasswordInput label="Current Password 2" value={frCurP2} onChange={setFrCurP2} autoComplete="current-password" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/2 border border-white/6 space-y-4">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-4 h-px bg-gray-700 inline-block" /> New Values (leave blank to keep current) <span className="w-4 h-px bg-gray-700 inline-block" />
                  </p>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">New Username</label>
                    <input type="text" value={frNewUser} onChange={e => setFrNewUser(e.target.value)}
                      placeholder={`Keep current: ${serverUsername}`} autoComplete="username"
                      className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 transition-all" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <PasswordInput label="New Password 1" value={frNewP1} onChange={setFrNewP1} placeholder="Leave blank to keep" showStrength showEntropy autoComplete="new-password" />
                    <PasswordInput label="Confirm Password 1" value={frNewP1c} onChange={setFrNewP1c} placeholder="Repeat new password 1" autoComplete="new-password" />
                  </div>
                  {frNewP1 && frNewP1c && frNewP1 !== frNewP1c && <p className="text-xs text-red-400 -mt-2">Passwords don't match</p>}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <PasswordInput label="New Password 2" value={frNewP2} onChange={setFrNewP2} placeholder="Leave blank to keep" showStrength showEntropy autoComplete="new-password" />
                    <PasswordInput label="Confirm Password 2" value={frNewP2c} onChange={setFrNewP2c} placeholder="Repeat new password 2" autoComplete="new-password" />
                  </div>
                  {frNewP2 && frNewP2c && frNewP2 !== frNewP2c && <p className="text-xs text-red-400 -mt-2">Passwords don't match</p>}
                  {frNewP1 && frNewP2 && frNewP1 === frNewP2 && (
                    <div className="px-4 py-3 rounded-xl bg-orange-500/8 border border-orange-500/20 text-orange-400 text-xs flex items-center gap-2">
                      <span>⚠</span> Password 1 and Password 2 must be different.
                    </div>
                  )}
                </div>

                {/* Password comparison */}
                {(frNewP1 || frNewP2) && <PasswordComparison p1={frNewP1} p2={frNewP2} />}

                <button type="submit" disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00BFFF] to-[#0066FF] text-white hover:from-[#00BFFF]/90 hover:to-[#0066FF]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,191,255,0.25)] hover:shadow-[0_0_30px_rgba(0,191,255,0.35)] flex items-center justify-center gap-2">
                  {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔄'}
                  {busy ? 'Updating…' : 'Apply Credential Rotation'}
                </button>
              </form>
            </Card>
          )}

          {/* ── Username ───────────────────────────────────────────────── */}
          {tab === 'username' && (
            <Card>
              <CardHeader icon="👤" title="Change Username" subtitle="Update the administrator login name. Both current passwords required." />
              <form onSubmit={handleChangeUsername} className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/5">
                  <span className="text-sm">👤</span>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">Current Username</p>
                    <p className="text-sm font-mono font-bold text-white">{serverUsername}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">New Username</label>
                  <input type="text" value={uNewUsername} onChange={e => setUNewUsername(e.target.value)}
                    placeholder="e.g. superadmin" autoComplete="username" minLength={3}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#00BFFF]/40 transition-all" />
                  {uNewUsername && uNewUsername.length < 3 && <p className="text-[11px] text-red-400">Must be ≥ 3 characters</p>}
                  {uNewUsername && uNewUsername === serverUsername && <p className="text-[11px] text-orange-400">Same as current username</p>}
                </div>
                <div className="h-px bg-white/5" />
                <p className="text-[11px] text-gray-600">Confirm identity — both current passwords required:</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <PasswordInput label="Current Password 1" value={uCurP1} onChange={setUCurP1} autoComplete="current-password" />
                  <PasswordInput label="Current Password 2" value={uCurP2} onChange={setUCurP2} autoComplete="current-password" />
                </div>
                <button type="submit" disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00BFFF] to-[#0066FF] text-white hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(0,191,255,0.2)] flex items-center justify-center gap-2">
                  {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '👤'}
                  {busy ? 'Updating…' : 'Update Username'}
                </button>
              </form>
            </Card>
          )}

          {/* ── Password 1 ─────────────────────────────────────────────── */}
          {tab === 'password1' && (
            <Card>
              <CardHeader icon="🔑" title="Change Password 1" subtitle="Primary login password. Both current passwords required to authorize." />
              <form onSubmit={handleChangeP1} className="space-y-4">
                <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Verify identity</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <PasswordInput label="Current Password 1" value={p1CurP1} onChange={setP1CurP1} autoComplete="current-password" />
                    <PasswordInput label="Current Password 2" value={p1CurP2} onChange={setP1CurP2} autoComplete="current-password" />
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <PasswordInput label="New Password 1" value={p1New} onChange={setP1New} showStrength showEntropy autoComplete="new-password" />
                <PasswordInput label="Confirm New Password 1" value={p1Confirm} onChange={setP1Confirm} autoComplete="new-password" />
                {p1New && p1Confirm && p1New !== p1Confirm && <p className="text-xs text-red-400">Passwords don't match</p>}
                {genP1 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00BFFF]/6 border border-[#00BFFF]/15 text-[#00BFFF] text-[11px]">
                    <span>✨</span> A generated password has been pre-filled. Use the Generator tab to create more.
                  </div>
                )}
                <button type="submit" disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00BFFF] to-[#0066FF] text-white hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(0,191,255,0.2)] flex items-center justify-center gap-2">
                  {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🔑'}
                  {busy ? 'Updating…' : 'Update Password 1'}
                </button>
              </form>
            </Card>
          )}

          {/* ── Password 2 ─────────────────────────────────────────────── */}
          {tab === 'password2' && (
            <Card>
              <CardHeader icon="🗝️" title="Change Password 2" subtitle="Secondary login password. Both current passwords required to authorize." />
              <form onSubmit={handleChangeP2} className="space-y-4">
                <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Verify identity</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <PasswordInput label="Current Password 1" value={p2CurP1} onChange={setP2CurP1} autoComplete="current-password" />
                    <PasswordInput label="Current Password 2" value={p2CurP2} onChange={setP2CurP2} autoComplete="current-password" />
                  </div>
                </div>
                <div className="h-px bg-white/5" />
                <PasswordInput label="New Password 2" value={p2New} onChange={setP2New} showStrength showEntropy autoComplete="new-password" />
                <PasswordInput label="Confirm New Password 2" value={p2Confirm} onChange={setP2Confirm} autoComplete="new-password" />
                {p2New && p2Confirm && p2New !== p2Confirm && <p className="text-xs text-red-400">Passwords don't match</p>}
                {genP2 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00BFFF]/6 border border-[#00BFFF]/15 text-[#00BFFF] text-[11px]">
                    <span>✨</span> A generated password has been pre-filled. Use the Generator tab to create more.
                  </div>
                )}
                <button type="submit" disabled={busy}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00BFFF] to-[#0066FF] text-white hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(0,191,255,0.2)] flex items-center justify-center gap-2">
                  {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🗝️'}
                  {busy ? 'Updating…' : 'Update Password 2'}
                </button>
              </form>
            </Card>
          )}

          {/* ── Generator ──────────────────────────────────────────────── */}
          {tab === 'generator' && (
            <PasswordGenerator onInsertP1={handleInsertP1} onInsertP2={handleInsertP2} />
          )}

          {/* ── Security Overview ─────────────────────────────────────── */}
          {tab === 'security' && (
            <>
              <SecurityGradeCard
                p1Score={p1Score} p2Score={p2Score}
                p1Hashed={p1Hashed} p2Hashed={p2Hashed}
                history={history}
              />
              <RateLimitMonitor session={session} />
              <SecuritySettingsPanel session={session} onSaved={s => setSettings(s)} />
            </>
          )}

          {/* ── Security Checklist (always visible) ───────────────────── */}
          <Card>
            <CardHeader icon="✅" title="Security Checklist" subtitle="Quick health check for your current credential configuration." />
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { ok: p1Hashed, label: 'Password 1 is hashed', detail: p1Hashed ? 'scrypt (64-byte)' : 'Plaintext — log in to upgrade' },
                { ok: p2Hashed, label: 'Password 2 is hashed', detail: p2Hashed ? 'scrypt (64-byte)' : 'Plaintext — log in to upgrade' },
                { ok: true,     label: 'Dual-password auth',   detail: 'Both passwords required on login' },
                { ok: true,     label: 'HMAC-signed sessions', detail: 'SESSION_SECRET env var in use' },
                { ok: history.length > 0, label: 'Rotation history exists', detail: history.length > 0 ? `${history.length} rotation(s)` : 'No changes recorded yet' },
                { ok: !!session, label: 'Active session',       detail: session ? `Logged in as ${session.username}` : 'No session' },
                { ok: (settings?.maxAttempts ?? 5) <= 10, label: 'Rate limit active', detail: settings ? `${settings.maxAttempts} attempts max` : '5 attempts max' },
                { ok: history.length === 0 || (Date.now() - history[0].ts) < 90 * 86_400_000, label: 'Recent rotation', detail: history.length > 0 ? `Last: ${timeAgo(history[0].ts)}` : 'Never rotated' },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border ${item.ok ? 'bg-green-500/5 border-green-500/15' : 'bg-orange-500/5 border-orange-500/15'}`}>
                  <span className="text-base shrink-0">{item.ok ? '✅' : '⚠️'}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-300">{item.label}</p>
                    <p className={`text-[11px] ${item.ok ? 'text-gray-600' : 'text-orange-400'}`}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Danger Zone ────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/3 overflow-hidden">
            <button onClick={() => setShowDanger(v => !v)}
              className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-red-500/5 transition-colors">
              <span className="text-xl">☠️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-400">Danger Zone</p>
                <p className="text-[11px] text-gray-600">Session invalidation, emergency context, and raw session info</p>
              </div>
              <span className={`text-gray-600 text-sm transition-transform ${showDanger ? 'rotate-90' : ''}`}>›</span>
            </button>
            {showDanger && (
              <div className="px-6 pb-6 space-y-4 border-t border-red-500/10 pt-4">
                <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-3">
                  <p className="text-xs font-bold text-gray-400">Session Revocation</p>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Every credential change — username or either password — bumps a{' '}
                    <span className="text-gray-400 font-mono">sessionInvalidBefore</span> timestamp written to{' '}
                    <span className="text-gray-400 font-mono">admin.yml</span>. The server checks this on every page load:
                    any session token issued before that timestamp is rejected, regardless of whether its HMAC signature is still valid.
                    This ensures password rotations revoke all existing sessions server-side immediately.
                  </p>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    After a successful update this page signs you out automatically. Log in with the new credentials to continue.
                  </p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00BFFF]/6 border border-[#00BFFF]/15 text-[#00BFFF] text-[11px]">
                    <span>ℹ</span>
                    <span>To force a sign-out of all sessions, rotate any credential via the forms above.</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2">
                  <p className="text-xs font-bold text-gray-400">Current Session Info</p>
                  <div className="font-mono text-[11px] text-gray-500 space-y-1 break-all">
                    <p>Username: <span className="text-gray-300">{session?.username ?? '—'}</span></p>
                    <p>Login at: <span className="text-gray-300">{session ? new Date(session.loginAt).toLocaleString() : '—'}</span></p>
                    <p>Token: <span className="text-gray-500">{session ? `${session.token.slice(0, 16)}…` : '—'}</span></p>
                    <p>Session TTL: <span className="text-gray-300">{sessionHours}h</span></p>
                  </div>
                  {session && (
                    <div className="flex justify-end">
                      <ClipboardBtn text={`username: ${session.username}\nloginAt: ${new Date(session.loginAt).toISOString()}\ntoken: ${session.token.slice(0,16)}...`} label="Copy session info" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right col — info panels (1/3) ────────────────────────────── */}
        <div className="space-y-5">

          {/* Session timer */}
          {session && (
            <Card>
              <CardHeader icon="⏱️" title="Active Session" subtitle="Current session countdown" />
              <SessionTimer loginAt={session.loginAt} sessionHours={sessionHours} />
            </Card>
          )}

          {/* Admin Notes */}
          <AdminNotes />

          {/* Activity Timeline */}
          <ActivityTimeline />

          {/* Rotation History */}
          <Card>
            <div className="flex items-center justify-between">
              <CardHeader icon="📜" title="Rotation History" subtitle="Last 30 credential changes" />
              <button onClick={() => setShowHistory(v => !v)}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors shrink-0">
                {showHistory ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {showHistory && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="text-center text-gray-700 text-xs py-6">No rotations recorded yet</p>
                ) : history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/2 border border-white/5">
                    <span className="text-sm shrink-0 mt-0.5">🔄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-300 truncate">Changed: {h.changed.join(', ')}</p>
                      <p className="text-[10px] text-gray-600">{timeAgo(h.ts)} · {new Date(h.ts).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Security Policy */}
          <Card>
            <div className="flex items-center justify-between">
              <CardHeader icon="🛡️" title="Security Policy" subtitle="How credentials are protected" />
              <button onClick={() => setShowPolicy(v => !v)}
                className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors shrink-0">
                {showPolicy ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {showPolicy && <SecurityPolicy settings={settings} />}
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader icon="💡" title="Best Practices" subtitle="Recommendations for keeping your account secure" />
            <div className="space-y-2.5">
              {[
                { tip: 'Rotate credentials every 90 days',                   severity: 'info' },
                { tip: 'Use a password manager to store complex passwords',   severity: 'info' },
                { tip: 'Make Password 1 and Password 2 completely different', severity: 'warning' },
                { tip: 'Never share admin credentials',                       severity: 'warning' },
                { tip: 'Use 16+ character passwords for maximum security',    severity: 'info' },
                { tip: 'Sign out when using shared machines',                 severity: 'warning' },
                { tip: 'After rotating, verify login before closing the tab', severity: 'warning' },
                { tip: 'Use the Generator tab to create strong passwords',    severity: 'info' },
                { tip: 'Keep rotation history to track changes over time',    severity: 'info' },
              ].map((b, i) => (
                <div key={i} className={`flex items-start gap-2 text-[11px] leading-relaxed ${b.severity === 'warning' ? 'text-orange-400' : 'text-gray-500'}`}>
                  <span className="shrink-0 mt-0.5">{b.severity === 'warning' ? '⚠' : '•'}</span>
                  {b.tip}
                </div>
              ))}
            </div>
          </Card>

          {/* Credential Anatomy */}
          <Card>
            <CardHeader icon="🧬" title="Credential Anatomy" subtitle="What each credential field does" />
            <div className="space-y-3">
              {[
                { field: 'Username', desc: 'The login name. Stored in admin.yml. Changing it bumps sessionInvalidBefore, revoking all sessions.', color: 'border-l-[#00BFFF]' },
                { field: 'Password 1', desc: 'Primary authentication factor. Stored as salted scrypt hash. Required on every login.', color: 'border-l-purple-400' },
                { field: 'Password 2', desc: 'Secondary authentication factor. Must differ from Password 1. Both must pass to authenticate.', color: 'border-l-green-400' },
                { field: 'sessionInvalidBefore', desc: 'Timestamp written on every credential change. Server rejects all sessions issued before this value.', color: 'border-l-orange-400' },
              ].map(c => (
                <div key={c.field} className={`pl-3 border-l-2 ${c.color}`}>
                  <p className="text-xs font-bold text-gray-300 font-mono">{c.field}</p>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
