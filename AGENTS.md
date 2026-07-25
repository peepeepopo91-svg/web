# Blue Tiers — Agent Architecture Guide

## Project Overview

Blue Tiers is a Minecraft PvP tier list website built with TanStack Start (React SSR), TanStack Router (file-based routing), Tailwind CSS v4, and deployed on Netlify.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5 |
| Deployment | Netlify |

## Directory Structure

```
src/
├── components/
│   ├── Navbar.tsx      # Sticky responsive nav with mobile hamburger menu
│   ├── Hero.tsx        # Hero section with canvas particles + copy-IP button
│   ├── Features.tsx    # 3-column feature cards
│   ├── Stats.tsx       # Animated counters (IntersectionObserver triggered)
│   ├── PlayerCard.tsx  # Player card with gamemode icons + tier tooltips
│   └── Footer.tsx      # Site footer
├── data/
│   └── players.ts      # ALL player data — single source of truth
├── routes/
│   ├── __root.tsx      # HTML shell, Google Fonts, meta tags
│   ├── index.tsx       # Home page (Hero + Features + Stats + Footer)
│   └── rankings.tsx    # Rankings page (search, gamemode filter, player grid)
└── styles.css          # Global CSS, Tailwind import, animations, glassmorphism
```

## Key Conventions

### Adding Players
Only `src/data/players.ts` needs to change. Add a `Player` object to the array:
```typescript
{
  name: "PlayerName",
  head: "https://mc-heads.net/avatar/PlayerName",
  ranks: { sword: "HT1", crystal: "LT2" }  // null/omit = unranked
}
```

### Tier System
`HT1` > `HT2` > `HT3` > `LT1` > `LT2` > `LT3`. Colors defined in `tierColors` in `PlayerCard.tsx`.

### Gamemodes
The `gamemodes` array in `PlayerCard.tsx` defines available gamemodes with icon and label. To add a new gamemode, update that array AND the `PlayerRanks` interface in `players.ts`.

### Styling
- Brand blues: `#00BFFF`, `#0099FF`, `#0066FF`
- Backgrounds: `#0B0F17`, `#111827`, `#161B22`
- Custom utilities (`.glass`, `.text-gradient`, `.btn-primary`, `.discord-btn`) in `styles.css`
- Stagger animation: wrap a grid in `.stagger` class for fade-in children

### Routing
TanStack Router with file-based routes. `routeTree.gen` is auto-generated at build time — never edit it. Root uses `shellComponent` (TanStack Start HTML shell pattern).

## Non-Obvious Decisions

- Canvas particles in `Hero.tsx` use `requestAnimationFrame` with cleanup to avoid memory leaks.
- `mc-heads.net/avatar/{name}` serves player head images; `onError` falls back to 👤 emoji.
- Stats counters start only when scrolled into view via IntersectionObserver (threshold 0.5).
- Rankings sort by best overall tier when no gamemode filter is active; by that gamemode's tier when filtered.
