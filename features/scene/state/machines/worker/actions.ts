import * as Sentry from "@sentry/nextjs";
import { assertEvent, setup } from "xstate";

import type { ProcessResponseMessage } from "@/lib/listings";

import type { CityMachineActor } from "../city/machine";
import { SystemId } from "../constants";
import type * as Context from "./context";
import type { ProcessSlot } from "./context";
import type * as Events from "./events";
import type { ProcessResult, ProcessType } from "./events";
import { workerGuards } from "./guards";
import type * as Input from "./input";
import { buildRequest } from "./request";
import { transportActor } from "./transport";

const PROCESS_TYPES = ["hexes", "aggregates"] as const;

/** Reset target/in-flight coordination while preserving completed cache. */
function resetCoordination(
  slots: Context.Context["slots"],
): Context.Context["slots"] {
  return {
    hexes: { ...slots.hexes, targetRequest: null, pendingRequestId: null },
    aggregates: {
      ...slots.aggregates,
      targetRequest: null,
      pendingRequestId: null,
    },
  };
}

const withSlot = (
  slots: Context.Context["slots"],
  type: ProcessType,
  slot: ProcessSlot,
): Context.Context["slots"] => ({ ...slots, [type]: slot });

function toResult(message: ProcessResponseMessage): ProcessResult {
  return {
    type: message.payload.type,
    payload: "data" in message.payload ? message.payload.data : undefined,
    slug: message.slug,
    snapshotId: message.snapshotId,
  } as ProcessResult;
}

const cityOf = (system: { get: (id: string) => unknown }) =>
  system.get(SystemId.CITY) as CityMachineActor | undefined;

/** The slot type an already-targeted event acts on: a dispatch's declared type or
 *  a process response's payload type. Null for events without a stored target. */
function slotTypeOf(event: Events.Events): ProcessType | null {
  if (event.type === "DISPATCH_TARGET") return event.processType;
  if (event.type === "TRANSPORT.PROCESS_RESPONSE")
    return event.message.payload.type;
  return null;
}

// This local setup provides strongly typed XState action creators. The machine
// imports the resulting implementations into its own setup declaration.
const actionSetup = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actors: {
    transport: transportActor,
  },
  guards: workerGuards,
});

export const workerActions = {
  sendLoadDataRequest: actionSetup.enqueueActions(({ event, enqueue }) => {
    assertEvent(event, "WORKER.REQUEST_LOAD");
    enqueue.assign({
      requestedDataset: { slug: event.slug, snapshotId: event.snapshotId },
      error: null,
    });
    enqueue.sendTo("transport", {
      type: "LOAD",
      slug: event.slug,
      snapshotId: event.snapshotId,
      assetUrl: event.assetUrl,
    });
  }),

  cancelTransportLoad: actionSetup.sendTo("transport", {
    type: "CANCEL_LOAD",
  }),

  clearRequestedCityData: actionSetup.assign({ requestedDataset: null }),

  resetSlots: actionSetup.assign(({ context }) => ({
    slots: resetCoordination(context.slots),
  })),

  markLoaded: actionSetup.assign(({ event }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    return {
      loadedDataset: {
        slug: event.message.slug,
        snapshotId: event.message.snapshotId,
      },
      error: null,
    };
  }),

  routeLoadOk: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    const city = cityOf(system);
    if (city)
      enqueue.sendTo(city, {
        type: "WORKER.FETCH_OK",
        slug: event.message.slug,
        snapshotId: event.message.snapshotId,
      });
  }),

  routeLoadError: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    if (event.message.status !== "error") return;
    const city = cityOf(system);
    if (city)
      enqueue.sendTo(city, {
        type: "WORKER.FETCH_ERROR",
        slug: event.message.slug,
        snapshotId: event.message.snapshotId,
        error: event.message.payload.error,
      });
  }),

  recordLoadError: actionSetup.assign(({ event }) => {
    assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
    return {
      error:
        event.message.status === "error"
          ? event.message.payload.error
          : new Error("load failed"),
    };
  }),

  settleAllPending: actionSetup.assign(({ context }) => ({
    slots: {
      hexes: { ...context.slots.hexes, pendingRequestId: null },
      aggregates: { ...context.slots.aggregates, pendingRequestId: null },
    },
  })),

  ackCachedLoad: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "WORKER.REQUEST_LOAD");
    const city = cityOf(system);
    if (city)
      enqueue.sendTo(city, {
        type: "WORKER.FETCH_OK",
        slug: event.slug,
        snapshotId: event.snapshotId,
      });
  }),

  raiseDataReady: actionSetup.raise({ type: "DATA.READY" }),

  captureWorkerError: actionSetup.enqueueActions(({ event }) => {
    assertEvent(event, "TRANSPORT.WORKER_ERROR");
    Sentry.captureException(event.error, { tags: { boundary: "worker" } });
  }),

  recordFatalError: actionSetup.assign(({ event }) => {
    assertEvent(event, "TRANSPORT.WORKER_ERROR");
    return { error: event.error };
  }),

  // Tell the current city analysis is unavailable, stamping its own framing so it
  // routes to whichever leg's error state (see city's WORKER.FATAL_ERROR handler).
  routeWorkerFatal: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "TRANSPORT.WORKER_ERROR");
    const city = cityOf(system);
    if (!city) return;
    const framing = city.getSnapshot().context.framing;
    enqueue.sendTo(city, {
      type: "WORKER.FATAL_ERROR",
      slug: framing?.slug ?? "",
      snapshotId: framing?.snapshotId ?? "",
      error: event.error,
    });
  }),

  // Record the latest calculation intent for its slot (newest wins, so a burst
  // collapses to one). The guards decide whether it also dispatches or delivers.
  setTarget: actionSetup.assign(({ context, event }) => {
    assertEvent(event, ["WORKER.REQUEST_HEXES", "WORKER.REQUEST_AGGREGATES"]);
    const message = buildRequest(event);
    const slot = context.slots[message.type];
    return {
      slots: withSlot(context.slots, message.type, {
        ...slot,
        targetRequest: message,
      }),
    };
  }),

  // Post the slot's target to the worker and mark it in flight (at most one per
  // type). Runs after `setTarget`, on the `shouldPostFreshRequest` branch.
  postTarget: actionSetup.enqueueActions(({ context, event, enqueue }) => {
    assertEvent(event, ["WORKER.REQUEST_HEXES", "WORKER.REQUEST_AGGREGATES"]);
    const message = buildRequest(event);
    const slot = context.slots[message.type];
    enqueue.sendTo("transport", { type: "POST", message });
    enqueue.assign({
      slots: withSlot(context.slots, message.type, {
        ...slot,
        pendingRequestId: message.requestId,
      }),
    });
  }),

  // Re-deliver the slot's cached result to the city without a round-trip. Runs
  // after `setTarget`, on the `requestServedFromCache` branch.
  deliverCachedResult: actionSetup.enqueueActions(
    ({ context, event, system, enqueue }) => {
      assertEvent(event, ["WORKER.REQUEST_HEXES", "WORKER.REQUEST_AGGREGATES"]);
      const message = buildRequest(event);
      const cached = context.slots[message.type].lastCompleted;
      const city = cityOf(system);
      if (cached && city)
        enqueue.sendTo(city, {
          type: "WORKER.PROCESS_RESULT",
          result: cached.result,
        });
    },
  ),

  // Mark the response's slot no longer in flight. Every settled response starts
  // here; the guarded branches then cache, deliver, or restart as appropriate.
  // Only reached for the in-flight response (`responseIsInFlight`), so it clears
  // the request it actually settles, not a stale reply's.
  clearPending: actionSetup.assign(({ context, event }) => {
    assertEvent(event, "TRANSPORT.PROCESS_RESPONSE");
    const type = event.message.payload.type;
    const slot = context.slots[type];
    return {
      slots: withSlot(context.slots, type, { ...slot, pendingRequestId: null }),
    };
  }),

  // Cache a successful result under the request it was computed for, so an
  // identical later request re-delivers without a round-trip. Runs after
  // `clearPending`, on the current-success branch.
  cacheResult: actionSetup.assign(({ context, event }) => {
    assertEvent(event, "TRANSPORT.PROCESS_RESPONSE");
    const { message } = event;
    const slot = context.slots[message.payload.type];
    return {
      slots: withSlot(context.slots, message.payload.type, {
        ...slot,
        lastCompleted: {
          requestId: message.requestId,
          result: toResult(message),
        },
      }),
    };
  }),

  deliverResult: actionSetup.enqueueActions(({ event, system, enqueue }) => {
    assertEvent(event, "TRANSPORT.PROCESS_RESPONSE");
    const city = cityOf(system);
    if (city)
      enqueue.sendTo(city, {
        type: "WORKER.PROCESS_RESULT",
        result: toResult(event.message),
      });
  }),

  deliverProcessError: actionSetup.enqueueActions(
    ({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.PROCESS_RESPONSE");
      const { message } = event;
      if (message.status !== "error") return;
      const city = cityOf(system);
      if (city)
        enqueue.sendTo(city, {
          type: "WORKER.PROCESS_ERROR",
          slug: message.slug,
          snapshotId: message.snapshotId,
          processType: message.payload.type,
          error: message.payload.error,
        });
    },
  ),

  // Suspended-mode settle: the in-flight response settles (and caches on success)
  // without delivery. Guarded by `responseIsInFlight`, so a stale reply from a
  // previous city can never clear the current in-flight request.
  settleResponse: actionSetup.assign(({ context, event }) => {
    assertEvent(event, "TRANSPORT.PROCESS_RESPONSE");
    const { message } = event;
    const type = message.payload.type;
    const slot = context.slots[type];
    if (
      message.status === "success" &&
      slot.targetRequest &&
      message.requestId === slot.targetRequest.requestId
    ) {
      return {
        slots: withSlot(context.slots, type, {
          ...slot,
          pendingRequestId: null,
          lastCompleted: {
            requestId: message.requestId,
            result: toResult(message),
          },
        }),
      };
    }
    return {
      slots: withSlot(context.slots, type, { ...slot, pendingRequestId: null }),
    };
  }),

  // Fan DATA.READY out to one DISPATCH_TARGET per type, so each slot's retained
  // target is resolved through the guarded machine branches below.
  raiseDispatchTargets: actionSetup.enqueueActions(({ enqueue }) => {
    for (const type of PROCESS_TYPES)
      enqueue.raise({ type: "DISPATCH_TARGET", processType: type });
  }),

  // Re-deliver a slot's cached result to the city. Runs on the
  // `targetServedFromCache` branch.
  deliverTargetResult: actionSetup.enqueueActions(
    ({ context, event, system, enqueue }) => {
      assertEvent(event, "DISPATCH_TARGET");
      const cached = context.slots[event.processType].lastCompleted;
      const city = cityOf(system);
      if (cached && city)
        enqueue.sendTo(city, {
          type: "WORKER.PROCESS_RESULT",
          result: cached.result,
        });
    },
  ),

  // Post a slot's retained target and mark it in flight. Shared by the DATA.READY
  // dispatch (`shouldPostRetainedTarget`) and the outdated-response repost
  // (`shouldRepostLatestTarget`) — both start the slot's stored target.
  flushStoredProcessRequests: actionSetup.enqueueActions(
    ({ context, event, enqueue }) => {
      const type = slotTypeOf(event);
      const slot = type && context.slots[type];
      if (!slot || !slot.targetRequest) return;
      enqueue.sendTo("transport", {
        type: "POST",
        message: slot.targetRequest,
      });
      enqueue.assign({
        slots: withSlot(context.slots, type, {
          ...slot,
          pendingRequestId: slot.targetRequest.requestId,
        }),
      });
    },
  ),
};
