import type { MapRef } from "react-map-gl/maplibre";

import type { BBox } from "@/lib/geo/types";
import type { HexResolution } from "@/lib/hex/types";
import type { SourceId } from "../../../map/types";

/**
 * Map machine context — the value state the map actor owns directly.
 *
 * DRAFT (see `docs/map-machine-transition-gating.md`). The map is the
 * session-persistent bridge to the imperative MapLibre instance; this holds the
 * data it needs across `/[city]` navigation. `mapStatus` is deliberately NOT
 * here — it became the machine's top-level `loading → ready → error` states.
 *
 * The type and its initial value share the name `Context` so a single
 * `import * as Context from "./context"` yields both.
 */
export interface Context {
  /** The MapLibre instance. Captured from `MAP.MOUNTED`, not from input —
   *  the map mounts after the machine starts. */
  readonly mapRef: MapRef | null;

  /** h3 resolution derived from map zoom; the worker reads it cross-actor. */
  readonly hexResolution: HexResolution;

  /** Which of our sources currently hold parsed data (gates feature-state
   *  re-apply). Fed by `MAP.SOURCE_LOADED`. */
  readonly loadedSources: Partial<Record<SourceId, boolean>>;

  /** Clicked-hex popup. OPEN QUESTION: could move to `ui` alongside
   *  `selectedId` (it is a selection). Kept here for now (spatial). */
  readonly hexInspectInfo: HexInspectInfo | null;

  /** Readiness-race buffer (deferral mechanism = "reconcile on ready", option
   *  D). A `MAP.FIT_BOUNDS` that arrives while still `loading` can't fly yet, so
   *  the *latest* bbox is stashed here (last-wins, no event log) and applied on
   *  entry to `ready`. `null` once applied / when nothing is pending. */
  readonly pendingFitBounds: BBox | null;
}

/** Clicked-hex inspect popup payload. DRAFT — mirrors the old `map-ui` type;
 *  relocate/confirm during refinement. */
export interface HexInspectInfo {
  readonly longitude: number;
  readonly latitude: number;
  readonly medianPrice: number;
  readonly count: number;
}

export const Context: Context = {
  mapRef: null,
  hexResolution: 6,
  loadedSources: {},
  hexInspectInfo: null,
  pendingFitBounds: null,
};
