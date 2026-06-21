# Plainsight

Explore short-term rental markets — where listings are, what they cost, and who
controls them. Plainsight renders four cities (London, Berlin, Manchester,
Amsterdam) on an interactive map with a market-analysis panel, all from a single
dated public snapshot. Read-only, no tracking, no sign-up.

## Data

- **Listings data:** [Inside Airbnb](https://insideairbnb.com) — dated public
  snapshots (September 2025). Every figure traces to one immutable snapshot; no
  estimates and no live data. Inside Airbnb data is published under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Base map:** [OpenFreeMap](https://openfreemap.org), built on
  [© OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- **Listing photos:** placeholder images from Unsplash, standing in for a real
  listing-image host.

## Tech

Next.js 16 (App Router, Cache Components / PPR) · React 19 · TypeScript ·
MapLibre via react-map-gl · XState v5 (scene orchestration) · TanStack Query ·
Tailwind CSS v4 · Web Worker for off-main-thread analytics. Snapshots ship as
immutable, versioned static assets — no database or application backend.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

All build-time defaults are non-secret `NEXT_PUBLIC_*` values (see `.env`):

- `NEXT_PUBLIC_SITE_URL` — deploy origin; sets `metadataBase` for canonical/OG
  URLs. Defaults to `http://localhost:3000`.
- `NEXT_PUBLIC_CITY_ASSET_BASE_URL` — origin for the immutable city tiers.
  Defaults to the same-origin `/city-assets`; point it at a CDN/object store to
  serve them externally.

## Scripts

`pnpm build` · `pnpm start` · `pnpm test` (Vitest) · `pnpm test:e2e`
(Playwright) · `pnpm lint`
