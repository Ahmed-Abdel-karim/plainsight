# Implementation Plan: Browse Lens — Listings List, Map Dots & Detail Drawer

**Branch**: `007-browse-lens` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-browse-lens/spec.md`

## Summary

Add the **Browse** lens alongside today's Analyse-only scene. A floating **Analyse / Browse**
tab over the map switches lenses (Analyse is default). Switching to Browse: (1) swaps the
sidebar/sheet analysis dashboard for a **virtualized listings list** with a **sort control** and
a live result count; (2) hides the hex price layer and shows **every matching listing as a dot**
on a single MapLibre **circle layer**, GPU-filtered by the existing price/room-type state and the
neighbourhood scope; (3) links **list-card hover ↔ map-dot hover** both ways; (4) opens a
**detail drawer** (over-map side panel on desktop, bottom sheet on mobile) when a listing is
selected, with the selected listing encoded in the URL so it is shareable and restored on reload.

Technical approach (per the data-architecture ADR
`/home/u/.claude/plans/we-are-discussing-as-structured-squid.md`, Decisions 4–6): the split
script emits a new **Browse tier** `public/data/{slug}-points.geojson`. The map loads it lazily
into MapLibre on first Browse activation and **filters its own dots with native GPU expressions**
(`setFilter`) — the small filter **state** crosses no worker boundary, and no per-listing IDs are
shipped. The **list and detail read the same in-memory points features** on the main thread: the
filtered + **sorted** array is a memoized pure compute (`lib/filters` predicate + a new pure
`lib/browse` comparator) and the drawer reads the selected feature's properties directly (ADR
Decision 5 — no round-trip). The listings **worker is untouched** (it remains the Analyse
analytics engine); Browse needs no worker.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.6 (App Router)

**Primary Dependencies**: **NEW** `@tanstack/react-virtual` (headless list virtualization for the
full filtered set; ships its own types). Existing: `maplibre-gl` + `react-map-gl/maplibre` (circle
layer, `setFilter`, feature-state hover/select), `nuqs` (URL lens + selected-listing + filter
state), `zustand` (client map store — ephemeral hover slice), shadcn `Drawer` (vaul) and **NEW**
shadcn `Tabs` primitive added to `components/ui/`.

**Storage**: Static files under `public/data/` served at `/data/`. **NEW**
`{slug}-points.geojson` (a `FeatureCollection` of `Point` features; properties carry the
list/drawer/pin fields) emitted by the split script. Existing `{slug}-meta.json` supplies the
neighbourhood id→name map and currency. No new app/server storage; the tier is `fetch()`ed
client-side on first Browse activation (not Next-cached), exactly like the analytics feed.

**Testing**: Vitest unit tests for the **pure** kernel (`lib/browse` sort comparators across all
four `SortKey`s, null-`reviewsPerMonth` handling, stable tie-break) and any `lib/filters` parity
over point properties. Presentational components (listing card, list, sort control, browse
summary, detail body) are **integration-tested** with fixtures using role/name queries. The
WebGL circle layer, hover linkage, drawer focus behaviour, deep-link restore, theme swap, and
large-city smoothness are verified **manually** via the `run-app` skill (WebGL + pointer
interaction are not unit-testable in jsdom — same posture as 004/006). Lens routing and
deep-link load are E2E-level (per constitution Testing Layers).

**Target Platform**: Web browser (WebGL canvas + DOM-virtualized list).

**Project Type**: Single Next.js application.

**Performance Goals**: Lens swap ≤ ~150 ms (SC-001); filter→list/count/dots update ≤ ~300 ms
(SC-003); hover highlight within one frame (SC-004); smooth scroll over the full filtered set on
the largest city (~62k, SC-002). Measured budget: points tier ≈ 3.46 MB gz (London) fetched +
parsed once on first Browse; main-thread filter+sort over ~62k array-of-objects ≈ 30–60 ms,
memoized (reruns only on filter/sort/scope change); virtualization renders only visible rows; GPU
`setFilter` is instant.

**Constraints**: Client-only WebGL + DOM virtualization. MapLibre's color parser does **not**
accept `oklch`, so the **room-type dot colors** are passed as per-theme **hex literals** mirroring
`--cat-1..5` (documented Rule 3 exception, same precedent as `hex-colors.ts`/`OVERLAY_LINE`). Only
the small filter **state** drives the map (`setFilter`), never per-listing IDs. `cacheComponents:
true` preserved (lens + selected listing + filters are client-only nuqs shallow state; the points
fetch is a client runtime request to a static file).

**Scale/Scope**: 4 launch cities (≤ ~62k listings). Feature scope = the full Browse lens (tab +
list + sort + dots + hover link + detail drawer). The Analyse lens and the hex layer (006) are
unchanged except for visibility toggling and sharing the lens state.

## Constitution Check

_GATE: Re-evaluated after Phase 1 design — still PASS._

- **Next.js App Router**: PASS. The lens tab, listings list, virtualization, points circle layer,
  hover bridge, and detail drawer are Client Components/hooks justified by nuqs URL state, WebGL,
  pointer interaction, and DOM virtualization. They live inside the existing `ssr:false` map
  island and the already-client sidebar surface; the route/layout stays a Server Component. No new
  server data fetching (the points tier is fetched client-side).
- **Cache Components**: PASS. Lens, selected listing, and filters live in the URL via nuqs
  **shallow** routing (no server `searchParams` read). The points-tier fetch is a client runtime
  request to a static file, not Next-cached work — identical to the analytics feed.
  `cacheComponents: true` untouched.
- **Zustand**: PASS (with note). Only the **ephemeral hovered-listing id** is added as a slice to
  the **existing client-only** module-global `map-store.ts` (shared by the sidebar list and the
  map canvas). The map canvas is `ssr:false`, so the store is never touched during server render
  and holds no request/user-scoped data — the already-accepted pattern for this store (same as the
  hex slice). Selected listing is URL state, not store state.
- **React Components**: PASS (with documented exception). The lens toggle is the shadcn **Tabs**
  primitive (Rule 1 mapping for `.tabs-trigger`); the sort control is shadcn **Select**; the
  detail is the shadcn **Drawer**; list rows are shadcn **Button**s. The **circle dot layer** is a
  ported MapLibre layer (Rule 8 real map piece), not a shadcn primitive; its **per-theme room-type
  hex literals** mirror `--cat-1..5` (tracked Rule 3 exception, precedent: `hex-colors.ts`). The
  detail drawer and list float per Rules 5/9; tokens only.
- **Accessibility**: PASS. Full keyboard path to tabs, sort, list items, and drawer; the drawer
  (vaul) traps focus and restores it to the trigger; the result count is `aria-live`; room type is
  conveyed by **label + dot**, never color alone; lens/drawer transitions respect
  `prefers-reduced-motion`; both themes meet WCAG AA. Verified in the manual `run-app` pass +
  role/name integration queries.
- **Type Safety And Verification**: PASS. `BrowsePoint` / `BrowsePointProperties`, the nuqs lens
  - listing parsers, the sort comparators, and the MapLibre filter expression are explicitly
    typed; `@tanstack/react-virtual` ships types; no `any`/unsafe casts. The riskiest **pure**
    behavior (sort ordering + null handling, filter parity) is unit-tested; the WebGL/interaction
    surface by the manual pass.

## Project Structure

### Documentation (this feature)

```text
specs/007-browse-lens/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions & rationale
├── data-model.md        # Phase 1 — Browse tier shape, entities, store/URL state
├── quickstart.md        # Phase 1 — run/verify
├── contracts/
│   ├── browse-tier.md       # {slug}-points.geojson file contract + properties
│   └── lens-and-map.md      # lens/selected-listing URL state + points layer + hover/select contract
└── checklists/
    └── requirements.md  # (from /speckit-specify + /speckit-clarify)
```

### Source Code (repository root)

```text
scripts/
└── split-city-data.ts          # UPDATED — also emit public/data/{slug}-points.geojson (projectPoints)

data/
├── contract.ts                 # UPDATED — add BrowsePoint / BrowsePointProperties (Browse tier shape)
└── types.ts                    # (SortKey already present — used as-is)

lib/
└── browse/                     # NEW (pure kernel — framework-light)
    ├── sort.ts                 #   comparatorFor(SortKey): price asc/desc, reviews/mo, review count
    ├── sort.test.ts            #   ordering + null-reviewsPerMonth + stable tie-break
    └── types.ts                #   (re-export/shared narrow types if needed)

components/
├── ui/
│   └── tabs.tsx                # NEW — stock shadcn Tabs primitive (lens toggle)
└── scene/
    ├── use-lens.ts             # NEW — nuqs: lens ('analyse'|'browse', default analyse) + selected listing id
    ├── lens-tabs.tsx           # NEW — over-map .map-chrome shadcn Tabs (FR-001)
    ├── sidebar-content.tsx     # UPDATED — render SidebarAnalysis OR SidebarBrowse by lens
    ├── city-scene.tsx          # UPDATED — mount <LensTabs> + <ListingDetail> over the map
    ├── browse/                 # NEW (feature UI + hooks)
    │   ├── sidebar-browse.tsx  #   client surface: summary + sort + virtualized list (mirrors SidebarAnalysis role)
    │   ├── use-browse-points.ts#   lazy fetch+parse {slug}-points.geojson; memoized filter+sort -> BrowsePoint[]
    │   ├── listing-list.tsx    #   @tanstack/react-virtual list; hover/scroll-into-view link
    │   ├── listing-card.tsx    #   one row (Button): thumb + title + room type + nbhd + price
    │   ├── listing-thumb.tsx   #   striped placeholder (port of design Thumb/ThumbWide)
    │   ├── sort-control.tsx    #   shadcn Select over the four SortKeys
    │   ├── browse-summary.tsx  #   "N of total" aria-live count (FR-003)
    │   ├── browse-empty.tsx    #   empty state + reset (FR-012)
    │   └── listing-detail.tsx  #   shadcn Drawer; direction by viewport (right ≥lg / bottom <lg); reads selected feature
    └── map/
        ├── constants.ts        # UPDATED — POINTS_SOURCE_ID, POINTS_CIRCLE_LAYER_ID
        ├── map-store.ts        # UPDATED — hoveredListingId slice + setter
        ├── map-canvas.tsx      # UPDATED — mount <PointsLayer> on Browse; toggle hex/points visibility; wire hover/click
        └── points/             # NEW (feature map UI)
            ├── points-layer.tsx#   <Source> + circle <Layer>; GPU setFilter; feature-state hover/selected
            ├── point-colors.ts #   per-theme room-type hex ramp mirroring --cat-1..5 (Rule 3 exception)
            └── use-points-layer.ts # bridge: filters+scope -> setFilter; lens visibility; selection/hover sync
```

**Structure Decision**: Single Next.js app, following `docs/architecture.md`. Pure sort logic is
kernel → `lib/browse/` (sibling to `lib/filters`/`lib/hex`). All Browse UI and its
fetch/derive/select hooks live with the scene feature in `components/scene/browse/` and
`components/scene/map/points/`; the lens hook is scene-level (consumed by sidebar + map). The
ephemeral hover id joins the existing client-only map store. The Browse tier is a new static file;
its shape lives in `data/contract.ts`. No cross-feature imports; dependencies point downward only.

## Complexity Tracking

| Decision                                          | Why needed                                                                                                                                                                    | Simpler alternative rejected because                                                                                                                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main-thread filter+sort for the list (no worker)  | The list/detail need a real filtered+**sorted** JS array with id/name/lat (fields the analytics tier omits); the points tier is already parsed on the main thread for the map | Routing through the worker would require shipping a second tier into it + per-row results across the boundary (ADR Decision 4 rejects ID round-trips); 62k memoized filter+sort is ~30–60 ms, within the 300 ms budget |
| New `@tanstack/react-virtual` dependency          | The unfiltered list can be ~62k rows; rendering all DOM nodes is infeasible (SC-002)                                                                                          | Capped sample / pagination was rejected by the clarified scope (virtualized full list); hand-rolling virtualization duplicates a solved, typed primitive                                                               |
| Per-theme **hex** literals for room-type dots     | MapLibre's parser rejects the `oklch` `--cat-1..5` tokens                                                                                                                     | Reading CSS vars fails in MapLibre; literals mirror tokens (tracked Rule 3 exception, precedent: `hex-colors.ts`)                                                                                                      |
| Hovered-listing id in the module-global map store | Hover must sync between the sidebar list and the `ssr:false` map canvas (two trees); it is ephemeral, not URL-worthy                                                          | A per-request store factory is for server-touchable request/user state — N/A to a client-only map store (same as the hex slice)                                                                                        |
| Adding shadcn `Tabs` primitive                    | Rule 1 maps the `.tabs-trigger` lens toggle to Tabs; not yet installed                                                                                                        | Hand-rolling the toggle violates Rule 1; reusing `ToggleGroup` loses the semantic `tablist` the lens switch wants                                                                                                      |
