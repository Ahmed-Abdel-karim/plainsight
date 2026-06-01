"use client";

import dynamic from "next/dynamic";

/**
 * Client-only boundary for the WebGL map. `ssr: false` keeps MapLibre out of the
 * server render entirely (it can only run in the browser anyway), so there is no
 * map markup to hydrate and no server/client mismatch — the `loading` fallback
 * is what the server/first paint shows until the chunk and canvas are ready.
 * `ssr: false` is only valid from a Client Component, which is why this wrapper
 * exists between the server `(scene)` layout and the canvas.
 *
 * The canvas is prop-less: it reads the current city from the shared map store
 * (fed by `MapDataSync`), so it can be mounted once in the layout and persist
 * across city navigation.
 */
const MapCanvas = dynamic(
  () => import("./map-canvas").then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="bg-map-bg text-map-label absolute inset-0 flex items-center justify-center type-label">
        Loading map
      </div>
    ),
  },
);

export function MapView() {
  return <MapCanvas />;
}
