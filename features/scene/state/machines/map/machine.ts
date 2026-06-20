import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  setup,
} from "xstate";
import type { Map as MaplibreMap } from "maplibre-gl";

import { POINTS_SOURCE_ID } from "@/features/scene/map/constants";
import { toBounds, type BBox } from "@/lib/geo";
import type { CityMachineActor } from "../city/machine";
import { SystemId } from "../constants";
import type { UiMachineActor } from "../ui/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

const MAX_BOUNDS_PADDING_RATIO = 0.3;

// --- private helpers (map-specific MapLibre utilities) ---

const getMap = (context: Context.Context) => context.mapRef?.getMap();

const applyBounds = (map: MaplibreMap, bbox: BBox) => {
  map.fitBounds(toBounds(bbox), { animate: false, zoom: 2 });
  map.setMaxBounds(toBounds(bbox, MAX_BOUNDS_PADDING_RATIO));
};

// MapLibre throws if the feature id isn't yet in the source — swallow silently.
const safeSetFeatureState = (
  map: MaplibreMap,
  id: number,
  state: Record<string, boolean>,
) => {
  try {
    map.setFeatureState({ source: POINTS_SOURCE_ID, id }, state);
  } catch {}
};

/**
 * Map machine — DRAFT (see `docs/map-machine-transition-gating.md`).
 *
 * One hierarchical region, the MapLibre instance lifecycle:
 *
 *   loading → ready → error
 *
 * `ready` is refined into two children that make the machine itself the
 * gatekeeper for interaction (rather than relying on the view to gate):
 *
 *   - `interactive` — accepts pointer interactions (SELECT / HOVER / HEX_INSPECT).
 *   - `suppressed`  — a city change is in flight: pointer interactions are
 *     structurally ignored (they aren't wired here) and the old city's
 *     selections are cleared on entry. The view derives the whole transition
 *     treatment from `ready.suppressed` (not from actions): it blanks the data
 *     layers (stale data would misrepresent the already-selected new city), dims
 *     the basemap behind a scrim, shows a loader, and disables map interaction.
 *
 * Why nested, not a parallel `freshness` region: suppression only means anything
 * while `ready` (a `loading`/`error` map paints nothing to suppress), so it is a
 * refinement of `ready`, not an orthogonal lifecycle.
 *
 * Note the event split: events that bring the *new* city in (FIT_BOUNDS fly,
 * SOURCE_LOADED, RESOLUTION_CHANGED) sit on the `ready` parent so they flow in
 * BOTH children; only pointer interactions live on `interactive`. That is what
 * lets `suppressed` reject interaction yet still ingest the incoming city.
 *
 * Readiness-race deferral (option D — reconcile on ready, NOT an event queue):
 * a `MAP.FIT_BOUNDS` arriving while `loading` is coalesced into
 * `context.pendingFitBounds` (last-wins). On entry to `ready`, `applyCurrentStateToMap`
 * flies to any pending bounds and re-applies the current selection/hover from
 * the `ui` actor — so the imperative layer is synced to durable truth once,
 * structurally. This replaces the `useRef` replay gate in
 * `points/use-points-layer.ts` and the `reactions` fly-guard. SELECT/HOVER need
 * no buffer (their truth lives in `ui`); HEX_INSPECT can't occur pre-render.
 *
 * Nothing here is mounted or tested yet — machine is ready for bridge wiring.
 */
export const mapMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actions: {
    // --- assign-based (pure context updates) ---
    captureMapRef: assign({
      mapRef: ({ event }) =>
        event.type === "MAP.MOUNTED" ? event.mapRef : null,
    }),
    markSourceLoaded: assign({
      loadedSources: ({ context, event }) =>
        event.type === "MAP.SOURCE_LOADED"
          ? { ...context.loadedSources, [event.sourceId]: event.loaded }
          : context.loadedSources,
    }),
    setResolution: assign({
      hexResolution: ({ context, event }) =>
        event.type === "MAP.RESOLUTION_CHANGED"
          ? event.hexResolution
          : context.hexResolution,
    }),
    forwardResolutionToCity: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "MAP.RESOLUTION_CHANGED");
      const city = system.get(SystemId.CITY) as CityMachineActor | undefined;
      if (city)
        enqueue.sendTo(city, {
          type: "MAP.RESOLUTION_CHANGED",
          hexResolution: event.hexResolution,
        });
    }),
    setHexInspect: assign({
      hexInspectInfo: ({ context, event }) =>
        event.type === "MAP.HEX_INSPECT" ? event.info : context.hexInspectInfo,
    }),
    resetHexInspect: assign({ hexInspectInfo: null }),
    // Readiness-race buffer: stash the latest bbox while still `loading`.
    savePendingFitBounds: assign({
      pendingFitBounds: ({ context, event }) =>
        event.type === "MAP.FIT_BOUNDS" ? event.bbox : context.pendingFitBounds,
    }),
    clearPendingFitBounds: assign({ pendingFitBounds: null }),

    // --- side-effecting MapLibre calls ---
    applySelect: enqueueActions(({ context, event, system, enqueue }) => {
      assertEvent(event, "MAP.SELECT");
      const { id } = event;
      const map = getMap(context);
      enqueue(() => {
        if (map?.getSource(POINTS_SOURCE_ID)) {
          map.removeFeatureState({ source: POINTS_SOURCE_ID }, "selected");
          if (id !== null) safeSetFeatureState(map, id, { selected: true });
        }
      });
      const ui = system.get(SystemId.UI) as UiMachineActor | undefined;
      if (ui) enqueue.sendTo(ui, { type: "UI.SELECT", id });
    }),
    applyHover: enqueueActions(({ context, event, system, enqueue }) => {
      assertEvent(event, "MAP.HOVER");
      const { id, source } = event;
      const map = getMap(context);
      enqueue(() => {
        if (map?.getSource(POINTS_SOURCE_ID)) {
          map.removeFeatureState({ source: POINTS_SOURCE_ID }, "hover");
          if (id !== null) safeSetFeatureState(map, id, { hover: true });
        }
      });
      const ui = system.get(SystemId.UI) as UiMachineActor | undefined;
      if (ui)
        enqueue.sendTo(ui, {
          type: "UI.SET_HOVER",
          id,
          source: source ?? "map",
        });
    }),
    flyTo: ({ context, event }) => {
      assertEvent(event, "MAP.FIT_BOUNDS");
      const map = getMap(context);
      if (!map) return;
      applyBounds(map, event.bbox);
    },
    // Clears both `selected` and `hover` feature states from the points
    // source. NAV.START already fans out to ui (clearing selectedId/hover
    // there) — this only resets the MapLibre visual layer.
    clearInteractionState: ({ context }) => {
      const map = getMap(context);
      if (!map?.getSource(POINTS_SOURCE_ID)) return;
      map.removeFeatureState({ source: POINTS_SOURCE_ID });
    },
    // Entry to `ready` — sync the imperative layer to durable truth once.
    // clearPendingFitBounds runs AFTER this in the entry array, so
    // context.pendingFitBounds is still readable here.
    applyCurrentStateToMap: ({ context, system }) => {
      const map = getMap(context);
      if (!map) return;
      if (context.pendingFitBounds) applyBounds(map, context.pendingFitBounds);
      const uiCtx = system.get(SystemId.UI)?.getSnapshot()?.context;
      if (!uiCtx || !map.getSource(POINTS_SOURCE_ID)) return;
      if (uiCtx.selectedId !== null)
        safeSetFeatureState(map, uiCtx.selectedId, { selected: true });
      if (uiCtx.hoveredListingId !== null)
        safeSetFeatureState(map, uiCtx.hoveredListingId, { hover: true });
    },
  },
}).createMachine({
  id: "map",
  context: Context.Context,
  initial: "loading",
  on: {
    // Mount can arrive in any state; capture the ref then proceed.
    "MAP.MOUNTED": { actions: "captureMapRef" },
  },
  states: {
    loading: {
      on: {
        "MAP.READY": "ready",
        "MAP.ERROR": "error",
        // Readiness-race deferral (option D): coalesce the latest desired bounds
        // — applied by `applyCurrentStateToMap` on entry to `ready`. SELECT/HOVER are
        // intentionally NOT buffered (their truth lives in `ui`, reconciled on
        // ready); HEX_INSPECT can't occur before the map paints.
        "MAP.FIT_BOUNDS": { actions: "savePendingFitBounds" },
      },
    },

    ready: {
      initial: "interactive",
      // Sync the imperative layer to durable truth once, then drop the buffer.
      entry: ["applyCurrentStateToMap", "clearPendingFitBounds"],
      on: {
        // Always handled while `ready` (both children) — these bring the new
        // city in, so they must keep flowing even during `suppressed`.
        "MAP.FIT_BOUNDS": { actions: "flyTo" },
        "MAP.SOURCE_LOADED": { actions: "markSourceLoaded" },
        "MAP.RESOLUTION_CHANGED": {
          actions: ["setResolution", "forwardResolutionToCity"],
        },
        // Nav only means anything once `ready` (first load has no old city to
        // dim, and real navigations always happen while the map is already
        // ready). Covers interactive→suppressed AND a re-click while already
        // suppressed (reenter re-runs the cleanup).
        "NAV.START": { target: ".suppressed", reenter: true },
      },
      states: {
        interactive: {
          on: {
            "MAP.SELECT": { actions: "applySelect" },
            "MAP.HOVER": { actions: "applyHover" },
            "MAP.HEX_INSPECT": { actions: "setHexInspect" },
          },
        },
        suppressed: {
          // Clear the old city's hover/select highlights + inspect popup. The
          // view blanks the data layers and lays a dim scrim + loader over the
          // map (derived from `ready.suppressed`); interaction is disabled there.
          entry: ["clearInteractionState", "resetHexInspect"],
          on: {
            // City converged (its data loaded; bbox already known from framing).
            "CITY.READY": "interactive",
            // Pointer interactions are absent here on purpose → structurally
            // ignored; the machine, not the view, enforces the gate.
          },
        },
      },
    },

    error: {},
  },
});

export type MapMachineActor = ActorRefFrom<typeof mapMachine>;
