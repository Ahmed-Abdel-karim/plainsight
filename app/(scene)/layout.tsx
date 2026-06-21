import { MapView, SceneNotifications } from "@/features/scene";

/**
 * City scene shell. The actor system + React Query providers live in the root
 * layout (`app/layout.tsx`) so they persist across *all* navigation — including a
 * trip out to the home picker — and the scene state is never torn down. This
 * layout sits above the `[city]` segment, so the WebGL map persists across
 * `/amsterdam → /berlin`; only `{children}` (the per-city sidebar/drawer) swaps.
 *
 * The grid lives here so the sidebar (`{children}`, column 1) and the map column
 * sit side by side. On desktop only the sidebar (`hidden lg:flex`) and the map
 * `<section>` are in-flow grid items; the mobile drawer is `lg:hidden`, so it
 * doesn't claim a grid cell. The lens switcher + legends are rendered by the
 * `[city]` route (overlaid on this column via CSS); the grid container is
 * `relative` to anchor that absolutely-positioned chrome.
 */
export default function SceneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SceneNotifications />
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
    </>
  );
}
