# Contract — Browse tier file (`{slug}-points.geojson`)

## Producer

`scripts/split-city-data.ts` (UPDATED). Add a `projectPoints(listings)` projection and emit one
file per city alongside the existing tiers:

```
data/json/{slug}.json (CityDataset)
  -> public/data/{slug}-points.geojson   (FeatureCollection<Point, BrowsePointProperties>)
```

```ts
export function projectPoints(
  listings: readonly Listing[],
): GeoJSON.FeatureCollection<GeoJSON.Point, BrowsePointProperties> {
  return {
    type: "FeatureCollection",
    features: listings.map((l) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [l.lng, l.lat] },
      properties: {
        id: l.id,
        name: l.name,
        price: l.price,
        roomType: l.roomType,
        neighbourhoodId: l.neighbourhoodId,
        hostName: l.hostName,
        hostListingsCount: l.hostListingsCount,
        reviewsPerMonth: l.reviewsPerMonth,
        numberOfReviews: l.numberOfReviews,
        minNights: l.minNights,
        imageVariant: l.imageVariant,
      },
    })),
  };
}
```

- Written **compact** (like `{slug}-listings.json`) — it is the heavy tier (~3.46 MB gz London).
- Emitted for every city in `cities.json`. No `availability` field (not in the dataset).

## Consumer

A client hook `components/scene/browse/use-browse-points.ts`:

- **Lazy & shared**: fetches `/data/{slug}-points.geojson` only once Browse is (or has been)
  active for the slug; caches the parsed `FeatureCollection` per slug (ref-counted, mirroring the
  `use-city-listings` registry pattern so the desktop sidebar and the map share one fetch).
- **Loading contract**: exposes `{ status: "loading" | "ready" | "error", points }`. While
  `loading`, the list shows a skeleton and the map draws no dots (FR edge case). On `error`, the
  list shows the empty/error affordance; the lens still toggles.
- **Derivation**: provides the memoized `filtered+sorted` `BrowsePointProperties[]` for the active
  `ListingFilters` + neighbourhood `Scope` + `SortKey` (via `lib/filters` + `lib/browse`).

## Invariants

- `properties.id` is unique per city and stable across snapshots (hover/select/deep-link key).
- `geometry.coordinates` are `[lng, lat]` (GeoJSON order), in range for the city bbox.
- `roomType` ∈ `ROOM_TYPES`; `price`, `numberOfReviews`, `minNights`, `hostListingsCount`,
  `imageVariant` are finite numbers; `reviewsPerMonth`/`hostName` may be null.
- The feature set is a 1:1 projection of the city's `Listing[]` (same count), so the Browse list
  count and the map dot count agree.
