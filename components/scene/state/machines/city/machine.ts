import {
  type ActorRefFrom,
  and,
  assertEvent,
  assign,
  enqueueActions,
  sendTo,
  setup,
} from "xstate";

import type { ScopeAggregates } from "@/data/contract";
import {
  normalizePriceRange,
  normalizeRoomTypes,
  priceBounds,
  resolveFilters,
} from "@/lib/filters/normalize";
import type { HexCell, HexResolution } from "@/lib/hex/types";
import { scopeFromNbhd } from "@/lib/search-params";

import type { WorkerMachineRef } from "../worker/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

/** The session worker, typed so payload-bearing requests type-check (an untyped
 *  `system.get` ref only accepts bare `{ type }` events). It is invoked by the
 *  root for the whole session, so it always exists while a city is running. */
const toWorker = ({ system }: { system: { get: (id: string) => unknown } }) =>
  system.get("worker") as WorkerMachineRef;

export const cityMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  guards: {
    // The worker is shared across cities; drop a reply addressed to a slug we've
    // since navigated away from (Rule 5.3). FETCH_* carry `slug`; PROCESS_RESULT
    // carries it on `result`.
    fetchIsCurrent: ({ context, event }) =>
      "slug" in event && event.slug === context.framing?.slug,
    resultIsCurrent: ({ context, event }) =>
      "result" in event && event.result.slug === context.framing?.slug,
    resultIsHexes: ({ event }) =>
      "result" in event && event.result.type === "hexes",
  },
  actions: {
    // --- filter assigns (inline per Actions convention) ---
    assignRoomTypes: assign({
      filter: ({ context, event }) => {
        assertEvent(event, "FILTER.SET_ROOM_TYPES");
        // All-selected collapses to the canonical [] (see lib/filters/normalize).
        return {
          ...context.filter,
          roomTypes: normalizeRoomTypes(event.roomTypes),
        };
      },
    }),
    assignPriceRange: assign({
      filter: ({ context, event }) => {
        assertEvent(event, "FILTER.SET_PRICE_RANGE");
        // Full-bounds selection collapses to null so the URL layer can drop the
        // `price` param (see lib/filters/normalize).
        return {
          ...context.filter,
          priceRange: normalizePriceRange(
            event.priceRange,
            priceBounds(context.framing),
          ),
        };
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

    // --- worker send actions (to the session worker, slug-stamped) ---
    // Ask the worker to ensure this city's listings are loaded; a previously
    // visited city is a cache hit and replies near-instantly.
    requestLoad: sendTo(toWorker, ({ context }) => ({
      type: "WORKER.REQUEST_LOAD" as const,
      slug: context.framing!.slug,
    })),
    // hexResolution lives in map (single source of truth); read from its
    // snapshot at send time rather than duplicating it in city context.
    requestHexes: sendTo(toWorker, ({ context, system }) => ({
      type: "WORKER.REQUEST_HEXES" as const,
      slug: context.framing!.slug,
      filters: resolveFilters(context.filter, priceBounds(context.framing)),
      hexResolution:
        (system.get("map")?.getSnapshot()?.context.hexResolution as
          | HexResolution
          | undefined) ?? 6,
    })),
    requestAggregates: sendTo(toWorker, ({ context }) => ({
      type: "WORKER.REQUEST_AGGREGATES" as const,
      slug: context.framing!.slug,
      scope: scopeFromNbhd(context.filter.nbhd),
      filters: resolveFilters(context.filter, priceBounds(context.framing)),
    })),

    // --- notify city convergence (first hex result landed) ---
    // Declarative (enqueueActions, not a plain function) so it doesn't open an
    // `executingCustomAction` window — an imperative `system.get(...).send()`
    // here made a downstream worker `enqueue.sendTo` spuriously warn. The `if`
    // preserves the old `?.` tolerance for an actor that isn't present yet.
    notifyCityReady: enqueueActions(({ system, enqueue }) => {
      for (const id of ["root", "map", "ui"] as const) {
        const ref = system.get(id);
        if (ref) enqueue.sendTo(ref, { type: "CITY.READY" });
      }
    }),
  },
}).createMachine({
  id: "city",
  context: ({ input }) => ({
    ...Context.Context,
    framing: input.framing,
    filter: input.filter,
  }),
  initial: "loading",
  states: {
    loading: {
      // Ask the session worker to load this city (cache hit → near-instant).
      entry: "requestLoad",
      on: {
        "WORKER.FETCH_OK": { guard: "fetchIsCurrent", target: "ready" },
        "WORKER.FETCH_ERROR": { guard: "fetchIsCurrent", target: "error" },
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
            guard: and(["resultIsCurrent", "resultIsHexes"]),
            actions: ["assignHexCells", "notifyCityReady"],
          },
          { guard: "resultIsCurrent", actions: ["assignAggregates"] },
          // else: a result for a city we've navigated past — dropped.
        ],
        // Informational — last good result stays on screen; no action needed.
        "WORKER.PROCESS_ERROR": {},
      },
    },

    error: {},
  },
});

export type CityMachineActor = ActorRefFrom<typeof cityMachine>;
