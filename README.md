# Plainsight

**A frontend-first geospatial market explorer for short-term-rental data.**

Plainsight helps users explore where short-term rentals are concentrated, what
they cost, and how a market is shaped by room type, neighbourhood, and host
structure.

It is a public, read-only portfolio demo built from attributed Inside Airbnb
snapshots. The data is transformed into static frontend assets so the experience
is reproducible, reviewable, and deployable without accounts or backend
infrastructure.

**Live demo:** https://plainsight-theta.vercel.app/

![Plainsight hero — Analyse and Browse lenses](docs/media/hero.png)

<p>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react" />
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript" />
  <img alt="XState 5" src="https://img.shields.io/badge/XState-5-2c3e50" />
  <img alt="MapLibre GL" src="https://img.shields.io/badge/MapLibre-GL-295dfe" />
</p>

---

## Why this project exists

I built Plainsight because a map-based analytical app exposes frontend problems
that a mostly static CRUD demo does not:

- a client-only map that is expensive to mount;
- large browser-side datasets that need responsive filtering and aggregation;
- route, map, UI, worker, and city lifecycles that must be coordinated;
- interaction state that should be shareable and restorable from the URL;
- a visual map workflow that still needs semantic, keyboard-friendly fallback
  paths.

The public demo uses curated static snapshots. That is an intentional portfolio
boundary: the app can be reviewed consistently without sign-up, uploads,
storage, moderation, or operational backend concerns.

---

## What you can do

- Explore four curated markets: London, Berlin, Manchester, and Amsterdam.
- Switch between two lenses over the same map:
  - **Analyse** — city-wide spatial patterns, median-price hexes, room mix,
    host structure, and market summaries.
  - **Browse** — individual public listings behind the aggregates, shown as map
    points and a virtualized list.
- Narrow the selection by room type, price range, and neighbourhood.
- Inspect how map layers, listing results, and market summaries relate.
- Share or reopen an exploration through URL state.

---

## What this demonstrates

| Area                  | What the project demonstrates                                                            |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Geospatial UI         | MapLibre layers, city boundaries, listing points, H3 aggregation, map legends            |
| Frontend architecture | Next.js App Router, route-persistent scene layout, clear module boundaries               |
| State orchestration   | XState actor system for route, map, UI, worker, and city lifecycles                      |
| Performance           | Worker analytics, snapshot tiers, query caching, virtualized Browse list                 |
| Product correctness   | Dated snapshots, data provenance, shared calculation core, no invented live availability |
| Accessibility         | Semantic non-map workflows, text alternatives for visual meaning, keyboard paths         |
| Delivery confidence   | TypeScript strict mode, unit/machine/UI tests, Playwright E2E, CI checks                 |

---

## Architecture overview

Plainsight is a Next.js App Router app with a frontend-owned scene subsystem.

The map lives in a persistent scene layout above the city route segment. City
navigation replaces city-specific data and panel content without recreating the
MapLibre runtime. The scene provider owns a session-lifetime actor system:

1. Next.js serves stable city routes and small materialized snapshot summaries.
2. The scene runtime persists across city navigation.
3. Root coordinates navigation, city replacement, suppression, resume, and URL
   sync.
4. Map and UI actors persist for the scene session.
5. The active city actor is replaced when the city changes.
6. A session worker actor routes analytics loading, H3 projection, aggregate
   recomputation, cancellation, and stale-result protection.
7. TanStack Query caches public points and boundaries assets for Browse and map
   rendering.

```text
app/       routes, layouts, metadata, server/client composition
features/  home and scene feature domains
data/      snapshot contracts, loaders, and server-facing read models
lib/       pure filters, listing projections, geo, URL, and worker-safe logic
docs/     engineering docs and ADRs
```

For deeper detail:

- [Case study](CASE_STUDY.md)
- [Engineering docs](docs/README.md)
- [Architecture](docs/architecture.md)
- [Runtime orchestration](docs/runtime-orchestration.md)
- [Testing strategy](docs/testing.md)
- [Architecture decisions](docs/decisions/)

---

## Key decisions

### Route-persistent map

The map is expensive and client-only, so it is mounted in the scene layout rather
than inside each city page. City navigation changes the data around the map
without remounting the MapLibre instance.

### XState for orchestration

XState is used where the hard problem is lifecycle coordination: navigation
intent, committed route changes, map readiness, UI suppression, city replacement,
worker replies, stale-result handling, and URL write gating.

It is not used for every local value. Local UI remains local. Server/cache data
remains in Next.js or TanStack Query.

### Tiered snapshots and shared calculation core

Server-rendered page-start data and browser-facing interactive data are split
into snapshot tiers. Small materialized tiers provide city metadata and KPIs.
Larger public assets feed the map, Browse, and worker runtime.

Materialized aggregates, worker recomputation, and Browse filtering use the same
pure projection logic so server-visible summaries and client interaction do not
drift into separate calculation models.

### Web Worker for client-side analytics

Analyse filtering, H3 projection, and aggregate recomputation can become
expensive on large city snapshots. The worker keeps that work off the main
thread, while Browse uses cached points plus client-side filtering and sorting.

### Map as enhancement, not blocker

The map is central to exploration, but key workflow meaning also exists in text,
controls, lists, summaries, loading states, and error states.

---

## Tech stack

| Area        | Choice                                                 |
| ----------- | ------------------------------------------------------ |
| Framework   | Next.js 16 App Router, React 19                        |
| Language    | TypeScript strict mode                                 |
| Map         | MapLibre GL via react-map-gl                           |
| State       | XState v5, TanStack Query                              |
| Styling     | Tailwind CSS v4, shadcn/ui primitives, design tokens   |
| Geospatial  | H3, GeoJSON                                            |
| Charts/data | Recharts, d3-array                                     |
| Performance | Web Worker analytics, asset cache, list virtualization |
| Testing     | Vitest, Testing Library, Playwright, axe checks        |
| Delivery    | pnpm, GitHub Actions, Vercel                           |

---

## Getting started

### Prerequisites

- Node.js 24
- pnpm 11

### Install and run

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

---

## Scripts

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Start the development server                 |
| `pnpm build`        | Build the production app                     |
| `pnpm start`        | Serve the production build                   |
| `pnpm test`         | Run unit, machine, and UI integration tests  |
| `pnpm test:e2e`     | Run Playwright end-to-end tests              |
| `pnpm lint`         | Run ESLint                                   |
| `pnpm lint:strict`  | Run ESLint with zero warnings allowed        |
| `pnpm format`       | Format the repo                              |
| `pnpm format:check` | Check formatting                             |
| `pnpm lighthouse`   | Run local Lighthouse script, when configured |
| `pnpm lhci`         | Run Lighthouse CI script                     |

---

## Testing and CI

The test strategy follows the app's main risks:

- pure unit tests for filters, projections, search params, and geospatial logic;
- generator tests that rebuild materialized aggregate output and compare it with
  committed snapshots;
- machine tests for XState lifecycle and stale-result coordination;
- UI integration tests for rendered behavior and accessibility semantics;
- Playwright E2E tests for browser workflows;
- Lighthouse checks for selected performance and layout budgets.

GitHub Actions runs formatting, linting, type checks, tests, build, E2E, and
Lighthouse CI through:

```text
.github/workflows/ci.yml
```

---

## Data source and attribution

Plainsight is built on public short-term-rental datasets published by
[Inside Airbnb](https://insideairbnb.com/), an independent project that provides
downloadable Airbnb listing, review, calendar, and neighbourhood datasets for
research and public-interest analysis.

The public demo uses dated Inside Airbnb snapshots:

| City               | Source snapshot   |
| ------------------ | ----------------- |
| Amsterdam          | 11 September 2025 |
| Berlin             | 23 September 2025 |
| Greater Manchester | 26 September 2025 |
| London             | 14 September 2025 |

Inside Airbnb publishes its data under the
[Creative Commons Attribution 4.0 International license](https://creativecommons.org/licenses/by/4.0/).

Plainsight transforms the original CSV and GeoJSON files into static application
assets for filtering, aggregation, and map rendering. The transformed data
remains derived from Inside Airbnb and is attributed accordingly.

Plainsight is not affiliated with, endorsed by, or sponsored by Airbnb or Inside
Airbnb. Airbnb is a trademark of its owner. The app presents dated public
snapshot observations only; it does not claim live availability, booking status,
host verification, forecasts, or real-time market data.

Base map attribution is provided in the app UI. Representative listing imagery
is decorative placeholder imagery and does not represent real listing photos.

---

## Privacy and analytics

Plainsight has no accounts, sign-up, advertising, session replay, or custom
event tracking.

The public deployment may use Vercel Analytics and Speed Insights for aggregate
usage and performance visibility. No application-specific tracking events are
implemented.

---

## Project status

Plainsight is an active portfolio project.

Current focus:

- accessibility improvements, especially making the map an enhancement rather
  than a workflow blocker;
- production performance measurements for large city snapshots;
- design-system polish around spacing, rhythm, and responsive scene layout;
- keeping documentation, ADRs, and implementation aligned.

---

## License

The Plainsight source code is available under the [MIT License](LICENSE).

The Inside Airbnb data is licensed separately under CC BY 4.0 and is attributed
independently of the code license.
