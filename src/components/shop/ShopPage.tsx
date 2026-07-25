import { useState, useEffect, useCallback } from 'react'
import type { ShopItem, Purchase, ShopCategory } from '../../data/shop'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../data/shop'
import { useMining } from '../../context/MiningContext'
import { getShopItems, purchaseItem, getMyPurchases } from '../../server/shopServer'
import { cacheShopItems, cachePurchases } from '../../store/shopStore'
import { ShopItemCard } from './ShopItemCard'
import { PurchaseModal } from './PurchaseModal'
import { PurchaseHistory } from './PurchaseHistory'
import type { ShopToastData } from './ShopToast'
import { ShopToast } from './ShopToast'

type Tab = 'shop' | 'history'

const CATEGORIES: (ShopCategory | 'all')[] = ['all', 'ranks', 'crate-keys', 'amethyst-tools']

export function ShopPage() {
  const { user } = useMining()
  const userGems = user ? Math.floor(user.gems ?? 0) : 0

  // Start with empty arrays for SSR consistency — populated from server/cache after mount
  const [items,       setItems]      = useState<ShopItem[]>([])
  const [purchases,   setPurchases]  = useState<Purchase[]>([])
  const [tab,         setTab]        = useState<Tab>('shop')
  const [category,    setCategory]   = useState<ShopCategory | 'all'>('all')
  const [search,      setSearch]     = useState('')
  const [selected,    setSelected]   = useState<ShopItem | null>(null)
  const [loadItems,   setLoadItems]  = useState(items.length === 0)
  const [loadHistory, setLoadHistory]= useState(false)
  const [toast,       setToast]      = useState<ShopToastData | null>(null)

  const showToast = useCallback((message: string, type: ShopToastData['type'] = 'info') => {
    setToast({ message, type })
  }, [])

  // Load shop items
  useEffect(() => {
    getShopItems()
      .then(data => { setItems(data); cacheShopItems(data) })
      .catch(() => {})
      .finally(() => setLoadItems(false))
  }, [])

  // Load purchase history when user is known
  const loadPurchaseHistory = useCallback(() => {
    if (!user?.username) return
    setLoadHistory(true)
    getMyPurchases({ data: { username: user.username } })
      .then(data => { setPurchases(data); cachePurchases(data) })
      .catch(() => {})
      .finally(() => setLoadHistory(false))
  }, [user?.username])

  useEffect(() => {
    if (user?.username) loadPurchaseHistory()
  }, [user?.username, loadPurchaseHistory])

  // Listen for live shop_updated events (forwarded from MiningContext via window event)
  useEffect(() => {
    function onShopUpdated() {
      getShopItems()
        .then(data => { setItems(data); cacheShopItems(data) })
        .catch(() => {})
      if (user?.username) {
        getMyPurchases({ data: { username: user.username } })
          .then(data => { setPurchases(data); cachePurchases(data) })
          .catch(() => {})
      }
    }
    window.addEventListener('shop_updated', onShopUpdated)
    return () => window.removeEventListener('shop_updated', onShopUpdated)
  }, [user?.username])

  // Filtered items
  const filtered = items.filter(item => {
    if (category !== 'all' && item.category !== category) return false
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) &&
        !item.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const featured = items.filter(i => i.featured)

  // Purchase handler
  async function handlePurchase(item: ShopItem, quantity: number) {
    if (!user?.username) {
      showToast('Please log in to purchase items.', 'error')
      return
    }
    try {
      const result = await purchaseItem({ data: { username: user.username, itemId: item.id, quantity } })
      if (result.success && result.purchase) {
        showToast(`🎉 Purchase successful! Order ${result.purchase.id} created.`, 'success')
        setSelected(null)
        loadPurchaseHistory()
      } else {
        showToast(result.error ?? 'Purchase failed. Please try again.', 'error')
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    }
  }

  return (
    <div className="min-h-screen">

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-12 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00BFFF]/20 bg-[#00BFFF]/5 text-[#00BFFF] text-xs font-semibold mb-6 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
            Gem Store
          </div>
          <h1 className="font-black text-4xl sm:text-5xl text-white mb-4">
            Blue Tiers <span className="text-gradient">Shop</span>
          </h1>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Spend your Gems on exclusive ranks, crate keys, and Amethyst tools.
            Mine BlueCoin → Exchange for Gems → Conquer the shop.
          </p>

          {/* Gem balance */}
          {user ? (
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass border border-white/8">
              <span className="text-blue-400">✨</span>
              <span className="text-white font-black text-lg">{Math.floor(userGems).toLocaleString()}</span>
              <span className="text-gray-500 text-sm">Gems</span>
              <div className="w-px h-5 bg-white/10" />
              <span className="text-gray-500 text-xs">Ready to spend</span>
            </div>
          ) : (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 text-amber-400 text-sm">
              ⚠️ <span>Log in to the <a href="/mining" className="underline underline-offset-2 hover:text-amber-300">Mining panel</a> to see your Gems</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 w-fit">
          {([['shop', '🏪', 'Browse Shop'], ['history', '📜', 'Purchase History']] as const).map(([t, icon, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'history') loadPurchaseHistory() }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                tab === t
                  ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/25 text-[#00BFFF]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{icon}</span>
              {label}
              {t === 'history' && purchases.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                  {purchases.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">

        {/* ── Shop Tab ──────────────────────────────────────────────────────── */}
        {tab === 'shop' && (
          <div className="space-y-8">

            {/* Featured Items */}
            {featured.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-amber-400 text-sm">★</span>
                  <h2 className="text-white font-bold text-sm uppercase tracking-wide">Featured</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map(item => (
                    <ShopItemCard
                      key={item.id}
                      item={item}
                      userGems={userGems}
                      onBuy={setSelected}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Search + Categories */}
            <section className="space-y-4">
              {/* Search */}
              <div className="relative max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search items…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-gray-600 outline-none focus:border-[#00BFFF]/30 focus:bg-[#00BFFF]/5 transition-all"
                />
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      category === cat
                        ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF]'
                        : 'bg-white/4 border border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15'
                    }`}
                  >
                    <span>{CATEGORY_ICONS[cat]}</span>
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Items grid */}
              {loadItems ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-52 rounded-2xl border border-white/5 bg-white/2 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-2xl">
                    🔍
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-sm">No items found</p>
                    <p className="text-gray-600 text-xs mt-1">Try a different search or category</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map(item => (
                    <ShopItemCard
                      key={item.id}
                      item={item}
                      userGems={userGems}
                      onBuy={setSelected}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Economy info strip */}
            <div className="rounded-2xl border border-white/5 bg-white/2 p-5 flex flex-wrap gap-6 items-center justify-center text-center">
              <div>
                <p className="text-gray-600 text-xs mb-1">How to earn Gems</p>
                <p className="text-white text-sm font-semibold">Mine BC → Exchange → Spend</p>
              </div>
              <div className="w-px h-8 bg-white/8 hidden sm:block" />
              <div>
                <p className="text-gray-600 text-xs mb-1">Purchase delivery</p>
                <p className="text-white text-sm font-semibold">Staff delivers in-game</p>
              </div>
              <div className="w-px h-8 bg-white/8 hidden sm:block" />
              <div>
                <p className="text-gray-600 text-xs mb-1">Refund policy</p>
                <p className="text-white text-sm font-semibold">Auto-refund if cancelled</p>
              </div>
              <div className="w-px h-8 bg-white/8 hidden sm:block" />
              <div>
                <p className="text-gray-600 text-xs mb-1">Support</p>
                <a
                  href="https://discord.gg/DmEPAb3NFU"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00BFFF] text-sm font-semibold hover:underline"
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── History Tab ───────────────────────────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-sm">
                {purchases.length > 0 ? `${purchases.length} purchase${purchases.length === 1 ? '' : 's'}` : 'Purchase History'}
              </h2>
              {user && (
                <button
                  onClick={loadPurchaseHistory}
                  className="text-xs text-gray-500 hover:text-gray-300 border border-white/8 px-3 py-1.5 rounded-lg hover:border-white/15 transition-all"
                >
                  ↻ Refresh
                </button>
              )}
            </div>
            {!user ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center text-2xl">🔒</div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">Login required</p>
                  <p className="text-gray-600 text-xs mt-1">
                    <a href="/mining" className="text-[#00BFFF] hover:underline">Log in to the Mining panel</a> to see your purchases
                  </p>
                </div>
              </div>
            ) : (
              <PurchaseHistory purchases={purchases} loading={loadHistory} />
            )}
          </div>
        )}
      </div>

      {/* Purchase confirmation modal */}
      <PurchaseModal
        item={selected}
        userGems={userGems}
        onConfirm={handlePurchase}
        onClose={() => setSelected(null)}
      />

      {/* Toast notifications */}
      <ShopToast toast={toast} onClear={() => setToast(null)} />
    </div>
  )
}
