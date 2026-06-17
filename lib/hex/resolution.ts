/**
 * Map a MapLibre zoom level to the H3 resolution the hex grid renders at. The
 * grid coarsens when zoomed out (fewer, larger cells for the city overview) and
 * refines on zoom-in, capped at the baked resolution 8 (research.md Decision 8).
 *
 * Thresholds are tuned to the map's actual *working* zoom: maxBounds (city bbox +
 * padding) blocks zooming out past the fitted overview, so the reachable floor is
 * ~9.5 for typical cities — anything coarser is unreachable. The breakpoints pack
 * the granularity into that working band: from the overview the grid reads as a
 * neighbourhood texture (res 6) and refines through res 7 to the baked floor (res
 * 8, ~0.7 km² cells) as the user zooms into a district. res 5 is a deep floor for
 * very large metros that frame below ~8.5. Steps are ~1.5–2 zoom levels apart (≈
 * how far you zoom before an H3 cell visually halves; one res step scales a cell's
 * edge by √7 ≈ 2.65×).
 */
import type { HexResolution } from "./types";

export const MIN_HEX_RESOLUTION: HexResolution = 5;
export const MAX_HEX_RESOLUTION: HexResolution = 8;

/**
 * Zoom breakpoints, ascending. A zoom `z` maps to the resolution of the last
 * entry whose `minZoom <= z`, clamped to [5, 8]. Below the first breakpoint the
 * grid holds at res 5; at/above the last it holds at res 8 through the map maximum.
 */
const BREAKPOINTS: ReadonlyArray<{
  minZoom: number;
  resolution: HexResolution;
}> = [
  { minZoom: 0, resolution: 5 }, // deep floor: very large metros framing below ~8.5 (rare)
  { minZoom: 8.5, resolution: 6 }, // working overview floor (~9.5) — neighbourhood texture
  { minZoom: 10.7, resolution: 7 }, // zooming in past the overview
  { minZoom: 12.2, resolution: 8 }, // district / street (baked floor, holds to max zoom)
];

/** Zoom → H3 resolution (5–8), clamped at both bounds. */
export function zoomToResolution(zoom: number): HexResolution {
  const z = Math.max(0, zoom);
  let resolution: HexResolution = MIN_HEX_RESOLUTION;
  for (const breakpoint of BREAKPOINTS) {
    if (z >= breakpoint.minZoom) resolution = breakpoint.resolution;
    else break;
  }
  return Math.max(
    MIN_HEX_RESOLUTION,
    Math.min(MAX_HEX_RESOLUTION, resolution),
  ) as HexResolution;
}
