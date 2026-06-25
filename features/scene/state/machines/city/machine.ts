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
  stateIn,
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
import { queryKey, resolveQuery, type ListingQuery } from "@/lib/listings";
import { type Lens } from "@/lib/search-params";

import { createEventAssigner } from "../utils";
import { SystemId } from "../constants";
import type { UiMachineActor } from "../ui/machine";
import type { WorkerMachineRef } from "../worker/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

const assignFromEvent = createEventAssigner<Context.Context, Events.Events>();

/** Quiet window after the last price-slider tick before a recompute is issued, so
 *  a drag coalesces into one worker request. */
const PRICE_RECOMPUTE_MS = 250;

/** The session worker, typed so payload-bearing requests type-check (an untyped
 *  `system.get` ref only accepts bare `{ type }` events). It is invoked by the
 *  root for the whole session, so it always exists while a city is running. */
const toWorker = ({ system }: { system: { get: (id: string) => unknown } }) =>
  system.get(SystemId.WORKER) as WorkerMachineRef;

/** The city's current selection resolved into a `{ neighbourhood, filters }`
 *  query — the single input the worker aggregates request and its dedupe key both
 *  derive from, so the request and the staleness check can never drift apart. */
const cityQuery = (context: Context.Context): ListingQuery =>
  resolveQuery(context.filter, priceBounds(context.framing));

/** The worker aggregates request for the city's current query. */
const aggregatesRequest = (context: Context.Context) => {
  const query = cityQuery(context);
  return {
    type: "WORKER.REQUEST_AGGREGATES",
    slug: context.framing!.slug,
    snapshotId: context.framing!.snapshotId,
    neighbourhood: query.neighbourhood,
    filters: query.filters,
    priceCap: context.framing!.priceCap,
  } as const;
};

/** The map owns `hexResolution` (single source of truth); read it at send time
 *  rather than duplicating it in city context. */
const hexResolutionOf = (system: {
  get: (id: string) => unknown;
}): HexResolution => {
  const map = system.get(SystemId.MAP) as
    | { getSnapshot: () => { context: { hexResolution?: HexResolution } } }
    | undefined;
  return map?.getSnapshot().context.hexResolution ?? 6;
};

/** The worker hexes request for the city's current filters at a resolution. */
const hexesRequest = (context: Context.Context, resolution: HexResolution) =>
  ({
    type: "WORKER.REQUEST_HEXES",
    slug: context.framing!.slug,
    snapshotId: context.framing!.snapshotId,
    filters: resolveFilters(context.filter, priceBounds(context.framing)),
    hexResolution: resolution,
  }) as const;

/** Stable signature of the hex inputs — resolved filters + the bucketed
 *  `HexResolution` (not raw zoom). The hex request and its staleness check both
 *  derive from this, so they can never drift apart; a zoom out-and-back within the
 *  same resolution band yields the same key and skips a redundant recompute. */
const hexesKey = (
  context: Context.Context,
  resolution: HexResolution,
): string => {
  const filters = resolveFilters(context.filter, priceBounds(context.framing));
  return JSON.stringify({
    roomTypes: [...filters.roomTypes].sort(),
    priceRange: filters.priceRange,
    resolution,
  });
};

export const cityMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
    emitted: {} as Events.Emitted,
  },
  actors: {
    // Readiness gate for the browse lens: awaits the points tier (an instant hit
    // once the nav prefetch has warmed it) so `loading → ready` can resume the
    // scene. The resolved collection is discarded — the UI reads points via
    // useBrowsePoints. Placeholder so the machine has no React / data dependency;
    // the real loader (closured over the app QueryClient) is injected at the
    // provider boundary — see shared/browse-points-query.
    ensureBrowseReady: fromPromise<
      BrowseCollection,
      { slug: string; snapshotId: string }
    >(() => {
      throw new Error("ensureBrowseReady actor not provided");
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
    // All-selected collapses to the canonical [] (see lib/filters/normalize).
    assignRoomTypes: assignFromEvent(
      "FILTER.SET_ROOM_TYPES",
      "filter",
      (event, context) => ({
        ...context.filter,
        roomTypes: normalizeRoomTypes(event.roomTypes),
      }),
    ),
    // Full-bounds selection collapses to null so the URL layer can drop the
    // `price` param (see lib/filters/normalize).
    assignPriceRange: assignFromEvent(
      "FILTER.SET_PRICE_RANGE",
      "filter",
      (event, context) => ({
        ...context.filter,
        priceRange: normalizePriceRange(
          event.priceRange,
          priceBounds(context.framing),
        ),
      }),
    ),
    assignNbhd: assignFromEvent(
      "FILTER.SET_NBHD",
      "filter",
      (event, context) => ({
        ...context.filter,
        nbhd: event.nbhd,
      }),
    ),
    // Guard in transitions ensures result.type === "hexes" when this fires.
    assignHexCells: assignFromEvent(
      "WORKER.PROCESS_RESULT",
      "hexCells",
      (event) => event.result.payload as HexCell[],
    ),
    assignAggregates: assignFromEvent(
      "WORKER.PROCESS_RESULT",
      "aggregates",
      (event) => event.result.payload as ScopeAggregates,
    ),

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
    // Sends the request AND records the signature it was issued for, so
    // `requestHexesIfStale` can later tell whether a recompute is needed.
    requestHexes: enqueueActions(({ context, system, enqueue }) => {
      const resolution = hexResolutionOf(system);
      enqueue.sendTo(toWorker({ system }), hexesRequest(context, resolution));
      enqueue.assign({ hexesFilterKey: hexesKey(context, resolution) });
    }),
    // Entry-time variant: recompute only if absent or the inputs (filters or the
    // resolution band) changed since — e.g. a filter or zoom moved while in the
    // browse leg, which doesn't recompute.
    requestHexesIfStale: enqueueActions(({ context, system, enqueue }) => {
      const resolution = hexResolutionOf(system);
      const key = hexesKey(context, resolution);
      if (context.hexCells !== null && context.hexesFilterKey === key) return;
      enqueue.sendTo(toWorker({ system }), hexesRequest(context, resolution));
      enqueue.assign({ hexesFilterKey: key });
    }),
    // Sends the request AND records the signature it was issued for, so
    // `requestAggregatesIfStale` can later tell whether a recompute is needed.
    requestAggregates: enqueueActions(({ context, system, enqueue }) => {
      enqueue.sendTo(toWorker({ system }), aggregatesRequest(context));
      enqueue.assign({ aggregatesFilterKey: queryKey(cityQuery(context)) });
    }),
    // Entry-time variant: recompute only if absent or the query changed since
    // (e.g. a filter/scope set while in the browse leg, which doesn't recompute).
    requestAggregatesIfStale: enqueueActions(({ context, system, enqueue }) => {
      if (
        context.aggregates !== null &&
        context.aggregatesFilterKey === queryKey(cityQuery(context))
      )
        return;
      enqueue.sendTo(toWorker({ system }), aggregatesRequest(context));
      enqueue.assign({ aggregatesFilterKey: queryKey(cityQuery(context)) });
    }),

    // Price drags arrive per-tick (the slider is machine-controlled); assign each
    // immediately for a smooth slider, but defer the recompute — re-arm a single
    // delayed FILTER.PRICE_SETTLED, cancelling the prior one, so a drag fires one
    // worker request once it settles.
    debouncePriceRecompute: enqueueActions(({ enqueue }) => {
      enqueue.cancel("price-settle");
      enqueue.raise(
        { type: "FILTER.PRICE_SETTLED" },
        { id: "price-settle", delay: PRICE_RECOMPUTE_MS },
      );
    }),
    cancelPriceRecompute: enqueueActions(({ enqueue }) =>
      enqueue.cancel("price-settle"),
    ),

    // Abort any in-flight recompute the worker still holds for this city — fired
    // when the analyse leg is left (→ browse) or the city is replaced, so the
    // worker doesn't keep computing a result no one will use.
    cancelWorker: sendTo(toWorker, { type: "WORKER.CANCEL" as const }),

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
    emitWorkerFatal: emit({ type: "city.error", kind: "worker" } as const),

    // Notify the coordinator only; root translates CITY.READY → RESUME for
    // map + ui. City stays decoupled from the other machines.
    notifyCityReady: enqueueActions(({ system, enqueue }) => {
      const root = system.get(SystemId.ROOT);
      if (root) enqueue.sendTo(root, { type: "CITY.READY" });
    }),

    // Terminal failure counterpart. A load that never converges must still end
    // the navigation window, or map/ui stay suppressed — root resumes them on
    // CITY.FAILED. The toast (emitLoadError) tells the user what failed.
    notifyCityFailed: enqueueActions(({ system, enqueue }) => {
      const root = system.get(SystemId.ROOT);
      if (root) enqueue.sendTo(root, { type: "CITY.FAILED" });
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
    // A worker-thread crash is terminal regardless of lens or substate (loading
    // or ready) — route to whichever leg's error state so the scene un-suppresses
    // and the user is told analysis is unavailable.
    "WORKER.FATAL_ERROR": [
      {
        guard: stateIn(".browse"),
        target: ".browse.error",
        actions: "emitWorkerFatal",
      },
      {
        target: ".analyse.error",
        actions: "emitWorkerFatal",
      },
    ],
  },
  states: {
    deciding: {
      // check the relevant initial state based on the Lens
      entry: "raiseInitialLens",
    },
    browse: {
      initial: "loading",
      states: {
        loading: {
          invoke: {
            id: "ensureBrowseReady",
            src: "ensureBrowseReady",
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
      // Leaving analyse (→ browse) — cancel the recomputes browse won't use, plus
      // any pending price-settle so a late drag can't recompute after we've left.
      exit: ["cancelWorker", "cancelPriceRecompute"],
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
            "requestHexesIfStale",
            "requestAggregatesIfStale",
          ],
          on: {
            "FILTER.SET_ROOM_TYPES": {
              actions: ["assignRoomTypes", "requestHexes", "requestAggregates"],
            },
            "FILTER.SET_PRICE_RANGE": {
              actions: ["assignPriceRange", "debouncePriceRecompute"],
            },
            "FILTER.PRICE_SETTLED": {
              actions: ["requestHexes", "requestAggregates"],
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
