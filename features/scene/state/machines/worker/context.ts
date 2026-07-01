import type { ProcessRequestMessage } from "@/lib/listings";

import type { ProcessResult, ProcessType } from "./events";

/** The city + snapshot a load is for. Identity is content-derived, not a counter,
 *  so a request and its response match by equality. */
export interface DatasetIdentity {
  readonly slug: string;
  readonly snapshotId: string;
}

/**
 * One calculation type's bounded coordination slot.
 *
 * `targetRequest` is the latest intent for this type (newest wins, so a burst
 * collapses to one). `isPending` is true while a transport request is in flight —
 * at most one per type; new intent replaces only `targetRequest` until that
 * response settles. `lastCompleted` is the Layer-1 cache: the last successful
 * result with the content `requestId` it was computed for, so an identical
 * request re-delivers without a worker round-trip. The id includes city identity,
 * so an entry from a previous city never falsely matches.
 */
export interface ProcessSlot {
  targetRequest: ProcessRequestMessage | null;
  isPending: boolean;
  lastCompleted: { requestId: string; result: ProcessResult } | null;
}

/**
 * Worker machine context.
 *
 * The data region tracks the `requestedDataset` (identity of the load in flight or
 * settled), the `loadedDataset` (identity of the rows available for calculation),
 * and the latest load `error`. `slots` holds one `ProcessSlot` per calculation
 * type. There is no counter and no ambient slug — identity rides on each request
 * via its content-derived `requestId` (see `requestKey`).
 */
export interface Context {
  requestedDataset: DatasetIdentity | null;
  loadedDataset: DatasetIdentity | null;
  error: Error | null;
  slots: Record<ProcessType, ProcessSlot>;
}

/** A fresh, idle slot: no target, not pending, no cached result. */
export function emptySlot(): ProcessSlot {
  return { targetRequest: null, isPending: false, lastCompleted: null };
}
