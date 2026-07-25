# Blue Tiers

A TanStack Start (React + Vite) marketing/community site for a Minecraft PvP network. Features a tier list, player rankings, BlueCoin mining system, shop, exchange, an admin panel, and a CMS-driven homepage.

## Stack
- **Framework**: TanStack Start / React 19
- **Bundler**: Vite 7
- **Styling**: Tailwind CSS 4
- **Routing**: TanStack Router
- **Data**: JSON files in `data/` (content, players, economy, shop, mining, etc.)
- **Auth**: `credentials.yml` (username/password store)

## How to run
```
npm install
npm run dev
```
The dev server starts on port 5000.

## Key directories
- `src/` — app source (components, routes, store, server functions)
- `data/` — JSON data files persisted to disk
- `credentials.yml` — user accounts
- `admin.yml` — admin config
- `server.mjs` — production server entry

## Replit setup
- Dependencies installed via `npm install`
- Runtime uses Node.js 22 to satisfy the TanStack Start engine requirement
- Dev workflow configured: `npm run dev` (starts Vite on port 5000)
- `vite.config.ts` already has `server.host: true` and `allowedHosts: true` for the Replit proxy

## User preferences
