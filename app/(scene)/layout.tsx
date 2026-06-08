import { QueryProvider } from "@/components/query/query-provider";
import { MapView } from "@/components/scene/map/map";

/**
 * Persistent scene shell. This layout sits *above* the `[city]` dynamic segment
 * (route groups don't add a path segment), so its React state key is constant
 * across city navigation — anything it renders survives a `/amsterdam → /berlin`
 * change. The WebGL map is mounted here exactly once and reframes itself in place
 * via the shared map store; only `{children}` (the per-city sidebar/drawer) swaps.
 *
 * The grid lives here so the sidebar (`{children}`, column 1) and the map column
 * sit side by side. On desktop only the sidebar (`hidden lg:flex`) and the map
 * `<section>` are in-flow grid items; the mobile drawer is `lg:hidden` and the
 * `MapDataSync` bridge renders nothing, so neither claims a grid cell.
 *
 * Only the WebGL canvas needs to persist across city navigation, so only `MapView`
 * lives here. The lens tabs + legends are rendered by the `[city]` route (overlaid
 * on this column via CSS) so they can read the lens/scope search params; the grid
 * container is `relative` to anchor that absolutely-positioned chrome.
 */
export default function SceneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <main className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:overflow-hidden">
        <div className="relative flex min-h-screen w-full flex-1 flex-col bg-background text-foreground lg:grid lg:h-screen lg:grid-cols-[432px_minmax(0,1fr)] lg:overflow-hidden">
          {children}
          <section
            aria-label="Map"
            className="bg-map-bg relative min-h-96 flex-1 overflow-hidden lg:min-h-0"
          >
            <MapView />
          </section>
        </div>
      </main>
    </QueryProvider>
  );
}
