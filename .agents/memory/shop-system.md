---
name: Shop System Architecture
description: How the Gem Shop works — server functions, SSE sync, data files, and admin integration.
---

# Shop System Architecture

## Data files
- `data/shop-items.json` — full item catalog; editable from Admin → Shop → Item Management (no code change needed)
- `data/shop-purchases.json` — all purchase records `{ purchases: Purchase[] }` — prepended on new purchase

Both files are included in `miningBackup.ts` `MINING_FILES` array, so they're GitHub-backed automatically via the same debounced backup system as mining data.

## Server functions (`src/server/shopServer.ts`)
- `getShopItems` (GET) — public; returns only enabled items
- `purchaseItem` (POST) — deducts gems from `mining-users.json`, creates purchase record, broadcasts SSE; in-memory `purchaseInProgress` Set prevents double-purchases
- `getMyPurchases` (POST) — returns filtered purchases for one user
- `adminGetAllPurchases` / `adminUpdatePurchase` / `adminGetShopItems` / `adminUpdateShopItem` / `adminGetShopStats` — admin panel functions; no server-side admin auth (follows existing pattern)

## SSE live sync
- `sseRegistry.ts` exports `broadcastShopUpdate()` — sends `event: shop_updated\ndata: 1\n\n` on the same `/api/mining-events` SSE channel
- `MiningContext.tsx` listens for `shop_updated` SSE events and forwards them as `window.dispatchEvent(new CustomEvent('shop_updated'))`
- `ShopPage` and admin `ShopManager` both listen to `window` for `shop_updated` to re-fetch data — no second SSE connection needed

## Gem flow
- Gems live on `User.gems` in `mining-users.json` (same field as before)
- Purchase deducts atomically on server; cancelled/rejected status auto-refunds
- After purchase, `broadcastMiningUpdate()` is also called so MiningContext refreshes the player's gem balance in real-time

## Admin section
- Added `shop-mgmt` to `AdminSection` type in `routes/admin.tsx`
- Added nav item in `AdminLayout.tsx` NAV_ITEMS + SECTION_TITLES
- `ShopManager` component: Dashboard (stats), Purchase Queue (status management), Item Management (price/description/enabled/featured editing)

**Why:** Buying items deducts gems server-side and is double-purchase protected, so client can't manipulate the flow.
