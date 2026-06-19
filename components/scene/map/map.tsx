"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-only boundary for the WebGL map. `ssr: false` keeps MapLibre out of the
 * server render entirely (it can only run in the browser anyway), so there is no
 * map markup to hydrate and no server/client mismatch — the `loading` fallback
 * is what the server/first paint shows until the chunk and canvas are ready.
 * `ssr: false` is only valid from a Client Component, which is why this wrapper
 * exists between the server `(scene)` layout and the canvas.
 *
 * The canvas is prop-less: it reads map state from the layout's map actor, so it
 * can be mounted once in the layout and persist across city navigation.
 */
const MapCanvas = dynamic(
  () => import("./map-canvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="text-map-label bg-map-bg absolute inset-0 flex items-center justify-center rounded-none type-label">
        Loading map
      </Skeleton>
    ),
  },
);

export function MapView() {
  return <MapCanvas />;
}
