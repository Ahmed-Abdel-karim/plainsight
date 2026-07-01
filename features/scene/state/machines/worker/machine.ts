import * as Sentry from "@sentry/nextjs";
import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  raise,
  sendTo,
  setup,
  stateIn,
} from "xstate";

import type {
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "@/lib/listings";

import type { CityMachineActor } from "../city/machine";
import { SystemId } from "../constants";
import type * as Context from "./context";
import { emptySlot, type ProcessSlot } from "./context";
import type * as Events from "./events";
import type { ProcessResult, ProcessType } from "./events";
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
 *   type (`isPending`), a request matching the slot's `lastCompleted` cache is
 *   re-delivered without a round-trip, and a superseded response dispatches the
 *   latest target instead of being delivered. While `suspended`, new requests are
 *   omitted and in-flight responses settle (and cache) without delivery.
 *
 * Data loading is independent of mode, so Analyse prefetch can load before the
 * scene is ready. Because the worker is shared, the slug + snapshot ride on every
 * request; the worker routes responses to whichever city is current
 * (`system.get(SystemId.CITY)`), and that city drops any response whose identity
 * ≠ its own.
 */

/** A recompute's `requestId`: a deterministic key over its `[type, slug,
 *  snapshotId, params]` identity, so two requests for the same computation carry
 *  the same id and collapse to one (idempotent), and an outstanding request is
 *  matched to its response by equality rather than a counter. */
function requestKey(
  type: ProcessRequestMessage["type"],
  slug: string,
  snapshotId: string,
  params: ProcessRequestMessage["params"],
): string {
  return JSON.stringify([type, slug, snapshotId, params]);
}

/** Build the stamped wire request for a hex recompute. */
function buildHexes(event: Events.WorkerRequestHexes): ProcessRequestMessage {
  const params = { filters: event.filters, resolution: event.hexResolution };
  return {
    type: "hexes",
    params,
    slug: event.slug,
    snapshotId: event.snapshotId,
    requestId: requestKey("hexes", event.slug, event.snapshotId, params),
  };
}

/** Build the stamped wire request for an aggregates recompute. */
function buildAggregates(
  event: Events.WorkerRequestAggregates,
): ProcessRequestMessage {
  const params = {
    neighbourhood: event.neighbourhood,
    filters: event.filters,
    priceCap: event.priceCap,
  };
  return {
    type: "aggregates",
    params,
    slug: event.slug,
    snapshotId: event.snapshotId,
    requestId: requestKey("aggregates", event.slug, event.snapshotId, params),
  };
}

/** Build the wire request for whichever recompute the event asks for. */
function buildRequest(
  event: Events.WorkerRequestHexes | Events.WorkerRequestAggregates,
): ProcessRequestMessage {
  return event.type === "WORKER.REQUEST_HEXES"
    ? buildHexes(event)
    : buildAggregates(event);
}

const PROCESS_TYPES = ["hexes", "aggregates"] as const;

/** True when `dataset` names the same city + snapshot as `obj`. */
function identityMatches(
  dataset: Context.DatasetIdentity | null,
  obj: { slug: string; snapshotId: string },
): boolean {
  return (
    dataset !== null &&
    dataset.slug === obj.slug &&
    dataset.snapshotId === obj.snapshotId
  );
}

/** Reset each slot's in-flight coordination (target + pending) while preserving
 *  its `lastCompleted` cache — used when a different dataset takes over. */
function resetCoordination(
  slots: Context.Context["slots"],
): Context.Context["slots"] {
  return {
    hexes: { ...slots.hexes, targetRequest: null, isPending: false },
    aggregates: { ...slots.aggregates, targetRequest: null, isPending: false },
  };
}

const withSlot = (
  slots: Context.Context["slots"],
  type: ProcessType,
  slot: ProcessSlot,
): Context.Context["slots"] => ({ ...slots, [type]: slot });

/** Shape a successful process response into the tagged result the city assigns. */
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

export const workerMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actors: {
    transport: transportActor,
  },
  guards: {
    // A load response for the dataset we're currently loading, by status.
    loadSucceeded: ({ context, event }) =>
      event.type === "TRANSPORT.LOAD_RESPONSE" &&
      event.message.status === "success" &&
      identityMatches(context.requestedDataset, event.message),
    loadFailed: ({ context, event }) =>
      event.type === "TRANSPORT.LOAD_RESPONSE" &&
      event.message.status === "error" &&
      identityMatches(context.requestedDataset, event.message),
    // A LOAD for the dataset already in flight / already loaded.
    loadMatchesRequested: ({ context, event }) =>
      event.type === "WORKER.REQUEST_LOAD" &&
      identityMatches(context.requestedDataset, event),
    loadMatchesLoaded: ({ context, event }) =>
      event.type === "WORKER.REQUEST_LOAD" &&
      identityMatches(context.loadedDataset, event),
  },
  actions: {
    // Record the requested dataset and ask transport to load it. A previously
    // visited city is a Web Worker cache hit and responds near-instantly.
    sendLoad: enqueueActions(({ event, enqueue }) => {
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

    // Abort the in-flight city load, keeping any cached rows.
    cancelTransportLoad: sendTo("transport", { type: "CANCEL_LOAD" }),

    clearRequested: assign({ requestedDataset: null }),

    // A different dataset is taking over: drop each slot's in-flight target and
    // pending flag, but keep the completed cache (a revisit re-delivers it).
    resetSlots: assign(({ context }) => ({
      slots: resetCoordination(context.slots),
    })),

    // Rows landed: this is now the loaded dataset.
    markLoaded: assign(({ event }) => {
      assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
      return {
        loadedDataset: {
          slug: event.message.slug,
          snapshotId: event.message.snapshotId,
        },
        error: null,
      };
    }),

    // Route load success/failure to the current city (no `count` — unused).
    routeLoadOk: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
      const city = cityOf(system);
      if (city)
        enqueue.sendTo(city, {
          type: "WORKER.FETCH_OK",
          slug: event.message.slug,
          snapshotId: event.message.snapshotId,
        });
    }),
    routeLoadError: enqueueActions(({ event, system, enqueue }) => {
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

    recordLoadError: assign(({ event }) => {
      assertEvent(event, "TRANSPORT.LOAD_RESPONSE");
      return {
        error:
          event.message.status === "error"
            ? event.message.payload.error
            : new Error("load failed"),
      };
    }),

    // Loading failed / crashed: settle every pending flag but keep targets +
    // completed cache for a later retry.
    settleAllPending: assign(({ context }) => ({
      slots: {
        hexes: { ...context.slots.hexes, isPending: false },
        aggregates: { ...context.slots.aggregates, isPending: false },
      },
    })),

    // Same dataset already loaded: acknowledge a newly spawned city actor from
    // cache without a transport round-trip.
    ackCachedLoad: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "WORKER.REQUEST_LOAD");
      const city = cityOf(system);
      if (city)
        enqueue.sendTo(city, {
          type: "WORKER.FETCH_OK",
          slug: event.slug,
          snapshotId: event.snapshotId,
        });
    }),

    // Once loaded, tell active mode to dispatch any retained calculation targets.
    raiseDataReady: raise({ type: "DATA.READY" as const }),

    // Worker-thread crash — global and terminal for the current city. Report to
    // Sentry (it bypasses the React error boundaries that own every other
    // capture), settle pending flags, and tell the current city analysis is gone.
    recordWorkerError: enqueueActions(({ event, context, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.WORKER_ERROR");
      Sentry.captureException(event.error, { tags: { boundary: "worker" } });
      enqueue.assign({
        error: event.error,
        slots: {
          hexes: { ...context.slots.hexes, isPending: false },
          aggregates: { ...context.slots.aggregates, isPending: false },
        },
      });
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

    calculate: enqueueActions(({ context, event, system, enqueue }) => {
      assertEvent(event, ["WORKER.REQUEST_HEXES", "WORKER.REQUEST_AGGREGATES"]);
      const message = buildRequest(event);
      const type = message.type;
      const slot = context.slots[type];
      const withTarget: ProcessSlot = { ...slot, targetRequest: message };

      if (!identityMatches(context.loadedDataset, message)) {
        enqueue.assign({ slots: withSlot(context.slots, type, withTarget) });
        return;
      }
      if (slot.lastCompleted?.requestId === message.requestId) {
        const city = cityOf(system);
        if (city)
          enqueue.sendTo(city, {
            type: "WORKER.PROCESS_RESULT",
            result: slot.lastCompleted.result,
          });
        enqueue.assign({ slots: withSlot(context.slots, type, withTarget) });
        return;
      }
      if (slot.isPending) {
        enqueue.assign({ slots: withSlot(context.slots, type, withTarget) });
        return;
      }
      enqueue.sendTo("transport", { type: "POST", message });
      enqueue.assign({
        slots: withSlot(context.slots, type, {
          ...withTarget,
          isPending: true,
        }),
      });
    }),

    // Active mode while data is unavailable: retain only the latest intent for
    // this process type. DATA.READY will serve its cache hit or dispatch it once
    // the matching dataset is actually loaded.
    holdCalculation: assign(({ context, event }) => {
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

    // Active mode: a process response landed. If it matches the slot's current
    // target, cache + deliver (success) or deliver the failure, and settle
    // pending. If it's superseded, omit it and either re-post the latest target
    // (data still loaded) or retain it for DATA.READY.
    deliverResponse: enqueueActions(({ context, event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.PROCESS_RESPONSE");
      const { message } = event;
      const type = message.payload.type;
      const slot = context.slots[type];
      const target = slot.targetRequest;
      const city = cityOf(system);

      if (target && message.requestId === target.requestId) {
        if (message.status === "success") {
          const result = toResult(message);
          enqueue.assign({
            slots: withSlot(context.slots, type, {
              ...slot,
              isPending: false,
              lastCompleted: { requestId: message.requestId, result },
            }),
          });
          if (city)
            enqueue.sendTo(city, { type: "WORKER.PROCESS_RESULT", result });
        } else {
          enqueue.assign({
            slots: withSlot(context.slots, type, { ...slot, isPending: false }),
          });
          if (city)
            enqueue.sendTo(city, {
              type: "WORKER.PROCESS_ERROR",
              slug: message.slug,
              snapshotId: message.snapshotId,
              processType: message.payload.type,
              error: message.payload.error,
            });
        }
        return;
      }

      // Superseded: the cached latest target was already delivered when requested.
      if (target && slot.lastCompleted?.requestId === target.requestId) {
        enqueue.assign({
          slots: withSlot(context.slots, type, { ...slot, isPending: false }),
        });
        return;
      }
      // Superseded with data still loaded: post only the latest target, stay busy.
      if (target && identityMatches(context.loadedDataset, target)) {
        enqueue.sendTo("transport", { type: "POST", message: target });
        enqueue.assign({
          slots: withSlot(context.slots, type, { ...slot, isPending: true }),
        });
        return;
      }
      // No target, or data no longer loaded: settle and retain for DATA.READY.
      enqueue.assign({
        slots: withSlot(context.slots, type, { ...slot, isPending: false }),
      });
    }),

    // Suspended mode: settle the response and cache a matching success, but never
    // deliver it and never dispatch replacement work.
    settleResponse: assign(({ context, event }) => {
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
            isPending: false,
            lastCompleted: {
              requestId: message.requestId,
              result: toResult(message),
            },
          }),
        };
      }
      return {
        slots: withSlot(context.slots, type, { ...slot, isPending: false }),
      };
    }),

    // DATA.READY (active only): for every idle slot with a target, deliver a
    // matching cached result or post the target and mark it pending.
    dispatchTargets: enqueueActions(({ context, system, enqueue }) => {
      const city = cityOf(system);
      const slots = { ...context.slots };
      let changed = false;
      for (const type of PROCESS_TYPES) {
        const slot = context.slots[type];
        const target = slot.targetRequest;
        if (!target || slot.isPending) continue;
        if (slot.lastCompleted?.requestId === target.requestId) {
          if (city)
            enqueue.sendTo(city, {
              type: "WORKER.PROCESS_RESULT",
              result: slot.lastCompleted.result,
            });
          continue;
        }
        if (!identityMatches(context.loadedDataset, target)) continue;
        enqueue.sendTo("transport", { type: "POST", message: target });
        slots[type] = { ...slot, isPending: true };
        changed = true;
      }
      if (changed) enqueue.assign({ slots });
    }),
  },
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
          actions: "recordWorkerError",
        },
      },
      states: {
        unloaded: {
          on: {
            "WORKER.REQUEST_LOAD": { target: "loading", actions: "sendLoad" },
          },
        },
        loading: {
          on: {
            "WORKER.REQUEST_LOAD": [
              // Identical load already in flight — deduplicate; its response
              // routes to whichever city is current when it lands.
              { guard: "loadMatchesRequested" },
              // Different dataset: cancel the old load, reset coordination, load.
              {
                actions: ["cancelTransportLoad", "resetSlots", "sendLoad"],
              },
            ],
            "WORKER.CANCEL_LOAD": {
              target: "unloaded",
              actions: ["cancelTransportLoad", "clearRequested", "resetSlots"],
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
              // A response for a superseded identity is omitted (no branch).
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
                actions: ["resetSlots", "sendLoad"],
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
                guard: "loadMatchesRequested",
                target: "loading",
                actions: "sendLoad",
              },
              // Different dataset resets coordination first.
              {
                target: "loading",
                actions: ["resetSlots", "sendLoad"],
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
            "TRANSPORT.PROCESS_RESPONSE": { actions: "settleResponse" },
          },
        },
        active: {
          on: {
            "WORKER.SUSPEND": { target: "suspended" },
            "WORKER.REQUEST_HEXES": [
              {
                guard: stateIn({ data: "loaded" }),
                actions: "calculate",
              },
              { actions: "holdCalculation" },
            ],
            "WORKER.REQUEST_AGGREGATES": [
              {
                guard: stateIn({ data: "loaded" }),
                actions: "calculate",
              },
              { actions: "holdCalculation" },
            ],
            "TRANSPORT.PROCESS_RESPONSE": {
              guard: stateIn({ data: "loaded" }),
              actions: "deliverResponse",
            },
            "DATA.READY": { actions: "dispatchTargets" },
          },
        },
      },
    },
  },
});

export type WorkerMachineRef = ActorRefFrom<typeof workerMachine>;
