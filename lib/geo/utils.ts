/**
 * Plainsight — Geospatial utilities
 * -----------------------------------------------------------------------------
 * Single home for coordinate/geometry helpers shared across the map components.
 */

import type { LngLatBoundsLike } from "react-map-gl/maplibre";

import type { BBox } from "./types";

/** Convert a [minLng, minLat, maxLng, maxLat] bbox to a MapLibre bounds pair. */
export function toBounds(
  [minLng, minLat, maxLng, maxLat]: BBox,
  maxPaddingRatio = 0,
): LngLatBoundsLike {
  const lngPadding = (maxLng - minLng) * maxPaddingRatio;
  const latPadding = (maxLat - minLat) * maxPaddingRatio;
  return [
    [minLng - lngPadding, minLat - latPadding],
    [maxLng + lngPadding, maxLat + latPadding],
  ];
}
