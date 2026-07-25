// ─── Activity Logs — Grand Edition ────────────────────────────────────────────
// Live feed · Analytics · Timeline · Export · Advanced filters

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLogs, clearLogs, addLog } from '../../store/adminStore'
import type { AdminLog } from '../../store/adminStore'
import { AdminPaginator } from './AdminPaginator'

interface Props { admin: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50, 100]

// Category → { label, icon, color, severity }
const ACTION_META: Record<string, { cat: string; icon: string; color: string; severity: 'info' | 'warn' | 'danger' | 'success' }> = {
  'player:add':            { cat: 'Players',     icon: '➕', color: '#22c55e',  severity: 'success' },
  'player:edit':           { cat: 'Players',     icon: '✏️', color: '#3b82f6',  severity: 'info'    },
  'player:delete':         { cat: 'Players',     icon: '🗑️', color: '#ef4444',  severity: 'danger'  },
  'player:import':         { cat: 'Players',     icon: '📥', color: '#f59e0b',  severity: 'warn'    },
  'player:export':         { cat: 'Players',     icon: '📤', color: '#8b5cf6',  severity: 'info'    },
  'player:reset':          { cat: 'Players',     icon: '🔄', color: '#f97316',  severity: 'danger'  },
  'player:repair':         { cat: 'Players',     icon: '🔧', color: '#f59e0b',  severity: 'warn'    },
  'economy:save':          { cat: 'Economy',     icon: '💰', color: '#a855f7',  severity: 'info'    },
  'economy:reset':         { cat: 'Economy',     icon: '🔄', color: '#f97316',  severity: 'danger'  },
  'user:create':           { cat: 'Users',       icon: '👤', color: '#22c55e',  severity: 'success' },
  'user:create-mining':    { cat: 'Users',       icon: '⛏️', color: '#22c55e',  severity: 'success' },
  'user:edit':             { cat: 'Users',       icon: '✏️', color: '#3b82f6',  severity: 'info'    },
  'user:delete':           { cat: 'Users',       icon: '🗑️', color: '#ef4444',  severity: 'danger'  },
  'user:bulk-delete':      { cat: 'Users',       icon: '💣', color: '#ef4444',  severity: 'danger'  },
  'mining:renewal':        { cat: 'Mining',      icon: '⛏️', color: '#f59e0b',  severity: 'info'    },
  'mining:give':           { cat: 'Mining',      icon: '💎', color: '#22c55e',  severity: 'success' },
  'mining:take':           { cat: 'Mining',      icon: '📉', color: '#ef4444',  severity: 'warn'    },
  'content:save':          { cat: 'Content',     icon: '📝', color: '#06b6d4',  severity: 'info'    },
  'content:reset':         { cat: 'Content',     icon: '🔄', color: '#f97316',  severity: 'danger'  },
  'event:save':            { cat: 'Events',      icon: '🎉', color: '#ec4899',  severity: 'info'    },
  'event:reset':           { cat: 'Events',      icon: '🔄', color: '#f97316',  severity: 'danger'  },
  'gamemode:add':          { cat: 'Gamemodes',   icon: '🎮', color: '#22c55e',  severity: 'success' },
  'gamemode:edit':         { cat: 'Gamemodes',   icon: '✏️', color: '#3b82f6',  severity: 'info'    },
  'gamemode:delete':       { cat: 'Gamemodes',   icon: '🗑️', color: '#ef4444',  severity: 'danger'  },
  'earnings:save':         { cat: 'Earnings',    icon: '💹', color: '#a855f7',  severity: 'info'    },
  'earnings:reset-stats':  { cat: 'Earnings',    icon: '🔄', color: '#f97316',  severity: 'danger'  },
  'credentials:update':    { cat: 'Security',    icon: '🔐', color: '#f59e0b',  severity: 'warn'    },
  'publish-config':        { cat: 'Publish',     icon: '🚀', color: '#00BFFF',  severity: 'info'    },
  'logs:clear':            { cat: 'System',      icon: '🗑️', color: '#6b7280',  severity: 'danger'  },
  'github:sync':           { cat: 'System',      icon: '☁️', color: '#6b7280',  severity: 'info'    },
  'shop:order':            { cat: 'Shop',        icon: '🛒', color: '#22c55e',  severity: 'success' },
  'tournament:save':       { cat: 'Tournament',  icon: '🏆', color: '#f59e0b',  severity: 'info'    },
}

function getMeta(action: string) {
  return ACTION_META[action] ?? { cat: 'Other', icon: '📋', color: '#6b7280', severity: 'info' as const }
}

const SEVERITY_STYLES = {
  info:    'bg-blue-500/10 text-blue-400 border-blue-500/25',
  warn:    'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
  danger:  'bg-red-500/10 text-red-400 border-red-500/25',
  success: 'bg-green-500/10 text-green-400 border-green-500/25',
}

const SEVERITY_DOT = {
  info:    'bg-blue-400',
  warn:    'bg-yellow-400',
  danger:  'bg-red-400',
  success: 'bg-green-400',
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000)   return `${Math.floor(diff / 1_000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(ts).toLocaleDateString()
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const today = new Date(); const yesterday = new Date(Date.now() - 86_400_000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function exportCSV(logs: AdminLog[]) {
  const header = 'ID,Timestamp,Date,Admin,Action,Category,Severity,Details'
  const rows = logs.map(l => {
    const m = getMeta(l.action)
    const d = new Date(l.timestamp).toISOString()
    const details = (l.details ?? '').replace(/,/g, ';').replace(/\n/g, ' ')
    return `${l.id},${l.timestamp},"${d}","${l.admin}","${l.action}","${m.cat}","${m.severity}","${details}"`
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `bluetiers-logs-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function exportJSON(logs: AdminLog[]) {
  const enriched = logs.map(l => ({ ...l, date: new Date(l.timestamp).toISOString(), ...getMeta(l.action) }))
  const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `bluetiers-logs-${Date.now()}.json`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBar({ logs }: { logs: AdminLog[] }) {
  // Last 14 days
  const days: { key: string; label: string; count: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = dayKey(d.getTime())
    const label = i === 0 ? 'Today' : i === 1 ? 'Yest.' : d.toLocaleDateString([], { weekday: 'short' })
    days.push({ key, label, count: 0 })
  }
  logs.forEach(l => {
    const k = dayKey(l.timestamp)
    const d = days.find(x => x.key === k)
    if (d) d.count++
  })
  const max = Math.max(...days.map(d => d.count), 1)

  return (
    <div className="flex items-end gap-1 h-14">
      {days.map((d, i) => (
        <div key={d.key} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="relative w-full">
            <div className="w-full rounded-sm transition-all duration-500 min-h-[2px]"
              style={{ height: `${Math.max(2, (d.count / max) * 48)}px`, background: d.count > 0 ? '#00BFFF' : 'rgba(255,255,255,0.06)' }} />
            {d.count > 0 && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0B0F17] border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                {d.count} {d.count === 1 ? 'log' : 'logs'}
              </div>
            )}
          </div>
          <span className="text-[8px] text-gray-700 truncate w-full text-center">{i % 2 === 0 ? d.label : ''}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Hourly activity chart ─────────────────────────────────────────────────────

function HourlyChart({ logs }: { logs: AdminLog[] }) {
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, count: 0 }))
  logs.forEach(l => { hours[new Date(l.timestamp).getHours()].count++ })
  const max = Math.max(...hours.map(h => h.count), 1)

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-px h-20">
        {hours.map(({ h, count }) => (
          <div key={h} className="flex-1 flex flex-col items-center group relative">
            <div className="w-full rounded-t-sm transition-all duration-700 min-h-[1px]"
              style={{ height: `${Math.max(1, (count / max) * 72)}px`, background: count > 0 ? `hsla(${195 - h * 3},100%,${40 + count / max * 20}%,0.85)` : 'rgba(255,255,255,0.04)' }} />
            {count > 0 && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0B0F17] border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                {String(h).padStart(2, '0')}:00 — {count}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-gray-700">
        <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
      </div>
    </div>
  )
}

// ─── Category breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ logs }: { logs: AdminLog[] }) {
  const cats: Record<string, { count: number; color: string }> = {}
  logs.forEach(l => {
    const m = getMeta(l.action)
    if (!cats[m.cat]) cats[m.cat] = { count: 0, color: m.color }
    cats[m.cat].count++
  })
  const sorted = Object.entries(cats).sort((a, b) => b[1].count - a[1].count).slice(0, 8)
  const total  = sorted.reduce((s, [, v]) => s + v.count, 0)

  return (
    <div className="space-y-2">
      {sorted.map(([cat, { count, color }]) => (
        <div key={cat} className="flex items-center gap-3">
          <span className="text-gray-400 text-[11px] w-24 shrink-0">{cat}</span>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(count / total) * 100}%`, background: color }} />
          </div>
          <span className="text-gray-500 text-[11px] w-8 text-right">{count}</span>
          <span className="text-gray-700 text-[10px] w-10 text-right">{Math.round((count / total) * 100)}%</span>
        </div>
      ))}
      {sorted.length === 0 && <p className="text-gray-600 text-xs text-center py-4">No data yet</p>}
    </div>
  )
}

// ─── Heatmap (last 30 days) ───────────────────────────────────────────────────

function Heatmap({ logs }: { logs: AdminLog[] }) {
  const cells: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(Date.now() - i * 86_400_000)
    cells[k] = 0
  }
  logs.forEach(l => { const k = dayKey(l.timestamp); if (k in cells) cells[k]++ })
  const max = Math.max(...Object.values(cells), 1)
  const entries = Object.entries(cells)

  function heatColor(count: number): string {
    if (count === 0) return 'rgba(255,255,255,0.04)'
    const p = count / max
    if (p < 0.25) return 'rgba(0,191,255,0.2)'
    if (p < 0.5)  return 'rgba(0,191,255,0.45)'
    if (p < 0.75) return 'rgba(0,191,255,0.65)'
    return 'rgba(0,191,255,0.9)'
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {entries.map(([k, count]) => {
          const label = new Date(k).toLocaleDateString([], { month: 'short', day: 'numeric' })
          return (
            <div key={k} title={`${label}: ${count} event${count !== 1 ? 's' : ''}`}
              className="w-6 h-6 rounded-sm cursor-default transition-transform hover:scale-110"
              style={{ background: heatColor(count) }} />
          )
        })}
      </div>
      <div className="flex items-center gap-2 text-[9px] text-gray-600">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: p === 0 ? 'rgba(255,255,255,0.04)' : `rgba(0,191,255,${0.2 + p * 0.7})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ─── Log Entry Row ────────────────────────────────────────────────────────────

function LogRow({ log, expanded, onToggle }: { log: AdminLog; expanded: boolean; onToggle: () => void }) {
  const m = getMeta(log.action)
  return (
    <div className={`border-b border-white/4 last:border-0 transition-colors ${expanded ? 'bg-white/3' : 'hover:bg-white/[0.015]'}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer group" onClick={onToggle}>
        {/* Severity dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[m.severity]}`} />

        {/* Icon */}
        <span className="text-base shrink-0 w-6 text-center">{m.icon}</span>

        {/* Action badge */}
        <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border shrink-0 ${SEVERITY_STYLES[m.severity]}`}>
          {log.action}
        </span>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-gray-300 text-xs truncate">{log.details ?? log.action}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-gray-700 text-[10px]">by <span className="text-gray-500">{log.admin}</span></span>
            <span className="text-gray-700 text-[9px]">·</span>
            <span className="text-[#00BFFF]/50 text-[9px] px-1.5 py-0.5 rounded bg-[#00BFFF]/5">{m.cat}</span>
          </div>
        </div>

        {/* Time */}
        <div className="text-right shrink-0">
          <p className="text-gray-600 text-[10px]">{timeAgo(log.timestamp)}</p>
          <p className="text-gray-700 text-[9px]">{fmtTime(log.timestamp)}</p>
        </div>

        {/* Expand chevron */}
        <span className={`text-gray-700 text-[10px] transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-black/20 border border-white/6 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
            <div className="space-y-2">
              <Row label="Log ID"      value={log.id} mono />
              <Row label="Action"      value={log.action} mono />
              <Row label="Category"    value={m.cat} />
              <Row label="Severity"    value={m.severity.toUpperCase()} />
            </div>
            <div className="space-y-2">
              <Row label="Admin"       value={log.admin} />
              <Row label="Timestamp"   value={new Date(log.timestamp).toISOString()} mono />
              <Row label="Local Time"  value={new Date(log.timestamp).toLocaleString()} />
              {log.details && <Row label="Details" value={log.details} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-600 w-24 shrink-0">{label}</span>
      <span className={`text-gray-300 break-all ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
    </div>
  )
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────

// Live Feed View ───────────────────────────────────────────────────────────────

function LiveFeedView({ logs, admin }: { logs: AdminLog[]; admin: string }) {
  const [search, setSearch]     = useState('')
  const [catFilter, setCat]     = useState('all')
  const [sevFilter, setSev]     = useState('all')
  const [adminFilter, setAdm]   = useState('all')
  const [dateFilter, setDate]   = useState('all')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage]         = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => setPage(1), [search, catFilter, sevFilter, adminFilter, dateFilter, pageSize])

  const allCats   = ['all', ...Array.from(new Set(logs.map(l => getMeta(l.action).cat))).sort()]
  const allAdmins = ['all', ...Array.from(new Set(logs.map(l => l.admin))).sort()]

  const filtered = logs.filter(l => {
    const m = getMeta(l.action)
    const q = search.toLowerCase()
    if (catFilter !== 'all' && m.cat !== catFilter) return false
    if (sevFilter !== 'all' && m.severity !== sevFilter) return false
    if (adminFilter !== 'all' && l.admin !== adminFilter) return false
    if (dateFilter !== 'all') {
      const cutoff = dateFilter === 'today'  ? Date.now() - 86_400_000
                   : dateFilter === 'week'   ? Date.now() - 7 * 86_400_000
                   : dateFilter === 'month'  ? Date.now() - 30 * 86_400_000
                   : 0
      if (l.timestamp < cutoff) return false
    }
    if (q && !l.action.includes(q) && !l.admin.includes(q) && !(l.details ?? '').toLowerCase().includes(q)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const selectCls = 'bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00BFFF]/40 transition-all cursor-pointer'

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {filtered.length.toLocaleString()} events matched
          </p>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={e => setPageSize(+e.target.value)} className={selectCls}>
              {PAGE_SIZES.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s} per page</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input type="text" placeholder="🔍  Search action, admin, details…" value={search} onChange={e => setSearch(e.target.value)}
            className="bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[#00BFFF]/40 transition-all" />
          <select value={catFilter} onChange={e => setCat(e.target.value)} className={selectCls}>
            {allCats.map(c => <option key={c} value={c} className="bg-[#0d1117]">{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <select value={sevFilter} onChange={e => setSev(e.target.value)} className={selectCls}>
            <option value="all" className="bg-[#0d1117]">All Severities</option>
            {['info', 'success', 'warn', 'danger'].map(s => <option key={s} value={s} className="bg-[#0d1117]">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={dateFilter} onChange={e => setDate(e.target.value)} className={selectCls}>
            <option value="all" className="bg-[#0d1117]">All Time</option>
            <option value="today" className="bg-[#0d1117]">Last 24 Hours</option>
            <option value="week" className="bg-[#0d1117]">Last 7 Days</option>
            <option value="month" className="bg-[#0d1117]">Last 30 Days</option>
          </select>
        </div>
        {(adminFilter !== 'all' || catFilter !== 'all' || sevFilter !== 'all' || dateFilter !== 'all' || search) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-600 text-[10px]">Active filters:</span>
            {search && <Chip label={`"${search}"`} onRemove={() => setSearch('')} />}
            {catFilter !== 'all' && <Chip label={catFilter} onRemove={() => setCat('all')} />}
            {sevFilter !== 'all' && <Chip label={sevFilter} onRemove={() => setSev('all')} />}
            {dateFilter !== 'all' && <Chip label={dateFilter} onRemove={() => setDate('all')} />}
            {adminFilter !== 'all' && <Chip label={`admin:${adminFilter}`} onRemove={() => setAdm('all')} />}
            <button onClick={() => { setSearch(''); setCat('all'); setSev('all'); setDate('all'); setAdm('all') }}
              className="text-[10px] text-red-400/70 hover:text-red-400 transition-all">Clear all</button>
          </div>
        )}
        {allAdmins.length > 2 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-[10px]">Filter by admin:</span>
            <div className="flex gap-1.5 flex-wrap">
              {allAdmins.map(a => (
                <button key={a} onClick={() => setAdm(a)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${adminFilter === a ? 'bg-[#00BFFF]/15 border-[#00BFFF]/30 text-[#00BFFF]' : 'border-white/8 text-gray-500 hover:text-gray-300'}`}>
                  {a === 'all' ? 'Everyone' : a}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log list */}
      <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
        {paged.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Header */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 border-b border-white/5 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
              <div className="w-2" />
              <div className="w-6" />
              <div className="w-36">Action</div>
              <div className="flex-1">Details</div>
              <div className="w-32 text-right">Time</div>
              <div className="w-4" />
            </div>
            {paged.map(log => (
              <LogRow key={log.id} log={log} expanded={expanded === log.id} onToggle={() => setExpanded(expanded === log.id ? null : log.id)} />
            ))}
          </>
        )}
      </div>

      <AdminPaginator page={safePage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} />
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF]">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-all ml-0.5">×</button>
    </span>
  )
}

// Analytics View ──────────────────────────────────────────────────────────────

function AnalyticsView({ logs }: { logs: AdminLog[] }) {
  const now = Date.now()
  const today  = logs.filter(l => now - l.timestamp < 86_400_000)
  const week   = logs.filter(l => now - l.timestamp < 7 * 86_400_000)

  // Top admins
  const adminCounts: Record<string, number> = {}
  logs.forEach(l => { adminCounts[l.admin] = (adminCounts[l.admin] ?? 0) + 1 })
  const topAdmins = Object.entries(adminCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Top actions
  const actionCounts: Record<string, number> = {}
  logs.forEach(l => { actionCounts[l.action] = (actionCounts[l.action] ?? 0) + 1 })
  const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Busiest hour
  const hourCounts = Array(24).fill(0)
  logs.forEach(l => hourCounts[new Date(l.timestamp).getHours()]++)
  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts))

  // Severity split
  const sevCounts = { info: 0, success: 0, warn: 0, danger: 0 }
  logs.forEach(l => { const s = getMeta(l.action).severity; sevCounts[s]++ })

  const sevColors = { info: '#3b82f6', success: '#22c55e', warn: '#f59e0b', danger: '#ef4444' }

  // Recent peak (last 30 days per-day max)
  const dayCounts: Record<string, number> = {}
  logs.forEach(l => { const k = dayKey(l.timestamp); dayCounts[k] = (dayCounts[k] ?? 0) + 1 })
  const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '📋', label: 'Total Events', value: logs.length.toLocaleString(), sub: 'all time', color: '#00BFFF' },
          { icon: '📅', label: 'Last 24h',     value: today.length.toLocaleString(), sub: 'recent activity', color: '#22c55e' },
          { icon: '📆', label: 'Last 7 Days',  value: week.length.toLocaleString(), sub: 'this week', color: '#8b5cf6' },
          { icon: '⏰', label: 'Peak Hour',    value: `${String(busiestHour).padStart(2, '0')}:00`, sub: `${hourCounts[busiestHour]} events`, color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} className="bg-white/2 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}>{k.icon}</div>
            <div className="min-w-0">
              <p className="text-white font-black text-xl leading-tight">{k.value}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{k.label}</p>
              <p className="text-gray-700 text-[9px]">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 14-day bar */}
        <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
          <div>
            <h3 className="text-white font-bold text-sm">Activity Last 14 Days</h3>
            <p className="text-gray-600 text-[10px]">Hover bars for exact count</p>
          </div>
          <MiniBar logs={logs} />
        </div>

        {/* Hourly heatstrip */}
        <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
          <div>
            <h3 className="text-white font-bold text-sm">Activity by Hour of Day</h3>
            <p className="text-gray-600 text-[10px]">When do admins work most?</p>
          </div>
          <HourlyChart logs={logs} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
          <h3 className="text-white font-bold text-sm">Events by Category</h3>
          <CategoryBreakdown logs={logs} />
        </div>

        {/* Severity split */}
        <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-bold text-sm">Events by Severity</h3>
          <div className="space-y-2">
            {(Object.entries(sevCounts) as [string, number][]).filter(([, c]) => c > 0).map(([sev, count]) => (
              <div key={sev} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[sev as keyof typeof SEVERITY_DOT]}`} />
                <span className="text-gray-400 text-xs w-16 capitalize">{sev}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(count / logs.length) * 100}%`, background: sevColors[sev as keyof typeof sevColors], transition: 'width 0.6s ease' }} />
                </div>
                <span className="text-gray-500 text-xs w-10 text-right">{count}</span>
                <span className="text-gray-700 text-[10px] w-10 text-right">{Math.round((count / logs.length) * 100)}%</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2">
            <h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Top Admins</h4>
            {topAdmins.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-gray-700 text-[10px] w-4">{i + 1}.</span>
                <div className="w-6 h-6 rounded-full bg-[#00BFFF]/15 border border-[#00BFFF]/25 flex items-center justify-center text-[9px] text-[#00BFFF] font-black shrink-0">
                  {name[0]?.toUpperCase()}
                </div>
                <span className="text-gray-300 text-xs flex-1">{name}</span>
                <span className="text-gray-500 text-xs">{count} events</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 30-day heatmap */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-white font-bold text-sm">30-Day Activity Heatmap</h3>
            <p className="text-gray-600 text-[10px]">Hover a cell to see the exact count</p>
          </div>
          {peakDay && (
            <div className="text-right">
              <p className="text-[#00BFFF] font-bold text-sm">{peakDay[1]} events</p>
              <p className="text-gray-600 text-[10px]">peak: {new Date(peakDay[0]).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
            </div>
          )}
        </div>
        <Heatmap logs={logs} />
      </div>

      {/* Top actions */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">Most Frequent Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {topActions.map(([action, count], i) => {
            const m = getMeta(action)
            return (
              <div key={action} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/5">
                <span className="text-gray-600 text-[10px] w-5 shrink-0">#{i + 1}</span>
                <span className="text-base shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-mono truncate">{action}</p>
                  <p className="text-gray-600 text-[10px]">{m.cat}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-bold text-sm">{count}</p>
                  <p className="text-gray-700 text-[9px]">{Math.round((count / logs.length) * 100)}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Timeline View ───────────────────────────────────────────────────────────────

function TimelineView({ logs }: { logs: AdminLog[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCount, setShowCount] = useState(50)

  // Group by date
  const groups: Record<string, AdminLog[]> = {}
  logs.slice(0, showCount).forEach(l => {
    const k = dayKey(l.timestamp)
    if (!groups[k]) groups[k] = []
    groups[k].push(l)
  })

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([key, dayLogs]) => (
        <div key={key}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-[#00BFFF]/10 border border-[#00BFFF]/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-[#00BFFF] text-xs font-bold">{fmtDate(dayLogs[0].timestamp)}</span>
              <span className="text-gray-600 text-[10px]">— {dayLogs.length} event{dayLogs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Events */}
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-0 bottom-0 w-px bg-white/6" />

            <div className="space-y-2">
              {dayLogs.map((log, i) => {
                const m = getMeta(log.action)
                const isExpanded = expanded === log.id
                return (
                  <div key={log.id} className="relative">
                    {/* Node */}
                    <div className="absolute -left-6 top-3.5 w-4 h-4 rounded-full border-2 border-[#0B0F17] flex items-center justify-center"
                      style={{ background: m.color, boxShadow: `0 0 6px ${m.color}60` }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    </div>

                    <div className={`ml-2 border rounded-xl transition-all cursor-pointer ${isExpanded ? 'border-white/15 bg-white/3' : 'border-white/6 bg-white/[0.015] hover:bg-white/3 hover:border-white/10'}`}
                      onClick={() => setExpanded(isExpanded ? null : log.id)}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-base shrink-0">{m.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-xs font-semibold">{log.details ?? log.action}</span>
                            <span className={`hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-bold border ${SEVERITY_STYLES[m.severity]}`}>{log.action}</span>
                          </div>
                          <p className="text-gray-600 text-[10px] mt-0.5">by {log.admin} · {m.cat}</p>
                        </div>
                        <span className="text-gray-600 text-[10px] shrink-0">{fmtTime(log.timestamp)}</span>
                        <span className={`text-gray-600 text-[10px] transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                            <Row label="ID"       value={log.id} mono />
                            <Row label="Action"   value={log.action} mono />
                            <Row label="Admin"    value={log.admin} />
                            <Row label="Category" value={m.cat} />
                            <Row label="Severity" value={m.severity.toUpperCase()} />
                            <Row label="Exact"    value={new Date(log.timestamp).toLocaleString()} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {showCount < logs.length && (
        <button onClick={() => setShowCount(c => c + 50)}
          className="w-full py-3 rounded-xl text-sm text-gray-500 border border-white/8 hover:border-white/15 hover:text-gray-300 transition-all">
          Load 50 more ({logs.length - showCount} remaining)
        </button>
      )}

      {logs.length === 0 && <EmptyState />}
    </div>
  )
}

// ─── Export View ──────────────────────────────────────────────────────────────

function ExportView({ logs, admin, onClear }: { logs: AdminLog[]; admin: string; onClear: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [exportRange, setExportRange] = useState('all')

  const now = Date.now()
  const ranges: Record<string, AdminLog[]> = {
    all:   logs,
    today: logs.filter(l => now - l.timestamp < 86_400_000),
    week:  logs.filter(l => now - l.timestamp < 7 * 86_400_000),
    month: logs.filter(l => now - l.timestamp < 30 * 86_400_000),
  }
  const exportLogs = ranges[exportRange]

  const catCounts: Record<string, number> = {}
  logs.forEach(l => { const c = getMeta(l.action).cat; catCounts[c] = (catCounts[c] ?? 0) + 1 })

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Logs',    value: logs.length },
          { label: 'Today',         value: logs.filter(l => now - l.timestamp < 86_400_000).length },
          { label: 'This Week',     value: logs.filter(l => now - l.timestamp < 7 * 86_400_000).length },
          { label: 'Categories',    value: Object.keys(catCounts).length },
        ].map(s => (
          <div key={s.label} className="bg-white/2 border border-white/8 rounded-xl p-4 text-center">
            <p className="text-white font-black text-2xl">{s.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-4">
        <h3 className="text-white font-bold text-sm">📤 Export Logs</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: `All (${logs.length})` },
            { id: 'today', label: `Today (${ranges.today.length})` },
            { id: 'week', label: `Last 7 days (${ranges.week.length})` },
            { id: 'month', label: `Last 30 days (${ranges.month.length})` },
          ].map(r => (
            <button key={r.id} onClick={() => setExportRange(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${exportRange === r.id ? 'bg-[#00BFFF]/15 border-[#00BFFF]/30 text-[#00BFFF]' : 'border-white/8 text-gray-500 hover:text-gray-300 bg-white/2'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-gray-500 text-xs">{exportLogs.length} logs will be exported in selected range.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => exportCSV(exportLogs)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
            📊 Export as CSV
            <span className="text-[10px] text-green-600">Excel / Sheets compatible</span>
          </button>
          <button onClick={() => exportJSON(exportLogs)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
            📋 Export as JSON
            <span className="text-[10px] text-blue-600">Full data with metadata</span>
          </button>
        </div>
      </div>

      {/* Category summary */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">📊 Log Summary by Category</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
            const sampleAction = logs.find(l => getMeta(l.action).cat === cat)
            const color = sampleAction ? getMeta(sampleAction.action).color : '#6b7280'
            return (
              <div key={cat} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/2 border border-white/5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-gray-400 text-xs flex-1">{cat}</span>
                <span className="text-white font-bold text-sm">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Storage */}
      <div className="bg-white/2 border border-white/8 rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-bold text-sm">💾 Storage Info</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Stored logs</span>
            <span className="text-gray-300">{logs.length} / 500 max</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-[#00BFFF] transition-all" style={{ width: `${(logs.length / 500) * 100}%` }} />
          </div>
          <p className="text-gray-700 text-[10px]">Logs are stored in your browser's localStorage. They persist across sessions but are local to this browser. Export regularly to keep a permanent record.</p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-4">
        <h3 className="text-red-400 font-bold text-sm flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[10px]">!</span>
          Danger Zone
        </h3>
        <p className="text-gray-500 text-xs">These actions are irreversible. Export your logs first if you need to keep them.</p>
        <button onClick={() => setShowConfirm(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/8 hover:bg-red-500/15 transition-all">
          🗑️ Clear All Logs ({logs.length} entries)
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="text-4xl">🗑️</div>
            <h3 className="text-white font-bold text-lg">Clear All Logs?</h3>
            <p className="text-gray-500 text-sm">This will permanently delete all {logs.length} log entries. You can't undo this.</p>
            <p className="text-orange-400/70 text-xs">Tip: Export them first so you have a backup.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={() => { onClear(); setShowConfirm(false) }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all">
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-20 text-center space-y-3">
      <div className="text-5xl">📋</div>
      <p className="text-white font-bold text-sm">No logs yet</p>
      <p className="text-gray-600 text-xs max-w-xs mx-auto">Activity is logged automatically when you make changes anywhere in the admin panel. Try editing a player or saving a setting.</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

const VIEWS = [
  { id: 'feed',      icon: '📡', label: 'Live Feed'   },
  { id: 'analytics', icon: '📊', label: 'Analytics'   },
  { id: 'timeline',  icon: '🕐', label: 'Timeline'    },
  { id: 'export',    icon: '📤', label: 'Export'      },
]

export function ActivityLogs({ admin }: Props) {
  const [logs, setLogs]         = useState<AdminLog[]>([])
  const [view, setView]         = useState('feed')
  const [autoRefresh, setAuto]  = useState(true)
  const [lastRefresh, setLast]  = useState(Date.now())
  const [newCount, setNewCount] = useState(0)
  const prevCountRef            = useRef(0)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(() => {
    const fresh = getLogs()
    setLogs(fresh)
    const added = fresh.length - prevCountRef.current
    if (added > 0 && prevCountRef.current > 0) setNewCount(n => n + added)
    prevCountRef.current = fresh.length
    setLast(Date.now())
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [])

  // Auto-refresh every 5s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 5_000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, refresh])

  function handleClear() {
    clearLogs()
    addLog(admin, 'logs:clear', `Cleared all ${logs.length} activity log entries`)
    prevCountRef.current = 1
    refresh()
  }

  function handleManualRefresh() {
    setNewCount(0)
    refresh()
  }

  const now = Date.now()
  const todayCount = logs.filter(l => now - l.timestamp < 86_400_000).length
  const hourCount  = logs.filter(l => now - l.timestamp < 3_600_000).length

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-white font-black text-lg flex items-center gap-3">
            📊 Activity Logs
            {newCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/25 animate-pulse">
                +{newCount} new
              </span>
            )}
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">{logs.length.toLocaleString()} total · {todayCount} today · {hourCount} this hour</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-refresh toggle */}
          <button onClick={() => setAuto(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${autoRefresh ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/3 border-white/8 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick={handleManualRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-white/8 text-gray-400 hover:text-white hover:border-white/20 bg-white/2 transition-all">
            ↻ Refresh
          </button>
          <span className="text-gray-700 text-[10px]">updated {timeAgo(lastRefresh)}</span>
        </div>
      </div>

      {/* Quick stat pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: `${logs.length} total`, color: 'text-gray-400 bg-white/4 border-white/8' },
          { label: `${todayCount} today`, color: 'text-green-400 bg-green-500/8 border-green-500/15' },
          { label: `${hourCount} this hour`, color: 'text-[#00BFFF] bg-[#00BFFF]/8 border-[#00BFFF]/15' },
          { label: `${Array.from(new Set(logs.map(l => l.action))).length} action types`, color: 'text-purple-400 bg-purple-500/8 border-purple-500/15' },
        ].map(p => (
          <span key={p.label} className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${p.color}`}>{p.label}</span>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              view === v.id
                ? 'bg-[#00BFFF]/15 border-[#00BFFF]/30 text-[#00BFFF]'
                : 'bg-white/2 border-white/8 text-gray-500 hover:text-gray-300 hover:bg-white/4'
            }`}>
            <span>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      {/* View content */}
      {view === 'feed'      && <LiveFeedView  logs={logs} admin={admin} />}
      {view === 'analytics' && <AnalyticsView logs={logs} />}
      {view === 'timeline'  && <TimelineView  logs={logs} />}
      {view === 'export'    && <ExportView    logs={logs} admin={admin} onClear={handleClear} />}
    </div>
  )
}
