Plainsight — Module Architecture (AI implementation guide)

Companion to Constitution **Principle VI — Layered Feature Architecture** and the
**Project Rules → Module Boundaries** section. The constitution states the obligations; this
doc explains the model, shows the tree, and gives the rationale. When the two disagree, the
constitution wins.

## What this governs

Where a file goes, and what it is allowed to import. Plainsight is organized in four layers.
**Dependencies point downward only** — a layer may import from layers below it, never above.

```
app/         routes — compose features, own Suspense / generateStaticParams, no business logic
components/  UI    — scene/ (the feature) + city-picker/ + home/ + ui/ (shadcn) + theme/ + logo
data/        IO seam — ports & adapters; loaders.ts is the ONLY data entry point for the UI
lib/         shared kernel — pure / framework-light: geo, filters, the listings worker engine
```

`app/` → may import `components/`, `data/`, `lib/`.
`components/` → may import `data/`, `lib/`, and `components/ui/`. A feature MAY import shared
UI; it MUST NOT import another sibling feature, and MUST NOT import `app/`.
`data/` → may import `lib/` (types/pure helpers). MUST NOT import `components/`, `app/`.
`lib/` → imports nothing from `data/`, `components/`, or `app/`. It is the bottom.

## Target tree

```
app/                              # routes only
  (scene)/layout.tsx              #   persistent map shell across city nav
  (scene)/[city]/page.tsx         #   gate on meta; 404 if city missing
  page.tsx  layout.tsx  globals.css  tokens.css

components/
  ui/                             # shadcn primitives — SHARED, never feature-specific
  theme/                          # cross-cutting: provider + toggle (>1 consumer)
  logo.tsx                        # shared chrome
  city-picker/                    # domain: choose a city (home)
  home/                           # home view shell
  scene/                          # ★ THE feature — self-contained
    city-scene.tsx  market-panel-content.tsx  scene-drawer.tsx  city-switcher.tsx
    listing-count.tsx  market-header.tsx  map-legend.tsx
    use-city-listings.ts          #   the feature's client hook (NOT in lib/)
    analysis/                     #   sub-slice: kpis, charts, filters, use-filters
    map/                          #   sub-slice: basemap, canvas, neighbourhoods, map-store
      neighbourhoods/

data/                             # IO seam — keep centralized, do not dissolve into features
  contract.ts  index.ts  types.ts  loaders.ts  selectors.ts
  repository/{index,port,static-json,postgres}.ts   # the swap seam
  sql/schema.sql

lib/                              # shared kernel — pure, no feature knowledge
  geo/  filters/
  listings/                       # off-thread engine: worker, client, compute, protocol
  utils.ts
```

## Rules

**Rule 1 — Slice by domain, not by kind.** A feature folder owns its components, its
feature-specific hooks/state, and its view-models together. Do NOT create global `hooks/`,
`stores/`, or `components/`-by-type buckets. _Why:_ things that change together live together;
you read one folder to understand one capability.

**Rule 2 — `components/` (outside `ui/`) is for SHARED UI only.** If exactly one feature uses
a component, it lives in that feature. Promotion to a shared location requires a **second**
consumer. _Why:_ premature sharing creates false coupling; `theme/` and `logo` earn their spot
because the whole app uses them.

**Rule 3 — `data/` is the only IO boundary.** All persistence/IO goes through the `@/data`
barrel (`data/loaders`). Nothing outside `data/` may import `data/repository/*` — that's the
ports-and-adapters swap seam (`static-json` ↔ `postgres`), wired in exactly one place
(`data/repository/index.ts`). _Why:_ one seam to swap the backing store; cached reads stay
request-API-free (see `[[client-imports-from-data-contract]]` and `[[data-architecture-tiers]]`).

**Rule 4 — `lib/` is the shared kernel.** Pure, framework-light, domain-agnostic-ish: geo
math, filter/sort, the listings worker engine. If a `lib/` module imports a feature, a
component, or `app/`, it does not belong in `lib/`. _Why:_ the kernel must be reusable and
testable without the UI. (This is why the React hook `use-city-listings` lives in
`components/scene/`, not `lib/listings/` — the worker _engine_ is kernel; the _hook_ is feature.)

**Rule 5 — Declare boundaries per file.** `import "server-only"` on server modules,
`"use server"` on mutations, `"use client"` on stores/hooks/interactive components — at the
top. _Why:_ the server/client cut is legible without tracing the import graph.

**Rule 6 — Routes stay thin; tests co-located; kebab-case files.** `app/` composes features
and owns `<Suspense>` placement and `generateStaticParams` — no data shaping, no logic. Tests
sit next to source (`*.test.ts(x)`). All files are kebab-case, including components.

## Why not `features/` yet

The `next16-commerce` sibling uses top-level `features/<domain>/` vertical slices. That pattern
earns its keep with **several independent domains that change for different reasons**
(product / cart / category / user / auth). Plainsight is effectively **one** product surface
(the city-market scene) plus a thin city picker. A `features/` rename here would be a
mechanical move of `components/scene` → `features/scene` that buys no new boundary — ceremony,
not architecture. **Defer it.** Adopt `features/` only when a genuinely independent second
domain appears (e.g. auth, saved searches, a multi-city comparison view). The boundary that
matters today is the one above: scene is self-contained, `data/` is the IO seam, `lib/` is the
kernel.
