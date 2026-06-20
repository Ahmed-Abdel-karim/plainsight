import { Skeleton } from "@/components/ui/skeleton";
import { type CityMeta, getCityNeighbourhoodCount, type Scope } from "@/data";
import { ListingCount } from "./listing-count";
import { ListingDetail } from "./browse";
import { SceneDrawer } from "./scene-drawer";
import { MarketPanelContent } from "./market-panel-content";
import { LensSwitcher } from "./lens-switcher";
import { HexLegend } from "./map/layers/hex";
import { PointsLegend } from "./map/layers/points";
import { MapLegend } from "./map-legend";
import type { MapCityPayload } from "@/data/types";
import { SceneUrlLoader } from "./scene-url-loader";
import { UrlWriteSync } from "./url-write-sync";

/**
 * City-scoped scene overlay. The map itself lives in the `(scene)` layout so it
 * persists across city navigation; this renders the per-city chrome that *does*
 * change — the desktop sidebar (grid column 1) and the mobile drawer.
 *
 * `SceneUrlLoader` fires `CITY.CHANGED` into the XState root machine on mount,
 * spawning a fresh city actor per slug. The heavy boundaries GeoJSON is fetched
 * lazily via React Query so the sidebar never blocks on it.
 *
 * Data is otherwise *not* threaded through here as props: each region fetches the
 * tier it needs behind its own Suspense boundary. The lens/scope/listing state is
 * client-only (XState, reflected from the URL by `SceneUrlLoader`), so nothing
 * here reads `searchParams` — the route stays fully static.
 */
export function SceneView({
  scope,
  cityMeta,
}: {
  scope: Scope;
  cityMeta: CityMeta;
}) {
  // Cheap framing promise: everything but the neighbourhood count comes straight
  // off the already-read meta; the count is the one extra (cached) read. Built
  // here (server) and passed unresolved so the client provider can `use()` it.
  const cityPromise: Promise<MapCityPayload> = getCityNeighbourhoodCount(
    cityMeta.slug,
  ).then((neighbourhoodCount) => ({
    ...cityMeta,
    cityName: cityMeta.name,
    neighbourhoodCount,
  }));

  return (
    <>
      <SceneUrlLoader cityPromise={cityPromise} />
      <UrlWriteSync />
      <aside
        aria-label="Market analysis"
        className="@container hidden w-full flex-col gap-section overflow-y-auto border-r border-border bg-card px-section pt-section pb-gutter lg:flex lg:h-screen lg:min-h-0"
      >
        <MarketPanelContent cityMeta={cityMeta} scope={scope} />
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
        <MarketPanelContent cityMeta={cityMeta} scope={scope} />
      </SceneDrawer>
      <div className="pointer-events-none absolute inset-0 z-10 lg:left-108">
        <div className="absolute top-16 left-1/2 -translate-x-1/2 lg:top-4">
          <LensSwitcher />
        </div>
        <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-col gap-2">
          <HexLegend />
          <PointsLegend />
          <MapLegend />
        </div>
      </div>
      <ListingDetail />
    </>
  );
}
