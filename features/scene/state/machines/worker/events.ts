import type { ScopeAggregates } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import type { HexCell, HexResolution } from "@/lib/hex/types";
import type {
  LoadDataResponseMessage,
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "@/lib/listings";

/**
 * Events the worker machine handles: requests *in* from the current city machine
 * (`WORKER.REQUEST_*`) and raw responses *up* from the invoked transport child
 * (`TRANSPORT.*`). The worker is a session-lifetime actor shared across cities,
 * so every request carries the city + snapshot it is for; the worker routes responses back
 * to `system.get("city")` and the city drops any whose slug ≠ its own. The events
 * the machine sends out — `WORKER.FETCH_*` / `WORKER.PROCESS_*` — are declared in
 * city/events.ts because city consumes them.
 */

// --- requests from the city machine (via sendTo) ---

/** Ensure a city's listings are loaded (a cache hit responses near-instantly). */
export interface WorkerRequestLoad {
  readonly type: "WORKER.REQUEST_LOAD";
  readonly slug: string;
  readonly snapshotId: string;
  readonly assetUrl: string;
}

export interface WorkerRequestHexes {
  readonly type: "WORKER.REQUEST_HEXES";
  readonly slug: string;
  readonly snapshotId: string;
  readonly filters: ListingFilters;
  readonly hexResolution: HexResolution;
}

export interface WorkerRequestAggregates {
  readonly type: "WORKER.REQUEST_AGGREGATES";
  readonly slug: string;
  readonly snapshotId: string;
  readonly neighbourhood: string | null;
  readonly filters: ListingFilters;
  /** The city's price ceiling — caps the histogram (see `computeAggregates`). */
  readonly priceCap: number;
}

/** Abort the in-flight city load only (e.g. an explicitly abandoned load). Cancels
 *  loading and returns the data region to `unloaded`; it does not touch calculation
 *  slots' completed cache. A *different* load replaces the active dataset on its
 *  own, so this is not needed for navigation — only for genuine abandonment. */
export interface WorkerCancelLoad {
  readonly type: "WORKER.CANCEL_LOAD";
}

/** Enter suspended mode: new calculation requests are omitted, and in-flight
 *  responses settle (and cache) without being delivered. Data loading is
 *  unaffected. Sent by the browse leg. */
export interface WorkerSuspend {
  readonly type: "WORKER.SUSPEND";
}

/** Enter active mode: calculation intent is retained or dispatched once data is
 *  loaded. Changes mode only — it does not itself re-dispatch retained targets, so
 *  the analyse leg re-sends its current requests after resuming. */
export interface WorkerResume {
  readonly type: "WORKER.RESUME";
}

// --- responses up from the transport actor ---

export interface TransportLoadResponse {
  readonly type: "TRANSPORT.LOAD_RESPONSE";
  readonly message: LoadDataResponseMessage;
}

/** A calculation result the controller has already decided is current; the machine
 *  routes it (success → PROCESS_RESULT, error → PROCESS_ERROR) to the current city
 *  while active, and drops it while suspended. */
export interface TransportProcessResult {
  readonly type: "TRANSPORT.PROCESS_RESULT";
  readonly response: ProcessResponseMessage;
}

/** Worker-level failure (the `error` event, not a message response) — terminal. */
export interface TransportWorkerError {
  readonly type: "TRANSPORT.WORKER_ERROR";
  readonly error: Error;
}

/** Scene-session reset, fanned from root when navigation leaves `/city`. Returns
 *  the data + mode regions to their initial state and resets the transport's
 *  controller, so a fresh load re-establishes the (now-empty) worker. */
export interface SceneReset {
  readonly type: "SCENE.RESET";
}

export type Events =
  | WorkerRequestLoad
  | WorkerRequestHexes
  | WorkerRequestAggregates
  | WorkerCancelLoad
  | WorkerSuspend
  | WorkerResume
  | TransportLoadResponse
  | TransportProcessResult
  | TransportWorkerError
  | SceneReset;

/** The process types the machine routes by (one parallel region per type). */
export type ProcessType = ProcessRequestMessage["type"];

/** A recompute result, tagged by type so the city routes it to its slab and by
 *  `slug` so the city can stamp which city the result is for (Rule 5.2). */
export type ProcessResult =
  | {
      type: "aggregates";
      payload: ScopeAggregates;
      slug: string;
      snapshotId: string;
    }
  | {
      type: "hexes";
      payload: HexCell[];
      slug: string;
      snapshotId: string;
    };
