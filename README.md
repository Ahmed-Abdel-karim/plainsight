# Plainsight

**An interactive short-term-rental market explorer — where listings are, what
they cost, and who controls them.**

Plainsight renders four cities (London, Berlin, Manchester, Amsterdam) on an
interactive map with a market-analysis panel, all from a single dated public
snapshot. Read-only, no tracking, no sign-up.

**▶ Live demo: [plainsight-theta.vercel.app](https://plainsight-theta.vercel.app/)**

![Plainsight — the Analyse and Browse lenses, with the mobile view](docs/media/hero.png)

<p>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript" />
  <img alt="XState 5" src="https://img.shields.io/badge/XState-5-2c3e50" />
  <img alt="MapLibre" src="https://img.shields.io/badge/MapLibre-GL-295dfe" />
</p>

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Data & attribution](#data--attribution)
- [License](#license)

## Features

- **One map, two lenses.** Switch a single map between **Analyse** (investor —
  aggregate price, room-mix, and host structure with a hex density layer, KPI and
  chart cards) and **Browse** (renter — the individual public listings behind the
  aggregates, as map points, a scrollable list, and detail).
- **Filter and scope.** Narrow by room type, price range, or neighbourhood; the
  map, aggregates, and listing set stay in sync.
- **Off-thread analytics.** Heavy aggregation runs in a Web Worker, so the map
  and UI stay responsive; a city's listings are cached so revisiting it is
  instant.
- **Restorable state.** The lens, selection, scope, and filters live in the URL —
  share or reopen an exploration exactly as it was.
- **Dark-first, accessible, responsive.** Working dark/light themes, full
  keyboard path, WCAG-AA targets, and a desktop sidebar that becomes a mobile
  bottom-sheet from one component.
- **One immutable snapshot per city.** Every map layer, aggregate, count, and
  listing traces to the same dated public snapshot — no estimates, no live data.

## How it works

Plainsight is a **Next.js 16 App Router** application with **Cache Components /
PPR**. There is **no backend**: each city is an immutable, dated snapshot served
as static assets, and all filtering and aggregation happens in the browser (heavy
work off the main thread in a Web Worker).

Scene orchestration — the coordination of the map, the worker, the URL, and the
city-switch lifecycle — is owned by a single **XState v5 actor system** (a `root`
machine invoking session-lifetime `map` / `ui` / `worker` machines and spawning a
`city` machine per navigation), rather than ad-hoc effects.

The full picture — module boundaries, runtime/data flow, and the state-machine
diagrams — is in [`_docs/architecture.md`](_docs/architecture.md). Product scope
and constraints are in
[`_docs/project-boundaries.md`](_docs/project-boundaries.md); the key decisions
are recorded as ADRs in [`_docs/decisions/`](_docs/decisions/).

## Tech stack

| Area          | Choice                                                              |
| ------------- | ------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Cache Components / PPR) · React 19          |
| Language      | TypeScript (strict)                                                 |
| Map           | MapLibre GL via react-map-gl · OpenFreeMap base tiles               |
| State         | XState v5 (scene orchestration) · TanStack Query (data/cache layer) |
| Styling       | Tailwind CSS v4 · shadcn/ui primitives · design tokens              |
| Geo / compute | h3-js hex aggregation · a dedicated Web Worker for analytics        |
| Tooling       | pnpm · Vitest · Playwright · ESLint · Prettier                      |

Snapshots ship as immutable, versioned static assets — no database or application
backend.

## Project structure

Feature-based ("screaming") architecture; dependencies point downward only.

```text
app/         Routes — compose features, own Suspense & generateStaticParams
features/    Product surfaces — scene/ (the map explorer) and home/ (city picker)
components/  Shared, cross-feature UI only — ui/ (shadcn), theme/, chrome
data/        The IO seam — loaders → repository (ports & adapters), snapshots
lib/         Pure kernel — filters, geo, hex, the listings worker engine, query
_docs/       Architecture, conventions, testing, project boundaries, ADRs
```

See [`_docs/architecture.md`](_docs/architecture.md) for the layer rules and the
`features/scene` breakdown.

## Getting started

**Prerequisites:** Node.js 24 (see `.nvmrc`) and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | What it does                               |
| --------------- | ------------------------------------------ |
| `pnpm dev`      | Start the dev server                       |
| `pnpm build`    | Production build                           |
| `pnpm start`    | Serve the production build                 |
| `pnpm test`     | Unit, machine, and UI integration (Vitest) |
| `pnpm test:e2e` | End-to-end browser tests (Playwright)      |
| `pnpm lint`     | ESLint (`lint:strict` fails on warnings)   |
| `pnpm format`   | Prettier write (`format:check` to verify)  |

## Configuration

All build-time defaults are non-secret `NEXT_PUBLIC_*` values (see `.env`):

- `NEXT_PUBLIC_SITE_URL` — deploy origin; sets `metadataBase` for canonical/OG
  URLs. Defaults to `http://localhost:3000`.
- `NEXT_PUBLIC_CITY_ASSET_BASE_URL` — origin for the immutable city tiers.
  Defaults to the same-origin `/city-assets`; point it at a CDN/object store to
  serve them externally (configure that origin's CORS and immutable cache
  headers).

## Testing

The suite follows a Testing-Trophy split — pure logic and XState machines as unit
tests, rendered behavior as UI integration tests (accessibility-first queries,
MSW-backed data), and real user journeys as Playwright E2E. Full philosophy,
layers, and rules: [`_docs/testing.md`](_docs/testing.md).

```bash
pnpm test          # Vitest: unit + machine + UI integration
pnpm test:e2e      # Playwright: end-to-end journeys
```

## Deployment

Built for [Vercel](https://vercel.com) (`vercel.json`); CI runs lint, type-check,
and the test suites via GitHub Actions (`.github/workflows/ci-cd.yml`). The app
prerenders one static route per city (`generateStaticParams`), and the immutable
city tiers are served with long-lived `immutable` cache headers — set
`NEXT_PUBLIC_CITY_ASSET_BASE_URL` to serve them from a CDN in production.

## Data & attribution

- **Listings data:** [Inside Airbnb](https://insideairbnb.com) — dated public
  snapshots (September 2025). Every figure traces to one immutable snapshot; no
  estimates and no live data. Inside Airbnb data is published under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Base map:** [OpenFreeMap](https://openfreemap.org), built on
  [© OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- **Listing photos:** placeholder images from [Unsplash](https://unsplash.com),
  standing in for a real listing-image host.

## License

> **TODO:** no license file is committed yet. Add a `LICENSE` (and a
> `package.json` `"license"` field) to declare how the code may be used. Note the
> Inside Airbnb data is CC BY 4.0 (attribution above), independent of the code
> license.
