import * as Sentry from "@sentry/nextjs";
import { type ActorRefFrom, assertEvent, enqueueActions, setup } from "xstate";

import type { ProcessRequestMessage } from "@/lib/listings";

import type { CityMachineActor } from "../city/machine";
import { SystemId } from "../constants";
import type * as Context from "./context";
import type * as Events from "./events";
import type { ProcessResult } from "./events";
import type * as Input from "./input";
import { transportActor } from "./transport";

/**
 * Worker machine — a **session-lifetime** actor invoked by the root (sibling of
 * map/ui), shared across every city. It is a flat request-router with no per-city
 * lifecycle of its own: that lives in the city machine. It invokes a thin
 * `transport` child for the raw `postMessage` pipe.
 *
 * Coalescing is modelled directly as state. Each process type (`hexes`,
 * `aggregates`) is its own parallel region with two states — `idle` and `busy`.
 * A request while `busy` cancels the in-flight task and starts the new one, so
 * only the latest request runs. Each request carries a monotonic `requestId`; the
 * worker echoes it, and a region drops any reply whose id ≠ the one it last
 * issued (the dead reply of a cancelled task that raced the abort).
 *
 * Because it is shared, the slug rides on every request; the worker routes replies
 * to whichever city is current (`system.get(SystemId.CITY)`), and that city drops
 * any reply whose slug ≠ its own. Loads are on-demand per slug — the underlying
 * Web Worker's TanStack Query cache returns a previously-visited city's rows
 * instantly, so revisiting a city is a fast `postMessage` round-trip, not a refetch.
 */

/** Build the stamped wire request for a hex recompute. */
function buildHexes(
  event: Events.WorkerRequestHexes,
  requestId: number,
): ProcessRequestMessage {
  return {
    type: "hexes",
    params: { filters: event.filters, resolution: event.hexResolution },
    slug: event.slug,
    snapshotId: event.snapshotId,
    requestId,
  };
}

/** Build the stamped wire request for an aggregates recompute. */
function buildAggregates(
  event: Events.WorkerRequestAggregates,
  requestId: number,
): ProcessRequestMessage {
  return {
    type: "aggregates",
    params: {
      neighbourhood: event.neighbourhood,
      filters: event.filters,
      priceCap: event.priceCap,
    },
    slug: event.slug,
    snapshotId: event.snapshotId,
    requestId,
  };
}

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
    // The reply belongs to this region's current request (right type, and the id
    // the region last issued). A stale id is a cancelled task's raced reply.
    hexesCurrent: ({ context, event }) =>
      event.type === "TRANSPORT.PROCESS_REPLY" &&
      event.message.payload.type === "hexes" &&
      event.message.requestId === context.hexesId,
    aggregatesCurrent: ({ context, event }) =>
      event.type === "TRANSPORT.PROCESS_REPLY" &&
      event.message.payload.type === "aggregates" &&
      event.message.requestId === context.aggregatesId,
  },
  actions: {
    // Ensure a city's listings are loaded; the Web Worker replies fast on a hit.
    requestLoad: enqueueActions(({ event, enqueue }) => {
      assertEvent(event, "WORKER.REQUEST_LOAD");
      enqueue.sendTo("transport", {
        type: "LOAD",
        slug: event.slug,
        snapshotId: event.snapshotId,
        assetUrl: event.assetUrl,
      });
    }),

    startHexes: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, "WORKER.REQUEST_HEXES");
      const requestId = context.nextRequestId;
      enqueue.assign({ nextRequestId: requestId + 1, hexesId: requestId });
      enqueue.sendTo("transport", {
        type: "POST",
        message: buildHexes(event, requestId),
      });
    }),
    cancelHexes: enqueueActions(({ context, enqueue }) => {
      enqueue.sendTo("transport", {
        type: "CANCEL",
        requestId: context.hexesId,
      });
    }),

    startAggregates: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, "WORKER.REQUEST_AGGREGATES");
      const requestId = context.nextRequestId;
      enqueue.assign({ nextRequestId: requestId + 1, aggregatesId: requestId });
      enqueue.sendTo("transport", {
        type: "POST",
        message: buildAggregates(event, requestId),
      });
    }),
    cancelAggregates: enqueueActions(({ context, enqueue }) => {
      enqueue.sendTo("transport", {
        type: "CANCEL",
        requestId: context.aggregatesId,
      });
    }),
    // Abort the in-flight city load, keeping any cached rows (see the worker's
    // `cancelLoad` handler). No id to track — at most one load is in flight.
    cancelLoad: enqueueActions(({ enqueue }) => {
      enqueue.sendTo("transport", { type: "CANCEL_LOAD" });
    }),

    // The current reply landed (guarded): route success/error to the current city
    // (slug-stamped so a city we've since navigated away from drops it).
    deliverReply: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.PROCESS_REPLY");
      const city = system.get(SystemId.CITY) as CityMachineActor | undefined;
      if (!city) return;
      const { message } = event;
      if (message.status === "success") {
        enqueue.sendTo(city, {
          type: "WORKER.PROCESS_RESULT",
          result: {
            type: message.payload.type,
            payload: message.payload.data,
            slug: message.slug,
            snapshotId: message.snapshotId,
          } as ProcessResult,
        });
      } else {
        enqueue.sendTo(city, {
          type: "WORKER.PROCESS_ERROR",
          slug: message.slug,
          snapshotId: message.snapshotId,
          processType: message.payload.type,
          error: message.payload.error,
        });
      }
    }),

    // Load finished — route FETCH_OK/ERROR to the current city.
    routeLoadReply: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.LOAD_REPLY");
      const city = system.get(SystemId.CITY) as CityMachineActor | undefined;
      if (!city) return;
      const { message } = event;
      if (message.status === "success") {
        enqueue.sendTo(city, {
          type: "WORKER.FETCH_OK",
          slug: message.slug,
          snapshotId: message.snapshotId,
          count: message.payload.data.count,
        });
      } else {
        enqueue.sendTo(city, {
          type: "WORKER.FETCH_ERROR",
          slug: message.slug,
          snapshotId: message.snapshotId,
          error: message.payload.error,
        });
      }
    }),

    // Worker-thread crash — terminal for the current city in any lens/substate.
    // Stamp it with the city's own slug so its guard accepts it, and report to
    // Sentry: unlike a handled fetch/process rejection this is a genuine crash,
    // and it bypasses the React error boundaries that own every other capture.
    routeWorkerError: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.WORKER_ERROR");
      Sentry.captureException(event.error, { tags: { boundary: "worker" } });
      const city = system.get(SystemId.CITY) as CityMachineActor | undefined;
      if (!city) return;
      const slug = city.getSnapshot().context.framing?.slug ?? "";
      const snapshotId = city.getSnapshot().context.framing?.snapshotId ?? "";
      enqueue.sendTo(city, {
        type: "WORKER.FATAL_ERROR",
        slug,
        snapshotId,
        error: event.error,
      });
    }),
  },
}).createMachine({
  id: "worker",
  type: "parallel",
  context: () => ({ nextRequestId: 1, hexesId: 0, aggregatesId: 0 }),
  // The transport runs for the worker's whole (session) lifetime; it spawns the
  // Web Worker but loads nothing until a city asks.
  invoke: {
    id: "transport",
    src: "transport",
    input: {},
  },
  on: {
    "TRANSPORT.WORKER_ERROR": { actions: "routeWorkerError" },
  },
  states: {
    // Load is its own region — stateless routing plus a cancel that, as a
    // sibling of hexes/aggregates, also fires on a shared WORKER.CANCEL. The city
    // machine owns the loading/ready/error lifecycle, so there's no state here.
    load: {
      on: {
        "WORKER.REQUEST_LOAD": { actions: "requestLoad" },
        "TRANSPORT.LOAD_REPLY": { actions: "routeLoadReply" },
        "WORKER.CANCEL": { actions: "cancelLoad" },
      },
    },
    hexes: {
      initial: "idle",
      states: {
        idle: {
          on: {
            "WORKER.REQUEST_HEXES": { target: "busy", actions: "startHexes" },
          },
        },
        busy: {
          on: {
            "WORKER.REQUEST_HEXES": {
              actions: ["cancelHexes", "startHexes"],
            },
            "WORKER.CANCEL": { target: "idle", actions: "cancelHexes" },
            "TRANSPORT.PROCESS_REPLY": {
              guard: "hexesCurrent",
              target: "idle",
              actions: "deliverReply",
            },
          },
        },
      },
    },
    aggregates: {
      initial: "idle",
      states: {
        idle: {
          on: {
            "WORKER.REQUEST_AGGREGATES": {
              target: "busy",
              actions: "startAggregates",
            },
          },
        },
        busy: {
          on: {
            "WORKER.REQUEST_AGGREGATES": {
              actions: ["cancelAggregates", "startAggregates"],
            },
            "WORKER.CANCEL": { target: "idle", actions: "cancelAggregates" },
            "TRANSPORT.PROCESS_REPLY": {
              guard: "aggregatesCurrent",
              target: "idle",
              actions: "deliverReply",
            },
          },
        },
      },
    },
  },
});

export type WorkerMachineRef = ActorRefFrom<typeof workerMachine>;
