import type { GuardArgs } from "xstate";

import type * as Context from "./context";
import type * as Events from "./events";

/** True when `dataset` names the same city + snapshot as `obj`. */
export function isTheSameCity(
  dataset: Context.DatasetIdentity | null,
  obj: { slug: string; snapshotId: string },
): boolean {
  return (
    dataset !== null &&
    dataset.slug === obj.slug &&
    dataset.snapshotId === obj.snapshotId
  );
}

type WorkerGuardArgs = GuardArgs<Context.Context, Events.Events>;

export const workerGuards = {
  // A load response for the dataset we're currently loading, by status.
  loadSucceeded: ({ context, event }: WorkerGuardArgs) =>
    event.type === "TRANSPORT.LOAD_RESPONSE" &&
    event.message.status === "success" &&
    isTheSameCity(context.requestedDataset, event.message),

  loadFailed: ({ context, event }: WorkerGuardArgs) =>
    event.type === "TRANSPORT.LOAD_RESPONSE" &&
    event.message.status === "error" &&
    isTheSameCity(context.requestedDataset, event.message),

  // A LOAD for a different dataset than the one currently loading — replace it.
  // (Same-dataset requests fall through unhandled: a no-op dedupe.)
  isNewCityLoadingRequest: ({ context, event }: WorkerGuardArgs) =>
    event.type === "WORKER.REQUEST_LOAD" &&
    !isTheSameCity(context.requestedDataset, event),

  loadMatchesLoaded: ({ context, event }: WorkerGuardArgs) =>
    event.type === "WORKER.REQUEST_LOAD" &&
    isTheSameCity(context.loadedDataset, event),
};
