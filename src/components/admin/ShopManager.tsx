import { useState, useEffect, useCallback } from 'react'
import { AdminPaginator } from './AdminPaginator'

const ITEMS_PAGE_SIZE = 10
import type { ShopItem, Purchase, PurchaseStatus, ShopCategory } from '../../data/shop'
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_ICONS,
  RARITY_NAMES, RARITY_COLORS,
} from '../../data/shop'
import {
  adminGetAllPurchases, adminUpdatePurchase,
  adminGetShopItems, adminUpdateShopItem, adminAddShopItem, adminDeleteShopItem, adminGetShopStats,
} from '../../server/shopServer'

type AdminTab = 'dashboard' | 'queue' | 'items' | 'analytics'

interface Props { admin: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGems(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: PurchaseStatus }) {
  const color = STATUS_COLORS[status]
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      {(status === 'pending' || status === 'processing') &&
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
      {STATUS_LABELS[status]}
    </span>
  )
}

function RarityBadge({ rarity }: { rarity: number }) {
  const color = RARITY_COLORS[rarity] ?? '#9ca3af'
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
    >
      {RARITY_NAMES[rarity] ?? `R${rarity}`}
    </span>
  )
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: `${color}20`, background: `${color}06` }}
    >
      <p className="font-black text-2xl" style={{ color }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: `${color}80` }}>{sub}</p>}
      <p className="text-gray-600 text-[10px] mt-1">{label}</p>
    </div>
  )
}

// ─── Purchase Row ─────────────────────────────────────────────────────────────

function PurchaseRow({ purchase, selected, onSelect, onUpdate }: {
  purchase: Purchase
  selected: boolean
  onSelect: (id: string) => void
  onUpdate: () => void
}) {
  const [expanded,    setExpanded]   = useState(false)
  const [saving,      setSaving]     = useState(false)
  const [staffNotes,  setStaffNotes] = useState(purchase.staffNotes ?? '')
  const [playerNotes, setPlayerNotes]= useState(purchase.playerNotes ?? '')
  const [message,     setMessage]    = useState('')

  async function updateStatus(status: PurchaseStatus) {
    setSaving(true)
    setMessage('')
    try {
      const result = await adminUpdatePurchase({
        data: { purchaseId: purchase.id, status, staffNotes: staffNotes || null, playerNotes: playerNotes || null },
      })
      if (result.success) {
        setMessage(status === 'cancelled' || status === 'rejected' ? '✅ Status updated — Gems refunded' : '✅ Status updated')
        onUpdate()
      } else {
        setMessage(`❌ ${result.error}`)
      }
    } catch { setMessage('❌ Error updating status') }
    finally { setSaving(false) }
  }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-200 ${
      selected ? 'border-[#00BFFF]/30 bg-[#00BFFF]/3' : 'border-white/8 bg-[#0B0F17]'
    }`}>
      <div className="p-4 flex items-center gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(purchase.id)}
          onClick={e => e.stopPropagation()}
          className="rounded border-white/20 bg-white/5 cursor-pointer shrink-0"
        />
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 text-left grid grid-cols-1 sm:grid-cols-4 gap-2 items-center min-w-0"
        >
          <div>
            <p className="text-[#00BFFF] text-xs font-mono font-bold">{purchase.id}</p>
            <p className="text-gray-600 text-[10px]">{timeAgo(purchase.createdAt)}</p>
          </div>
          <div>
            <p className="text-white text-xs font-semibold truncate">{purchase.username}</p>
            <p className="text-gray-600 text-[10px]">{CATEGORY_LABELS[purchase.category]}</p>
          </div>
          <div>
            <p className="text-white text-xs font-semibold truncate">{purchase.itemName}</p>
            {purchase.quantity > 1 && <p className="text-gray-600 text-[10px]">×{purchase.quantity}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-purple-400 text-xs font-bold">✨ {formatGems(purchase.totalCost)}</span>
            <StatusBadge status={purchase.status} />
          </div>
        </button>
        <span
          onClick={() => setExpanded(v => !v)}
          className={`text-gray-600 text-xs cursor-pointer transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`}
        >▼</span>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
            <div><span className="text-gray-700 block text-[10px]">Created</span>{formatDate(purchase.createdAt)}</div>
            <div><span className="text-gray-700 block text-[10px]">Updated</span>{formatDate(purchase.updatedAt)}</div>
            {purchase.completedAt && <div><span className="text-gray-700 block text-[10px]">Completed</span>{formatDate(purchase.completedAt)}</div>}
            <div><span className="text-gray-700 block text-[10px]">Unit Price</span>✨ {purchase.price.toLocaleString()}</div>
          </div>

          {purchase.refunded && (
            <div className="flex gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400">
              ♻️ Refunded ✨ {purchase.totalCost.toLocaleString()} Gems{purchase.refundedAt ? ` • ${formatDate(purchase.refundedAt)}` : ''}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Staff Notes (internal only)</label>
              <textarea
                value={staffNotes}
                onChange={e => setStaffNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes for staff…"
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs placeholder-gray-700 outline-none focus:border-white/20 resize-none transition-all"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Player Notes (visible to player)</label>
              <textarea
                value={playerNotes}
                onChange={e => setPlayerNotes(e.target.value)}
                rows={2}
                placeholder="Message shown to the player…"
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs placeholder-gray-700 outline-none focus:border-white/20 resize-none transition-all"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(['pending', 'processing', 'completed', 'cancelled', 'rejected'] as PurchaseStatus[]).map(s => {
              const color   = STATUS_COLORS[s]
              const isActive = purchase.status === s
              return (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={saving || isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive ? 'opacity-40 cursor-default' : 'hover:opacity-90 active:scale-95'
                  }`}
                  style={{ background: `${color}15`, border: `1px solid ${color}30`, color, opacity: saving ? 0.5 : undefined }}
                >
                  {saving ? '…' : STATUS_LABELS[s]}
                </button>
              )
            })}
            {message && (
              <p className={`text-xs font-medium ml-1 ${message.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Full Item Editor (edit existing) ─────────────────────────────────────────

function ItemEditor({ item, onSave, onDelete }: { item: ShopItem; onSave: () => void; onDelete: () => void }) {
  const [form,      setForm]    = useState({ ...item })
  const [saving,    setSaving]  = useState(false)
  const [deleting,  setDeleting]= useState(false)
  const [confirmDel,setConfirm] = useState(false)
  const [message,   setMsg]     = useState('')
  const [expanded,  setExpanded]= useState(false)

  const rarityColor = RARITY_COLORS[form.rarity] ?? '#9ca3af'

  async function save() {
    setSaving(true)
    setMsg('')
    try {
      const result = await adminUpdateShopItem({ data: {
        id: form.id, name: form.name, description: form.description,
        price: form.price, icon: form.icon, enabled: form.enabled,
        featured: form.featured,
        purchaseLimit: form.purchaseLimit, stock: form.stock,
      }})
      if (result.success) { setMsg('✅ Saved'); onSave() }
      else setMsg(`❌ ${result.error}`)
    } catch { setMsg('❌ Save failed') }
    finally { setSaving(false) }
  }

  async function deleteItem() {
    setDeleting(true)
    try {
      const result = await adminDeleteShopItem({ data: { id: item.id } })
      if (result.success) onDelete()
      else setMsg(`❌ ${result.error}`)
    } catch { setMsg('❌ Delete failed') }
    finally { setDeleting(false); setConfirm(false) }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-[#0B0F17] overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-white/2 transition-colors"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ background: `${rarityColor}15`, border: `1px solid ${rarityColor}25` }}
        >
          {form.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-bold">{form.name}</p>
            <RarityBadge rarity={form.rarity} />
            {!form.enabled && <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">Disabled</span>}
            {form.featured && <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">★ Featured</span>}
          </div>
          <p className="text-gray-600 text-[10px] mt-0.5">
            {CATEGORY_LABELS[form.category]} · ✨ {formatGems(form.price)} · {form.id}
          </p>
        </div>
        <span className={`text-gray-600 text-xs shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* Toggles */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="rounded" />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
              Featured (shows in hero section)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name */}
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all" />
            </div>
            {/* Category */}
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ShopCategory }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-[#0B0F17] text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all">
                <option value="ranks">Ranks</option>
                <option value="crate-keys">Crate Keys</option>
                <option value="amethyst-tools">Amethyst Tools</option>
              </select>
            </div>
            {/* Rarity */}
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Rarity</label>
              <select value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-[#0B0F17] text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all">
                {[1,2,3,4,5,6].map(r => (
                  <option key={r} value={r}>{RARITY_NAMES[r]} (R{r})</option>
                ))}
              </select>
            </div>
            {/* Price */}
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Price (Gems ✨)</label>
              <input type="number" min={1} value={form.price} onChange={e => setForm(f => ({ ...f, price: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all" />
            </div>
            {/* Icon */}
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Icon (emoji)</label>
              <input type="text" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all" />
            </div>
            {/* Purchase Limit */}
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Purchase Limit (blank = unlimited)</label>
              <input
                type="number" min={1}
                value={form.purchaseLimit ?? ''}
                placeholder="Unlimited"
                onChange={e => setForm(f => ({ ...f, purchaseLimit: e.target.value ? Math.max(1, parseInt(e.target.value)) : null }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all placeholder-gray-700"
              />
            </div>
            {/* Stock */}
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Stock (blank = unlimited)</label>
              <input
                type="number" min={0}
                value={form.stock ?? ''}
                placeholder="Unlimited"
                onChange={e => setForm(f => ({ ...f, stock: e.target.value ? Math.max(0, parseInt(e.target.value)) : null }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all placeholder-gray-700"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 resize-none transition-all"
            />
          </div>

          {message && (
            <p className={`text-xs font-medium ${message.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#00BFFF]/15 border border-[#00BFFF]/25 text-[#00BFFF] text-xs font-semibold hover:bg-[#00BFFF]/25 transition-all disabled:opacity-50"
            >
              {saving ? '⏳ Saving…' : '💾 Save Changes'}
            </button>
            {!confirmDel ? (
              <button
                onClick={() => setConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
              >
                🗑 Delete Item
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs">Confirm delete?</span>
                <button
                  onClick={deleteItem}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                >
                  {deleting ? '…' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-500 text-xs hover:text-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add New Item Form ─────────────────────────────────────────────────────────

const BLANK_ITEM: Omit<ShopItem, 'id'> = {
  category: 'ranks',
  name: '',
  description: '',
  price: 50000,
  rarity: 1,
  icon: '⭐',
  enabled: true,
  featured: false,
  purchaseLimit: null,
  stock: null,
}

function AddItemForm({ onAdded }: { onAdded: () => void }) {
  const [open,    setOpen]   = useState(false)
  const [form,    setForm]   = useState({ id: '', ...BLANK_ITEM })
  const [saving,  setSaving] = useState(false)
  const [message, setMsg]    = useState('')

  const rarityColor = RARITY_COLORS[form.rarity] ?? '#9ca3af'

  async function submit() {
    if (!form.id.trim()) { setMsg('❌ Item ID is required'); return }
    if (!form.name.trim()) { setMsg('❌ Name is required'); return }
    setSaving(true)
    setMsg('')
    try {
      const result = await adminAddShopItem({ data: { ...form, id: form.id.trim().toLowerCase().replace(/\s+/g, '-') } })
      if (result.success) {
        setMsg('✅ Item added!')
        setForm({ id: '', ...BLANK_ITEM })
        onAdded()
        setTimeout(() => { setOpen(false); setMsg('') }, 1200)
      } else {
        setMsg(`❌ ${result.error}`)
      }
    } catch { setMsg('❌ Error adding item') }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-white/10 bg-[#080B11] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/2 transition-colors group"
      >
        <div className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-gray-500 group-hover:text-white group-hover:border-[#00BFFF]/30 transition-all">
          +
        </div>
        <div>
          <p className="text-gray-400 text-sm font-semibold group-hover:text-white transition-colors">Add New Item</p>
          <p className="text-gray-700 text-[10px]">Create a custom shop item with full control</p>
        </div>
        <span className={`ml-auto text-gray-600 text-xs shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* Live preview */}
          <div className="flex items-start gap-4 p-3 rounded-xl border border-white/8 bg-[#0B0F17]">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${rarityColor}15`, border: `1px solid ${rarityColor}30` }}
            >
              {form.icon || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-bold text-sm">{form.name || 'Item Name'}</p>
                <RarityBadge rarity={form.rarity} />
                {form.featured && <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">★ Featured</span>}
              </div>
              <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">{form.description || 'Description…'}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-400 text-xs font-bold">✨ {formatGems(form.price)}</span>
                <span className="text-gray-700 text-[10px]">· {CATEGORY_LABELS[form.category]}</span>
                {form.purchaseLimit && <span className="text-gray-700 text-[10px]">· Limit: ×{form.purchaseLimit}</span>}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Item ID <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.id}
                placeholder="e.g. vip-rank-v2"
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all placeholder-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.name}
                placeholder="Display name…"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all placeholder-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ShopCategory }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-[#0B0F17] text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all"
              >
                <option value="ranks">Ranks</option>
                <option value="crate-keys">Crate Keys</option>
                <option value="amethyst-tools">Amethyst Tools</option>
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Price (Gems ✨)</label>
              <input
                type="number" min={1}
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Rarity</label>
              <select
                value={form.rarity}
                onChange={e => setForm(f => ({ ...f, rarity: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-[#0B0F17] text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all"
              >
                {[1,2,3,4,5,6].map(r => (
                  <option key={r} value={r}>{RARITY_NAMES[r]} (Tier {r})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Icon (emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Purchase Limit (blank = unlimited)</label>
              <input
                type="number" min={1}
                value={form.purchaseLimit ?? ''}
                placeholder="Unlimited"
                onChange={e => setForm(f => ({ ...f, purchaseLimit: e.target.value ? Math.max(1, parseInt(e.target.value)) : null }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all placeholder-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Stock (blank = unlimited)</label>
              <input
                type="number" min={0}
                value={form.stock ?? ''}
                placeholder="Unlimited"
                onChange={e => setForm(f => ({ ...f, stock: e.target.value ? Math.max(0, parseInt(e.target.value)) : null }))}
                className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 transition-all placeholder-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-600 text-[10px] uppercase tracking-wide mb-1 block">Description</label>
            <textarea
              value={form.description}
              placeholder="What does this item do? What does the player get?"
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs outline-none focus:border-[#00BFFF]/30 resize-none transition-all placeholder-gray-700"
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} className="rounded" />
              Enabled immediately
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="rounded" />
              Featured (hero section)
            </label>
          </div>

          {message && (
            <p className={`text-xs font-medium ${message.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF] text-sm font-bold hover:bg-[#00BFFF]/25 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? '⏳ Adding…' : '✨ Add Item to Shop'}
            </button>
            <button
              onClick={() => { setOpen(false); setMsg(''); setForm({ id: '', ...BLANK_ITEM }) }}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-500 text-xs hover:text-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold" style={{ color }}>✨ {formatGems(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function AnalyticsTab({ purchases, items, stats }: { purchases: Purchase[]; items: ShopItem[]; stats: any }) {
  // Category breakdown
  const catRevenue: Record<string, number> = {}
  const catCount:   Record<string, number> = {}
  for (const p of purchases.filter(x => !x.refunded)) {
    catRevenue[p.category] = (catRevenue[p.category] ?? 0) + p.totalCost
    catCount[p.category]   = (catCount[p.category] ?? 0) + 1
  }
  const maxCatRev = Math.max(...Object.values(catRevenue), 1)

  // Status funnel
  const total     = purchases.length
  const pending   = purchases.filter(p => p.status === 'pending').length
  const processing= purchases.filter(p => p.status === 'processing').length
  const completed = purchases.filter(p => p.status === 'completed').length
  const refunds   = purchases.filter(p => p.refunded).length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const refundRate     = total > 0 ? Math.round((refunds   / total) * 100) : 0

  // 7-day daily orders (simple buckets)
  const now  = Date.now()
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const dailyBuckets = new Array(7).fill(0).map((_, i) => {
    const start = now - (6 - i) * 86_400_000
    const end   = start + 86_400_000
    const count = purchases.filter(p => p.createdAt >= start && p.createdAt < end).length
    const gems  = purchases.filter(p => p.createdAt >= start && p.createdAt < end && !p.refunded)
                           .reduce((s, p) => s + p.totalCost, 0)
    const dayName = days[new Date(start).getDay()]
    return { dayName, count, gems }
  })
  const maxDaily = Math.max(...dailyBuckets.map(d => d.count), 1)

  // Items availability overview
  const enabledCount  = items.filter(i => i.enabled).length
  const disabledCount = items.filter(i => !i.enabled).length
  const featuredCount = items.filter(i => i.featured).length

  return (
    <div className="space-y-6">
      {/* Funnel + rate cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Completion Rate"  value={`${completionRate}%`}  color="#22c55e" sub={`${completed} completed`} />
        <StatCard label="Refund Rate"      value={`${refundRate}%`}      color="#f59e0b" sub={`${refunds} refunded`} />
        <StatCard label="Pending + Active" value={pending + processing}  color="#3b82f6" sub="awaiting action" />
        <StatCard label="Avg Order Value"  value={total > 0 ? `✨ ${formatGems(Math.round(purchases.reduce((s, p) => s + p.totalCost, 0) / total))}` : '—'} color="#a855f7" sub="per purchase" />
      </div>

      {/* 7-Day sparkline */}
      <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
        <h3 className="text-white font-bold text-sm mb-4">📅 Last 7 Days — Order Activity</h3>
        {dailyBuckets.every(d => d.count === 0) ? (
          <p className="text-gray-600 text-xs">No orders in the last 7 days</p>
        ) : (
          <div className="flex items-end gap-2 h-24">
            {dailyBuckets.map((d, i) => {
              const pct = (d.count / maxDaily) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-600">{d.count > 0 ? d.count : ''}</span>
                  <div className="w-full rounded-t-sm flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md transition-all duration-700"
                      style={{
                        height: `${Math.max(pct, d.count > 0 ? 8 : 0)}%`,
                        background: d.count > 0 ? '#00BFFF' : '#ffffff08',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-600">{d.dayName}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Category Revenue Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
          <h3 className="text-white font-bold text-sm mb-4">💰 Revenue by Category</h3>
          {Object.keys(catRevenue).length === 0 ? (
            <p className="text-gray-600 text-xs">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {(['ranks', 'crate-keys', 'amethyst-tools'] as ShopCategory[]).map((cat, i) => {
                const colors = ['#f59e0b', '#3b82f6', '#a855f7']
                return (
                  <BarRow
                    key={cat}
                    label={`${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]} (${catCount[cat] ?? 0} orders)`}
                    value={catRevenue[cat] ?? 0}
                    max={maxCatRev}
                    color={colors[i]}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Catalog health */}
        <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
          <h3 className="text-white font-bold text-sm mb-4">🏪 Catalog Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Total Items</span>
              <span className="text-white font-bold">{items.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Enabled</span>
              <span className="text-green-400 font-bold">{enabledCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Disabled / Hidden</span>
              <span className="text-gray-500 font-bold">{disabledCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Featured</span>
              <span className="text-amber-400 font-bold">★ {featuredCount}</span>
            </div>
            <div className="border-t border-white/5 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">By Rarity</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[1,2,3,4,5,6].map(r => {
                  const cnt = items.filter(i => i.rarity === r).length
                  if (!cnt) return null
                  const col = RARITY_COLORS[r]
                  return (
                    <span key={r} className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${col}15`, color: col, border: `1px solid ${col}25` }}>
                      {RARITY_NAMES[r]}: {cnt}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
          <h3 className="text-white font-bold text-sm mb-3">🏆 Top Selling Items</h3>
          {(stats?.topItems ?? []).length === 0 ? (
            <p className="text-gray-600 text-xs">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topItems.map((item: any, i: number) => (
                <div key={item.itemName} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-5 shrink-0">{i + 1}.</span>
                  <span className="text-white text-xs flex-1 truncate">{item.itemName}</span>
                  <span className="text-purple-400 text-xs font-bold shrink-0">✨ {formatGems(item.gemsSpent)}</span>
                  <span className="text-gray-600 text-[10px] shrink-0">×{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
          <h3 className="text-white font-bold text-sm mb-3">💎 Highest Spenders</h3>
          {(stats?.topBuyers ?? []).length === 0 ? (
            <p className="text-gray-600 text-xs">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topBuyers.map((buyer: any, i: number) => (
                <div key={buyer.username} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-5 shrink-0">{i + 1}.</span>
                  <span className="text-white text-xs flex-1 truncate">{buyer.username}</span>
                  <span className="text-purple-400 text-xs font-bold shrink-0">✨ {formatGems(buyer.gemsSpent)}</span>
                  <span className="text-gray-600 text-[10px] shrink-0">{buyer.count} orders</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main ShopManager ─────────────────────────────────────────────────────────

const QUEUE_PAGE_SIZE = 20

export function ShopManager({ admin: _admin }: Props) {
  const [tab,          setTab]         = useState<AdminTab>('dashboard')
  const [purchases,    setPurchases]   = useState<Purchase[]>([])
  const [items,        setItems]       = useState<ShopItem[]>([])
  const [stats,        setStats]       = useState<any>(null)
  const [loading,      setLoading]     = useState(true)
  const [search,       setSearch]      = useState('')
  const [statusFilter, setStatusFilter]= useState<PurchaseStatus | 'all'>('all')
  const [sortBy,       setSortBy]      = useState<'newest' | 'oldest' | 'cost-desc' | 'cost-asc'>('newest')
  const [selected,     setSelected]    = useState<Set<string>>(new Set())
  const [bulkSaving,   setBulkSaving]  = useState(false)
  const [bulkMsg,      setBulkMsg]     = useState('')
  const [queuePage,    setQueuePage]   = useState(1)
  const [itemFilter,   setItemFilter]  = useState<ShopCategory | 'all'>('all')
  const [itemSearch,   setItemSearch]  = useState('')
  const [itemPage,     setItemPage]    = useState(1)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [p, i, s] = await Promise.all([adminGetAllPurchases(), adminGetShopItems(), adminGetShopStats()])
      setPurchases(p)
      setItems(i)
      setStats(s)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    function onUpdate() { loadAll() }
    window.addEventListener('shop_updated', onUpdate)
    return () => window.removeEventListener('shop_updated', onUpdate)
  }, [loadAll])

  // Reset page on filter change
  useEffect(() => { setQueuePage(1); setSelected(new Set()) }, [search, statusFilter, sortBy])
  useEffect(() => { setItemPage(1) }, [itemFilter, itemSearch])

  // Filtered + sorted purchases
  const filteredPurchases = purchases.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!p.username.toLowerCase().includes(q) && !p.itemName.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'newest')    return b.createdAt - a.createdAt
    if (sortBy === 'oldest')    return a.createdAt - b.createdAt
    if (sortBy === 'cost-desc') return b.totalCost - a.totalCost
    return a.totalCost - b.totalCost
  })

  const totalQueuePages = Math.max(1, Math.ceil(filteredPurchases.length / QUEUE_PAGE_SIZE))
  const safePage        = Math.min(queuePage, totalQueuePages)
  const pagedPurchases  = filteredPurchases.slice((safePage - 1) * QUEUE_PAGE_SIZE, safePage * QUEUE_PAGE_SIZE)

  // Filtered items
  const filteredItems = items.filter(item => {
    if (itemFilter !== 'all' && item.category !== itemFilter) return false
    if (itemSearch) {
      const q = itemSearch.toLowerCase()
      if (!item.name.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q)) return false
    }
    return true
  })
  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PAGE_SIZE))
  const safeItemPage   = Math.min(itemPage, totalItemPages)
  const pagedItems     = filteredItems.slice((safeItemPage - 1) * ITEMS_PAGE_SIZE, safeItemPage * ITEMS_PAGE_SIZE)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(pagedPurchases.map(p => p.id)))
  }

  function clearSelection() { setSelected(new Set()) }

  async function bulkUpdate(status: PurchaseStatus) {
    if (selected.size === 0) return
    setBulkSaving(true)
    setBulkMsg('')
    let ok = 0; let fail = 0
    for (const id of selected) {
      try {
        const r = await adminUpdatePurchase({ data: { purchaseId: id, status } })
        r.success ? ok++ : fail++
      } catch { fail++ }
    }
    await loadAll()
    setBulkMsg(`✅ Updated ${ok} order${ok !== 1 ? 's' : ''}${fail ? ` — ${fail} failed` : ''}`)
    setSelected(new Set())
    setBulkSaving(false)
    setTimeout(() => setBulkMsg(''), 3000)
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00BFFF]/40 border-t-[#00BFFF] animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading shop data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 w-fit flex-wrap">
        {([
          ['dashboard', '📊', 'Dashboard'],
          ['queue',     '📋', 'Purchase Queue'],
          ['items',     '🛒', 'Item Management'],
          ['analytics', '📈', 'Analytics'],
        ] as const).map(([t, icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t
                ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/25 text-[#00BFFF]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{icon}</span>
            {label}
            {t === 'queue' && (stats?.pending ?? 0) > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={loadAll}
          disabled={loading}
          className="px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 text-sm border border-white/8 hover:border-white/15 transition-all ml-1 disabled:opacity-40"
          title="Refresh"
        >
          {loading ? '⏳' : '↻'}
        </button>
      </div>

      {/* ── Dashboard Tab ──────────────────────────────────────────────────── */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total Orders"    value={stats.total}      color="#00BFFF" />
            <StatCard label="Pending"         value={stats.pending}    color="#f59e0b" sub="awaiting action" />
            <StatCard label="Processing"      value={stats.processing} color="#3b82f6" />
            <StatCard label="Completed"       value={stats.completed}  color="#22c55e" />
            <StatCard label="Cancelled"       value={stats.cancelled}  color="#6b7280" />
            <StatCard
              label="Gems Circulated"
              value={`✨ ${formatGems(stats.totalGemsSpent)}`}
              color="#a855f7"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
              <h3 className="text-white font-bold text-sm mb-3">🏆 Top Items</h3>
              {stats.topItems.length === 0 ? (
                <p className="text-gray-600 text-xs">No purchases yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.topItems.slice(0, 5).map((item: any, i: number) => (
                    <div key={item.itemName} className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs w-5 shrink-0">{i + 1}.</span>
                      <span className="text-white text-xs flex-1 truncate">{item.itemName}</span>
                      <span className="text-purple-400 text-xs font-bold shrink-0">✨ {formatGems(item.gemsSpent)}</span>
                      <span className="text-gray-600 text-[10px] shrink-0">×{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
              <h3 className="text-white font-bold text-sm mb-3">💎 Top Buyers</h3>
              {stats.topBuyers.length === 0 ? (
                <p className="text-gray-600 text-xs">No buyers yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.topBuyers.slice(0, 5).map((buyer: any, i: number) => (
                    <div key={buyer.username} className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs w-5 shrink-0">{i + 1}.</span>
                      <span className="text-white text-xs flex-1 truncate">{buyer.username}</span>
                      <span className="text-purple-400 text-xs font-bold shrink-0">✨ {formatGems(buyer.gemsSpent)}</span>
                      <span className="text-gray-600 text-[10px] shrink-0">{buyer.count} order{buyer.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-4">
            <h3 className="text-white font-bold text-sm mb-3">🕐 Recent Orders</h3>
            {stats.recentPurchases.length === 0 ? (
              <p className="text-gray-600 text-xs">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {stats.recentPurchases.map((p: Purchase) => (
                  <div key={p.id} className="flex items-center gap-3 text-xs">
                    <span className="text-[#00BFFF] font-mono font-bold shrink-0">{p.id}</span>
                    <span className="text-gray-400 shrink-0">{p.username}</span>
                    <span className="text-white flex-1 truncate">{p.itemName}</span>
                    <span className="text-purple-400 shrink-0">✨ {formatGems(p.totalCost)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Purchase Queue Tab ─────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div className="space-y-4">
          {/* Filter/sort row */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search player, item, ID…"
                className="pl-8 pr-4 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs placeholder-gray-600 outline-none focus:border-[#00BFFF]/30 w-56 transition-all"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'pending', 'processing', 'completed', 'cancelled', 'rejected'] as const).map(s => {
                const color = s === 'all' ? '#00BFFF' : STATUS_COLORS[s as PurchaseStatus]
                const label = s === 'all' ? 'All' : STATUS_LABELS[s as PurchaseStatus]
                const cnt   = s === 'all' ? purchases.length : purchases.filter(p => p.status === s).length
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                      statusFilter === s ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                    }`}
                    style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                  >
                    {label}
                    <span className="opacity-60">({cnt})</span>
                  </button>
                )
              })}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-2 py-1.5 rounded-lg border border-white/8 bg-[#0B0F17] text-gray-400 text-xs outline-none focus:border-white/15 transition-all"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="cost-desc">Highest cost</option>
              <option value="cost-asc">Lowest cost</option>
            </select>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20 flex-wrap">
              <span className="text-[#00BFFF] text-xs font-bold">{selected.size} selected</span>
              <span className="text-gray-600 text-xs">Bulk set status:</span>
              {(['pending', 'processing', 'completed', 'cancelled', 'rejected'] as PurchaseStatus[]).map(s => {
                const color = STATUS_COLORS[s]
                return (
                  <button
                    key={s}
                    onClick={() => bulkUpdate(s)}
                    disabled={bulkSaving}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}
                  >
                    → {STATUS_LABELS[s]}
                  </button>
                )
              })}
              <button onClick={clearSelection} className="ml-auto text-gray-600 text-[10px] hover:text-gray-400 transition-colors">✕ Clear</button>
              {bulkMsg && <p className="w-full text-xs font-medium text-green-400">{bulkMsg}</p>}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-xs">
              {filteredPurchases.length} purchase{filteredPurchases.length !== 1 ? 's' : ''}
              {totalQueuePages > 1 && ` · Page ${safePage}/${totalQueuePages}`}
            </p>
            <div className="flex items-center gap-2">
              {filteredPurchases.length > 0 && selected.size < pagedPurchases.length && (
                <button onClick={selectAll} className="text-[#00BFFF] text-[10px] hover:underline">Select page</button>
              )}
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">No purchases found</div>
          ) : (
            <>
              <div className="space-y-2">
                {pagedPurchases.map(p => (
                  <PurchaseRow
                    key={p.id}
                    purchase={p}
                    selected={selected.has(p.id)}
                    onSelect={toggleSelect}
                    onUpdate={loadAll}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalQueuePages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: totalQueuePages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setQueuePage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                        p === safePage
                          ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF]'
                          : 'border border-white/8 text-gray-500 hover:text-white hover:border-white/15'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setQueuePage(p => Math.min(totalQueuePages, p + 1))}
                    disabled={safePage === totalQueuePages}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Item Management Tab ────────────────────────────────────────────── */}
      {tab === 'items' && (
        <div className="space-y-4">
          {/* Add new item */}
          <AddItemForm onAdded={loadAll} />

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
              <input
                type="text"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="Search items…"
                className="pl-8 pr-4 py-2 rounded-lg border border-white/8 bg-white/3 text-white text-xs placeholder-gray-600 outline-none focus:border-[#00BFFF]/30 w-48 transition-all"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'ranks', 'crate-keys', 'amethyst-tools'] as const).map(cat => {
                const colors: Record<string, string> = { all: '#00BFFF', ranks: '#f59e0b', 'crate-keys': '#3b82f6', 'amethyst-tools': '#a855f7' }
                const col = colors[cat]
                return (
                  <button
                    key={cat}
                    onClick={() => setItemFilter(cat as ShopCategory | 'all')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                      itemFilter === cat ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                    }`}
                    style={{ background: `${col}15`, color: col, border: `1px solid ${col}25` }}
                  >
                    {CATEGORY_ICONS[cat as ShopCategory | 'all']} {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as ShopCategory]}
                  </button>
                )
              })}
            </div>
            <p className="text-gray-600 text-xs ml-auto">{filteredItems.length} of {items.length} items</p>
          </div>

          {/* Item editors */}
          <div className="grid grid-cols-1 gap-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-sm">No items found</div>
            ) : (
              pagedItems.map(item => (
                <ItemEditor key={item.id} item={item} onSave={loadAll} onDelete={loadAll} />
              ))
            )}
          </div>

          <AdminPaginator
            page={safeItemPage}
            totalPages={totalItemPages}
            totalItems={filteredItems.length}
            pageSize={ITEMS_PAGE_SIZE}
            onPageChange={setItemPage}
          />
        </div>
      )}

      {/* ── Analytics Tab ──────────────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <AnalyticsTab purchases={purchases} items={items} stats={stats} />
      )}
    </div>
  )
}
