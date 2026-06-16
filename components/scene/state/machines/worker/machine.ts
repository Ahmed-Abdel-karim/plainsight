import { type ActorRefFrom, assertEvent, enqueueActions, setup } from "xstate";

import type { ProcessRequestMessage } from "@/lib/listings/worker";

import type { CityMachineActor } from "../city/machine";
import type * as Context from "./context";
import type * as Events from "./events";
import type { ProcessResult } from "./events";
import type * as Input from "./input";
import { Slot } from "./slot";
import { transportActor } from "./transport";

/**
 * Worker machine — a **session-lifetime** actor invoked by the root (sibling of
 * map/ui), shared across every city. It is a flat request-router with no per-city
 * lifecycle of its own: that lives in the city machine. It owns only the per-type
 * coalescing (`Slot` refs) and invokes a thin `transport` child for the raw
 * `postMessage` pipe.
 *
 * Because it is shared, the slug rides on every request; the worker routes replies
 * to whichever city is current (`system.get("city")`), and that city drops any
 * reply whose slug ≠ its own. Loads are on-demand per slug — the underlying Web
 * Worker's TanStack Query cache returns a previously-visited city's rows instantly,
 * so revisiting a city is a fast `postMessage` round-trip, not a refetch.
 */

type RequestEvent = Events.WorkerRequestHexes | Events.WorkerRequestAggregates;

/** Build the stamped wire request for a city request event. */
function buildMessage(event: RequestEvent): ProcessRequestMessage {
  if (event.type === "WORKER.REQUEST_HEXES") {
    return {
      type: "hexes",
      params: { filters: event.filters, resolution: event.hexResolution },
      slug: event.slug,
    };
  }
  return {
    type: "aggregates",
    params: { scope: event.scope, filters: event.filters },
    slug: event.slug,
  };
}

/** Get-or-create the coalescing slot for a process type. */
function slotFor(
  context: Context.Context,
  type: ProcessRequestMessage["type"],
) {
  let slot = context.slots.get(type);
  if (!slot) {
    slot = new Slot();
    context.slots.set(type, slot);
  }
  return slot;
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
  actions: {
    // Ensure a city's listings are loaded; the Web Worker replies fast on a hit.
    requestLoad: enqueueActions(({ event, enqueue }) => {
      assertEvent(event, "WORKER.REQUEST_LOAD");
      enqueue.sendTo("transport", { type: "LOAD", slug: event.slug });
    }),

    // Stash the request (newest wins) then send if the slot is idle. The city
    // only asks for a process after its own FETCH_OK, so the slug is loaded.
    request: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, ["WORKER.REQUEST_HEXES", "WORKER.REQUEST_AGGREGATES"]);
      const message = buildMessage(event);
      const slot = slotFor(context, message.type);
      slot.offer(message);
      const next = slot.take();
      if (next) enqueue.sendTo("transport", { type: "POST", message: next });
    }),

    // Load finished — route FETCH_OK/ERROR to the current city (slug-stamped so a
    // city we've since navigated away from drops it).
    routeLoadReply: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.LOAD_REPLY");
      const city = system.get("city") as CityMachineActor | undefined;
      if (!city) return;
      const { message } = event;
      if (message.status === "success") {
        enqueue.sendTo(city, {
          type: "WORKER.FETCH_OK",
          slug: message.slug,
          count: message.payload.data.count,
        });
      } else {
        enqueue.sendTo(city, {
          type: "WORKER.FETCH_ERROR",
          slug: message.slug,
          error: message.payload.error,
        });
      }
    }),

    // A recompute reply landed: settle the slot and, if it's the latest, route it
    // to the current city; then flush any request queued meanwhile.
    deliverProcess: enqueueActions(({ context, event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.PROCESS_REPLY");
      const { message } = event;
      const slot = context.slots.get(message.payload.type);
      if (!slot) return;
      const city = system.get("city") as CityMachineActor | undefined;
      if (slot.settle() && city) {
        if (message.status === "success") {
          enqueue.sendTo(city, {
            type: "WORKER.PROCESS_RESULT",
            result: {
              type: message.payload.type,
              payload: message.payload.data,
              slug: message.slug,
            } as ProcessResult,
          });
        } else {
          enqueue.sendTo(city, {
            type: "WORKER.PROCESS_ERROR",
            processType: message.payload.type,
            error: message.payload.error,
          });
        }
      }
      const next = slot.take();
      if (next) enqueue.sendTo("transport", { type: "POST", message: next });
    }),

    // Worker-thread crash — terminal for whatever city is loading. Stamp it with
    // the current city's own slug so its FETCH_ERROR guard accepts it.
    routeWorkerError: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "TRANSPORT.WORKER_ERROR");
      const city = system.get("city") as CityMachineActor | undefined;
      if (!city) return;
      const slug = city.getSnapshot().context.framing?.slug ?? "";
      enqueue.sendTo(city, {
        type: "WORKER.FETCH_ERROR",
        slug,
        error: event.error,
      });
    }),
  },
}).createMachine({
  id: "worker",
  context: () => ({ slots: new Map() }),
  // The transport runs for the worker's whole (session) lifetime; it spawns the
  // Web Worker but loads nothing until a city asks.
  invoke: {
    id: "transport",
    src: "transport",
    input: {},
  },
  // Flat — no per-city states; the city machine owns loading/ready/error.
  on: {
    "WORKER.REQUEST_LOAD": { actions: "requestLoad" },
    "WORKER.REQUEST_HEXES": { actions: "request" },
    "WORKER.REQUEST_AGGREGATES": { actions: "request" },
    "TRANSPORT.LOAD_REPLY": { actions: "routeLoadReply" },
    "TRANSPORT.PROCESS_REPLY": { actions: "deliverProcess" },
    "TRANSPORT.WORKER_ERROR": { actions: "routeWorkerError" },
  },
});

export type WorkerMachineRef = ActorRefFrom<typeof workerMachine>;
