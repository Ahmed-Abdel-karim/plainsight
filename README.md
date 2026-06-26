# Plainsight

**A frontend-first geospatial market explorer for short-term-rental data.**

Plainsight lets users explore where short-term rentals are concentrated, what they cost, and how a market is shaped by room type, neighbourhood, and host structure.

It is built as a public, read-only portfolio demo using attributed public Inside Airbnb snapshots, transformed into static frontend assets for a reproducible geospatial analysis experience.

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

I chose Plainsight as a frontend-first case study because a map-based data explorer creates real client-side engineering problems that a mostly static CRUD demo would not expose:

- an expensive client-only map that should persist across city navigation
- large browser-side datasets that need fast filtering and aggregation
- interaction state that should be shareable and restorable from the URL
- route, map, UI, worker, and city lifecycles that need explicit coordination
- a dense responsive interface that still needs clear semantics, keyboard paths, and accessible fallbacks

The public demo uses curated static snapshots so the project is reproducible, reviewable, and deployable without accounts, uploads, storage, or backend infrastructure. Static data is a demo boundary, not the only possible product direction.

A future version could support user-imported city datasets, but that would add validation, storage, privacy, moderation, cost, and operational concerns that are intentionally outside this public portfolio scope.

---

## What you can do

- Explore four curated markets: London, Berlin, Manchester, and Amsterdam.
- Switch between two lenses over the same map:
  - **Analyse** — city-wide spatial patterns, median price hexes, room mix, host structure, and market summaries.
  - **Browse** — individual public listings behind the aggregates, shown as map points and a virtualized list.

- Narrow the selection by room type, price range, and neighbourhood.
- Inspect the relationship between map layers, listing results, and market summaries.
- Share or reopen an exploration through URL state.

---

## What this demonstrates

Plainsight is designed to show senior frontend engineering in a non-trivial app:

| Area                  | What the project demonstrates                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Geospatial UI         | MapLibre map layers, city boundaries, point layers, H3 hex aggregation, map legends               |
| Frontend architecture | Clear module boundaries, route-persistent scene layout, client/server separation                  |
| State orchestration   | XState actor system for route, map, UI, worker, and city lifecycles                               |
| Performance           | Web Worker analytics, preprocessed data tiers, cache/revisit behavior, virtualized listing browse |
| Product correctness   | Dated snapshot language, data provenance, no invented live availability                           |
| UI engineering        | Design tokens, spacing rhythm, responsive panel/drawer composition, theme support                 |
| Accessibility         | Semantic regions, keyboard paths for non-map workflows, text alternatives for visual meaning      |
| Delivery confidence   | TypeScript strict mode, unit/machine/UI tests, Playwright E2E, CI checks                          |

---

## Architecture overview

Plainsight is a **Next.js App Router** application with a frontend-owned scene subsystem.

The scene is built around a persistent map shell. City navigation swaps the city-specific panel and data, but the expensive MapLibre instance stays mounted. This makes the app behave like a continuous analytical workspace rather than a set of disconnected pages.

At runtime:

1. Next.js serves static city routes and snapshot metadata.
2. The scene provider owns a session-lifetime actor system.
3. The map and UI actors persist while navigating between cities.
4. The city actor is replaced when the selected city changes.
5. A shared worker handles listing projections and aggregation off the main thread.
6. Settled lens, scope, filters, and selection are mirrored into the URL.

```txt
app/
  routes, layouts, metadata, Suspense boundaries

features/
  home/
  scene/
    analysis/
    browse/
    map/
    state/
    shared/

data/
  loaders, contracts, snapshot access

lib/
  listings, filters, geo, search params, worker-safe logic

docs/
  architecture, decisions, testing, performance, accessibility, design notes
```

For the deeper engineering story, read:

- [Case study](CASE_STUDY.md)
- [Architecture](docs/architecture.md)
- [Performance](docs/performance.md)
- [Accessibility](docs/accessibility.md)
- [Testing strategy](docs/testing.md)
- [Architecture decisions](docs/decisions/)

---

## Key engineering decisions

### Route-persistent map

The map is expensive and client-only, so it is mounted above the city route segment. City navigation changes the surrounding scene data without recreating the MapLibre instance.

### XState for orchestration

The app does not use XState for every value. It uses XState where the hard problem is coordination: route intent, committed navigation, map readiness, UI suppression, city replacement, worker replies, and stale result protection.

Local UI remains local. Server/cache data remains in Next.js or TanStack Query. The actor system owns lifecycle and event coordination.

### Web Worker for client-side analytics

Filtering, listing projection, and hex aggregation can become expensive on large city snapshots. The worker keeps analytical work off the main thread so map interaction and UI feedback remain responsive.

### Curated static snapshots for the public demo

The public demo is read-only and snapshot-based so it can be hosted cheaply, reviewed consistently, and understood without accounts or setup. Every visible figure is tied to a dated public dataset.

### Map as enhancement, not blocker

The map is central to exploration, but non-spatial workflow meaning should not depend on color or position alone. Counts, filters, selections, loading states, and listing details are exposed through text and semantic UI as well.

---

## Tech stack

| Area        | Choice                                               |
| ----------- | ---------------------------------------------------- |
| Framework   | Next.js 16 App Router, React 19                      |
| Language    | TypeScript strict mode                               |
| Map         | MapLibre GL via react-map-gl                         |
| State       | XState v5, TanStack Query                            |
| Styling     | Tailwind CSS v4, shadcn/ui primitives, design tokens |
| Geospatial  | H3, GeoJSON                                          |
| Charts/data | Recharts, d3-array                                   |
| Performance | Web Worker projections, list virtualization          |
| Testing     | Vitest, Testing Library, Playwright, axe checks      |
| Delivery    | pnpm, GitHub Actions, Vercel                         |

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

```txt
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

The project uses a layered testing strategy:

- pure unit tests for listings, filters, search params, and geospatial logic
- machine tests for XState lifecycle and race-prone coordination
- UI integration tests for rendered behavior and accessibility semantics
- Playwright E2E tests for real browser workflows
- Lighthouse checks for selected performance and layout budgets

GitHub Actions runs formatting, linting, type checks, tests, build, E2E, and Lighthouse CI through:

```txt
.github/workflows/ci.yml
```

---

## Data source and attribution

Plainsight is built on public short-term-rental datasets published by [Inside Airbnb](https://insideairbnb.com/), an independent project that provides downloadable Airbnb listing, review, calendar, and neighbourhood datasets for research and public-interest analysis.

The public demo uses dated Inside Airbnb snapshots:

| City               | Source snapshot   |
| ------------------ | ----------------- |
| Amsterdam          | 11 September 2025 |
| Berlin             | 23 September 2025 |
| Greater Manchester | 26 September 2025 |
| London             | 14 September 2025 |

Inside Airbnb publishes its data under the [Creative Commons Attribution 4.0 International license](https://creativecommons.org/licenses/by/4.0/).

Plainsight transforms the original CSV and GeoJSON files into static application assets for filtering, aggregation, and map rendering. The transformed data remains derived from Inside Airbnb and is attributed accordingly.

Plainsight is not affiliated with, endorsed by, or sponsored by Airbnb or Inside Airbnb. Airbnb is a trademark of its owner. The app presents dated public snapshot observations only; it does not claim live availability, booking status, host verification, forecasts, or real-time market data.

Base map attribution is provided in the app UI. Representative listing imagery is decorative placeholder imagery and does not represent real listing photos.

---

## Privacy and analytics

Plainsight has no accounts, sign-up, advertising, session replay, or custom event tracking.

The public deployment may use Vercel Analytics and Speed Insights for aggregate usage and performance visibility. No application-specific tracking events are implemented.

---

## Project status

Plainsight is an active portfolio project.

Current focus:

- reviewer-facing documentation and case study
- accessibility improvements, especially making the map an enhancement rather than a workflow blocker
- performance measurements for large city snapshots
- design-system polish around spacing, rhythm, and responsive scene layout

Planned documentation:

- `CASE_STUDY.md`
- `docs/architecture.md`
- `docs/performance.md`
- `docs/accessibility.md`
- `docs/design-system.md`
- `docs/data-model.md`
- `docs/decisions/`

---

## License

License is not declared yet. The code remains all-rights-reserved until a `LICENSE` file and `package.json` license field are added.

The Inside Airbnb data is licensed separately under CC BY 4.0 and is attributed independently of the code license.
