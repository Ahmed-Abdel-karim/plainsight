# Implementation Plan: Hexagonal Price Map (Default Scene View)

**Branch**: `006-h3-hex-layer` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-h3-hex-layer/spec.md`

## Summary

Make the default city-scene visualization a **hexagonal price map**: listings are aggregated
client-side into equal-area H3 hex cells, each shaded by the cell's **median nightly price** along
the city's existing 5-step price ramp. The grid **refines with zoom** (coarser H3 resolutions when
zoomed out, finer when zoomed in, capped at the baked resolution), **recomputes on filter changes**
(price range / room type), and supports **per-cell inspect** (median price + listing count).

Technical approach (per the architecture decision record at
`/home/u/.claude/plans/we-are-discussing-as-structured-squid.md`): **pure client-side aggregation**
— no server hex pre-bake, no vector tiles. A new lightweight **analytics tier**
(`{slug}-analytics.json`: `h3, price, roomType` + the existing card fields) is fetched by the
**listings Web Worker**, which becomes the scene's **analytics engine**: it bins listings to the
current resolution with `h3-js` `cellToParent`, rolls up `count` + `median(price)` per cell with
the already-locked **d3-array** engine, and posts back only the small per-cell result. The main
thread turns cells into hex polygons (`cellToBoundary`) and renders them as a MapLibre `fill` layer
colored by a `step` expression over the city's `priceScale.breaks`. Only the small filter-state in
and the small cell result out ever cross the worker boundary.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.6 (App Router)

**Primary Dependencies**: **NEW** `h3-js` (`cellToParent` for zoom→resolution truncation,
`cellToBoundary` for cell polygons; ships its own types). Existing: `d3-array` (locked — `median`,
`rollup`), `maplibre-gl` + `react-map-gl/maplibre`, `zustand` (client map store), `nuqs` (URL
filter state), Web Worker.

**Storage**: Static files under `public/data/` served at `/data/`. **NEW** `{slug}-analytics.json`
(per-listing `h3, price, roomType, numberOfReviews, reviewsPerMonth, hostId, hostName,
hostListingsCount, neighbourhoodId`) emitted by the split script; existing `{slug}-meta.json`
provides `priceScale.breaks` for the color buckets. No new app/server storage; the worker
`fetch()`es the tier client-side (not Next-cached), exactly like today's listings feed.

**Testing**: Vitest unit tests for the **pure** kernel (`lib/hex` binning, median rollup,
zoom→resolution mapping, the price→color step-stop builder) and the worker protocol shape. The
WebGL hex layer, legend, inspect popup, theme swap, and zoom/filter reactivity are verified
**manually** via the `run-app` skill (WebGL is not unit-testable in jsdom — same posture as 004).

**Target Platform**: Web browser (WebGL canvas + Web Worker).

**Project Type**: Single Next.js application.

**Performance Goals**: Default map visible ≤ 2 s on broadband (SC-001); zoom-resolution update
≤ 200 ms after the zoom settles (SC-003); filter update ≤ 300 ms (SC-004); smooth on the largest
city (~62k listings, SC-005). Measured budget: analytics tier ≈ 1.38 MB gz (London) fetched +
parsed off-thread; hex rollup ≈ 12–18 ms; per-view cell count ≤ ~2k → small `postMessage` payload.

**Constraints**: Client-only WebGL + Worker. MapLibre's color parser does **not** accept `oklch`,
so the ramp is passed as per-theme **hex literals** mirroring `--price-1..5` (documented Rule 3
exception, same precedent as `OVERLAY_LINE` in 004). Only small results cross the worker boundary.
`cacheComponents: true` preserved (no new server cached work; filter state is client-only nuqs).

**Scale/Scope**: 4 launch cities (≤ ~62k listings). H3 resolutions **5–8** (8 = baked floor;
coarser by `cellToParent`). Feature scope = the hex price layer only; individual-listing
points/drawer (the Browse tier) are a **separate future feature**, out of scope here.

## Constitution Check

_GATE: Re-evaluated after Phase 1 design — still PASS._

- **Next.js App Router**: PASS. The hex layer, the worker bridge, and the inspect popup are
  Client Components/hooks justified by WebGL, Web Workers, and pointer interaction. They live
  inside the existing `ssr:false` map island; the route/layout stays a Server Component. No new
  server data fetching is introduced (the analytics tier is fetched client-side by the worker).
- **Cache Components**: PASS. No request-time APIs in cached work; filter state stays in the URL
  via nuqs **shallow** routing (no server `searchParams` read). The analytics-tier fetch is a
  client runtime request to a static file, not Next-cached work — identical to today's listings
  feed. `cacheComponents: true` untouched.
- **Zustand**: PASS (with note). The hex cell result + active resolution are added as a slice to
  the **existing client-only** `map-store.ts`. The map canvas is `ssr:false`, so the store is never
  touched during server render and holds no request/user-scoped data — module-global is the
  already-accepted pattern for this store, not a per-request-factory case.
- **React Components**: PASS (with documented exception). The hex layer is a MapLibre `fill`
  layer (the Rule 8 "ported real map piece"), not a shadcn primitive; the legend + inspect popup
  float with `.map-chrome` (Rule 9) and use token utilities. The **price ramp fill colors are
  per-theme hex literals** (MapLibre rejects `oklch`) kept in sync with `--price-1..5` — a tracked
  Rule 3 exception mirroring `OVERLAY_LINE`.
- **Accessibility**: PASS. The price legend is semantic and labeled; price is **never conveyed by
  color alone** (numeric median + count on inspect, and the existing sidebar cards give a text
  equivalent of the filtered set). The map stays keyboard pannable/zoomable; grid/zoom transitions
  respect `prefers-reduced-motion`; both ramp variants meet WCAG AA contrast over their basemap
  (verified in the manual pass, like 004).
- **Type Safety And Verification**: PASS. `HexCell`, the protocol messages, and the MapLibre
  expression are explicitly typed; `h3-js` ships types; no `any`/unsafe casts. The riskiest
  behavior (binning correctness, median parity, zoom→resolution thresholds, color-bucket mapping)
  is covered by **pure unit tests**; the WebGL surface by the manual `run-app` pass.

## Project Structure

### Documentation (this feature)

```text
specs/006-h3-hex-layer/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions & rationale
├── data-model.md        # Phase 1 — entities, tier shape, protocol, store slice
├── quickstart.md        # Phase 1 — run/verify
├── contracts/
│   ├── worker-protocol.md   # hex request/response + analytics-tier file contract
│   └── map-layer.md         # hex source/layer + color-ramp + inspect contract
└── checklists/
    └── requirements.md  # (from /speckit-specify)
```

### Source Code (repository root)

```text
scripts/
└── split-city-data.ts          # UPDATED — also emit public/data/{slug}-analytics.json

lib/
├── hex/                         # NEW (pure kernel — framework-light, h3-js + d3-array)
│   ├── aggregate.ts             #   binToResolution + rollup count/median(price) per cell -> HexCell[]
│   ├── aggregate.test.ts        #   parity + binning unit tests
│   ├── resolution.ts            #   zoom -> H3 resolution (5..8) mapping, with bounds
│   ├── resolution.test.ts
│   └── types.ts                 #   HexCell, HexResolution
└── listings/
    ├── worker.ts                # UPDATED — load analytics tier; answer "hexes" requests
    ├── protocol.ts              # UPDATED — add hexes request/response
    ├── client.ts                # UPDATED — add hexes(filters, resolution) -> HexCell[]
    └── compute.ts               # UPDATED — delegate hex compute to lib/hex

components/
└── scene/
    └── map/
        ├── constants.ts          # UPDATED — HEX_SOURCE_ID, HEX_FILL_LAYER_ID
        ├── map-store.ts          # UPDATED — hex slice: cells, resolution, setters
        ├── map-canvas.tsx        # UPDATED — mount <HexLayer>, observe zoom -> resolution
        └── hex/                  # NEW (feature UI)
            ├── hex-layer.tsx     #   <Source> + price-stepped <Layer>; cells -> GeoJSON via cellToBoundary
            ├── hex-colors.ts     #   per-theme hex ramp + step-expression builder (Rule 3 exception)
            ├── hex-legend.tsx    #   .map-chrome price-ramp legend (FR-003)
            ├── hex-inspect.tsx   #   hover/tap readout: median price + count (FR-008)
            └── use-hex-layer.ts  #   bridge hook: filters + resolution -> worker -> store
```

**Structure Decision**: Single Next.js app, following `docs/architecture.md`. Pure hex math is
kernel → `lib/hex/` (sibling to `lib/filters`, reused by the worker). The worker _engine_ stays in
`lib/listings/`; the React _bridge hook_ and all map UI live with the scene feature in
`components/scene/map/hex/`. The persistent map store gains a client-only hex slice. No
cross-feature imports; dependencies point downward only.

## Complexity Tracking

| Decision                                             | Why needed                                                                                                    | Simpler alternative rejected because                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Client Components (hex layer, bridge hook, inspect)  | WebGL render + Web Worker compute + pointer interaction are browser-only                                      | Server rendering can't draw a WebGL hex layer or run the off-thread aggregation                                                                        |
| Eager worker on scene entry (analytics tier upfront) | The **default** hex view needs aggregated cells immediately; pure client-side has no pre-bake to fall back on | Hybrid server pre-bake of the default view was rejected (extra build step + two code paths) for a ~20 KB first-paint saving the budget doesn't require |
| Per-theme **hex** color literals for the ramp        | MapLibre's parser rejects the `oklch` `--price-1..5` tokens                                                   | Reading the CSS vars directly fails in MapLibre; literals mirror the tokens (tracked Rule 3 exception, precedent: `OVERLAY_LINE`)                      |
| Module-global map store gains a hex slice            | Map canvas is `ssr:false`; the slice is client-only UI state                                                  | A per-request store factory is for server-touchable request/user state — N/A to a client-only map store                                                |
