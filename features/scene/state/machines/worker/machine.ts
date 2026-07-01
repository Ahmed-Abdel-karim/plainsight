import { type ActorRefFrom, and, setup } from "xstate";

import { workerActions } from "./actions";
import type * as Context from "./context";
import { emptySlot } from "./context";
import type * as Events from "./events";
import { workerGuards } from "./guards";
import type * as Input from "./input";
import { transportActor } from "./transport";

/**
 * Worker machine — a **session-lifetime** actor invoked by the root alongside the
 * spawned map/ui actors, shared across every city. It invokes a thin `transport`
 * child for the raw `postMessage` pipe.
 *
 * Two parallel regions run independently:
 *
 * - **`data`** (`unloaded → loading → loaded`, with `error`) tracks the current
 *   analytics dataset. A *different* load replaces the active dataset; an
 *   *identical* one is deduplicated (while loading) or acknowledged from cache
 *   (while loaded, no round-trip) so a newly spawned city actor need not wait on
 *   data the session worker already holds. `WORKER.CANCEL_LOAD` cancels loading
 *   only; a worker crash is global — it records the failure and enters `error`
 *   while preserving each slot's completed cache for recovery.
 *
 * - **`mode`** (`suspended ⇄ active`, initial `suspended`) gates calculations.
 *   While `active`, each calculation type owns one bounded slot: intent sets the
 *   `targetRequest` (newest wins), at most one transport request is in flight per
 *   type (`pendingRequestId`), a request matching the slot's `lastCompleted` cache
 *   is re-delivered without a round-trip, and an outdated response dispatches the
 *   latest target instead of being delivered. Only the reply matching a slot's
 *   `pendingRequestId` may settle it, so a stale reply from a replaced city (whose
 *   worker was never cancelled) is dropped. While `suspended`, new requests are
 *   omitted and in-flight responses settle (and cache) without delivery.
 *
 * Data loading is independent of mode, so Analyse prefetch can load before the
 * scene is ready. Because the worker is shared, the slug + snapshot ride on every
 * request; the worker routes responses to whichever city is current, and that
 * city drops any response whose identity does not match its own.
 */
export const workerMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actors: {
    transport: transportActor,
  },
  guards: workerGuards,
  actions: workerActions,
}).createMachine({
  id: "worker",
  context: () => ({
    requestedDataset: null,
    loadedDataset: null,
    error: null,
    slots: { hexes: emptySlot(), aggregates: emptySlot() },
  }),
  invoke: {
    id: "transport",
    src: "transport",
    input: {},
  },
  type: "parallel",
  states: {
    // Tracks the current analytics dataset, independent of mode.
    data: {
      initial: "unloaded",
      // A worker crash is global: record + report, settle pending, keep cache.
      on: {
        "TRANSPORT.WORKER_ERROR": {
          target: ".error",
          actions: [
            "captureWorkerError",
            "recordFatalError",
            "settleAllPending",
            "routeWorkerFatal",
          ],
        },
      },
      states: {
        unloaded: {
          on: {
            "WORKER.REQUEST_LOAD": {
              target: "loading",
              actions: "sendLoadDataRequest",
            },
          },
        },
        loading: {
          on: {
            "WORKER.REQUEST_LOAD": [
              {
                guard: "isCurrentCityLoadingRequest",
                actions: () => {
                  // do nothing
                },
              },
              // else
              {
                actions: [
                  "cancelTransportLoad",
                  "resetSlots",
                  "sendLoadDataRequest",
                ],
              },
            ],
            "WORKER.CANCEL_LOAD": {
              target: "unloaded",
              actions: [
                "cancelTransportLoad",
                "clearRequestedCityData",
                "resetSlots",
              ],
            },
            "TRANSPORT.LOAD_RESPONSE": [
              {
                guard: "loadSucceeded",
                target: "loaded",
                actions: ["markLoaded", "routeLoadOk", "raiseDataReady"],
              },
              {
                guard: "loadFailed",
                target: "error",
                actions: [
                  "recordLoadError",
                  "settleAllPending",
                  "routeLoadError",
                ],
              },
              // A response for an outdated identity is omitted (no branch).
            ],
          },
        },
        loaded: {
          on: {
            "WORKER.REQUEST_LOAD": [
              // Identical to the loaded dataset — acknowledge from cache, no
              // transport round-trip (a newly spawned city need not wait).
              { guard: "loadMatchesLoaded", actions: "ackCachedLoad" },
              // Different dataset: reset coordination (keep cache) and load.
              {
                target: "loading",
                actions: ["resetSlots", "sendLoadDataRequest"],
              },
            ],
            // No load is current, so CANCEL_LOAD and load responses are omitted.
          },
        },
        error: {
          on: {
            "WORKER.REQUEST_LOAD": [
              // Same-dataset retry preserves calculation targets.
              {
                guard: "isCurrentCityLoadingRequest",
                target: "loading",
                actions: "sendLoadDataRequest",
              },
              // Different dataset resets coordination first.
              {
                target: "loading",
                actions: ["resetSlots", "sendLoadDataRequest"],
              },
            ],
          },
        },
      },
    },

    // Gates calculations; data loading is unaffected by mode.
    mode: {
      initial: "suspended",
      states: {
        suspended: {
          on: {
            "WORKER.RESUME": { target: "active" },
            "TRANSPORT.PROCESS_RESPONSE": {
              guard: "responseIsInFlight",
              actions: "settleResponse",
            },
          },
        },
        active: {
          on: {
            "WORKER.SUSPEND": { target: "suspended" },
            // Each request first records its slot target (newest wins); the guards
            // then decide whether it also serves from cache, dispatches fresh work,
            // or only holds the target (slot pending, or data not yet loaded).
            "WORKER.REQUEST_HEXES": [
              {
                guard: and(["dataLoaded", "requestServedFromCache"]),
                actions: ["setTarget", "deliverCachedResult"],
              },
              {
                guard: and(["dataLoaded", "shouldPostFreshRequest"]),
                actions: ["setTarget", "postTarget"],
              },
              { actions: "setTarget" },
            ],
            "WORKER.REQUEST_AGGREGATES": [
              {
                guard: and(["dataLoaded", "requestServedFromCache"]),
                actions: ["setTarget", "deliverCachedResult"],
              },
              {
                guard: and(["dataLoaded", "shouldPostFreshRequest"]),
                actions: ["setTarget", "postTarget"],
              },
              { actions: "setTarget" },
            ],
            // Only the reply for the slot's in-flight request (`responseIsInFlight`)
            // is acted on; a stale reply from a previous city matches no branch and
            // is dropped, so it can neither settle nor repost the current request.
            "TRANSPORT.PROCESS_RESPONSE": [
              {
                guard: and([
                  "dataLoaded",
                  "responseIsInFlight",
                  "processResponseIsCurrent",
                  "processResponseSucceeded",
                ]),
                actions: ["clearPending", "cacheResult", "deliverResult"],
              },
              {
                guard: and([
                  "dataLoaded",
                  "responseIsInFlight",
                  "processResponseIsCurrent",
                ]),
                actions: ["clearPending", "deliverProcessError"],
              },
              {
                guard: and([
                  "dataLoaded",
                  "responseIsInFlight",
                  "shouldRepostLatestTarget",
                ]),
                actions: ["clearPending", "flushStoredProcessRequests"],
              },
              {
                guard: and(["dataLoaded", "responseIsInFlight"]),
                actions: "clearPending",
              },
            ],
            "DATA.READY": { actions: "raiseDispatchTargets" },
            // Each retained target: serve from cache, post fresh work, or (no
            // branch) stay idle — pending, cached-and-served, or a foreign city.
            DISPATCH_TARGET: [
              {
                guard: "targetServedFromCache",
                actions: "deliverTargetResult",
              },
              {
                guard: "shouldPostRetainedTarget",
                actions: "flushStoredProcessRequests",
              },
            ],
          },
        },
      },
    },
  },
});

export type WorkerMachineRef = ActorRefFrom<typeof workerMachine>;
