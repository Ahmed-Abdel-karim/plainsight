---
description: "Task list for Hexagonal Price Map (Default Scene View)"
---

# Tasks: Hexagonal Price Map (Default Scene View)

**Input**: Design documents from `/specs/006-h3-hex-layer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per the constitution's Testing Layers and plan.md — the **pure kernel** (`lib/hex`) gets
Vitest unit tests; the WebGL hex layer / legend / inspect are verified **manually** via the
`run-app` skill (not unit-testable in jsdom). No component/E2E test tasks are generated.

**Organization**: Tasks are grouped by user story. US1 is the MVP; US2–US4 layer onto it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 (user-story phases only)
- All paths are repository-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependency + data tier the whole feature builds on.

- [x] T001 [P] Add `h3-js` to dependencies via `pnpm add h3-js` (ships its own types); confirm it appears in `package.json`.
- [x] T002 Extend `scripts/split-city-data.ts` to also emit `public/data/{slug}-analytics.json` — a projection of each `Listing` with `h3, price, roomType, numberOfReviews, reviewsPerMonth, hostId, hostName, hostListingsCount, neighbourhoodId` (per `contracts/worker-protocol.md`); update the file header comment to list the new tier.
- [x] T003 Run `npx tsx scripts/split-city-data.ts` and commit the generated `public/data/{amsterdam,berlin,london,manchester}-analytics.json` (depends on T002).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure hex kernel + the worker analytics engine that every user story depends on.

**⚠️ CRITICAL**: No user-story rendering can begin until this phase is complete.

- [x] T004 [P] Create `lib/hex/types.ts` exporting `HexResolution = 5 | 6 | 7 | 8` and `HexCell { h3: string; count: number; medianPrice: number }` (per data-model.md).
- [x] T005 [P] Create `lib/hex/resolution.ts`: `zoomToResolution(zoom: number): HexResolution` mapping MapLibre zoom ranges to res 5–8, clamped at both bounds (per research.md Decision 8).
- [x] T006 [P] Create `lib/hex/resolution.test.ts`: assert zoom thresholds map to the expected resolution and clamp at the 5 and 8 bounds.
- [x] T007 Create `lib/hex/aggregate.ts`: `aggregateHexes(listings, resolution): HexCell[]` — truncate each row's `h3` with `cellToParent` (h3-js), `d3.rollup` by parent cell to `{ count, medianPrice: d3.median(price) }`, skip null-`h3` rows, omit empty cells (depends on T004).
- [x] T008 Create `lib/hex/aggregate.test.ts`: same listings → expected cells; `medianPrice` matches `d3.median`; filtered/empty sets omit cells; out-of-polygon rows (with `h3`) still counted (depends on T007).
- [x] T009 [P] Add `HEX_SOURCE_ID = "hex-price"` and `HEX_FILL_LAYER_ID = "hex-price-fill"` to `components/scene/map/constants.ts`.
- [x] T010 Extend `lib/listings/protocol.ts` with the `hexes` request `{ type:"hexes"; id; filters; resolution }` and response `{ type:"hexes"; id; cells: HexCell[] }` (depends on T004).
- [x] T011 Update `lib/listings/compute.ts` to add `hexesFor(rows, filters, resolution)` = `aggregateHexes(filterListings(rows, filters), resolution)`, reusing the existing isomorphic filter (depends on T007, T010).
- [x] T012 Update `lib/listings/worker.ts`: `load` fetches `/data/{slug}-analytics.json`; handle the `hexes` message via `hexesFor`; keep the existing `aggregates` path working over the analytics rows (depends on T010, T011).
- [x] T013 Add `hexes(filters, resolution): Promise<HexCell[]>` (id-correlated) to `CityListingsClient` in `lib/listings/client.ts` (depends on T010).
- [x] T014 [P] Add a client-only hex slice to `components/scene/map/map-store.ts`: state `hexCells: HexCell[]`, `hexResolution: HexResolution`; actions `setHexCells`, `setHexResolution`; plus selector hooks (depends on T004).

**Checkpoint**: The worker returns hex cells for given filters + resolution; the store can hold them.

---

## Phase 3: User Story 1 - See how prices vary across the city, at a glance (Priority: P1) 🎯 MVP

**Goal**: On opening a city, render the default hex price map (median-price ramp) with a legend.

**Independent Test**: Open each launch city → a hexagonal price map renders on first view with a
legend mapping the ramp to price ranges; pricier areas shade toward the high end; empty areas have
no hex.

- [x] T015 [P] [US1] Create `components/scene/map/hex/hex-colors.ts`: `PRICE_RAMP: Record<Theme, [string,string,string,string,string]>` (per-theme hex literals mirroring `--price-1..5`; documented Rule 3 exception) and `priceFillExpression(theme, breaks)` building a MapLibre `step` expression over `priceScale.breaks` (per `contracts/map-layer.md`).
- [x] T016 [US1] Create `components/scene/map/hex/hex-layer.tsx`: a `<Source id={HEX_SOURCE_ID} type="geojson">` whose data is `HexCell[]` → `FeatureCollection<Polygon, {medianPrice,count}>` via `cellToBoundary`, with a `<Layer id={HEX_FILL_LAYER_ID} type="fill">` using `priceFillExpression(theme, breaks)` and a legible `fill-opacity`; empty cells → empty collection (depends on T009, T014, T015).
- [x] T017 [P] [US1] Create `components/scene/map/hex/hex-legend.tsx`: a `.map-chrome` panel with five ramp swatches + price ranges derived from `priceScale.breaks` + currency, token utilities only, legible in both themes (FR-003).
- [x] T018 [US1] Create `components/scene/map/hex/use-hex-layer.ts`: bridge hook that acquires the worker eagerly via the `use-city-listings` registry, queries `client.hexes(filters, resolution)` (default filters + the overview resolution), and writes results to the store's hex slice (depends on T013, T014).
- [x] T019 [US1] Mount `<HexLayer>` + `<HexLegend>` and call `useHexLayer(...)` in `components/scene/map/map-canvas.tsx`; seed `hexResolution` from the initial zoom; thread `priceScale`/currency from the map city payload (depends on T016, T017, T018).
- [x] T020 [US1] Extend the map city payload (`MapCityPayload` in `map-store.ts` + `MapDataFeeder`/`MapDataSync`) to carry `priceScale` and `currency` from `{slug}-meta.json` so the layer/legend can color and label (depends on T014).
- [x] T021 [US1] Verify (run-app): each city shows the default hex price map + legend within ~2 s (SC-001); pricier areas read high on the ramp; empty areas have no hex; legible in dark **and** light, toggle recolors in place (SC-006); reduced-motion respected; map stays keyboard pannable/zoomable (CR-001/003).

**Checkpoint**: MVP — the default price map renders, themed and legended, independently demoable.

---

## Phase 4: User Story 2 - Zoom from city overview to neighbourhood texture (Priority: P2)

**Goal**: Hexes refine on zoom-in (finer resolution) and coarsen on zoom-out, capped at res 8.

**Independent Test**: From city-wide view, zoom in stepwise → hexes get smaller / finer; zoom out →
coarser; holds at res 8 at closest zoom; no stale cells.

- [x] T022 [US2] In `components/scene/map/map-canvas.tsx`, add a debounced `moveend`/zoom observer that computes `zoomToResolution(zoom)` and calls `setHexResolution` only when the bucket changes (depends on T005, T019).
- [x] T023 [US2] In `components/scene/map/hex/use-hex-layer.ts`, re-query the worker when `hexResolution` changes and replace the store cells (no stale cells across buckets) (depends on T018, T022).
- [x] T024 [US2] Verify (run-app): zooming in/out swaps resolution within ~200 ms of settling, finer detail appears, grid holds at res 8 at closest zoom, no leftover cells (SC-003).

**Checkpoint**: Zoom-adaptive grid on top of the MVP.

---

## Phase 5: User Story 3 - Prices reflect my active filters (Priority: P2)

**Goal**: The hex map recomputes per-cell medians over only the filtered listings.

**Independent Test**: Apply a price/room-type filter → hexes recolor / empty to match; clear →
restores full picture; map total matches the sidebar cards.

- [x] T025 [US3] In `components/scene/map/hex/use-hex-layer.ts`, subscribe to `useFilters(bounds)` (bounds from `priceScale.min/max`) and re-query `client.hexes(filters, resolution)` whenever filter state changes (depends on T018).
- [x] T026 [US3] Verify (run-app): applying/clearing a filter updates the hexes within ~300 ms (SC-004); fully-excluded areas read empty; the hex set and the sidebar cards report the same listing total for the same filter (FR-009 / SC-007).

**Checkpoint**: Filter-reactive, consistent with the cards.

---

## Phase 6: User Story 4 - Inspect a single hex's numbers (Priority: P3)

**Goal**: Hover (desktop) / tap (touch) a hex → readout of median price + listing count.

**Independent Test**: Hover/tap several hexes → each shows median price + count; dismisses cleanly.

- [x] T027 [US4] Create `components/scene/map/hex/hex-inspect.tsx`: a `.map-chrome` popup showing **Median** `{currency}{medianPrice}` and **Listings** `{count}` from the hovered/tapped feature's properties (FR-008).
- [x] T028 [US4] Wire `HEX_FILL_LAYER_ID` as an interactive layer in `components/scene/map/map-canvas.tsx` (hover/tap handlers + dismiss on leave/elsewhere) and render `<HexInspect>` (depends on T016, T027).
- [x] T029 [US4] Verify (run-app): hover/tap a hex shows correct median + count and dismisses on leave/tap-away; reduced-motion respected.

**Checkpoint**: All four stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T030 [P] Tune hex `fill-opacity` and confirm the `PRICE_RAMP` literals meet WCAG AA contrast over both basemaps; keep them in sync with `--price-1..5` (CR-003 / SC-006).
- [x] T031 [P] Performance pass on the largest city (London): confirm no perceptible lag on zoom/filter and default paint within budget (SC-005); debounce tuning if needed.
- [x] T032 Run quickstart validation: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm exec eslint .` all green.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1)**: T001 [P]; T002 → T003.
- **Foundational (P2)**: depends on Setup. T004/T005/T009/T014 parallelizable; T006→(T005), T007→(T004), T008→(T007), T010→(T004), T011→(T007,T010), T012→(T010,T011), T013→(T010). **Blocks all user stories.**
- **US1 (P3)**: depends on Foundational. The MVP.
- **US2 (P4)**, **US3 (P5)**: depend on US1's bridge/canvas (T018/T019); independent of each other.
- **US4 (P6)**: depends on US1's layer (T016).
- **Polish (P7)**: after the desired stories.

### Within/after US1

- T015 [P], T017 [P] (independent files) → T016 (layer) → T018 (bridge) → T020 (payload) → T019 (mount) → T021 (verify).

### Parallel opportunities

- Setup: T001 with T002 (different concerns).
- Foundational: T004, T005, T009, T014 together; then T006/T007 once their deps land.
- US1: T015 and T017 in parallel.
- US2 and US3 can be built in parallel once US1 lands (US2 touches canvas+bridge; US3 touches bridge — coordinate on `use-hex-layer.ts`).

---

## Parallel Example: Foundational kernel

```bash
Task: "Create lib/hex/types.ts (T004)"
Task: "Create lib/hex/resolution.ts (T005)"
Task: "Add hex slice to components/scene/map/map-store.ts (T014)"
Task: "Add hex source/layer IDs to components/scene/map/constants.ts (T009)"
```

---

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (T021) → demo the
   default themed price map.

### Incremental delivery

- - US2 (zoom adaptivity) → validate (T024)
- - US3 (filter reactivity) → validate (T026)
- - US4 (inspect) → validate (T029)
- Polish (T030–T032)

Each story adds value without breaking the previous ones.

---

## Notes

- [P] = different files, no incomplete dependency. `use-hex-layer.ts` (T018/T023/T025) and
  `map-canvas.tsx` (T019/T022/T028) are touched across stories → those tasks are **not** [P].
- The browse/points + drawer tier is a **separate future feature** — not in this list.
- Commit after each task or logical group; the optional `after_tasks` git hook can auto-commit.
