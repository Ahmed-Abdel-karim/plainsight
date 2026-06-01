/**
 * Plainsight — Geospatial utilities
 * -----------------------------------------------------------------------------
 * Single home for coordinate/geometry helpers shared across the map components.
 */

import type { LngLatBoundsLike } from "react-map-gl/maplibre";

import type { BBox } from "./types";

/** Convert a [minLng, minLat, maxLng, maxLat] bbox to a MapLibre bounds pair. */
export function toBounds([
  minLng,
  minLat,
  maxLng,
  maxLat,
]: BBox): LngLatBoundsLike {
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
