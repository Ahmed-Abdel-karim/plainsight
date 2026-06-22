import type { MapRef } from "react-map-gl/maplibre";

import type { BBox } from "@/lib/geo/types";
import type { HexResolution } from "@/lib/hex/types";
import type { SourceId } from "@/features/scene/map/types";
import type { HexInspectInfo } from "./context";
import type * as Input from "./input";

/**
 * Map machine events, grouped by source:
 *   - `MAP.*`        — the React/MapLibre bridge (mount, lifecycle, interactions)
 *   - `SUSPEND` / `RESUME` — the coordinator's suppression pair (map shares it
 *     with ui). `SUSPEND` enters `interaction: "suspended"`; `RESUME` returns to
 *     `interactive`.
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
/** The canvas was torn down (`map.remove()` ran) — drop the now-dead ref. */
export interface MapUnmounted {
  readonly type: "MAP.UNMOUNTED";
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

// --- interactions (only honoured in interaction.interactive) ---
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

// --- suppression (shared coordinator pair) ---
export interface Suspend {
  readonly type: "SUSPEND";
}
export interface Resume {
  readonly type: "RESUME";
}

export type Events =
  | Init
  | MapMounted
  | MapUnmounted
  | MapReady
  | MapError
  | MapSourceLoaded
  | MapSelect
  | MapHover
  | MapFitBounds
  | MapHexInspect
  | MapResolutionChanged
  | Suspend
  | Resume;
