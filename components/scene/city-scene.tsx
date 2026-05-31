import { MarketHeader } from "./market-header";
import { MapRegion } from "./map-region";
import { SidebarRegion } from "./sidebar-region";

/**
 * City-scoped scene. Hosts the market header above the analytics sidebar and
 * map, reflowing from stacked layout to side-by-side regions on wide screens.
 */
export function CityScene({
  cityName,
  listingCount,
  snapshotLabel,
}: {
  cityName: string;
  listingCount: number;
  snapshotLabel: string;
}) {
  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <MarketHeader
        cityName={cityName}
        listingCount={listingCount}
        snapshotLabel={snapshotLabel}
      />
      <div className="flex w-full flex-1 flex-col gap-4 lg:flex-row">
        <SidebarRegion />
        <MapRegion />
      </div>
    </div>
  );
}
