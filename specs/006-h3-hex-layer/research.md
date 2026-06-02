# Phase 0 Research: Hexagonal Price Map

All open questions are resolved; this records the decisions and why. Much of it consolidates the
architecture decision record at `/home/u/.claude/plans/we-are-discussing-as-structured-squid.md`
(measured on the real data) and the `/speckit-clarify` outcome.

## Decision 1 — Aggregate hexes client-side (no server pre-bake)

- **Decision**: Compute hex cells on the client (in the worker), for both the default and filtered
  views. No server-side hex pre-bake, no vector tiles, no tippecanoe.
- **Rationale**: At 6k–62k listings the data fits in memory; kepler.gl / deck.gl `HexagonLayer`
  aggregate client-side at this scale and beyond, and H3's own guidance is "one canonical
  resolution, aggregate up/down lazily." Filtered hexes _must_ be computed client-side regardless
  (you can't pre-bake every price/room-type combination), so a single client path is simpler than
  maintaining a pre-bake + a client path.
- **Alternatives**: (a) Server pre-bake of the default per resolution (~20 KB) — rejected: extra
  build step + two code paths for a first-paint saving the 2 s budget doesn't need. (b) Vector
  tiles (Martin/tippecanoe) — rejected: server tiling infra, unwarranted < 50k–62k.

## Decision 2 — Median price is the colored metric (count on inspect)

- **Decision**: Shade each hex by the **median nightly price** of its listings, mapped onto the
  city's 5-step price ramp. Listing **count** is shown only on per-cell inspect, not by color.
- **Rationale**: Resolved from the design prototype — `design/app/map.jsx` colors the aggregated
  cells with `D.priceRampVar(c.t)` (a price ramp) and the cell tooltip reads "Median" price +
  "Listings" count; `design/app/data.js` stores cells as `[x, y, price, count]`. Median (not mean)
  matches the app's locked price decision (`data/contract.ts`).
- **Alternatives**: count/density coloring, or a metric toggle — out of scope (recorded in spec
  Assumptions); the neighbourhood choropleth is the price view's larger-grain sibling, so the hex
  layer adding a _finer_ price read (not a duplicate density layer) is the intended differentiation.

## Decision 3 — Engine: `h3-js` + `d3-array`

- **Decision**: Add `h3-js`; reuse the locked `d3-array`. `cellToParent(bakedCell, res)` truncates
  the baked resolution-8 cell to the zoom's resolution; `d3.rollup(... , v => ({ count: v.length,
medianPrice: d3.median(v, d => d.price) }), d => cellToParent(d.h3, res))` produces the cells;
  `cellToBoundary(cell)` builds polygons on the main thread.
- **Rationale**: Both are small, well-maintained (Uber / Observable), framework-light → belong in
  `lib/`. `d3-array` is already the aggregate engine; the hex rollup is the same toolkit. Avoids a
  hand-rolled binning/median implementation.
- **Alternatives**: hand-rolled H3 truncation + median — rejected (reimplements maintained libs);
  Apache Arrow / a columnar store — rejected (over-engineered at this scale; see the decision
  record's measurements).

## Decision 4 — Baked resolution 8 is the finest; coarser by truncation

- **Decision**: Display H3 resolutions **5–8**, mapped from MapLibre zoom; res 8 is the floor.
- **Rationale**: The committed `h3` field is uniformly resolution 8 (verified across all city
  listings). `cellToParent` cheaply derives 7/6/5 for zoomed-out views; going finer than 8 would
  require re-binning from lat/lng (out of scope). Res 8 (~0.7 km² cells) is fine for city scale.
- **Alternatives**: re-bin to finer resolutions at build time — deferred (not needed for the
  supported zoom range).

## Decision 5 — Data tier: a new lightweight analytics tier

- **Decision**: Emit `public/data/{slug}-analytics.json` from the split script: per-listing
  `h3, price, roomType, numberOfReviews, reviewsPerMonth, hostId, hostName, hostListingsCount,
neighbourhoodId`. The worker loads this instead of the full listings feed.
- **Rationale**: The hex layer needs only `h3 + price (+ roomType, neighbourhoodId for
filter/scope)`, and the existing sidebar cards need the remaining fields — one tier serves both.
  ~1.38 MB gz (London) vs 3.89 MB for full listings; no `lat/lng/name/imageVariant/minNights`
  (those belong to the future Browse/points tier). Off-thread fetch+parse keeps the main thread
  free.
- **Alternatives**: keep loading full listings — rejected (ships ~2.5 MB the hex/cards path never
  uses); separate per-consumer tiers — rejected (the cards + hexes share these exact fields).

## Decision 6 — Worker stays the analytics engine; eager on scene entry

- **Decision**: The worker owns the analytics tier and answers both `aggregates` (cards) and the
  new `hexes` requests. Because the **default** view is the hex map, the worker is acquired on
  scene entry (analytics tier loads upfront), not lazily on first filter.
- **Rationale**: Hex + card recompute reruns on zoom/filter changes (~12–18 ms on London);
  off-thread keeps interaction jank-free. The map is on the main thread and cannot read worker
  memory, so the worker posts back small per-cell results which the main thread renders.
- **Alternatives**: recompute on the main thread (no worker) — viable (sub-frame on smaller
  cities) but risks frame drops on London during filter drags; keep the worker for headroom and
  consistency with the existing card path.

## Decision 7 — Color in MapLibre via a `step` expression over `priceScale.breaks`

- **Decision**: Build a MapLibre `step` expression mapping a cell's `medianPrice` to one of five
  **per-theme hex literals** mirroring `--price-1..5`, using the city's `priceScale.breaks`
  (`QUANTILE_BREAKS = 5`) from `{slug}-meta.json`. The legend renders the same five swatches with
  their price ranges.
- **Rationale**: MapLibre's color parser rejects `oklch`, so the OKLCH `--price-*` tokens can't be
  referenced directly (established by the 004 `OVERLAY_LINE` exception). Quantile breaks already
  define the 5 buckets used elsewhere, keeping the hex ramp consistent with the rest of the app.
- **Alternatives**: continuous interpolate on min/max — rejected (the app's price encoding is
  quantile-bucketed `price-1..5`, and breaks already exist); reading CSS vars at runtime — fails in
  MapLibre.

## Decision 8 — Zoom→resolution change detection & reactivity

- **Decision**: The canvas observes `zoom` (debounced on `moveend`), computes the resolution
  bucket via `lib/hex/resolution.ts`, and re-queries the worker only when the bucket **or** the
  filter state changes; the result FeatureCollection goes into the map store's hex slice.
- **Rationale**: Recomputing on every zoom frame is wasteful; bucket-change + filter-change are the
  only triggers that alter the cells. Sharing the small `{ filters, resolution }` (not IDs or
  geometry) keeps the boundary cheap.
- **Alternatives**: recompute per zoom frame — rejected (needless work); push IDs to filter the map
  — rejected in the decision record (per-tick clone + huge expression).
