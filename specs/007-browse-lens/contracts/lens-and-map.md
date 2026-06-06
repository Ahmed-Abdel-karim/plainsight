# Contract — Lens / selection URL state, points layer, hover & select

## URL state (`components/scene/use-lens.ts`, nuqs — shallow, client-only)

| Param     | Type / parser                                | Default   | Meaning                                                              |
| --------- | -------------------------------------------- | --------- | -------------------------------------------------------------------- |
| `lens`    | `parseAsStringLiteral(["analyse","browse"])` | `analyse` | Active lens. `clearOnDefault` keeps the URL clean at Analyse.        |
| `listing` | `parseAsInteger`                             | absent    | Selected listing id; opens the detail drawer; absent = no selection. |

```ts
export type Lens = "analyse" | "browse";
export interface UseLensResult {
  lens: Lens;
  selectedId: number | null;
  setLens: (lens: Lens) => void; // switching to analyse clears selectedId
  selectListing: (id: number | null) => void;
  isBrowse: boolean;
}
```

- `setLens("analyse")` MUST also clear `listing` (FR-010).
- Filters (`rooms`, `price`) are owned by the existing `use-filters` and are **shared across both
  lenses** — unchanged.
- All shallow (no server `searchParams` read) — `cacheComponents` preserved (CR-004).

## Points circle layer (`components/scene/map/points/`)

- **Source**: `geojson`, id `POINTS_SOURCE_ID = "browse-points"`, `data` = the fetched
  `FeatureCollection`, `promoteId: "id"` (so feature-state keys on the listing id).
- **Layer**: `circle`, id `POINTS_CIRCLE_LAYER_ID = "browse-points-circle"`.
  - `circle-color`: `match` on `roomType` → per-theme hex literals mirroring `--cat-1..5`
    (Rule 3 exception; `point-colors.ts`).
  - `circle-radius`/`circle-stroke`: enlarge + stroke when `feature-state.hover` or
    `feature-state.selected` (SC-004 emphasis), interpolated by zoom.
  - `circle-opacity`: dim non-matching only if needed; primary filtering is `setFilter`.
- **Visibility**: `visibility: "visible"` in Browse, `"none"` in Analyse; the hex fill layer is
  the inverse. Set imperatively / via `layout` on lens change.
- **GPU filter** (`use-points-layer.ts`): on filter/scope change, build and apply
  ```
  ["all",
    [">=", ["get","price"], priceMin], ["<=", ["get","price"], priceMax],
    // roomTypes: empty = all; else ["in", ["get","roomType"], ["literal", roomTypes]]
    // scope: neighbourhood => ["==", ["get","neighbourhoodId"], scopeId]
  ]
  ```
  via `map.setFilter(POINTS_CIRCLE_LAYER_ID, expr)`. State in, no IDs out (ADR D4).
- **interactiveLayerIds**: include `POINTS_CIRCLE_LAYER_ID` while in Browse (alongside / instead of
  `HEX_FILL_LAYER_ID`).

## Hover & select wiring

- **List → map**: card `onMouseEnter`/`onFocus` → `setHoveredListingId(id)` (map store) →
  `use-points-layer` sets `map.setFeatureState({source,id},{hover:true})`; leave/blur clears.
- **Map → list**: layer `onMouseMove` reads `features[0].id` → `setHoveredListingId(id)`; the list
  observes `hoveredListingId` and `scrollIntoView({block:"nearest"})` for that row (only when the
  hover originated from the map, to avoid fighting the pointer).
- **Select**: card click or dot click → `selectListing(id)` (writes `listing`); `use-points-layer`
  sets `feature-state.selected`; `listing-detail` opens from the `listing` param, reading that
  feature's properties (no fetch). Esc/close/another-select/lens-change/city-switch/filtered-out →
  `selectListing(null)`.

## Acceptance hooks (map to spec)

- FR-001/US1 — `lens` toggles sidebar content; FR-006/US2 — hex hidden + dots shown in Browse.
- FR-007/SC-004 — two-way hover via feature-state + scroll-into-view.
- FR-008/FR-009/US3 — drawer opens from `listing`, focus-trapped, closes & clears.
- FR-011/SC-005 — `lens=browse&listing=ID` deep-link restores the open drawer.
- FR-013/US2-4 — neighbourhood click narrows `setFilter` + list + count.
