import { MapRegion } from "./map-region";
import { ScopeLabel } from "./scope-label";
import { SidebarRegion } from "./sidebar-region";

/**
 * E1-S2: the city-scoped scene. Composes the map region and the sidebar region
 * (which carries the scope label) against the whole-city default scope. Reflows
 * from a stacked layout on small screens to map + sidebar side-by-side on wide
 * screens, without hiding either region.
 */
export function CityScene({
  cityName,
  listingCount,
}: {
  cityName: string;
  listingCount: number;
}) {
  return (
    <div className="flex w-full flex-1 flex-col gap-4 lg:flex-row">
      <SidebarRegion>
        <ScopeLabel cityName={cityName} count={listingCount} />
      </SidebarRegion>
      <MapRegion />
    </div>
  );
}
