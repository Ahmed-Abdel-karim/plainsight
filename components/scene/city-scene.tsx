import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { BBox, LngLat, Scope } from "@/data";
import { MapDataFeeder } from "./map/map-data-feeder";
import { ListingCount } from "./listing-count";
import { SceneDrawer } from "./scene-drawer";
import { SidebarContent } from "./sidebar-content";

/**
 * City-scoped scene overlay. The map itself lives in the `(scene)` layout so it
 * persists across city navigation; this renders the per-city chrome that *does*
 * change — the desktop sidebar (grid column 1) and the mobile drawer.
 *
 * Data is *not* threaded through here as props: each region fetches the tier it
 * needs behind its own Suspense boundary (the analysis cards, header count, and
 * city switcher inside `SidebarContent`; the map's boundaries via `MapDataFeeder`).
 * This component only forwards the cheap framing primitives it received from the
 * route's `meta` read, so a slow tier never blocks a fast one.
 */
export function CityScene({
  citySlug,
  cityName,
  country,
  frame,
  currency,
  snapshotLabel,
  scope,
  bbox,
  center,
}: {
  citySlug: string;
  cityName: string;
  country: string;
  frame: string;
  currency: string;
  snapshotLabel: string;
  scope: Scope;
  bbox: BBox;
  center: LngLat;
}) {
  return (
    <>
      <aside
        aria-label="Market analysis"
        className="@container hidden w-full flex-col gap-section overflow-y-auto border-r border-border bg-card px-section pt-section pb-gutter lg:flex lg:h-screen lg:min-h-0"
      >
        <SidebarContent
          citySlug={citySlug}
          cityName={cityName}
          country={country}
          frame={frame}
          currency={currency}
          snapshotLabel={snapshotLabel}
          scope={scope}
        />
      </aside>
      <SceneDrawer
        cityName={cityName}
        triggerCount={
          <Suspense fallback={<Skeleton className="h-3 w-16" />}>
            <ListingCount citySlug={citySlug} scope={scope} />
          </Suspense>
        }
      >
        <SidebarContent
          citySlug={citySlug}
          cityName={cityName}
          country={country}
          frame={frame}
          currency={currency}
          snapshotLabel={snapshotLabel}
          scope={scope}
        />
      </SceneDrawer>
      <Suspense fallback={null}>
        <MapDataFeeder
          citySlug={citySlug}
          cityName={cityName}
          bbox={bbox}
          center={center}
        />
      </Suspense>
    </>
  );
}
