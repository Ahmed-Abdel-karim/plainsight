import { type ActorRefFrom, setup } from "xstate";

import { workerActions } from "./actions";
import type * as Context from "./context";
import { transportActor } from "./controller/transport-actor";
import type * as Events from "./events";
import { workerGuards } from "./guards";
import type * as Input from "./input";

/**
 * Worker machine — a **session-lifetime** actor invoked by the root alongside the
 * spawned map/ui actors, shared across every city. It invokes the `transport`
 * actor, which owns the raw worker pipe *and* the calculation controller
 * (coalescing, per-type caching, and the hold-until-loaded gate). The machine
 * itself only tracks load lifecycle and gates delivery by mode.
 *
 * Two parallel regions run independently:
 *
 * - **`data`** (`unloaded → loading → loaded`, with `error`) tracks the current
 *   analytics dataset. A *different* load replaces the active dataset; an
 *   *identical* one is deduplicated (while loading) or acknowledged from the
 *   controller's cache (while loaded, no round-trip). On a current-dataset load
 *   success it sends `DATA_READY` so the controller flushes held calculations. A
 *   worker crash is global: it records the failure, enters `error`, and routes a
 *   fatal to the city (the transport actor already reset the controller).
 *
 * - **`mode`** (`suspended ⇄ active`, initial `suspended`) gates calculations.
 *   While `active`, calculation requests are forwarded to the controller and
 *   delivered results are routed to the current city. While `suspended`, both are
 *   omitted — the controller keeps caching, so resuming re-requests serve from
 *   cache. Data loading is independent of mode.
 *
 * The worker is shared, so the slug + snapshot ride on every request; the
 * controller drops replies that no longer match, and the city drops any result
 * whose identity is not its own.
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
  }),
  invoke: {
    id: "transport",
    src: "transport",
    input: {},
  },
  // Scene-session reset fanned from root (navigation left `/city`): return both
  // regions to their initial state and reset the transport controller, so a
  // fresh `WORKER.REQUEST_LOAD` on re-show performs a real load (the re-created
  // worker thread holds nothing) rather than a stale dedupe/cached ack.
  on: {
    // Not `reenter: true`: re-entering the parallel root would restart the
    // invoked `transport`, and `sendReset` targets it — we reset the controller
    // in place instead. The region targets alone return data/mode to initial.
    "SCENE.RESET": {
      target: [".data.unloaded", ".mode.suspended"],
      actions: ["clearDatasets", "sendReset"],
    },
  },
  type: "parallel",
  states: {
    // Tracks the current analytics dataset, independent of mode.
    data: {
      on: {
        "TRANSPORT.WORKER_ERROR": {
          target: ".error",
          actions: [
            "captureWorkerError",
            "recordFatalError",
            "routeWorkerFatal",
          ],
        },
      },
      initial: "unloaded",
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
            "WORKER.REQUEST_LOAD": {
              guard: "isNewCityLoadingRequest",
              actions: ["cancelTransportLoad", "sendLoadDataRequest"],
            },
            "WORKER.CANCEL_LOAD": {
              target: "unloaded",
              actions: ["cancelTransportLoad", "clearRequestedCityData"],
            },
            "TRANSPORT.LOAD_RESPONSE": [
              {
                guard: "loadSucceeded",
                target: "loaded",
                actions: ["markLoaded", "routeLoadOk", "sendDataReady"],
              },
              {
                guard: "loadFailed",
                target: "error",
                actions: ["recordLoadError", "routeLoadError"],
              },
            ],
          },
        },
        loaded: {
          on: {
            "WORKER.REQUEST_LOAD": [
              {
                guard: "loadMatchesLoaded",
                actions: ["ackCachedLoad"],
              },
              {
                target: "loading",
                actions: ["sendLoadDataRequest"],
              },
            ],
          },
        },
        error: {
          on: {
            "WORKER.REQUEST_LOAD": {
              target: "loading",
              actions: "sendLoadDataRequest",
            },
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
          },
        },
        active: {
          on: {
            "WORKER.SUSPEND": { target: "suspended" },
            "WORKER.REQUEST_HEXES": { actions: "forwardCalcRequest" },
            "WORKER.REQUEST_AGGREGATES": { actions: "forwardCalcRequest" },
            "TRANSPORT.PROCESS_RESULT": { actions: "routeProcessResult" },
          },
        },
      },
    },
  },
});

export type WorkerMachineRef = ActorRefFrom<typeof workerMachine>;
