import { useState } from 'react'
import type { Purchase } from '../../data/shop'
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS } from '../../data/shop'

const PAGE_SIZE = 10

interface Props {
  purchases: Purchase[]
  loading:   boolean
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: Purchase['status'] }) {
  const color = STATUS_COLORS[status]
  const dot = status === 'pending' || status === 'processing'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PurchaseHistory({ purchases, loading }: Props) {
  const [page, setPage] = useState(1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00BFFF]/40 border-t-[#00BFFF] animate-spin mx-auto" />
          <p className="text-gray-600 text-sm">Loading your purchases…</p>
        </div>
      </div>
    )
  }

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-3xl">
          🛒
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">No purchases yet</p>
          <p className="text-gray-600 text-xs mt-1">Browse the shop and spend your Gems!</p>
        </div>
      </div>
    )
  }

  const totalPages  = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const paginated   = purchases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // summary stats
  const totalSpent  = purchases.reduce((s, p) => s + (p.refunded ? 0 : p.totalCost), 0)
  const refundTotal = purchases.reduce((s, p) => s + (p.refunded ? p.totalCost : 0), 0)
  const pending     = purchases.filter(p => p.status === 'pending' || p.status === 'processing').length

  return (
    <div className="space-y-4">
      {/* Mini summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-3 text-center">
          <p className="text-white font-black text-lg">{purchases.length}</p>
          <p className="text-gray-600 text-[10px]">Total Orders</p>
        </div>
        <div className="rounded-xl border border-purple-500/15 bg-purple-500/5 p-3 text-center">
          <p className="text-purple-400 font-black text-lg">
            ✨ {totalSpent >= 1_000_000 ? `${(totalSpent / 1_000_000).toFixed(1)}M` : totalSpent >= 1_000 ? `${(totalSpent / 1_000).toFixed(1)}K` : totalSpent.toLocaleString()}
          </p>
          <p className="text-gray-600 text-[10px]">Gems Spent</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#0B0F17] p-3 text-center">
          {pending > 0 ? (
            <>
              <p className="text-amber-400 font-black text-lg">{pending}</p>
              <p className="text-gray-600 text-[10px]">Pending / Active</p>
            </>
          ) : (
            <>
              <p className="text-gray-400 font-black text-lg">
                {refundTotal > 0
                  ? `✨ ${refundTotal >= 1_000 ? `${(refundTotal / 1_000).toFixed(1)}K` : refundTotal.toLocaleString()}`
                  : '—'}
              </p>
              <p className="text-gray-600 text-[10px]">Gems Refunded</p>
            </>
          )}
        </div>
      </div>

      {/* Page info */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600 text-xs">
          {purchases.length} orders · Page {safePage} of {totalPages}
        </p>
        <p className="text-gray-700 text-[10px]">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, purchases.length)}</p>
      </div>

      {/* Purchase cards */}
      <div className="space-y-3">
        {paginated.map(p => (
          <div key={p.id} className="rounded-xl border border-white/8 bg-[#0D1117] overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-white font-bold text-sm truncate">{p.itemName}</span>
                  {p.quantity > 1 && (
                    <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">×{p.quantity}</span>
                  )}
                  <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABELS[p.category]}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                  <span className="font-mono text-gray-600">{p.id}</span>
                  <span>•</span>
                  <span className="text-purple-400 font-semibold">✨ {p.totalCost.toLocaleString()} Gems</span>
                  <span>•</span>
                  <span title={formatDate(p.createdAt)}>{timeAgo(p.createdAt)}</span>
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>

            {p.playerNotes && (
              <div className="px-4 pb-3">
                <div className="flex gap-2 bg-[#00BFFF]/5 border border-[#00BFFF]/15 rounded-lg px-3 py-2">
                  <span className="text-[#00BFFF] text-xs shrink-0">📝</span>
                  <p className="text-[#00BFFF] text-xs">{p.playerNotes}</p>
                </div>
              </div>
            )}

            {p.refunded && (
              <div className="px-4 pb-3">
                <div className="flex gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                  <span className="text-amber-400 text-xs">♻️</span>
                  <p className="text-amber-400 text-xs">
                    Refunded ✨ {p.totalCost.toLocaleString()} Gems
                    {p.refundedAt ? ` · ${timeAgo(p.refundedAt)}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-semibold hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                p === safePage
                  ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF]'
                  : 'border border-white/8 text-gray-500 hover:text-white hover:border-white/15'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-xs font-semibold hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
