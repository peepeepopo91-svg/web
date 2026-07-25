// ─── User Manager — Grand Section ────────────────────────────────────────────
// Full player management across credentials.yml, players.json, mining-users.json.
// Server-authoritative: every mutation goes to disk immediately.
// GitHub sync: changes are included in the next Sync Center push (no extra commits).

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AdminPaginator } from './AdminPaginator'

const PAGE_SIZE = 10
import {
  adminLoadUsers,
  adminCreateUser,
  adminUpdateUserPlayer,
  adminUpdateUserCred,
  adminUpdateUserMining,
  adminDeleteUser,
  adminBulkDeleteUsers,
  adminCreateMiningForPlayer,
  adminRenameMiningUser,
  loadAllData,
} from '../../server/dataFiles'
import type { UserRecord } from '../../server/dataFiles'
import { savePlayers, getGamemodes } from '../../store/playersStore'
import { addLog } from '../../store/adminStore'
import type { Player } from '../../data/players'
import { REGIONS } from '../../data/players'

// ─── Constants ────────────────────────────────────────────────────────────────

const RANK_KEYS   = () => getGamemodes().map(gm => gm.key)
const RANK_VALUES = ['HT5','LT5','HT4','LT4','HT3','LT3','HT2','LT2','HT1','LT1','NONE'] as const
const REGION_LIST = [...REGIONS] as string[]

const REGION_SHORT: Record<string, string> = {
  'North America': 'NA', 'South America': 'SA', Europe: 'EU',
  Asia: 'AS', Oceania: 'OC', Africa: 'AF', 'Middle East': 'ME',
}

type SortKey = 'username' | 'balance' | 'gems' | 'rigs' | 'joinDate' | 'lastSeen' | 'topRank'
type FilterKey = 'all' | 'has-cred' | 'has-player' | 'has-mining' | 'admin' | 'incomplete'
type EditTab = 'overview' | 'player' | 'mining' | 'login'

// ─── Utility helpers ──────────────────────────────────────────────────────────

function timeAgo(ts: number | null): string {
  if (!ts) return '—'
  const d = Date.now() - ts
  if (d < 60_000)        return 'Just now'
  if (d < 3_600_000)     return `${Math.floor(d / 60_000)}m ago`
  if (d < 86_400_000)    return `${Math.floor(d / 3_600_000)}h ago`
  if (d < 30*86_400_000) return `${Math.floor(d / 86_400_000)}d ago`
  return new Date(ts).toLocaleDateString()
}

function rankColor(rank: string | null): string {
  if (!rank || rank === 'NONE') return ''
  if (rank.includes('5')) return 'text-amber-400 border-amber-500/30 bg-amber-500/8'
  if (rank.includes('4')) return 'text-[#00BFFF] border-[#00BFFF]/30 bg-[#00BFFF]/8'
  if (rank.includes('3')) return 'text-green-400 border-green-500/30 bg-green-500/8'
  if (rank.includes('2')) return 'text-purple-400 border-purple-500/30 bg-purple-500/8'
  return 'text-gray-400 border-white/10 bg-white/5'
}

function sortUsers(users: UserRecord[], key: SortKey, asc: boolean): UserRecord[] {
  return [...users].sort((a, b) => {
    let cmp = 0
    switch (key) {
      case 'username':  cmp = a.username.localeCompare(b.username); break
      case 'balance':   cmp = a.balance - b.balance; break
      case 'gems':      cmp = a.gems - b.gems; break
      case 'rigs':      cmp = a.activeRigs - b.activeRigs; break
      case 'joinDate':  cmp = (a.joinDate ?? 0) - (b.joinDate ?? 0); break
      case 'lastSeen':  cmp = (a.lastSeen ?? 0) - (b.lastSeen ?? 0); break
      case 'topRank': {
        const ORDER = ['HT5','LT5','HT4','LT4','HT3','LT3','HT2','LT2','HT1','LT1']
        const ai = a.topRank ? ORDER.indexOf(a.topRank) : 99
        const bi = b.topRank ? ORDER.indexOf(b.topRank) : 99
        cmp = ai - bi; break
      }
    }
    return asc ? cmp : -cmp
  })
}

// ─── Small UI atoms ───────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: string | null }) {
  if (!rank || rank === 'NONE') return <span className="text-gray-700 text-xs">—</span>
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${rankColor(rank)}`}>{rank}</span>
}

function SourcePips({ hasCred, hasPlayer, hasMining }: { hasCred: boolean; hasPlayer: boolean; hasMining: boolean }) {
  return (
    <div className="flex gap-1" title={`Login:${hasCred} Profile:${hasPlayer} Mining:${hasMining}`}>
      <span className={`text-[11px] leading-none transition-opacity ${hasCred   ? 'opacity-100' : 'opacity-15'}`} title="Login account">🔑</span>
      <span className={`text-[11px] leading-none transition-opacity ${hasPlayer ? 'opacity-100' : 'opacity-15'}`} title="Player profile">📋</span>
      <span className={`text-[11px] leading-none transition-opacity ${hasMining ? 'opacity-100' : 'opacity-15'}`} title="Mining account">⛏</span>
    </div>
  )
}

function Avatar({ username, avatar, size = 32 }: { username: string; avatar: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  const url = !err && avatar ? avatar : null
  if (url) {
    return (
      <img
        src={url} alt={username} onError={() => setErr(true)}
        className="rounded-lg object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center shrink-0 font-bold text-[#00BFFF]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {username[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' | 'info' }) {
  const cls = type === 'success'
    ? 'bg-green-500/15 border-green-500/30 text-green-400'
    : type === 'error'
    ? 'bg-red-500/15 border-red-500/30 text-red-400'
    : 'bg-[#00BFFF]/12 border-[#00BFFF]/30 text-[#00BFFF]'
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border ${cls} max-w-xs`}>
      {type === 'success' ? '✓ ' : type === 'error' ? '⚠ ' : 'ℹ '}{msg}
    </div>
  )
}

function SortBtn({ label, k, cur, asc, onClick }: { label: string; k: SortKey; cur: SortKey; asc: boolean; onClick: () => void }) {
  const active = cur === k
  return (
    <button onClick={onClick} className={`text-left hover:text-gray-300 transition-colors uppercase tracking-widest text-[10px] flex items-center gap-1 ${active ? 'text-[#00BFFF]' : 'text-gray-600'}`}>
      {label}
      {active ? <span>{asc ? '↑' : '↓'}</span> : <span className="text-gray-800">↕</span>}
    </button>
  )
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white/10 border-t-[#00BFFF] rounded-full animate-spin" />
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, sub }: { icon: string; value: number | string; label: string; sub?: string }) {
  return (
    <div className="glass rounded-xl border border-white/8 px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#00BFFF]/8 border border-[#00BFFF]/15 flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-white font-['Space_Grotesk'] font-bold text-xl leading-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-gray-500 text-xs">{label}</p>
        {sub && <p className="text-gray-700 text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Create User Modal ────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void
  onCreated: () => void
  admin: string
}

function CreateModal({ onClose, onCreated, admin }: CreateModalProps) {
  const [username,     setUsername]     = useState('')
  const [password,     setPassword]     = useState('')
  const [role,         setRole]         = useState('user')
  const [region,       setRegion]       = useState('North America')
  const [startingBC,   setStartingBC]   = useState('0')
  const [startingGems, setStartingGems] = useState('0')
  const [addCred,      setAddCred]      = useState(true)
  const [addPlayer,    setAddPlayer]    = useState(false)
  const [addMining,    setAddMining]    = useState(false)
  const [working,      setWorking]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  async function handleCreate() {
    const u = username.trim()
    if (!u) { setError('Username is required'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) { setError('Only letters, numbers, and underscores'); return }
    if (addCred && !password.trim()) { setError('Password is required for login accounts'); return }
    if (!addCred && !addPlayer && !addMining) { setError('Select at least one system to add the user to'); return }

    setWorking(true); setError(null)
    try {
      await adminCreateUser({
        data: {
          username: u, password: password.trim() || 'changeme',
          role, addCred, addPlayer, addMining,
          region: addPlayer ? region : undefined,
          startingBC:   addMining ? parseFloat(startingBC)   || 0 : undefined,
          startingGems: addMining ? parseFloat(startingGems) || 0 : undefined,
        },
      })
      addLog(admin, 'user:create', `Created user "${u}" — cred:${addCred} player:${addPlayer} mining:${addMining}`)
      onCreated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.replace(/^DUPLICATE: /, '').replace(/^Error: /, ''))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-lg">➕</div>
          <div>
            <h2 className="font-['Space_Grotesk'] font-bold text-white text-base">Create New User</h2>
            <p className="text-gray-600 text-xs">Add a player to one or more systems</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-600 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Username */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Minecraft Username *</label>
            <input
              type="text" value={username} onChange={e => { setUsername(e.target.value); setError(null) }}
              placeholder="e.g. CoolPlayer123"
              className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 placeholder-gray-700 transition-all"
            />
          </div>

          {/* Systems */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Add to Systems</label>
            <div className="space-y-2">
              {[
                { key: 'cred',   state: addCred,   set: setAddCred,   icon: '🔑', label: 'Login Account', desc: 'Can sign in to mine BlueCoin' },
                { key: 'player', state: addPlayer, set: setAddPlayer, icon: '📋', label: 'Player Profile', desc: 'Appears on the public Tier List' },
                { key: 'mining', state: addMining, set: setAddMining, icon: '⛏', label: 'Mining Account', desc: 'Has BC balance, gems, and rigs' },
              ].map(item => (
                <label key={item.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${item.state ? 'border-[#00BFFF]/30 bg-[#00BFFF]/5' : 'border-white/8 hover:border-white/15'}`}>
                  <input type="checkbox" checked={item.state} onChange={e => item.set(e.target.checked)} className="sr-only" />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${item.state ? 'border-[#00BFFF] bg-[#00BFFF]' : 'border-white/20'}`}>
                    {item.state && <span className="text-black text-xs font-black">✓</span>}
                  </div>
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${item.state ? 'text-white' : 'text-gray-400'}`}>{item.label}</p>
                    <p className="text-gray-700 text-[10px]">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Conditional fields */}
          {(addCred || addPlayer || addMining) && (
            <div className="space-y-4 pt-1">
              {addCred && (
                <div className="glass rounded-xl border border-white/5 p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">🔑 Login Account Settings</p>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1.5">Password</label>
                    <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a password"
                      className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 placeholder-gray-700 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1.5">Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              )}
              {addPlayer && (
                <div className="glass rounded-xl border border-white/5 p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">📋 Player Profile Settings</p>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1.5">Region</label>
                    <select value={region} onChange={e => setRegion(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all">
                      {REGION_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              )}
              {addMining && (
                <div className="glass rounded-xl border border-white/5 p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">⛏ Mining Account Settings</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1.5">Starting BC</label>
                      <input type="number" min="0" step="any" value={startingBC} onChange={e => setStartingBC(e.target.value)}
                        className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1.5">Starting Gems</label>
                      <input type="number" min="0" step="any" value={startingGems} onChange={e => setStartingGems(e.target.value)}
                        className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleCreate} disabled={working} className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white flex items-center justify-center gap-2 disabled:opacity-50">
            {working ? <><Spinner /> Creating…</> : '+ Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Mining Account Modal (for tier-list-only players) ────────────────

interface CreateMiningModalProps {
  player: UserRecord
  onClose: () => void
  onCreated: () => void
  admin: string
}

function CreateMiningModal({ player, onClose, onCreated, admin }: CreateMiningModalProps) {
  const [password,     setPassword]     = useState('')
  const [startingBC,   setStartingBC]   = useState('0')
  const [startingGems, setStartingGems] = useState('0')
  const [working,      setWorking]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // The mining/login username always equals the tier-list player name so all three
  // stores (players, mining, creds) share the same lowercase key and adminLoadUsers
  // merges them into one coherent row. Admins can rename the account afterwards via
  // the Mining tab in the Edit modal.
  async function handleCreate() {
    if (!password.trim()) { setError('Password is required'); return }

    setWorking(true); setError(null)
    try {
      await adminCreateMiningForPlayer({
        data: {
          playerName:   player.username,
          password:     password.trim(),
          startingBC:   parseFloat(startingBC)   || 0,
          startingGems: parseFloat(startingGems) || 0,
        },
      })
      addLog(admin, 'user:create-mining', `Created mining account for tier player "${player.username}"`)
      onCreated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.replace(/^DUPLICATE:\s*/, '').replace(/^Error:\s*/, ''))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-2xl border border-white/10 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-lg">⛏</div>
          <div>
            <h2 className="font['Space_Grotesk'] font-bold text-white text-base">Create Mining Account</h2>
            <p className="text-gray-600 text-xs">For tier list player <span className="text-[#00BFFF]">{player.username}</span></p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-600 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Username is fixed — always matches the player name */}
          <div className="glass rounded-xl border border-white/5 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-0.5">Login Username</p>
              <p className="text-white text-sm font-mono font-semibold">{player.username}</p>
            </div>
            <span className="text-[10px] text-gray-600 border border-white/8 rounded-lg px-2 py-1">Fixed — matches player name</span>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Password *</label>
            <input
              type="text" value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="Set a login password"
              className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 placeholder-gray-700 transition-all"
            />
            <p className="text-gray-700 text-[10px] mt-1">The player will use this with their username to log in and mine BlueCoin. You can rename the account later from the Mining tab.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Starting BC</label>
              <input type="number" min="0" step="any" value={startingBC} onChange={e => setStartingBC(e.target.value)}
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Starting Gems</label>
              <input type="number" min="0" step="any" value={startingGems} onChange={e => setStartingGems(e.target.value)}
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleCreate} disabled={working} className="flex-1 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white flex items-center justify-center gap-2 disabled:opacity-50">
            {working ? <><Spinner /> Creating…</> : '⛏ Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

interface EditModalProps {
  user: UserRecord
  onClose: () => void
  onSaved: () => void
  admin: string
}

function EditModal({ user, onClose, onSaved, admin }: EditModalProps) {
  const [tab, setTab] = useState<EditTab>('overview')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Player fields
  const [region, setRegion] = useState(user.region ?? 'North America')
  const [head,   setHead]   = useState(user.avatar  ?? `https://mc-heads.net/avatar/${user.username}`)
  const [ranks,  setRanks]  = useState<Record<string, string>>(
    user.ranks ?? Object.fromEntries(RANK_KEYS().map(k => [k, 'NONE']))
  )

  // Mining fields
  const [balance, setBalance] = useState(Math.floor(user.balance).toString())
  const [gems,    setGems]    = useState(Math.floor(user.gems).toString())

  // Mining account management — init from miningKey so rename lookups use the actual mining-users.json key
  const [miningUsername,    setMiningUsername]    = useState(user.miningKey ?? user.username)
  const [miningNewPassword, setMiningNewPassword] = useState('')
  const [credEnabled,       setCredEnabled]       = useState(user.credEnabled !== false)

  // Cred fields
  const [newPassword, setNewPassword] = useState('')
  const [role, setRole] = useState(user.role ?? 'user')

  // Add-system states
  const [addPlayerNow, setAddPlayerNow] = useState(false)

  function showOk(msg: string) {
    setSuccessMsg(msg); setError(null)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  async function savePlayer() {
    setWorking(true); setError(null)
    try {
      if (!user.hasPlayer && !addPlayerNow) {
        // Create profile from scratch
        setAddPlayerNow(true); setWorking(false); return
      }
      await adminUpdateUserPlayer({ data: { username: user.username, region, head, ranks, create: true } })
      addLog(admin, 'user:edit', `Updated player profile for ${user.username}`)
      showOk('Player profile saved')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorking(false)
    }
  }

  async function saveMining() {
    if (!user.hasMining) return
    setWorking(true); setError(null)
    // Use miningKey as the lookup identifier — it is the actual key in mining-users.json
    // and may differ from user.username when the account has been renamed.
    const miningLookup = user.miningKey ?? user.username
    try {
      const bc  = parseFloat(balance)
      const gms = parseFloat(gems)
      if (isNaN(bc) || isNaN(gms) || bc < 0 || gms < 0) throw new Error('Values must be non-negative numbers')
      await adminUpdateUserMining({ data: { username: miningLookup, balance: bc, gems: gms } })
      addLog(admin, 'user:edit', `Updated mining for ${user.username}: BC=${bc}, Gems=${gms}`)
      showOk('Mining data saved')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorking(false)
    }
  }

  async function saveCred() {
    setWorking(true); setError(null)
    try {
      if (!newPassword && role === (user.role ?? 'user') && credEnabled === (user.credEnabled !== false)) {
        showOk('No changes to save'); setWorking(false); return
      }
      await adminUpdateUserCred({
        data: {
          username: user.username,
          newPassword: newPassword.trim() || undefined,
          role,
          enabled: credEnabled,
        },
      })
      addLog(admin, 'user:edit', `Updated credentials for ${user.username}${credEnabled !== (user.credEnabled !== false) ? ` (${credEnabled ? 'enabled' : 'disabled'})` : ''}`)
      showOk('Login account updated')
      setNewPassword('')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorking(false)
    }
  }

  async function saveMiningUsername() {
    const newName = miningUsername.trim()
    if (!newName) { setError('Username cannot be empty'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(newName)) { setError('Only letters, numbers, and underscores'); return }
    // currentUsername must be the actual mining-users.json key to find the entry
    const currentKey = user.miningKey ?? user.username
    if (newName.toLowerCase() === currentKey.toLowerCase()) { showOk('No change'); return }
    setWorking(true); setError(null)
    try {
      await adminRenameMiningUser({ data: { currentUsername: currentKey, newUsername: newName } })
      addLog(admin, 'user:edit', `Renamed mining user "${currentKey}" → "${newName}"`)
      showOk('Username updated — player profile renamed too if one existed')
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.replace(/^DUPLICATE:\s*/, '').replace(/^Error:\s*/, ''))
    } finally {
      setWorking(false)
    }
  }

  async function saveMiningPassword() {
    const pw = miningNewPassword.trim()
    if (!pw) { setError('Password cannot be empty'); return }
    setWorking(true); setError(null)
    // Credential entry shares the same lowercase key as the mining entry
    const credLookup = user.miningKey ?? user.username
    try {
      await adminUpdateUserCred({ data: { username: credLookup, newPassword: pw } })
      addLog(admin, 'user:edit', `Reset password for mining account ${user.username}`)
      showOk('Password updated')
      setMiningNewPassword('')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorking(false)
    }
  }

  async function toggleMiningEnabled() {
    const newState = !credEnabled
    const credLookup = user.miningKey ?? user.username
    setWorking(true); setError(null)
    try {
      await adminUpdateUserCred({ data: { username: credLookup, enabled: newState } })
      setCredEnabled(newState)
      addLog(admin, 'user:edit', `${newState ? 'Enabled' : 'Disabled'} mining account for ${user.username}`)
      showOk(newState ? 'Account enabled' : 'Account disabled')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setWorking(false)
    }
  }

  const TABS: { id: EditTab; icon: string; label: string; show?: boolean }[] = [
    { id: 'overview', icon: '👤', label: 'Overview' },
    { id: 'player',   icon: '📋', label: 'Profile' },
    { id: 'mining',   icon: '⛏',  label: 'Mining' },
    { id: 'login',    icon: '🔑', label: 'Login', show: user.hasCred },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-2xl border border-white/10 w-full max-w-2xl overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 shrink-0">
          <Avatar username={user.username} avatar={user.avatar} size={40} />
          <div>
            <h2 className="font-['Space_Grotesk'] font-bold text-white text-base">{user.username}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <SourcePips hasCred={user.hasCred} hasPlayer={user.hasPlayer} hasMining={user.hasMining} />
              {user.uuid && <span className="text-gray-700 text-[10px] font-mono">{user.uuid.slice(0,8)}…</span>}
            </div>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-600 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 px-6 gap-1 shrink-0 bg-[#0B0F17]/50">
          {TABS.filter(t => t.show !== false).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(null); setSuccessMsg(null) }}
              className={`px-4 py-3 text-xs font-semibold transition-all border-b-2 ${tab === t.id ? 'text-[#00BFFF] border-[#00BFFF]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {successMsg && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-4">✓ {successMsg}</p>}
          {error      && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>}

          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Username',   val: user.username },
                  { label: 'Role',       val: user.role ?? 'user' },
                  { label: 'Region',     val: user.region ?? '—' },
                  { label: 'Top Rank',   val: user.topRank ?? '—' },
                  { label: 'BC Balance', val: user.hasMining ? Math.floor(user.balance).toLocaleString() : '—' },
                  { label: 'Gems',       val: user.hasMining ? Math.floor(user.gems).toLocaleString() : '—' },
                  { label: 'Rigs',       val: user.hasMining ? `${user.activeRigs}/${user.totalRigs} active` : '—' },
                  { label: 'Block Rewards', val: user.hasMining ? `${user.rewardCount} blocks` : '—' },
                  { label: 'Joined',     val: user.joinDate ? new Date(user.joinDate).toLocaleDateString() : '—' },
                  { label: 'Last Seen',  val: timeAgo(user.lastSeen) },
                  { label: 'UUID',       val: user.uuid ? user.uuid.slice(0, 18) + '…' : '—' },
                ].map(item => (
                  <div key={item.label} className="glass rounded-xl border border-white/5 p-3">
                    <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-0.5">{item.label}</p>
                    <p className="text-white text-sm font-semibold break-all">{item.val}</p>
                  </div>
                ))}
              </div>
              {user.hasPlayer && user.ranks && (
                <div className="glass rounded-xl border border-white/5 p-4">
                  <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-3">Tier Ranks</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${RANK_KEYS().length}, minmax(0, 1fr))` }}>
                    {RANK_KEYS().map(k => (
                      <div key={k} className="text-center">
                        <p className="text-gray-700 text-[9px] uppercase mb-1">{k}</p>
                        <RankBadge rank={user.ranks?.[k] ?? 'NONE'} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Player profile tab */}
          {tab === 'player' && (
            <div className="space-y-5">
              {!user.hasPlayer && !addPlayerNow && (
                <div className="text-center py-6">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-white font-semibold mb-1">No player profile yet</p>
                  <p className="text-gray-500 text-sm mb-4">Create one to add this user to the Tier List</p>
                  <button onClick={() => setAddPlayerNow(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white">Create Player Profile</button>
                </div>
              )}
              {(user.hasPlayer || addPlayerNow) && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Head / Avatar URL</label>
                    <input type="text" value={head} onChange={e => setHead(e.target.value)}
                      className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all font-mono text-xs" />
                    {head && (
                      <div className="mt-2 flex items-center gap-2">
                        <img src={head} alt="" className="w-8 h-8 rounded-md" onError={e => (e.currentTarget.style.display = 'none')} />
                        <span className="text-gray-600 text-xs">Preview</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Region</label>
                    <select value={region} onChange={e => setRegion(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all">
                      {REGION_LIST.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest block mb-3">Tier Ranks</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {RANK_KEYS().map(k => (
                        <div key={k}>
                          <label className="text-gray-600 text-xs capitalize block mb-1">{k}</label>
                          <select value={ranks[k] ?? 'NONE'} onChange={e => setRanks(r => ({ ...r, [k]: e.target.value }))}
                            className={`w-full bg-[#0B0F17] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00BFFF]/40 transition-all ${rankColor(ranks[k] ?? 'NONE').split(' ')[0] || 'text-gray-400'}`}>
                            {RANK_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={savePlayer} disabled={working} className="w-full py-2.5 rounded-xl text-sm font-semibold btn-primary text-white flex items-center justify-center gap-2 disabled:opacity-50">
                    {working ? <><Spinner /> Saving…</> : user.hasPlayer ? 'Save Player Profile' : 'Create Player Profile'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Mining tab */}
          {tab === 'mining' && (
            <div className="space-y-5">
              {!user.hasMining && (
                <div className="text-center py-6">
                  <p className="text-4xl mb-3">⛏</p>
                  <p className="text-white font-semibold mb-1">No mining account yet</p>
                  <p className="text-gray-500 text-sm">Use the ⛏+ button on the user row to create one.</p>
                </div>
              )}
              {user.hasMining && (
                <>
                  {/* Status header */}
                  {user.hasMining && (
                    <div className="glass rounded-xl border border-white/5 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-gray-600 text-[10px] uppercase tracking-widest">Account Status</p>
                        {user.hasCred && (
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${credEnabled ? 'text-green-400 border-green-500/30 bg-green-500/8' : 'text-red-400 border-red-500/30 bg-red-500/8'}`}>
                            {credEnabled ? '● Active' : '● Disabled'}
                          </span>
                        )}
                        {!user.hasCred && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold border text-gray-500 border-white/10">No Login Account</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Total Rigs',  val: user.totalRigs },
                          { label: 'Active Rigs', val: user.activeRigs },
                          { label: 'Rewards',     val: user.rewardCount },
                          { label: 'Last Seen',   val: timeAgo(user.lastSeen) },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <p className="text-white font-bold text-lg">{s.val}</p>
                            <p className="text-gray-600 text-[10px]">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BC / Gems editor */}
                  {user.hasMining && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">BlueCoin Balance</label>
                        <input type="number" min="0" step="any" value={balance} onChange={e => setBalance(e.target.value)}
                          className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-amber-400 text-sm font-mono outline-none focus:border-[#00BFFF]/40 transition-all" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Gems</label>
                        <input type="number" min="0" step="any" value={gems} onChange={e => setGems(e.target.value)}
                          className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-purple-400 text-sm font-mono outline-none focus:border-[#00BFFF]/40 transition-all" />
                      </div>
                    </div>
                  )}

                  <button onClick={saveMining} disabled={working} className="w-full py-2.5 rounded-xl text-sm font-semibold btn-primary text-white flex items-center justify-center gap-2 disabled:opacity-50">
                    {working ? <><Spinner /> Saving…</> : user.hasMining ? 'Save Balance & Gems' : 'Create Mining Account'}
                  </button>

                  {/* Account management — only when mining account exists */}
                  {user.hasMining && (
                    <div className="border-t border-white/5 pt-5 space-y-4">
                      <p className="text-gray-500 text-[10px] uppercase tracking-widest">⚙ Account Management</p>

                      {/* Username rename */}
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">
                          Mining Username
                          <span className="ml-2 text-gray-700 normal-case tracking-normal">(changes login username)</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text" value={miningUsername}
                            onChange={e => setMiningUsername(e.target.value)}
                            className="flex-1 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all font-mono"
                          />
                          <button
                            onClick={saveMiningUsername} disabled={working || miningUsername.trim().toLowerCase() === user.username.toLowerCase()}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all disabled:opacity-30 whitespace-nowrap"
                          >
                            Rename
                          </button>
                        </div>
                      </div>

                      {/* Password reset (only when user has a login credential) */}
                      {user.hasCred && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Reset Password</label>
                          <div className="flex gap-2">
                            <input
                              type="text" value={miningNewPassword}
                              onChange={e => setMiningNewPassword(e.target.value)}
                              placeholder="Enter new password…"
                              className="flex-1 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 placeholder-gray-700 transition-all"
                            />
                            <button
                              onClick={saveMiningPassword} disabled={working || !miningNewPassword.trim()}
                              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all disabled:opacity-30 whitespace-nowrap"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Enable / Disable toggle (only when user has a login credential) */}
                      {user.hasCred && (
                        <div className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/2">
                          <div>
                            <p className="text-white text-sm font-semibold">Account Access</p>
                            <p className="text-gray-600 text-xs mt-0.5">
                              {credEnabled ? 'Player can log in and mine BlueCoin.' : 'Login is blocked — player cannot mine.'}
                            </p>
                          </div>
                          <button
                            onClick={toggleMiningEnabled} disabled={working}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
                              credEnabled
                                ? 'text-red-400 border-red-500/30 bg-red-500/8 hover:bg-red-500/15'
                                : 'text-green-400 border-green-500/30 bg-green-500/8 hover:bg-green-500/15'
                            }`}
                          >
                            {working ? <Spinner /> : credEnabled ? 'Disable Account' : 'Enable Account'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Login tab */}
          {tab === 'login' && user.hasCred && (
            <div className="space-y-5">
              <div className="glass rounded-xl border border-white/5 p-4">
                <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-3">Current Account Info</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Username</span>
                    <span className="text-white text-sm font-mono">{user.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Role</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${user.role === 'admin' ? 'text-amber-400 border-amber-500/30 bg-amber-500/8' : 'text-gray-400 border-white/10'}`}>{user.role ?? 'user'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Status</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${credEnabled ? 'text-green-400 border-green-500/30 bg-green-500/8' : 'text-red-400 border-red-500/30 bg-red-500/8'}`}>
                      {credEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  {user.uuid && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm">UUID</span>
                      <span className="text-gray-400 text-xs font-mono">{user.uuid}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">New Password <span className="text-gray-700">(leave blank to keep current)</span></label>
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password…"
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 placeholder-gray-700 transition-all" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#00BFFF]/40 transition-all">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {/* Enable / Disable toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/2">
                <div>
                  <p className="text-white text-sm font-semibold">Account Access</p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    {credEnabled ? 'Player can log in.' : 'Login is blocked for this account.'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={credEnabled} onChange={e => setCredEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-10 h-5 rounded-full border border-white/20 bg-white/5 peer-checked:bg-green-500/80 peer-checked:border-green-500/50 transition-all relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
              <button onClick={saveCred} disabled={working} className="w-full py-2.5 rounded-xl text-sm font-semibold btn-primary text-white flex items-center justify-center gap-2 disabled:opacity-50">
                {working ? <><Spinner /> Saving…</> : 'Update Login Account'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  user: UserRecord
  onClose: () => void
  onDeleted: () => void
  admin: string
}

function DeleteModal({ user, onClose, onDeleted, admin }: DeleteModalProps) {
  const [deleteCred,   setDeleteCred]   = useState(user.hasCred)
  const [deletePlayer, setDeletePlayer] = useState(user.hasPlayer)
  const [deleteMining, setDeleteMining] = useState(user.hasMining)
  const [working, setWorking] = useState(false)
  const nothingSelected = !deleteCred && !deletePlayer && !deleteMining

  async function handleDelete() {
    setWorking(true)
    try {
      const result = await adminDeleteUser({ data: { username: user.username, deleteCred, deletePlayer, deleteMining } })
      addLog(admin, 'user:delete', `Deleted ${user.username}: ${result.removed.join(', ')}`)
      onDeleted()
    } catch { /* ignore */ }
    finally { setWorking(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-2xl border border-red-500/20 p-6 w-full max-w-md">
        <div className="text-center mb-5">
          <p className="text-4xl mb-3">🗑️</p>
          <h3 className="text-white font-bold text-lg">Delete {user.username}?</h3>
          <p className="text-gray-500 text-sm mt-1">Choose which data to remove. This cannot be undone.</p>
        </div>

        <div className="space-y-2 mb-5">
          {[
            { check: deleteCred,   set: setDeleteCred,   has: user.hasCred,   icon: '🔑', label: 'Login account', desc: 'Remove from credentials.yml' },
            { check: deletePlayer, set: setDeletePlayer, has: user.hasPlayer, icon: '📋', label: 'Player profile', desc: 'Remove from tier list' },
            { check: deleteMining, set: setDeleteMining, has: user.hasMining, icon: '⛏', label: 'Mining account', desc: 'Permanently lose BC, gems & rigs' },
          ].map(item => (
            <label key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${!item.has ? 'opacity-30 cursor-not-allowed' : item.check ? 'border-red-500/30 bg-red-500/5' : 'border-white/8 hover:border-white/15'}`}>
              <input type="checkbox" checked={item.check} disabled={!item.has} onChange={e => item.set(e.target.checked)} className="sr-only" />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${item.check && item.has ? 'border-red-400 bg-red-400' : 'border-white/20'}`}>
                {item.check && item.has && <span className="text-black text-xs font-black">✓</span>}
              </div>
              <span className="text-base">{item.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${item.check ? 'text-red-300' : 'text-gray-400'}`}>{item.label}</p>
                <p className="text-gray-700 text-[10px]">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={working || nothingSelected}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {working ? <><Spinner /> Deleting…</> : 'Delete Selected'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk Delete Modal ────────────────────────────────────────────────────────

interface BulkDeleteModalProps {
  usernames: string[]
  onClose: () => void
  onDeleted: () => void
  admin: string
}

function BulkDeleteModal({ usernames, onClose, onDeleted, admin }: BulkDeleteModalProps) {
  const [deleteCred,   setDeleteCred]   = useState(true)
  const [deletePlayer, setDeletePlayer] = useState(true)
  const [deleteMining, setDeleteMining] = useState(true)
  const [working, setWorking] = useState(false)

  async function handleBulkDelete() {
    setWorking(true)
    try {
      await adminBulkDeleteUsers({ data: { usernames, deleteCred, deletePlayer, deleteMining } })
      addLog(admin, 'user:bulk-delete', `Bulk deleted ${usernames.length} users`)
      onDeleted()
    } catch { /* ignore */ }
    finally { setWorking(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-2xl border border-red-500/20 p-6 w-full max-w-sm">
        <div className="text-center mb-5">
          <p className="text-4xl mb-3">⚡</p>
          <h3 className="text-white font-bold text-lg">Bulk Delete {usernames.length} Users?</h3>
          <p className="text-gray-500 text-sm mt-1">Select which data to remove from all selected users.</p>
        </div>
        <div className="space-y-2 mb-5">
          {[
            { check: deleteCred,   set: setDeleteCred,   icon: '🔑', label: 'Login accounts' },
            { check: deletePlayer, set: setDeletePlayer, icon: '📋', label: 'Player profiles' },
            { check: deleteMining, set: setDeleteMining, icon: '⛏', label: 'Mining accounts' },
          ].map(item => (
            <label key={item.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer ${item.check ? 'border-red-500/30 bg-red-500/5' : 'border-white/8 hover:border-white/15'}`}>
              <input type="checkbox" checked={item.check} onChange={e => item.set(e.target.checked)} className="sr-only" />
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${item.check ? 'border-red-400 bg-red-400' : 'border-white/20'}`}>
                {item.check && <span className="text-black text-xs font-black">✓</span>}
              </div>
              <span className="text-base">{item.icon}</span>
              <p className="text-sm font-semibold text-gray-300">{item.label}</p>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10">Cancel</button>
          <button onClick={handleBulkDelete} disabled={working}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            {working ? <><Spinner /> Deleting…</> : `Delete ${usernames.length} Users`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { admin: string }

export function UserManager({ admin }: Props) {
  const [users,    setUsers]    = useState<UserRecord[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<FilterKey>('all')
  const [sortKey,  setSortKey]  = useState<SortKey>('username')
  const [sortAsc,  setSortAsc]  = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)

  const [page, setPage] = useState(1)

  const [createOpen,          setCreateOpen]          = useState(false)
  const [createMiningTarget,  setCreateMiningTarget]  = useState<UserRecord | null>(null)
  const [editTarget,          setEditTarget]          = useState<UserRecord | null>(null)
  const [deleteTarget,        setDeleteTarget]        = useState<UserRecord | null>(null)
  const [bulkDeleteOpen,      setBulkDeleteOpen]      = useState(false)
  const [toast,               setToast]               = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await adminLoadUsers()
      setUsers(list)
    } catch (e) {
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Also refresh the playersStore so TierList section stays consistent
  const syncPlayersStore = useCallback(async () => {
    try {
      const fresh = await loadAllData()
      if (fresh.players) savePlayers(fresh.players as Player[], { silent: true })
    } catch { /* best-effort */ }
  }, [])

  useEffect(() => { load() }, [load])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(key === 'username') }
  }

  const displayList = useMemo(() => {
    const q = search.toLowerCase()
    let list = users.filter(u => {
      if (q && !u.username.toLowerCase().includes(q)) return false
      if (filter === 'has-cred')    return u.hasCred
      if (filter === 'has-player')  return u.hasPlayer
      if (filter === 'has-mining')  return u.hasMining
      if (filter === 'admin')       return u.role === 'admin'
      if (filter === 'incomplete')  return !u.hasCred || !u.hasPlayer || !u.hasMining
      return true
    })
    return sortUsers(list, sortKey, sortAsc)
  }, [users, search, filter, sortKey, sortAsc])

  // Pagination
  useEffect(() => { setPage(1) }, [search, filter, sortKey, sortAsc])
  const totalPages = Math.max(1, Math.ceil(displayList.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pagedList  = displayList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const allSelected  = pagedList.length > 0 && pagedList.every(u => selected.has(u.key))
  const someSelected = displayList.some(u => selected.has(u.key))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(pagedList.map(u => u.key)))
  }

  function toggleOne(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleCreated() {
    setCreateOpen(false)
    await load()
    await syncPlayersStore()
    showToast('User created successfully')
  }

  async function handleMiningCreated() {
    setCreateMiningTarget(null)
    await load()
    await syncPlayersStore()
    showToast('Mining account created successfully')
  }

  async function handleSaved() {
    await load()
    await syncPlayersStore()
  }

  async function handleDeleted() {
    setDeleteTarget(null)
    setEditTarget(null)
    await load()
    await syncPlayersStore()
    showToast('User data removed')
  }

  async function handleBulkDeleted() {
    setBulkDeleteOpen(false)
    setSelected(new Set())
    await load()
    await syncPlayersStore()
    showToast(`${selected.size} users removed`)
  }

  // Stats
  const totalUsers    = users.length
  const totalCreds    = users.filter(u => u.hasCred).length
  const totalPlayers  = users.filter(u => u.hasPlayer).length
  const totalMiners   = users.filter(u => u.hasMining).length
  const totalBC       = users.reduce((s, u) => s + u.balance, 0)
  const selectedKeys  = [...selected]

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',        label: 'All',          count: users.length },
    { key: 'has-cred',   label: '🔑 Login',     count: totalCreds },
    { key: 'has-player', label: '📋 Profile',   count: totalPlayers },
    { key: 'has-mining', label: '⛏ Mining',    count: totalMiners },
    { key: 'admin',      label: '👑 Admin',      count: users.filter(u => u.role === 'admin').length },
    { key: 'incomplete', label: '⚠ Incomplete', count: users.filter(u => !u.hasCred || !u.hasPlayer || !u.hasMining).length },
  ]

  const COL = 'grid-cols-[20px_36px_1fr_80px_80px_100px_70px_68px_88px_80px]'

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Modals */}
      {createOpen           && <CreateModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} admin={admin} />}
      {createMiningTarget   && <CreateMiningModal player={createMiningTarget} onClose={() => setCreateMiningTarget(null)} onCreated={handleMiningCreated} admin={admin} />}
      {editTarget           && <EditModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} admin={admin} />}
      {deleteTarget         && <DeleteModal user={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} admin={admin} />}
      {bulkDeleteOpen       && <BulkDeleteModal usernames={selectedKeys} onClose={() => setBulkDeleteOpen(false)} onDeleted={handleBulkDeleted} admin={admin} />}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="👥" value={totalUsers}   label="Total Users"       sub={`${totalCreds} can log in`} />
        <StatCard icon="📋" value={totalPlayers} label="Player Profiles"   sub="On the tier list" />
        <StatCard icon="⛏" value={totalMiners}  label="Mining Accounts"   sub={`${Math.floor(totalBC).toLocaleString()} BC in circulation`} />
        <StatCard icon="🔑" value={totalCreds}   label="Login Accounts"    sub={`${users.filter(u => u.role === 'admin').length} admin(s)`} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm pointer-events-none">🔍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by username…"
            className="w-full bg-white/3 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-[#00BFFF]/40 transition-all"
          />
        </div>
        {/* Refresh */}
        <button onClick={load} disabled={loading}
          className="px-3 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-40 flex items-center gap-1.5">
          {loading ? <Spinner /> : '↻'} Refresh
        </button>
        {/* Create */}
        <button onClick={() => setCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold btn-primary text-white flex items-center gap-2">
          + New User
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${filter === f.key ? 'bg-[#00BFFF]/12 border-[#00BFFF]/30 text-[#00BFFF]' : 'border-white/8 text-gray-500 hover:border-white/15 hover:text-gray-300'}`}>
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? 'bg-[#00BFFF]/20 text-[#00BFFF]' : 'bg-white/5 text-gray-600'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="glass rounded-xl border border-[#00BFFF]/20 bg-[#00BFFF]/5 px-5 py-3 flex items-center gap-4 flex-wrap">
          <span className="text-[#00BFFF] text-sm font-semibold">{selected.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setBulkDeleteOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 bg-red-500/8 hover:bg-red-500/15 transition-all flex items-center gap-1.5">
              🗑 Delete Selected
            </button>
            <button onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-white/10 hover:text-white transition-all">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        {/* Column headers */}
        <div className={`grid ${COL} gap-2 px-4 py-3 border-b border-white/5 items-center`}>
          <button onClick={toggleAll} className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${allSelected ? 'border-[#00BFFF] bg-[#00BFFF]' : 'border-white/20 hover:border-white/40'}`}>
            {allSelected && <span className="text-black text-[8px] font-black leading-none">✓</span>}
            {someSelected && !allSelected && <span className="w-1.5 h-1.5 rounded-sm bg-[#00BFFF] block" />}
          </button>
          <div />
          <SortBtn label="Player"    k="username" cur={sortKey} asc={sortAsc} onClick={() => toggleSort('username')} />
          <span className="text-gray-600 text-[10px] uppercase tracking-widest">Sources</span>
          <SortBtn label="Top Rank"  k="topRank"  cur={sortKey} asc={sortAsc} onClick={() => toggleSort('topRank')} />
          <SortBtn label="BC"        k="balance"  cur={sortKey} asc={sortAsc} onClick={() => toggleSort('balance')} />
          <SortBtn label="Gems"      k="gems"     cur={sortKey} asc={sortAsc} onClick={() => toggleSort('gems')} />
          <SortBtn label="Rigs"      k="rigs"     cur={sortKey} asc={sortAsc} onClick={() => toggleSort('rigs')} />
          <SortBtn label="Last Seen" k="lastSeen" cur={sortKey} asc={sortAsc} onClick={() => toggleSort('lastSeen')} />
          <span className="text-gray-600 text-[10px] uppercase tracking-widest text-right">Actions</span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 flex items-center justify-center gap-3 text-gray-600">
            <Spinner /> <span className="text-sm">Loading users…</span>
          </div>
        )}

        {/* Empty */}
        {!loading && displayList.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 text-sm">{search || filter !== 'all' ? 'No users match your search.' : 'No users yet — create the first one.'}</p>
          </div>
        )}

        {/* Rows */}
        {!loading && (
          <div className="divide-y divide-white/4">
            {pagedList.map(u => {
              const isSelected = selected.has(u.key)
              const isExpanded = expanded === u.key
              return (
                <div key={u.key} className={isSelected ? 'bg-[#00BFFF]/4' : ''}>
                  <div
                    className={`grid ${COL} gap-2 px-4 py-3 items-center hover:bg-white/2 transition-colors cursor-pointer`}
                    onClick={() => setExpanded(prev => prev === u.key ? null : u.key)}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleOne(u.key) }}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-[#00BFFF] bg-[#00BFFF]' : 'border-white/20 hover:border-white/40'}`}>
                      {isSelected && <span className="text-black text-[8px] font-black leading-none">✓</span>}
                    </button>

                    {/* Avatar */}
                    <Avatar username={u.username} avatar={u.avatar} size={28} />

                    {/* Username */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{u.username}</p>
                        {u.credEnabled === false && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 font-semibold">Disabled</span>
                        )}
                      </div>
                      <p className="text-gray-700 text-[10px] truncate">
                        {u.region ? REGION_SHORT[u.region] ?? u.region : ''}
                        {u.role === 'admin' && <span className="ml-1 text-amber-500">★ admin</span>}
                      </p>
                    </div>

                    {/* Sources */}
                    <SourcePips hasCred={u.hasCred} hasPlayer={u.hasPlayer} hasMining={u.hasMining} />

                    {/* Top Rank */}
                    <div><RankBadge rank={u.topRank} /></div>

                    {/* Balance */}
                    {u.hasMining
                      ? <p className="text-amber-400 text-sm font-mono text-right">{Math.floor(u.balance).toLocaleString()}</p>
                      : <p className="text-gray-700 text-xs text-right">—</p>}

                    {/* Gems */}
                    {u.hasMining
                      ? <p className="text-purple-400 text-sm font-mono text-right">{Math.floor(u.gems).toLocaleString()}</p>
                      : <p className="text-gray-700 text-xs text-right">—</p>}

                    {/* Rigs */}
                    {u.hasMining
                      ? <p className="text-[#00BFFF] text-sm text-right">{u.activeRigs}<span className="text-gray-600 text-xs">/{u.totalRigs}</span></p>
                      : <p className="text-gray-700 text-xs text-right">—</p>}

                    {/* Last Seen */}
                    <p className="text-gray-500 text-xs text-right truncate">{timeAgo(u.lastSeen)}</p>

                    {/* Actions */}
                    <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      {/* Quick: Create Mining Account for tier-list-only players */}
                      {u.hasPlayer && !u.hasMining && (
                        <button
                          onClick={() => setCreateMiningTarget(u)}
                          className="p-1.5 rounded-lg text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all text-[10px] leading-none"
                          title="Create Mining Account"
                        >
                          ⛏+
                        </button>
                      )}
                      <button onClick={() => setEditTarget(u)}
                        className="p-1.5 rounded-lg text-[#00BFFF] border border-[#00BFFF]/20 hover:bg-[#00BFFF]/10 transition-all text-xs" title="Edit">
                        ✎
                      </button>
                      <button onClick={() => setDeleteTarget(u)}
                        className="p-1.5 rounded-lg text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all text-xs" title="Delete">
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <div className="px-16 pb-4 bg-white/[0.01] border-t border-white/4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3">
                        <div className="glass rounded-lg border border-white/5 p-3">
                          <p className="text-gray-600 text-[9px] uppercase tracking-widest">Joined</p>
                          <p className="text-white text-xs font-semibold mt-1">{u.joinDate ? new Date(u.joinDate).toLocaleDateString() : '—'}</p>
                        </div>
                        <div className="glass rounded-lg border border-white/5 p-3">
                          <p className="text-gray-600 text-[9px] uppercase tracking-widest">Block Rewards</p>
                          <p className="text-white text-xs font-semibold mt-1">{u.hasMining ? `${u.rewardCount} blocks` : '—'}</p>
                        </div>
                        <div className="glass rounded-lg border border-white/5 p-3">
                          <p className="text-gray-600 text-[9px] uppercase tracking-widest">UUID</p>
                          <p className="text-gray-400 text-[10px] font-mono mt-1 truncate">{u.uuid ?? '—'}</p>
                        </div>
                        <div className="glass rounded-lg border border-white/5 p-3">
                          <p className="text-gray-600 text-[9px] uppercase tracking-widest">Region</p>
                          <p className="text-white text-xs font-semibold mt-1">{u.region ?? '—'}</p>
                        </div>
                      </div>
                      {u.hasPlayer && u.ranks && (
                        <div className="flex flex-wrap gap-2">
                          {RANK_KEYS().filter(k => u.ranks![k] && u.ranks![k] !== 'NONE').map(k => (
                            <div key={k} className="flex items-center gap-1.5">
                              <span className="text-gray-600 text-[10px] capitalize">{k}:</span>
                              <RankBadge rank={u.ranks![k]} />
                            </div>
                          ))}
                          {RANK_KEYS().every(k => !u.ranks![k] || u.ranks![k] === 'NONE') && (
                            <span className="text-gray-700 text-xs">No tier ranks assigned</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        {!loading && displayList.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-gray-700 text-[10px]">
            <span>{displayList.length} of {users.length} users shown</span>
            <span>
              {Math.floor(users.reduce((s, u) => s + u.balance, 0)).toLocaleString()} BC total ·{' '}
              {users.reduce((s, u) => s + u.totalRigs, 0)} rigs total
            </span>
          </div>
        )}
      </div>

      <AdminPaginator
        page={safePage}
        totalPages={totalPages}
        totalItems={displayList.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
