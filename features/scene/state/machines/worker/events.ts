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
 * (`WORKER.REQUEST_*`) and raw replies *up* from the invoked transport child
 * (`TRANSPORT.*`). The worker is a session-lifetime actor shared across cities,
 * so every request carries the city + snapshot it is for; the worker routes replies back
 * to `system.get("city")` and the city drops any whose slug ≠ its own. The events
 * the machine sends out — `WORKER.FETCH_*` / `WORKER.PROCESS_*` — are declared in
 * city/events.ts because city consumes them.
 */

// --- requests from the city machine (via sendTo) ---

/** Ensure a city's listings are loaded (a cache hit replies near-instantly). */
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

/** Abort every in-flight recompute (e.g. on a lens or city change): each busy
 *  region cancels its task and returns to idle. Slug-agnostic — it clears whatever
 *  is running, since the work is no longer wanted regardless of which city it was for. */
export interface WorkerCancel {
  readonly type: "WORKER.CANCEL";
}

// --- raw replies from the transport child (a dumb pipe; machine interprets) ---

export interface TransportLoadReply {
  readonly type: "TRANSPORT.LOAD_REPLY";
  readonly message: LoadDataResponseMessage;
}

export interface TransportProcessReply {
  readonly type: "TRANSPORT.PROCESS_REPLY";
  readonly message: ProcessResponseMessage;
}

/** Worker-level failure (the `error` event, not a message reply) — terminal. */
export interface TransportWorkerError {
  readonly type: "TRANSPORT.WORKER_ERROR";
  readonly error: Error;
}

export type Events =
  | WorkerRequestLoad
  | WorkerRequestHexes
  | WorkerRequestAggregates
  | WorkerCancel
  | TransportLoadReply
  | TransportProcessReply
  | TransportWorkerError;

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
