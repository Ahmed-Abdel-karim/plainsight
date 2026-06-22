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
import { createEventAssigner } from "../utils";
import type { CityMachineActor } from "../city/machine";
import { SystemId } from "../constants";
import type { UiMachineActor } from "../ui/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

const assignFromEvent = createEventAssigner<Context.Context, Events.Events>();

const MAX_BOUNDS_PADDING_RATIO = 0.3;

// --- private helpers (map-specific MapLibre utilities) ---

// A removed MapLibre instance still answers method calls but throws *inside*
// them (its `style` is gone), so the `?.` guard at call sites isn't enough — the
// ref is non-null, just dead. `_removed` is MapLibre's teardown flag; treat a
// removed map as absent so every call site no-ops instead of crashing.
const getMap = (context: Context.Context) => {
  const map = context.mapRef?.getMap();
  return map && !(map as { _removed?: boolean })._removed ? map : undefined;
};

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
 * Map machine — two parallel regions:
 *
 *   - `lifecycle` (loading → ready → error) — the MapLibre instance, its camera,
 *     and data ingest. Keeps flowing regardless of suppression.
 *   - `interaction` (interactive ⇄ suspended) — the pointer-interaction gate. A
 *     city switch suspends it (`SUSPEND`); the city converging resumes it
 *     (`RESUME`). In `suspended` it does nothing but clear the old highlights on
 *     entry and wait.
 *
 * The regions are independent: `SUSPEND` arriving while `loading` just moves the
 * interaction region, so when `MAP.READY` lands the combined state is correctly
 * `ready + suspended` — no buffer, no guard. `MAP.UNMOUNTED` resets the lifecycle
 * region only; interaction keeps its place. The view derives the dim/scrim from
 * `interaction: "suspended"`.
 */
export const mapMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actions: {
    captureMapRef: assignFromEvent("MAP.MOUNTED", "mapRef", "mapRef"),
    clearMapRef: assign({ mapRef: null, loadedSources: {} }),
    markSourceLoaded: assignFromEvent(
      "MAP.SOURCE_LOADED",
      "loadedSources",
      (event, context) => ({
        ...context.loadedSources,
        [event.sourceId]: event.loaded,
      }),
    ),
    setResolution: assignFromEvent(
      "MAP.RESOLUTION_CHANGED",
      "hexResolution",
      "hexResolution",
    ),
    forwardResolutionToCity: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "MAP.RESOLUTION_CHANGED");
      const city = system.get(SystemId.CITY) as CityMachineActor | undefined;
      if (city)
        enqueue.sendTo(city, {
          type: "MAP.RESOLUTION_CHANGED",
          hexResolution: event.hexResolution,
        });
    }),
    setHexInspect: assignFromEvent("MAP.HEX_INSPECT", "hexInspectInfo", "info"),
    resetHexInspect: assign({ hexInspectInfo: null }),
    // Readiness-race buffer: stash the latest bbox while still `loading`.
    savePendingFitBounds: assignFromEvent(
      "MAP.FIT_BOUNDS",
      "pendingFitBounds",
      "bbox",
    ),
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
    // Clears both `selected` and `hover` feature states from the points source.
    clearInteractionState: ({ context }) => {
      const map = getMap(context);
      if (!map?.getSource(POINTS_SOURCE_ID)) return;
      map.removeFeatureState({ source: POINTS_SOURCE_ID });
    },
    // Entry to `lifecycle.ready` — sync the imperative layer to durable truth
    // once. clearPendingFitBounds runs AFTER this in the entry array, so
    // context.pendingFitBounds is still readable here.
    applyCurrentStateToMap: ({ context, system }) => {
      const map = getMap(context);
      if (!map) return;
      if (context.pendingFitBounds) applyBounds(map, context.pendingFitBounds);
      const uiCtx = system.get(SystemId.UI)?.getSnapshot()?.context;
      if (!uiCtx || !map.getSource(POINTS_SOURCE_ID)) return;
      if (uiCtx.selectedId !== null)
        safeSetFeatureState(map, uiCtx.selectedId, { selected: true });
      if (uiCtx.hoveredListing)
        safeSetFeatureState(map, uiCtx.hoveredListing.id, { hover: true });
    },
  },
}).createMachine({
  id: "map",
  context: Context.Context,
  on: {
    "MAP.MOUNTED": { actions: "captureMapRef" },
    // Drop the dead ref and restart the lifecycle region only — interaction
    // keeps its place, so unmounting mid-nav and returning is still suspended.
    "MAP.UNMOUNTED": { target: ".lifecycle.loading", actions: "clearMapRef" },
  },
  type: "parallel",
  states: {
    lifecycle: {
      initial: "loading",
      states: {
        loading: {
          on: {
            "MAP.READY": "ready",
            "MAP.ERROR": "error",
            // Coalesce the latest desired bounds; applied on entry to `ready`.
            "MAP.FIT_BOUNDS": { actions: "savePendingFitBounds" },
          },
        },
        ready: {
          entry: ["applyCurrentStateToMap", "clearPendingFitBounds"],
          on: {
            "MAP.FIT_BOUNDS": { actions: "flyTo" },
            "MAP.SOURCE_LOADED": { actions: "markSourceLoaded" },
            "MAP.RESOLUTION_CHANGED": {
              actions: ["setResolution", "forwardResolutionToCity"],
            },
          },
        },
        error: {},
      },
    },
    interaction: {
      initial: "interactive",
      states: {
        interactive: {
          on: {
            "MAP.SELECT": { actions: "applySelect" },
            "MAP.HOVER": { actions: "applyHover" },
            "MAP.HEX_INSPECT": { actions: "setHexInspect" },
            SUSPEND: "suspended",
          },
        },
        suspended: {
          entry: ["clearInteractionState", "resetHexInspect"],
          on: {
            RESUME: "interactive",
          },
        },
      },
    },
  },
});

export type MapMachineActor = ActorRefFrom<typeof mapMachine>;
