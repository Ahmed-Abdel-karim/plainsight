"use client";

import dynamic from "next/dynamic";

import type { NeighbourhoodBoundaries } from "@/data";

/**
 * Client-only boundary for the WebGL map. `ssr: false` keeps MapLibre out of the
 * server render entirely (it can only run in the browser anyway), so there is no
 * map markup to hydrate and no server/client mismatch — the `loading` fallback
 * is what the server/first paint shows until the chunk and canvas are ready.
 * `ssr: false` is only valid from a Client Component, which is why this wrapper
 * exists between the server `map-region.tsx` and the canvas.
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

export function MapView(props: {
  bbox: [number, number, number, number];
  center: [number, number];
  boundaries: NeighbourhoodBoundaries;
  cityName: string;
}) {
  return <MapCanvas {...props} />;
}
