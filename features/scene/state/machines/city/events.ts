import type { RoomType } from "@/data/contract";
import type { ProcessResult, ProcessType } from "../worker/events";
import type { HexResolution } from "@/lib/hex/types";
import type { Lens } from "@/lib/search-params";

// --- lens event (raised at spawn from the ui snapshot; forwarded by ui on a
// runtime switch) — routes the city to its browse / analyse leg ---

export interface LensChanged {
  readonly type: "LENS.CHANGED";
  readonly lens: Lens;
}

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
/** Internal: raised (debounced) once a price-slider drag settles, to coalesce the
 *  per-tick filter updates into a single worker recompute. */
export interface FilterPriceSettled {
  readonly type: "FILTER.PRICE_SETTLED";
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
  readonly snapshotId: string;
  readonly count: number;
}
/** Terminal load failure — city exits loading → error. Slug-stamped (Rule 5.3). */
export interface WorkerFetchError {
  readonly type: "WORKER.FETCH_ERROR";
  readonly slug: string;
  readonly snapshotId: string;
  readonly error: Error;
}
/** The worker thread crashed (uncaught throw / OOM), not a handled fetch or
 *  process rejection. Terminal from any lens — the worker can no longer serve
 *  this city. Slug-stamped with the city's own identity by the worker router. */
export interface WorkerFatalError {
  readonly type: "WORKER.FATAL_ERROR";
  readonly slug: string;
  readonly snapshotId: string;
  readonly error: Error;
}
/** A recompute landed. City assigns aggregates or hexCells from the result. */
export interface WorkerProcessResult {
  readonly type: "WORKER.PROCESS_RESULT";
  readonly result: ProcessResult;
}
/** Informational recompute error — last good result stays on screen. Carries the
 *  `slug`/`snapshotId` it is for so a city that has been navigated away from
 *  drops it (Rule 5.3), exactly like a successful `WORKER.PROCESS_RESULT`. */
export interface WorkerProcessError {
  readonly type: "WORKER.PROCESS_ERROR";
  readonly slug: string;
  readonly snapshotId: string;
  readonly processType: ProcessType;
  readonly error: Error;
}

export type Events =
  | LensChanged
  | FilterSetRoomTypes
  | FilterSetPriceRange
  | FilterSetNbhd
  | FilterPriceSettled
  | MapResolutionChanged
  | WorkerFetchOk
  | WorkerFetchError
  | WorkerFatalError
  | WorkerProcessResult
  | WorkerProcessError;

// --- emitted events (semantic signals the UI subscribes to; no UI coupling) ---

/** A city-level failure worth surfacing. `load` is the terminal data-load
 *  failure; `process` is a recompute (`hexes`/`aggregates`) that didn't land —
 *  the last good result stays on screen, but the user is told it's stale;
 *  `worker` is a worker-thread crash that ends analysis for this city. */
export interface CityErrorEmitted {
  readonly type: "city.error";
  readonly kind: "load" | "process" | "worker";
  readonly processType?: ProcessType;
}

export type Emitted = CityErrorEmitted;
