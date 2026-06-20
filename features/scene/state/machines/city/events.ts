import type { RoomType } from "@/data/contract";
import type { ProcessResult, ProcessType } from "../worker/events";
import type { HexResolution } from "@/lib/hex/types";

// --- filter events (from UI action hooks; only honoured in city.ready) ---

export interface FilterSetRoomTypes {
  readonly type: "FILTER.SET_ROOM_TYPES";
  readonly roomTypes: RoomType[];
}
export interface FilterSetPriceRange {
  readonly type: "FILTER.SET_PRICE_RANGE";
  readonly priceRange: [number, number] | null;
}
export interface FilterSetNbhd {
  readonly type: "FILTER.SET_NBHD";
  readonly nbhd: string | null;
}

// --- map event forwarded from map machine (triggers hex recompute) ---

export interface MapResolutionChanged {
  readonly type: "MAP.RESOLUTION_CHANGED";
  readonly hexResolution: HexResolution;
}

// --- worker events (sent via sendParent from the invoked worker actor) ---

/** Worker's city-data load succeeded. City exits loading → ready. Carries the
 *  `slug` it is for so a city that has since been navigated away from drops it. */
export interface WorkerFetchOk {
  readonly type: "WORKER.FETCH_OK";
  readonly slug: string;
  readonly count: number;
}
/** Terminal load failure — city exits loading → error. Slug-stamped (Rule 5.3). */
export interface WorkerFetchError {
  readonly type: "WORKER.FETCH_ERROR";
  readonly slug: string;
  readonly error: Error;
}
/** A recompute landed. City assigns aggregates or hexCells from the result. */
export interface WorkerProcessResult {
  readonly type: "WORKER.PROCESS_RESULT";
  readonly result: ProcessResult;
}
/** Informational recompute error — last good result stays on screen. */
export interface WorkerProcessError {
  readonly type: "WORKER.PROCESS_ERROR";
  readonly processType: ProcessType;
  readonly error: Error;
}

export type Events =
  | FilterSetRoomTypes
  | FilterSetPriceRange
  | FilterSetNbhd
  | MapResolutionChanged
  | WorkerFetchOk
  | WorkerFetchError
  | WorkerProcessResult
  | WorkerProcessError;

// --- emitted events (semantic signals the UI subscribes to; no UI coupling) ---

/** A city-level failure worth surfacing. `load` is the terminal data-load
 *  failure; `process` is a recompute (`hexes`/`aggregates`) that didn't land —
 *  the last good result stays on screen, but the user is told it's stale. */
export interface CityErrorEmitted {
  readonly type: "city.error";
  readonly kind: "load" | "process";
  readonly processType?: ProcessType;
}

export type Emitted = CityErrorEmitted;
