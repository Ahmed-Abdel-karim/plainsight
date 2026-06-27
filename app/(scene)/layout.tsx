import { FeatureBoundary } from "@/components/utils/error-boundary";
import { QueryProvider } from "@/components/query/query-provider";
import { MapView, SceneNotifications, SceneProvider } from "@/features/scene";
import { getCitiesData } from "@/data";

/**
 * City scene shell — owns the whole client scene subsystem. The actor system +
 * React Query providers live here (not the root layout) so their client JS stays
 * off non-scene routes like the home route. They persist across city↔city
 * navigation within this segment and reset only when navigation leaves `(scene)`
 * entirely. This layout sits above the `[city]` segment, so the WebGL map
 * persists across `/amsterdam → /berlin`; only `{children}` (the per-city
 * sidebar/drawer) swaps.
 *
 * The grid lives here so the sidebar (`{children}`, column 1) and the map column
 * sit side by side. On desktop only the sidebar (`hidden lg:flex`) and the map
 * `<section>` are in-flow grid items; the mobile drawer is `lg:hidden`, so it
 * doesn't claim a grid cell. The lens switcher + legends are rendered by the
 * `[city]` route (overlaid on this column via CSS); the grid container is
 * `relative` to anchor that absolutely-positioned chrome.
 */
export default async function SceneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cities = await getCitiesData();
  const snapshotById = Object.fromEntries(
    cities.map(({ slug, snapshotId }) => [slug, snapshotId]),
  );
  return (
    <QueryProvider>
      <SceneProvider snapshotById={snapshotById}>
        <SceneNotifications />
        <main className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:overflow-hidden">
          <div className="relative flex min-h-screen w-full flex-1 flex-col bg-background text-foreground lg:grid lg:h-screen lg:grid-cols-[432px_minmax(0,1fr)] lg:overflow-hidden">
            {children}
            <section
              aria-label="Map"
              className="bg-map-bg relative min-h-96 flex-1 overflow-hidden lg:min-h-0"
            >
              <FeatureBoundary id="scene.map">
                <MapView />
              </FeatureBoundary>
            </section>
          </div>
        </main>
      </SceneProvider>
    </QueryProvider>
  );
}
