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

export const MAX_BOUNDS_PADDING_RATIO = 0.25;

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
  map.fitBounds(toBounds(bbox), { animate: true, zoom: 2 });
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
 *     (`RESUME`), which also frames the map to that city (fit + clamp + centre,
 *     pulled from the city actor). In `suspended` it does nothing but clear the
 *     old highlights on entry and wait.
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

    // Frame the current city: fit + clamp to its bbox and centre on its centre.
    // The bbox/centre are pulled from the city actor (their single source of
    // truth) at call time, so a stale value can never be applied. Runs on RESUME
    // — the one edge that fires both on first load and on a city switch.
    fitToCity: ({ context, system }) => {
      const map = getMap(context);
      if (!map) return;
      const framing = (
        system.get(SystemId.CITY) as CityMachineActor | undefined
      )?.getSnapshot().context.framing;
      if (!framing) return;
      applyBounds(map, framing.bbox);
      map.setCenter(framing.center);
      map.setZoom(0);
    },

    // Injected at the provider boundary (see provider.tsx); the restyle helper
    // lives in shared/map-theme. The default keeps the machine self-contained.
    applyMapTheme: enqueueActions(() => {}),

    // --- side-effecting MapLibre calls ---
    // Mirror the ui selection onto the points source: unpaint the outgoing
    // feature (read from context), paint the incoming one, and remember it.
    paintCurrentSelection: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, "MAP.SELECTION_CHANGED");
      const { id } = event;
      const map = getMap(context);
      const prev = context.mapSelectedListingId;
      enqueue(() => {
        if (map?.getSource(POINTS_SOURCE_ID)) {
          if (prev !== null)
            safeSetFeatureState(map, prev, { selected: false });
          if (id !== null) safeSetFeatureState(map, id, { selected: true });
        }
      });
      enqueue.assign({ mapSelectedListingId: id });
    }),
    // The points source's feature-state is wiped whenever its data (re)loads;
    // repaint the current selection once the new data is parsed.
    reapplySelection: ({ context, event }) => {
      assertEvent(event, "MAP.SOURCE_LOADED");
      if (event.sourceId !== POINTS_SOURCE_ID || !event.loaded) return;
      const map = getMap(context);
      if (!map?.getSource(POINTS_SOURCE_ID)) return;
      if (context.mapSelectedListingId !== null)
        safeSetFeatureState(map, context.mapSelectedListingId, {
          selected: true,
        });
    },
    applyHover: enqueueActions(({ context, event, system, enqueue }) => {
      assertEvent(event, "MAP.HOVER");
      const { id, source } = event;
      const map = getMap(context);
      const prev = context.mapHoveredListingId;
      enqueue(() => {
        if (map?.getSource(POINTS_SOURCE_ID)) {
          if (prev !== null) safeSetFeatureState(map, prev, { hover: false });
          if (id !== null) safeSetFeatureState(map, id, { hover: true });
        }
      });
      enqueue.assign({ mapHoveredListingId: id });
      const ui = system.get(SystemId.UI) as UiMachineActor | undefined;
      if (ui)
        enqueue.sendTo(ui, {
          type: "UI.SET_HOVER",
          id,
          source: source ?? "map",
        });
    }),
    // Clears both `selected` and `hover` feature states from the points source.
    clearInteractionState: ({ context }) => {
      const map = getMap(context);
      if (!map?.getSource(POINTS_SOURCE_ID)) return;
      map.removeFeatureState({ source: POINTS_SOURCE_ID });
    },
    resetMapHover: assign({ mapHoveredListingId: null }),
    resetMapSelect: assign({ mapSelectedListingId: null }),
    applyCurrentStateToMap: enqueueActions(({ context, system, enqueue }) => {
      const map = getMap(context);
      if (!map) return;
      const uiCtx = (
        system.get(SystemId.UI) as UiMachineActor | undefined
      )?.getSnapshot()?.context;
      enqueue(() => {
        if (!uiCtx || !map.getSource(POINTS_SOURCE_ID)) return;
        if (uiCtx.selectedId !== null)
          safeSetFeatureState(map, uiCtx.selectedId, { selected: true });
        if (uiCtx.hoveredListing)
          safeSetFeatureState(map, uiCtx.hoveredListing.id, { hover: true });
      });
      // Keep the painted-truth ids in sync so a later paint unpaints the right
      // feature and a source reload repaints the right selection.
      enqueue.assign({
        mapSelectedListingId: uiCtx?.selectedId ?? null,
        mapHoveredListingId: uiCtx?.hoveredListing?.id ?? null,
      });
    }),
  },
}).createMachine({
  id: "map",
  context: Context.Context,
  on: {
    "MAP.MOUNTED": { actions: "captureMapRef" },
    // Drop the dead ref and restart the lifecycle region only — interaction
    // keeps its place, so unmounting mid-nav and returning is still suspended.
    "MAP.UNMOUNTED": { target: ".lifecycle.loading", actions: "clearMapRef" },
    // Selection is gated upstream on `ui` (dropped while navigating), so the
    // paint is a pure side effect here, valid in any lifecycle/interaction state.
    "MAP.SELECTION_CHANGED": { actions: "paintCurrentSelection" },
    "MAP.STYLE_LOADED": { actions: "applyMapTheme" },
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
          },
        },
        ready: {
          entry: ["fitToCity", "applyCurrentStateToMap"],
          on: {
            "MAP.SOURCE_LOADED": {
              actions: ["markSourceLoaded", "reapplySelection"],
            },
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
            "MAP.HOVER": { actions: "applyHover" },
            "MAP.HEX_INSPECT": { actions: "setHexInspect" },
            SUSPEND: "suspended",
          },
        },
        suspended: {
          entry: [
            "clearInteractionState",
            "resetHexInspect",
            "resetMapHover",
            "resetMapSelect",
          ],
          on: {
            RESUME: { target: "interactive", actions: "fitToCity" },
          },
        },
      },
    },
  },
});

export type MapMachineActor = ActorRefFrom<typeof mapMachine>;
