import type {
  CityData,
  Neighbourhood,
  NeighbourhoodBoundaries,
  PriceScale,
  ScopeAggregates,
} from "@/data";
import { MapRegion } from "./map-region";
import { SceneDrawer } from "./scene-drawer";
import { SidebarContent, SidebarRegion } from "./sidebar-region";

/**
 * City-scoped scene. Mirrors the RentalScope design shell: a dense analysis
 * sidebar paired with a full-height map canvas.
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
  bbox: [number, number, number, number];
  center: [number, number];
  neighbourhoodCount: number;
}) {
  return (
    <div className="relative flex min-h-screen w-full flex-1 flex-col bg-background text-foreground lg:grid lg:h-screen lg:grid-cols-[432px_minmax(0,1fr)] lg:overflow-hidden">
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
      <MapRegion
        boundaries={boundaries}
        bbox={bbox}
        center={center}
        cityName={cityName}
        neighbourhoodCount={neighbourhoodCount}
      />
      <SceneDrawer cityName={cityName} listingCount={listingCount}>
        <SidebarContent
          citySlug={citySlug}
          country={country}
          frame={frame}
          listingCount={listingCount}
          snapshotLabel={snapshotLabel}
          cities={cities}
        />
      </SceneDrawer>
    </div>
  );
}
