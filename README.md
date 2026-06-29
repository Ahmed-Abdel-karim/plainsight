# Plainsight

A geospatial rental-market explorer used as a frontend architecture case study.

**The constraint.** The map shows a whole city at once — every listing and its
stats on screen together. A view like that needs the full dataset present, not
paginated. So all the data already lives in the browser, and filtering and
aggregation are fastest done on the frontend rather than round-tripping to a
server.

**The problem.** That means a lot of data in the browser, heavy filtering and
aggregation, and an expensive map kept alive while the user moves between
cities — where async results and stale events can leak from one city into
another.

**The approach.** Heavy work runs off the main thread. An actor system
coordinates the map, UI, worker, and city lifecycles and drops stale results.
Calculations share one source of truth, and exploration state lives in the URL.

The domain is rentals (MapLibre, H3, XState), but the focus is the architecture,
not the domain.

Public, read-only, built from attributed Inside Airbnb snapshots transformed
into static assets — reproducible and reviewable without accounts or a backend.

**Live demo:** https://plainsight-theta.vercel.app/

![Plainsight hero — Analyse and Browse lenses](docs/media/hero.png)
![Plainsight gif — Analyse and Browse lenses](docs/media/analyse-browse.gif)

<p>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react" />
  <img alt="TypeScript strict" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript" />
  <img alt="XState 5" src="https://img.shields.io/badge/XState-5-2c3e50" />
  <img alt="MapLibre GL" src="https://img.shields.io/badge/MapLibre-GL-295dfe" />
</p>

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

## Known gaps & limitations

Two kinds of "not done", kept separate on purpose.

**Limitations — deliberate scope choices, not planned work**

- **Static, prebuilt city snapshots.** Adding a city needs an ingestion pipeline
  to validate, clean, and format uploaded data into the snapshot shape — a
  separate concern from the client-side architecture here, so it's out of scope.
- **No auth or user accounts.** The demo is public and read-only by design;
  there's nothing to gate, so accounts would be irrelevant, not missing.

**What I'd improve next**

- **Mobile needs work.** Mobile UI needs refinement. Core flows work and filter performance is acceptable,
  but the map zoom controls and legends aren't touch-friendly enough yet.

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

```bash
pnpm dev     # develop
pnpm build   # production build
pnpm test    # unit, machine, UI tests
pnpm test:e2e  # Playwright E2E
```

Full list (lint, format, Lighthouse) in `package.json`.

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

No accounts, ads, session replay, or custom tracking. The public deploy may use
Vercel Analytics and Speed Insights for aggregate performance only.

---

## Project status

Plainsight is an active case study project.

Current focus:

- accessibility improvements, especially making the map an enhancement rather
  than a workflow blocker;
- production performance measurements for large city snapshots;
- keeping documentation, ADRs, and implementation aligned.

---

## License

The Plainsight source code is available under the [MIT License](LICENSE).

The Inside Airbnb data is licensed separately under CC BY 4.0 and is attributed
independently of the code license.
