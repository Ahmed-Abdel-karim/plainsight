import {
  type ActorRefFrom,
  and,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  fromPromise,
  sendTo,
  setup,
} from "xstate";

import type { BrowseCollection, ScopeAggregates } from "@/data/contract";
import { cityAssetUrl } from "@/features/scene/shared/city-asset-url";
import {
  normalizePriceRange,
  normalizeRoomTypes,
  priceBounds,
  resolveFilters,
} from "@/lib/filters/normalize";
import type { HexCell, HexResolution } from "@/lib/hex/types";
import { scopeFromNbhd, type Lens } from "@/lib/search-params";

import { SystemId } from "../constants";
import type { UiMachineActor } from "../ui/machine";
import type { WorkerMachineRef } from "../worker/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

/** The session worker, typed so payload-bearing requests type-check (an untyped
 *  `system.get` ref only accepts bare `{ type }` events). It is invoked by the
 *  root for the whole session, so it always exists while a city is running. */
const toWorker = ({ system }: { system: { get: (id: string) => unknown } }) =>
  system.get(SystemId.WORKER) as WorkerMachineRef;

/** Signature of the inputs an aggregates request depends on (resolved filters +
 *  scope). Built from explicit, order-stable fields — `roomTypes` is sorted so a
 *  reordered-but-equal selection still matches. Used to skip a redundant
 *  recompute when nothing changed. */
const aggregatesRequestKey = (context: Context.Context) => {
  const filters = resolveFilters(context.filter, priceBounds(context.framing));
  return JSON.stringify({
    scope: scopeFromNbhd(context.filter.nbhd),
    roomTypes: [...filters.roomTypes].sort(),
    priceRange: filters.priceRange,
  });
};

/** The worker aggregates request for the city's current scope + filters. */
const aggregatesRequest = (context: Context.Context) =>
  ({
    type: "WORKER.REQUEST_AGGREGATES",
    slug: context.framing!.slug,
    snapshotId: context.framing!.snapshotId,
    scope: scopeFromNbhd(context.filter.nbhd),
    filters: resolveFilters(context.filter, priceBounds(context.framing)),
  }) as const;

export const cityMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
    emitted: {} as Events.Emitted,
  },
  actors: {
    // Loads the Browse points tier. A placeholder so the machine has no React /
    // data dependency; the real one (closured over the app QueryClient) is
    // injected at the provider boundary — see shared/browse-points-query.
    loadBrowsePoints: fromPromise<
      BrowseCollection,
      { slug: string; snapshotId: string }
    >(() => {
      throw new Error("loadBrowsePoints actor not provided");
    }),
  },
  guards: {
    // The worker is shared across cities; drop a reply addressed to a slug we've
    // since navigated away from (Rule 5.3). FETCH_* and PROCESS_ERROR carry
    // `slug`/`snapshotId` at the top level; PROCESS_RESULT carries it on `result`.
    fetchIsCurrent: ({ context, event }) =>
      "slug" in event &&
      event.slug === context.framing?.slug &&
      event.snapshotId === context.framing?.snapshotId,
    resultIsCurrent: ({ context, event }) =>
      "result" in event &&
      event.result.slug === context.framing?.slug &&
      event.result.snapshotId === context.framing?.snapshotId,
    resultIsHexes: ({ event }) =>
      "result" in event && event.result.type === "hexes",
    lensIsBrowse: ({ event }) =>
      event.type === "LENS.CHANGED" && event.lens === "browse",
    analyticsLoaded: ({ context }) => context.analyticsLoaded,
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
      snapshotId: context.framing!.snapshotId,
      assetUrl: cityAssetUrl(
        context.framing!.slug,
        context.framing!.snapshotId,
        "analytics",
      ),
    })),
    // hexResolution lives in map (single source of truth); read from its
    // snapshot at send time rather than duplicating it in city context.
    requestHexes: sendTo(toWorker, ({ context, system }) => ({
      type: "WORKER.REQUEST_HEXES" as const,
      slug: context.framing!.slug,
      snapshotId: context.framing!.snapshotId,
      filters: resolveFilters(context.filter, priceBounds(context.framing)),
      hexResolution:
        (system.get(SystemId.MAP)?.getSnapshot()?.context.hexResolution as
          | HexResolution
          | undefined) ?? 6,
    })),
    // Sends the request AND records the signature it was issued for, so
    // `requestAggregatesIfStale` can later tell whether a recompute is needed.
    requestAggregates: enqueueActions(({ context, system, enqueue }) => {
      enqueue.sendTo(toWorker({ system }), aggregatesRequest(context));
      enqueue.assign({ aggregatesFilterKey: aggregatesRequestKey(context) });
    }),
    // Entry-time variant: recompute only if absent or the filter changed since
    // (e.g. a filter set while in the browse leg, which doesn't recompute).
    requestAggregatesIfStale: enqueueActions(({ context, system, enqueue }) => {
      if (
        context.aggregates !== null &&
        context.aggregatesFilterKey === aggregatesRequestKey(context)
      )
        return;
      enqueue.sendTo(toWorker({ system }), aggregatesRequest(context));
      enqueue.assign({ aggregatesFilterKey: aggregatesRequestKey(context) });
    }),

    markAnalyticsLoaded: assign({ analyticsLoaded: true }),

    // Emit semantic failure signals; the scene's notification layer turns these
    // into toasts. Kept here (not coupled to UI) so the machine stays portable.
    emitLoadError: emit({ type: "city.error", kind: "load" } as const),
    emitProcessError: emit(({ event }) => {
      assertEvent(event, "WORKER.PROCESS_ERROR");
      return {
        type: "city.error",
        kind: "process",
        processType: event.processType,
      } as const;
    }),

    notifyCityReady: enqueueActions(({ system, enqueue }) => {
      for (const id of [SystemId.ROOT, SystemId.MAP, SystemId.UI] as const) {
        const ref = system.get(id);
        if (ref) enqueue.sendTo(ref, { type: "CITY.READY" });
      }
    }),

    // Terminal failure counterpart of notifyCityReady. A load that never
    // converges must still end the navigation gate, or root/map/ui stay stuck in
    // their suppressed states. The toast (emitLoadError) tells the user what
    // failed; this leaves them an operable recovery path.
    notifyCityFailed: enqueueActions(({ system, enqueue }) => {
      for (const id of [SystemId.ROOT, SystemId.MAP, SystemId.UI] as const) {
        const ref = system.get(id);
        if (ref) enqueue.sendTo(ref, { type: "CITY.FAILED" });
      }
    }),

    raiseInitialLens: enqueueActions(({ system, enqueue }) => {
      const ui = system.get(SystemId.UI) as UiMachineActor | undefined;
      const lens: Lens = ui?.getSnapshot().context.lens ?? "analyse";
      enqueue.raise({ type: "LENS.CHANGED", lens });
    }),
  },
}).createMachine({
  id: "city",
  context: ({ input }) => ({
    ...Context.Context,
    framing: input.framing,
    filter: input.filter,
  }),
  initial: "deciding",
  on: {
    "LENS.CHANGED": [
      { guard: "lensIsBrowse", target: ".browse", reenter: false },
      { guard: "analyticsLoaded", target: ".analyse.ready", reenter: false },
      { target: ".analyse", reenter: false },
    ],
    "FILTER.SET_ROOM_TYPES": { actions: "assignRoomTypes" },
    "FILTER.SET_PRICE_RANGE": { actions: "assignPriceRange" },
    "FILTER.SET_NBHD": { actions: "assignNbhd" },
    "WORKER.PROCESS_RESULT": [
      {
        guard: and(["resultIsCurrent", "resultIsHexes"]),
        actions: ["assignHexCells"],
      },
      { guard: "resultIsCurrent", actions: ["assignAggregates"] },
    ],
    "WORKER.PROCESS_ERROR": {
      guard: "fetchIsCurrent",
      actions: "emitProcessError",
    },
  },
  states: {
    deciding: {
      entry: "raiseInitialLens",
    },
    browse: {
      initial: "loading",
      states: {
        loading: {
          invoke: {
            id: "loadBrowsePoints",
            src: "loadBrowsePoints",
            input: ({ context }) => ({
              slug: context.framing!.slug,
              snapshotId: context.framing!.snapshotId,
            }),
            onDone: {
              target: "ready",
            },
            onError: { target: "error", actions: "emitLoadError" },
          },
        },
        ready: {
          entry: "notifyCityReady",
        },
        error: {
          entry: "notifyCityFailed",
        },
      },
    },

    analyse: {
      initial: "loading",
      states: {
        loading: {
          entry: "requestLoad",
          on: {
            "WORKER.FETCH_OK": [{ guard: "fetchIsCurrent", target: "ready" }],
            "WORKER.FETCH_ERROR": {
              guard: "fetchIsCurrent",
              target: "error",
              actions: "emitLoadError",
            },
          },
        },
        ready: {
          entry: [
            "markAnalyticsLoaded",
            "notifyCityReady",
            "requestHexes",
            "requestAggregatesIfStale",
          ],
          on: {
            "FILTER.SET_ROOM_TYPES": {
              actions: ["assignRoomTypes", "requestHexes", "requestAggregates"],
            },
            "FILTER.SET_PRICE_RANGE": {
              actions: [
                "assignPriceRange",
                "requestHexes",
                "requestAggregates",
              ],
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
          },
        },
        error: {
          entry: "notifyCityFailed",
        },
      },
    },
  },
});

export type CityMachineActor = ActorRefFrom<typeof cityMachine>;
