import { Skeleton } from "@/components/ui/skeleton";
import type { CityMeta, Scope } from "@/data";
import { MapDataFeeder } from "./map/map-data-feeder";
import { ListingCount } from "./listing-count";
import { ListingDetail } from "./browse/listing-detail";
import { SceneDrawer } from "./scene-drawer";
import { SidebarContent } from "./sidebar-content";
import { LensTabs } from "./lens-tabs/lens-tabs";
import { HexLegend } from "./map/hex/hex-legend";
import { PointsLegend } from "./map/points/points-legend";
import { MapLegend } from "./map-legend";
import { SceneStoreSync } from "./scene-store-sync";

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
 *
 * The lens/scope/listing state is client-only (the scene store, reflected from the
 * URL by `SceneStoreSync`), so nothing here reads `searchParams` — the route stays
 * fully static. The heavy WebGL canvas lives in the `(scene)` layout (persistent
 * across city navigation); only its chrome (the lens tabs + legends) lives here.
 */
export function CityScene({
  scope,
  cityMeta,
}: {
  scope: Scope;
  cityMeta: CityMeta;
}) {
  return (
    <>
      <SceneStoreSync />
      <aside
        aria-label="Market analysis"
        className="@container hidden w-full flex-col gap-section overflow-y-auto border-r border-border bg-card px-section pt-section pb-gutter lg:flex lg:h-screen lg:min-h-0"
      >
        <SidebarContent cityMeta={cityMeta} scope={scope} />
      </aside>
      <SceneDrawer
        cityName={cityMeta.name}
        triggerCount={
          <ListingCount
            citySlug={cityMeta.slug}
            scope={scope}
            fallback={<Skeleton className="h-3 w-16" />}
          />
        }
      >
        <SidebarContent cityMeta={cityMeta} scope={scope} />
      </SceneDrawer>
      <div className="pointer-events-none absolute inset-0 z-10 lg:left-108">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <LensTabs />
        </div>
        <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-col gap-2">
          <HexLegend />
          <PointsLegend />
          <MapLegend />
        </div>
      </div>
      <MapDataFeeder cityMeta={cityMeta} />
      <ListingDetail />
    </>
  );
}
