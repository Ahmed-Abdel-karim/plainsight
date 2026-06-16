import type { ListingFilters, Scope } from "@/data/types";
import type { HexResolution } from "@/lib/hex/types";

/**
 * Events the worker actor receives — sent from the city machine via sendTo.
 * (The events the worker sends *back* — WORKER.FETCH_OK/ERROR, WORKER.PROCESS_*
 * — are declared in city/events.ts because city is their consumer.)
 */

export interface WorkerRequestHexes {
  readonly type: "WORKER.REQUEST_HEXES";
  readonly filters: ListingFilters;
  readonly hexResolution: HexResolution;
}

export interface WorkerRequestAggregates {
  readonly type: "WORKER.REQUEST_AGGREGATES";
  readonly scope: Scope;
  readonly filters: ListingFilters;
}

export type Events = WorkerRequestHexes | WorkerRequestAggregates;
