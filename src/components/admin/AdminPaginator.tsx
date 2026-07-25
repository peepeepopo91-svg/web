// ─── AdminPaginator ────────────────────────────────────────────────────────────
// Shared pagination control for all admin list views.
// Shows: First · Prev · page buttons · Next · Last + record range summary.

interface AdminPaginatorProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function AdminPaginator({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: AdminPaginatorProps) {
  if (totalPages <= 1 && totalItems <= pageSize) return null

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, totalItems)

  // Up to 5 page buttons centred around current page
  function pageRange(): number[] {
    const delta = 2
    const range: number[] = []
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      range.push(i)
    }
    return range
  }

  const base     = 'rounded-lg border text-xs font-semibold transition-all disabled:opacity-30 disabled:pointer-events-none'
  const inactive = `${base} px-3 py-1.5 border-white/8 text-gray-500 hover:text-white hover:border-white/20`
  const active   = `${base} w-8 h-8 flex items-center justify-center bg-[#00BFFF]/15 border-[#00BFFF]/30 text-[#00BFFF]`
  const num      = `${base} w-8 h-8 flex items-center justify-center border-white/8 text-gray-500 hover:text-white hover:border-white/20`

  const range = pageRange()
  const showLeadingEllipsis  = range[0] > 2
  const showTrailingEllipsis = range[range.length - 1] < totalPages - 1

  return (
    <div className="flex flex-col items-center gap-2 pt-4">
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* First */}
        <button onClick={() => onPageChange(1)} disabled={page === 1} className={inactive} aria-label="First page">«</button>
        {/* Prev */}
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={inactive} aria-label="Previous page">← Prev</button>

        {/* Leading ellipsis */}
        {showLeadingEllipsis && <span className="text-gray-700 text-xs px-1">…</span>}

        {/* Page buttons */}
        {range.map(p => (
          <button key={p} onClick={() => onPageChange(p)} className={p === page ? active : num}>
            {p}
          </button>
        ))}

        {/* Trailing ellipsis */}
        {showTrailingEllipsis && <span className="text-gray-700 text-xs px-1">…</span>}

        {/* Next */}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={inactive} aria-label="Next page">Next →</button>
        {/* Last */}
        <button onClick={() => onPageChange(totalPages)} disabled={page === totalPages} className={inactive} aria-label="Last page">»</button>
      </div>

      <p className="text-gray-700 text-[10px]">
        {totalItems === 0
          ? 'No records'
          : `Showing ${from}–${to} of ${totalItems.toLocaleString()} records · Page ${page} of ${totalPages}`}
      </p>
    </div>
  )
}
