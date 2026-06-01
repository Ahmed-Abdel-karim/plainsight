import type {
  BBox,
  CityData,
  LngLat,
  Neighbourhood,
  NeighbourhoodBoundaries,
  PriceScale,
  ScopeAggregates,
} from "@/data";
import { MapDataSync } from "../map/map-data-sync";
import { SceneDrawer } from "./scene-drawer";
import { SidebarContent, SidebarRegion } from "./sidebar-region";

/**
 * City-scoped scene overlay. The map itself lives in the `(scene)` layout so it
 * persists across city navigation; this renders the per-city chrome that *does*
 * change — the desktop sidebar (grid column 1) and the mobile drawer — plus a
 * `MapDataSync` bridge that feeds the persistent map its current-city data.
 */
export function CityScene({
  citySlug,
  cityName,
  country,
  frame,
  currency,
  listingCount,
  snapshotLabel,
  aggregates,
  neighbourhoods,
  priceScale,
  cities,
  boundaries,
  bbox,
  center,
  neighbourhoodCount,
}: {
  citySlug: string;
  cityName: string;
  country: string;
  frame: string;
  currency: string;
  listingCount: number;
  snapshotLabel: string;
  aggregates: ScopeAggregates;
  neighbourhoods: Neighbourhood[];
  priceScale: PriceScale;
  cities: CityData[];
  boundaries: NeighbourhoodBoundaries | null;
  bbox: BBox;
  center: LngLat;
  neighbourhoodCount: number;
}) {
  return (
    <>
      <SidebarRegion
        citySlug={citySlug}
        country={country}
        frame={frame}
        currency={currency}
        listingCount={listingCount}
        snapshotLabel={snapshotLabel}
        aggregates={aggregates}
        neighbourhoods={neighbourhoods}
        priceScale={priceScale}
        cities={cities}
      />
      <SceneDrawer cityName={cityName} listingCount={listingCount}>
        <SidebarContent
          citySlug={citySlug}
          country={country}
          frame={frame}
          currency={currency}
          listingCount={listingCount}
          snapshotLabel={snapshotLabel}
          aggregates={aggregates}
          cities={cities}
        />
      </SceneDrawer>
      <MapDataSync
        slug={citySlug}
        cityName={cityName}
        boundaries={boundaries}
        bbox={bbox}
        center={center}
        neighbourhoodCount={neighbourhoodCount}
      />
    </>
  );
}
