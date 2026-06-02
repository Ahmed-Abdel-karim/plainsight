import {
  getCityBoundaries,
  getCityNeighbourhoodCount,
  type BBox,
  type LngLat,
} from "@/data";

import { MapDataSync } from "./map-data-sync";

/**
 * Co-located fetch for the persistent map's per-city tier: the ~1.8 MB
 * neighbourhood boundaries GeoJSON plus the neighbourhood count. Rendered behind
 * its own Suspense boundary (fallback `null` — the map shows its own "Loading
 * map" skeleton) so this heavy read no longer gates the analysis cards, header,
 * or switcher. The `Promise.all` here is local to the map's own tier; the map
 * tolerates late arrival by reacting to the shared store via `MapDataSync`.
 */
export async function MapDataFeeder({
  citySlug,
  cityName,
  bbox,
  center,
}: {
  citySlug: string;
  cityName: string;
  bbox: BBox;
  center: LngLat;
}) {
  const [boundaries, neighbourhoodCount] = await Promise.all([
    getCityBoundaries(citySlug),
    getCityNeighbourhoodCount(citySlug),
  ]);

  return (
    <MapDataSync
      slug={citySlug}
      cityName={cityName}
      boundaries={boundaries}
      bbox={bbox}
      center={center}
      neighbourhoodCount={neighbourhoodCount}
    />
  );
}
