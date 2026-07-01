import { stateIn, type GuardArgs } from "xstate";

import type * as Context from "./context";
import type * as Events from "./events";
import { buildRequest } from "./request";

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

/** The slot state a calculation request lands on: whether it targets the loaded
 *  city, has a request already in flight, and matches its slot's cached result.
 *  Null for non-calculation events (the guards then decline). */
function calcSlotState({ context, event }: WorkerGuardArgs) {
  if (
    event.type !== "WORKER.REQUEST_HEXES" &&
    event.type !== "WORKER.REQUEST_AGGREGATES"
  )
    return null;
  const message = buildRequest(event);
  const slot = context.slots[message.type];
  return {
    forLoadedCity: isTheSameCity(context.loadedDataset, message),
    isPending: slot.pendingRequestId !== null,
    cached: slot.lastCompleted?.requestId === message.requestId,
  };
}

/** A slot's retained target, for the DISPATCH_TARGET event that names its type.
 *  Null for other events (the guards then decline). */
function retainedTarget({ context, event }: WorkerGuardArgs) {
  if (event.type !== "DISPATCH_TARGET") return null;
  const slot = context.slots[event.processType];
  return { slot, target: slot.targetRequest };
}

/** The slot a process response lands on, and the latest target it's compared
 *  against. Null for non-response events (the guards then decline). */
function processResponseSlot({ context, event }: WorkerGuardArgs) {
  if (event.type !== "TRANSPORT.PROCESS_RESPONSE") return null;
  const { message } = event;
  const slot = context.slots[message.payload.type];
  return { message, slot, target: slot.targetRequest };
}

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

  // A LOAD for the dataset already in flight / already loaded.
  isCurrentCityLoadingRequest: ({ context, event }: WorkerGuardArgs) =>
    event.type === "WORKER.REQUEST_LOAD" &&
    isTheSameCity(context.requestedDataset, event),

  loadMatchesLoaded: ({ context, event }: WorkerGuardArgs) =>
    event.type === "WORKER.REQUEST_LOAD" &&
    isTheSameCity(context.loadedDataset, event),

  dataLoaded: stateIn({ data: "loaded" }),

  // An idle slot whose latest intent matches its cached result — re-deliver it
  // without a transport round-trip.
  requestServedFromCache: (args: WorkerGuardArgs) => {
    const state = calcSlotState(args);
    return (
      state !== null && state.forLoadedCity && !state.isPending && state.cached
    );
  },

  // An idle slot with fresh work for the loaded city — post it. A pending slot or
  // a request for another city falls through to retaining the target only.
  shouldPostFreshRequest: (args: WorkerGuardArgs) => {
    const state = calcSlotState(args);
    return (
      state !== null && state.forLoadedCity && !state.isPending && !state.cached
    );
  },

  // An idle slot whose retained target matches its cached result — re-deliver it.
  // Checked before dispatch, so a cached target is served rather than reposted.
  targetServedFromCache: (args: WorkerGuardArgs) => {
    const state = retainedTarget(args);
    return (
      state !== null &&
      state.target !== null &&
      state.slot.pendingRequestId === null &&
      state.slot.lastCompleted?.requestId === state.target.requestId
    );
  },

  // An idle slot whose uncached target is for the loaded city — post it. Anything
  // else (pending, no target, cached, or a foreign city) leaves the slot idle.
  shouldPostRetainedTarget: (args: WorkerGuardArgs) => {
    const state = retainedTarget(args);
    return (
      state !== null &&
      state.target !== null &&
      state.slot.pendingRequestId === null &&
      state.slot.lastCompleted?.requestId !== state.target.requestId &&
      isTheSameCity(args.context.loadedDataset, state.target)
    );
  },

  // The reply belongs to the request currently in flight for its slot. A city
  // switch resets the slot without cancelling the worker, so a previous city's
  // recompute can still respond; such a stale reply fails this and is dropped
  // (never settling or reposting the new city's in-flight request).
  responseIsInFlight: (args: WorkerGuardArgs) => {
    const state = processResponseSlot(args);
    return (
      state !== null && state.message.requestId === state.slot.pendingRequestId
    );
  },

  // A response that still matches its slot's latest target — its result is the
  // one the city is waiting for. An outdated response has moved on.
  processResponseIsCurrent: (args: WorkerGuardArgs) => {
    const state = processResponseSlot(args);
    return (
      state !== null &&
      state.target !== null &&
      state.message.requestId === state.target.requestId
    );
  },

  processResponseSucceeded: ({ event }: WorkerGuardArgs) =>
    event.type === "TRANSPORT.PROCESS_RESPONSE" &&
    event.message.status === "success",

  // An outdated response whose latest target is uncached, for the loaded city —
  // so settling it should start that target. Otherwise the slot just settles.
  shouldRepostLatestTarget: (args: WorkerGuardArgs) => {
    const state = processResponseSlot(args);
    if (state === null || state.target === null) return false;
    const { message, slot, target } = state;
    return (
      message.requestId !== target.requestId &&
      slot.lastCompleted?.requestId !== target.requestId &&
      isTheSameCity(args.context.loadedDataset, target)
    );
  },
};
