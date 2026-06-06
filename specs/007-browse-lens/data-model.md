# Phase 1 Data Model — Browse Lens

## Browse tier file — `public/data/{slug}-points.geojson`

A GeoJSON `FeatureCollection`; one `Point` feature per listing. Emitted by the updated split
script (`projectPoints(listings)`), served at `/data/{slug}-points.geojson`, fetched client-side
on first Browse activation. Geometry coordinates are `[lng, lat]`.

```jsonc
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [lng, lat] },
      "properties": {
        "id": 12345,                 // number — stable listing id (hover/select key, deep-link)
        "name": "string",            // listing title
        "price": 120,                // number — nightly price (GPU filter + display)
        "roomType": "Entire home/apt", // RoomType (GPU filter + color/label)
        "neighbourhoodId": "string", // scope filter; resolved to a name via {slug}-meta.json
        "hostName": "string|null",
        "hostListingsCount": 3,      // number — multi-host indicator = >= 2
        "reviewsPerMonth": 1.4,      // number|null — sort key (reviews_desc)
        "numberOfReviews": 57,       // number — sort key (review_count_desc)
        "minNights": 2,              // number — drawer detail
        "imageVariant": 0            // number — placeholder thumb bucket
      }
    }
  ]
}
```

Notes:

- Properties = the full `Listing` **minus** `h3` (the analytics/hex concern) and **plus** the
  point geometry. There is **no `availability`** field in the dataset (research D3) — it is not in
  the tier and not in the drawer.
- MapLibre's `setFilter` reads `price`, `roomType`, `neighbourhoodId` from `properties`.
- Numeric/typed; no derived fields baked in (multi-host is derived in the UI from
  `hostListingsCount >= 2`).

## Types (`data/contract.ts`, NEW)

```ts
/** One Browse-tier point feature's properties (a Listing minus h3, used for the
 *  map dots, the list rows, and the detail drawer). */
export interface BrowsePointProperties {
  id: number;
  name: string;
  price: number;
  roomType: RoomType;
  neighbourhoodId: string;
  hostName: string | null;
  hostListingsCount: number;
  reviewsPerMonth: number | null;
  numberOfReviews: number;
  minNights: number;
  imageVariant: number;
}

/** A Browse-tier GeoJSON point feature. */
export type BrowsePoint = GeoJSON.Feature<GeoJSON.Point, BrowsePointProperties>;
```

`SortKey` is already defined in `data/types.ts` and is used unchanged:
`"price_asc" | "price_desc" | "reviews_desc" | "review_count_desc"`.

## Entities & derived view-models

- **Lens** — `"analyse" | "browse"`. URL param `lens` (nuqs string-literal, default `analyse`,
  `clearOnDefault`). Drives sidebar content, map layer visibility, and `interactiveLayerIds`.
- **Selected listing** — `id | null`. URL param `listing` (nuqs integer). Opens the detail drawer;
  cleared on close, lens→analyse, city switch, or when the id leaves the filtered set.
- **Hovered listing** — `id | null`. Ephemeral; `map-store` slice. Set by list-card hover/focus and
  by map-dot hover; consumed by both (feature-state on the map, scroll-into-view + emphasis in the
  list).
- **Filtered+sorted listings** — derived `BrowsePointProperties[]`: `points` features →
  `lib/filters` predicate (active `ListingFilters` + neighbourhood scope) → `lib/browse`
  comparator (`SortKey`). Memoized; recomputed on points/filter/scope/sort change. Feeds the
  virtualized list and the result count.

## State transitions

- **Lens**: `analyse ⇄ browse`. Entering `browse`: lazy-fetch the points tier (if not cached),
  hide hex / show dots, render the list. Entering `analyse`: hide dots / show hex, render the
  dashboard, clear selection + hover.
- **Selection**: `none → selected` (card/dot click) opens drawer + writes `listing`;
  `selected → none` (Esc/close/lens change/city switch/filtered-out) closes drawer + clears
  `listing`; `selected → selected'` (pick another) replaces drawer content.
- **City switch**: reset lens-scoped view — points re-fetch for the new slug, selection + hover
  - sort reset (filters already reset by the existing flow).

## Store slice (`components/scene/map/map-store.ts`, UPDATED)

```ts
// added to State
hoveredListingId: number | null;
// added to Actions
setHoveredListingId: (id: number | null) => void;
// selector
export const useHoveredListingId = () =>
  useMapStore((s) => s.hoveredListingId);
```

No other store shape changes; `hexCells`/`hexResolution` are untouched (the hex layer keeps
working in Analyse).
