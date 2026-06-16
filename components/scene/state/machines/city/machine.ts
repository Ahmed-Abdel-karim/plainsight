import { type ActorRefFrom, assertEvent, assign, sendTo, setup } from "xstate";

import type { ScopeAggregates } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import type { HexCell, HexResolution } from "@/lib/hex/types";
import { scopeFromNbhd } from "@/lib/search-params";

import { workerActor } from "../worker/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

/** Resolve null priceRange to the city's full range before sending to worker. */
function buildFilters(context: Context.Context): ListingFilters {
  return {
    roomTypes: context.filter.roomTypes,
    priceRange: context.filter.priceRange ?? [
      context.framing!.priceScale.min,
      context.framing!.priceCap,
    ],
  };
}

export const cityMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actors: {
    worker: workerActor,
  },
  actions: {
    // --- filter assigns (inline per Actions convention) ---
    assignRoomTypes: assign({
      filter: ({ context, event }) => {
        assertEvent(event, "FILTER.SET_ROOM_TYPES");
        return { ...context.filter, roomTypes: event.roomTypes };
      },
    }),
    assignPriceRange: assign({
      filter: ({ context, event }) => {
        assertEvent(event, "FILTER.SET_PRICE_RANGE");
        return { ...context.filter, priceRange: event.priceRange };
      },
    }),
    assignNbhd: assign({
      filter: ({ context, event }) => {
        assertEvent(event, "FILTER.SET_NBHD");
        return { ...context.filter, nbhd: event.nbhd };
      },
    }),
    assignHexCells: assign({
      hexCells: ({ event }) => {
        assertEvent(event, "WORKER.PROCESS_RESULT");
        // Guard in transitions ensures result.type === "hexes" when this fires.
        return event.result.payload as HexCell[];
      },
    }),
    assignAggregates: assign({
      aggregates: ({ event }) => {
        assertEvent(event, "WORKER.PROCESS_RESULT");
        return event.result.payload as ScopeAggregates;
      },
    }),

    // --- worker send actions ---
    // hexResolution lives in map (single source of truth); read from its
    // snapshot at send time rather than duplicating it in city context.
    requestHexes: sendTo("worker", ({ context, system }) => ({
      type: "WORKER.REQUEST_HEXES" as const,
      filters: buildFilters(context),
      hexResolution:
        (system.get("map")?.getSnapshot()?.context.hexResolution as
          | HexResolution
          | undefined) ?? 6,
    })),
    requestAggregates: sendTo("worker", ({ context }) => ({
      type: "WORKER.REQUEST_AGGREGATES" as const,
      scope: scopeFromNbhd(context.filter.nbhd),
      filters: buildFilters(context),
    })),

    // --- broadcast city convergence (first hex result landed) ---
    broadcastCityReady: ({ system }) => {
      system.get("root")?.send({ type: "CITY.READY" });
      system.get("map")?.send({ type: "CITY.READY" });
      system.get("ui")?.send({ type: "CITY.READY" });
    },
  },
}).createMachine({
  id: "city",
  context: ({ input }) => ({ ...Context.Context, framing: input.framing }),
  // Worker runs for the full city lifetime (both loading and ready).
  invoke: {
    id: "worker",
    src: "worker",
    input: ({ context }) => ({ slug: context.framing!.slug }),
  },
  initial: "loading",
  states: {
    loading: {
      on: {
        "WORKER.FETCH_OK": { target: "ready" },
        "WORKER.FETCH_ERROR": { target: "error" },
      },
    },

    ready: {
      // Kick off initial hex + aggregate compute as soon as data is loaded.
      entry: ["requestHexes", "requestAggregates"],
      on: {
        "FILTER.SET_ROOM_TYPES": {
          // assign runs first; requestHexes/Aggregates see updated context.
          actions: ["assignRoomTypes", "requestHexes", "requestAggregates"],
        },
        "FILTER.SET_PRICE_RANGE": {
          actions: ["assignPriceRange", "requestHexes", "requestAggregates"],
        },
        // nbhd changes scope only — no effect on hex filters.
        "FILTER.SET_NBHD": {
          actions: ["assignNbhd", "requestAggregates"],
        },
        // Trigger a re-request when zoom changes resolution; value read
        // from map snapshot inside requestHexes, not stored here.
        "MAP.RESOLUTION_CHANGED": {
          actions: ["requestHexes"],
        },
        "WORKER.PROCESS_RESULT": [
          {
            guard: ({ event }) => event.result.type === "hexes",
            actions: ["assignHexCells", "broadcastCityReady"],
          },
          { actions: ["assignAggregates"] },
        ],
        // Informational — last good result stays on screen; no action needed.
        "WORKER.PROCESS_ERROR": {},
      },
    },

    error: {},
  },
});

export type CityMachineActor = ActorRefFrom<typeof cityMachine>;
