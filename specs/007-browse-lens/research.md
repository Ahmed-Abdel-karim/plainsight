# Phase 0 Research — Browse Lens

Decisions resolving the Technical Context, grounded in the data-architecture ADR
(`/home/u/.claude/plans/we-are-discussing-as-structured-squid.md`), the design prototype
(`design/app/app.jsx`, `design/app/listings.jsx`, `design/app/map.jsx`), and the existing 006 hex
implementation.

## D1 — Browse tier transport: `{slug}-points.geojson`, client-fetched, GPU-filtered

- **Decision**: Emit a per-city GeoJSON `FeatureCollection` of `Point` features. The map loads it
  into MapLibre as a `geojson` source lazily on first Browse activation and filters dots with
  native `setFilter` expressions over `price` / `roomType` / `neighbourhoodId`.
- **Rationale**: ADR Decisions 4 & 6 — keep map filtering on the GPU and share the small filter
  **state**, never per-listing IDs (routing 62k IDs costs ~242 KB clone + ~518 KB `in` expression
  per filter tick on London). GeoJSON is MapLibre's native source format; one fetch (~3.46 MB gz
  LON) serves both the dots and the list/detail.
- **Alternatives rejected**: Vector tiles / tippecanoe (unneeded at this scale, ADR D2); worker-
  returned filtered IDs (ADR D4); per-listing detail fetch (ADR D5 — read feature properties).

## D2 — List + detail read the same in-memory features on the main thread (no worker)

- **Decision**: The parsed points features are held on the main thread; the list's filtered +
  **sorted** array is a `useMemo` over them (`lib/filters` predicate + `lib/browse` comparator),
  and the detail drawer reads the selected feature's properties by id. The listings **worker is
  not touched** — it stays the Analyse analytics engine.
- **Rationale**: The list/detail need id/name/lat/lng — fields the analytics tier deliberately
  omits — so they must read the points tier, which is already parsed for the map. A memoized
  filter+sort over ~62k array-of-objects is ~30–60 ms and reruns only on filter/sort/scope change
  (debounced by the nuqs slider) — within the 300 ms budget (SC-003). Virtualization keeps render
  cost to visible rows.
- **Alternatives rejected**: Adding a second tier to the worker + posting filtered rows back
  (re-introduces the boundary cost ADR D4 avoids, for no main-thread saving the budget needs);
  the worker's array-of-objects scale-out (typed-array column store) stays **parked** (ADR D7).

## D3 — `availability` is NOT in the dataset → omit it from the drawer

- **Decision**: The detail drawer shows **host (+ multi-host), reviews/month, review count,
  minimum nights, and snapshot provenance** — it does **not** show "availability / 365 days".
- **Rationale**: The prototype's `DetailDrawer` rendered an `availability` field, but the real
  `Listing` contract (`data/contract.ts`) has **no availability field** (it carries `minNights`,
  `numberOfReviews`, `reviewsPerMonth`, host fields, `imageVariant`). The project's "no estimates,
  only the dated snapshot" rule forbids inventing it.
- **Action / flag**: spec **FR-008** and **User Story 3** list "availability" — they should drop
  it. Recommend a one-line spec edit; tracked in the plan report. No other field is affected.
- **Alternatives rejected**: Deriving a synthetic availability (violates the provenance rule);
  back-filling the source data (out of scope — the split pipeline is the de-facto source).

## D4 — Lens + selected listing as nuqs URL state; ephemeral hover in the map store

- **Decision**: Add a scene-level `use-lens` hook with nuqs params: `lens` (string-literal
  `analyse`|`browse`, default `analyse`, `clearOnDefault`) and `listing` (the selected listing id,
  absent when none). The **hovered** listing id is ephemeral and lives in the existing
  client-only `map-store` as a new slice (shared by the sidebar list and the map canvas).
- **Rationale**: FR-011/CR-004 require lens + selection to be shareable/restorable and to stay
  client-only (shallow nuqs, no server `searchParams` read) so `cacheComponents` holds — matching
  the existing filter state. Hover changes every pointer move and must not touch the URL; the map
  store is the established cross-tree client channel (hex slice precedent).
- **Alternatives rejected**: Putting hover in the URL (history spam, jank); a new bespoke store
  (the map store already spans both trees and is `ssr:false`).

## D5 — Map dots: one MapLibre `circle` layer, feature-state hover/selected

- **Decision**: Render all matching listings as a single `circle` layer (`POINTS_CIRCLE_LAYER_ID`)
  over a `geojson` source. Hide the hex layer (`visibility: none`) in Browse and show the circle
  layer; reverse in Analyse. Hover/selection use MapLibre **feature-state** (`hover`, `selected`)
  keyed by listing id; the layer adds to `interactiveLayerIds` while in Browse.
- **Rationale**: The clarified answer is explicit — "everything as a dot, this is a **circle layer
  not pins**." A GL circle layer scales to 62k where DOM markers would not (the prototype's
  `PinLayer` only ever drew a small sample). Feature-state recolors without re-issuing data.
- **Alternatives rejected**: DOM marker pins (don't scale); clustering (clarified against; breaks
  the per-listing hover/select link); a capped sample (clarified against).

## D6 — Detail drawer: one shadcn `Drawer`, direction by viewport

- **Decision**: A single `listing-detail.tsx` renders the shadcn (vaul) `Drawer` with
  `direction="right"` at ≥ `lg` (over-map side panel) and `direction="bottom"` below `lg`
  (over-map bottom sheet), chosen via a viewport hook. The list stays mounted behind it. Opening
  is driven by the `listing` URL param; closing clears it.
- **Rationale**: CR-002 wants one component for both presentations; vaul already powers the mobile
  sidebar drawer and gives focus trap, scrim, drag-to-dismiss, and Esc (FR-009). Floating over the
  map (not replacing the list) matches the clarified placement and the prototype.
- **Alternatives rejected**: Separate Sheet (desktop) + Drawer (mobile) components (two components,
  violates CR-002); replacing the sidebar list (clarified against); full-screen modal (clarified
  against).

## D7 — List virtualization: `@tanstack/react-virtual`

- **Decision**: Add `@tanstack/react-virtual` for the listings list; render only visible rows over
  the full filtered+sorted array.
- **Rationale**: Clarified scope is a virtualized **full** list (London ≈ 62k); a headless, typed,
  widely-used primitive is proportionate (matches the "adopt small credible libraries" posture of
  the ADR's d3-array/h3-js choices). Container-query layout (CR-002) is unaffected by the
  virtualizer.
- **Alternatives rejected**: Hand-rolled windowing (re-implements a solved primitive); capped
  sample / pagination (clarified against).

## D8 — Sort: pure `lib/browse` comparators over `SortKey`

- **Decision**: `lib/browse/sort.ts` exposes a pure `comparatorFor(key: SortKey)` for the four
  reserved keys: `price_asc` (default), `price_desc`, `reviews_desc` (reviews/month), and
  `review_count_desc`. Null `reviewsPerMonth` sorts last; ties break by listing id for stability.
- **Rationale**: `SortKey` already exists in `data/types.ts` (reserved "E6-S5"). Sorting is pure
  and the riskiest correctness surface → unit-tested in the kernel (constitution Testing Layers).
- **Alternatives rejected**: Sorting inside the component (untestable as a unit, duplicated logic);
  sorting in the worker (no worker on the Browse path — D2).

## D9 — Lens control: shadcn `Tabs` primitive

- **Decision**: Add the stock shadcn `Tabs` primitive to `components/ui/`; wrap it in
  `lens-tabs.tsx` as an over-map `.map-chrome` segmented control bound to the `lens` URL param.
- **Rationale**: Rule 1 maps the prototype's `.tabs-trigger` (Browse/Analyse) to **Tabs**, which
  gives the semantic `tablist`/`tab` roles and keyboard arrow navigation for free. Adding a stock
  primitive is not a fork (Rule 2).
- **Alternatives rejected**: Reusing the installed `ToggleGroup` (loses `tablist` semantics);
  hand-rolling (violates Rule 1).
