# Contract: Listings Worker — Hex Aggregation

The listings Web Worker is the scene's analytics engine. This contract adds hex aggregation to the
existing `aggregates` protocol. Only small messages cross the boundary.

## Analytics tier file

- **Path**: `public/data/{slug}-analytics.json` (served at `/data/{slug}-analytics.json`).
- **Shape**: `AnalyticsListing[]` — a projection of `Listing` with fields:
  `h3, price, roomType, numberOfReviews, reviewsPerMonth, hostId, hostName, hostListingsCount,
neighbourhoodId`.
- **Producer**: `scripts/split-city-data.ts` (extended). **Consumer**: `lib/listings/worker.ts`.
- **Guarantee**: a structural subset of `Listing`, so `lib/filters` (`filterListings`,
  `computeAggregates`) operates on it unchanged.

## Messages

```ts
// main → worker
type ListingsRequest =
  | { type: "load"; slug: string } // now loads -analytics.json
  | { type: "aggregates"; id: number; scope: Scope; filters: ListingFilters } // existing
  | {
      type: "hexes";
      id: number;
      filters: ListingFilters;
      resolution: HexResolution;
    }; // NEW

// worker → main
type ListingsResponse =
  | { type: "ready"; slug: string; count: number } // existing
  | { type: "aggregates"; id: number; result: ScopeAggregates } // existing
  | { type: "hexes"; id: number; cells: HexCell[] } // NEW
  | { type: "error"; id?: number; message: string }; // existing
```

### `hexes` request → response

- **Input**: active `filters` (`{ priceRange, roomTypes }`) and the `resolution` (5–8) for the
  current zoom.
- **Behavior**: `cells = aggregateHexes(filterListings(rows, filters), resolution)` where
  `aggregateHexes` (in `lib/hex/aggregate.ts`) truncates each row's `h3` to `resolution`
  (`cellToParent`) and rolls up `{ count, medianPrice: median(price) }` per cell, omitting empty
  cells.
- **Output**: `HexCell[]` (≤ ~2k for the largest city at the finest resolution).
- **Errors**: if not loaded → `{ type: "error", id, message }`; the client rejects that request's
  promise (existing pattern).

## Client surface (`lib/listings/client.ts`)

```ts
class CityListingsClient {
  ready: Promise<number>;

  aggregates(scope, filters): Promise<ScopeAggregates>; // existing
  hexes(filters, resolution): Promise<HexCell[]>; // NEW — id-correlated
  dispose(): void;
}
```

## Invariants

- Both `aggregates` and `hexes` derive from the **same** in-memory analytics rows and the **same**
  `filterListings` — the map, the hexes, and the cards never disagree about the filtered set
  (spec FR-009 / SC-007).
- The worker never posts per-listing data or geometry — only `ScopeAggregates` or `HexCell[]`.
