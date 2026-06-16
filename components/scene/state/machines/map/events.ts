import type { MapRef } from "react-map-gl/maplibre";

import type { BBox } from "@/lib/geo/types";
import type { HexResolution } from "@/lib/hex/types";
import type { SourceId } from "../../../map/types";
import type { HexInspectInfo } from "./context";
import type * as Input from "./input";

/**
 * Map machine events. DRAFT (see `docs/map-machine-transition-gating.md`).
 *
 * Grouped by source:
 *   - `MAP.*`  — pushed up from the React/MapLibre bridge (mount, lifecycle,
 *                interactions).
 *   - `NAV.START` / `CITY.READY` — the transition window. `NAV.START` (fired at
 *                click, slug known from the href) sends the map to
 *                `ready.suppressed`; `CITY.READY` (city converged) returns it to
 *                `ready.interactive`.
 *
 * `CITY.CHANGED { framing }` is intentionally a *root* event, not a map event —
 * root spawns the city from it; the map only cares about NAV.START / CITY.READY.
 */

/** Auto-fired when the actor starts; carries the machine `input`. */
export interface Init {
  readonly type: "xstate.init";
  readonly input: Input.Input;
}

// --- lifecycle (MapLibre instance: loading → ready → error) ---
export interface MapMounted {
  readonly type: "MAP.MOUNTED";
  readonly mapRef: MapRef;
}
export interface MapReady {
  readonly type: "MAP.READY";
}
export interface MapError {
  readonly type: "MAP.ERROR";
}
export interface MapSourceLoaded {
  readonly type: "MAP.SOURCE_LOADED";
  readonly sourceId: SourceId;
  /** false on MapLibre's metadata pulse before the content pulse arrives. */
  readonly loaded: boolean;
}

// --- interactions (only honoured in instance.ready) ---
export interface MapSelect {
  readonly type: "MAP.SELECT";
  readonly id: number | null;
}
export interface MapHover {
  readonly type: "MAP.HOVER";
  readonly id: number | null;
  readonly source: "list" | "map" | null;
}
export interface MapFitBounds {
  readonly type: "MAP.FIT_BOUNDS";
  readonly bbox: BBox;
}
export interface MapHexInspect {
  readonly type: "MAP.HEX_INSPECT";
  readonly info: HexInspectInfo | null;
}
export interface MapResolutionChanged {
  readonly type: "MAP.RESOLUTION_CHANGED";
  readonly hexResolution: HexResolution;
}

// --- data region (transition window) ---
export interface NavStart {
  readonly type: "NAV.START";
  readonly slug: string;
}
export interface CityReady {
  readonly type: "CITY.READY";
}

export type Events =
  | Init
  | MapMounted
  | MapReady
  | MapError
  | MapSourceLoaded
  | MapSelect
  | MapHover
  | MapFitBounds
  | MapHexInspect
  | MapResolutionChanged
  | NavStart
  | CityReady;
