import { CityMeta, getCityBoundaries, getCityNeighbourhoodCount } from "@/data";

import { MapDataSync } from "./map-data-sync";
import { AsyncBoundary } from "../../utils/async-boundary";

/**
 * Co-located fetch for the persistent map's per-city tier: the ~1.8 MB
 * neighbourhood boundaries GeoJSON plus the neighbourhood count. Rendered behind
 * its own Suspense boundary (fallback `null` — the map shows its own "Loading
 * map" skeleton) so this heavy read no longer gates the analysis cards, header,
 * or switcher. The `Promise.all` here is local to the map's own tier; the map
 * tolerates late arrival by reacting to the shared store via `MapDataSync`.
 */
export function MapDataFeeder({
  cityMeta: {
    slug: citySlug,
    name: cityName,
    bbox,
    center,
    priceScale,
    priceCap,
    currency,
    snapshotLabel,
  },
}: {
  cityMeta: CityMeta;
}) {
  return (
    <AsyncBoundary
      data={() =>
        Promise.all([
          getCityBoundaries(citySlug),
          getCityNeighbourhoodCount(citySlug),
        ])
      }
      Component={({ data: [boundaries, neighbourhoodCount] }) => (
        <MapDataSync
          slug={citySlug}
          cityName={cityName}
          boundaries={boundaries}
          bbox={bbox}
          center={center}
          neighbourhoodCount={neighbourhoodCount}
          priceScale={priceScale}
          priceCap={priceCap}
          currency={currency}
          snapshotLabel={snapshotLabel}
        />
      )}
      fallback={null}
    />
  );
}
