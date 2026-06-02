/**
 * Map a MapLibre zoom level to the H3 resolution the hex grid renders at. The
 * grid coarsens when zoomed out (fewer, larger cells for the city overview) and
 * refines on zoom-in, capped at the baked resolution 8 (research.md Decision 8).
 *
 * Thresholds are tuned to the map's *fitted* overview zoom, not the nominal
 * `initialViewState.zoom`: the canvas frames each city to its bounds, which lands
 * at ~9.7 (London/Berlin/Manchester) to ~11.2 (Amsterdam). At that overview the
 * grid should read as a fine neighbourhood texture (res 7), refining to the
 * baked floor (res 8, ~0.7 km² cells) once the user zooms into a district, and
 * only coarsening to res 5–6 if they pull well back from the framed city.
 */
import type { HexResolution } from "./types";

export const MIN_HEX_RESOLUTION: HexResolution = 5;
export const MAX_HEX_RESOLUTION: HexResolution = 8;

/**
 * Zoom breakpoints, ascending. A zoom `z` maps to the resolution of the last
 * entry whose `minZoom <= z`, clamped to [5, 8]. Below the first breakpoint the
 * grid holds at res 5; at/above the last it holds at res 8. Spacing is ~1.5 zoom
 * levels per step (≈ how far you zoom before an H3 cell visually halves).
 */
const BREAKPOINTS: ReadonlyArray<{
  minZoom: number;
  resolution: HexResolution;
}> = [
  { minZoom: 0, resolution: 5 },
  { minZoom: 8.5, resolution: 6 },
  { minZoom: 9.5, resolution: 7 },
  { minZoom: 11.5, resolution: 8 },
];

/** Zoom → H3 resolution (5–8), clamped at both bounds. */
export function zoomToResolution(zoom: number): HexResolution {
  let resolution: HexResolution = MIN_HEX_RESOLUTION;
  for (const breakpoint of BREAKPOINTS) {
    if (zoom >= breakpoint.minZoom) resolution = breakpoint.resolution;
    else break;
  }
  return resolution;
}
