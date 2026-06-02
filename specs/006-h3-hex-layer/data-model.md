# Phase 1 Data Model: Hexagonal Price Map

## Entities

### `HexCell` (NEW — `lib/hex/types.ts`)

The per-cell aggregate the worker produces and posts back. Small and serializable.

```ts
export type HexResolution = 5 | 6 | 7 | 8;

export interface HexCell {
  /** H3 cell index at the active resolution (parent of the baked res-8 cell). */
  h3: string;
  /** Listings in this cell for the current filtered set (≥ 1; empty cells are omitted). */
  count: number;
  /** Median nightly price of those listings — drives the cell color. */
  medianPrice: number;
}
```

- **Identity**: `h3` is unique within a single `{resolution, filterState}` result.
- **Lifecycle**: recomputed wholesale whenever resolution or filter state changes; cells with zero
  matching listings are simply absent (FR-007 "empty, not filled").
- **Validation**: `count ≥ 1`; `medianPrice` finite. Derived only from listings whose `h3` is
  non-null (out-of-polygon listings still have an `h3` and are counted; null-`h3` listings, if any,
  are skipped).

### Analytics tier record (NEW file — `public/data/{slug}-analytics.json`)

A projection of `Listing` carrying exactly what the worker needs for hexes **and** the existing
sidebar cards — no map/drawer-only fields.

| Field               | Used by        | Notes                                               |
| ------------------- | -------------- | --------------------------------------------------- |
| `h3`                | hexes          | baked resolution-8 cell; truncated per zoom         |
| `price`             | hexes + cards  | median color + price filter + histogram/median card |
| `roomType`          | filter + cards | room-type filter + room-mix card                    |
| `numberOfReviews`   | cards          |                                                     |
| `reviewsPerMonth`   | cards          | nullable; mean over reviewed only                   |
| `hostId`            | cards          | top hosts                                           |
| `hostName`          | cards          | top hosts label                                     |
| `hostListingsCount` | cards          | multi-host share                                    |
| `neighbourhoodId`   | scope + cards  | neighbourhood drill-down scope                      |

Excluded (belong to the future Browse/points tier): `id, name, lat, lng, minNights, imageVariant`.

### Price ramp (EXISTING — reused)

- `CityMeta.priceScale: { breaks: number[]; min: number; max: number }` from
  `{slug}-meta.json` (`QUANTILE_BREAKS = 5`) → the 5 bucket thresholds for coloring.
- `--price-1..5` OKLCH tokens (dark + light) → mirrored as **hex literals** in `hex-colors.ts`
  (MapLibre cannot parse `oklch`). One hex per ramp step per theme.

## Worker protocol additions (`lib/listings/protocol.ts`)

```ts
// request (main → worker)
| { type: "hexes"; id: number; filters: ListingFilters; resolution: HexResolution }
// response (worker → main)
| { type: "hexes"; id: number; cells: HexCell[] }
```

- Mirrors the existing `aggregates` request/response (id-correlated). `client.ts` gains
  `hexes(filters, resolution): Promise<HexCell[]>`.
- The worker's `load` now fetches `{slug}-analytics.json`; the in-memory rows are the analytics
  projection (a structural subset of `Listing`, so `lib/filters` keeps working unchanged).

## Client map store slice (`components/scene/map/map-store.ts`)

Added to the existing client-only store (canvas is `ssr:false`):

```ts
// state
hexCells: HexCell[];          // latest worker result for the active resolution + filters
hexResolution: HexResolution; // current bucket derived from zoom
// actions
setHexCells: (cells: HexCell[]) => void;
setHexResolution: (r: HexResolution) => void;
```

No request- or user-scoped data; purely client UI state.

## Derived geometry (main thread, `hex-layer.tsx`)

`HexCell[] → GeoJSON FeatureCollection`: each cell → a `Polygon` from `cellToBoundary(h3)` with
properties `{ medianPrice, count }`. Fed to a MapLibre `<Source type="geojson">`; the `<Layer
type="fill">` color is a `step` expression over `priceScale.breaks` → the per-theme ramp literals.

## State transitions / reactivity

```
scene enters → worker.load(analytics) → hexes(defaultFilters, resForZoom) → store.hexCells → render
zoom settles → resolution bucket changes? → hexes(filters, newRes) → store.hexCells → re-render
filter changes (nuqs URL) → hexes(newFilters, res) → store.hexCells → re-render
hover/tap cell → inspect popup { medianPrice, count } ; leave/elsewhere → dismiss
theme toggle → recolor layer with the other theme's ramp literals (no recompute)
```
