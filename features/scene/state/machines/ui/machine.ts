import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  setup,
} from "xstate";

import { createEventAssigner } from "../utils";
import type { CityMachineActor } from "../city/machine";
import type { MapMachineActor } from "../map/machine";
import { SystemId } from "../constants";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

const assignFromEvent = createEventAssigner<Context.Context, Events.Events>();

/**
 * UI machine — cross-navigation UI state (lens, selection, hover).
 *
 * Two states enforce the navigation window as machine topology rather than guards:
 *
 *   active     — normal interaction: all UI.* events accepted.
 *   navigating — city change in flight: UI.* events are structurally dropped so
 *                stale selection/hover from the old city can't leak into the new
 *                city's first render. Mirrors map's interaction.suspended window.
 *
 * SUSPEND enters `navigating` and clears stale selection/hover. RESUME exits back
 * to `active`.
 *
 * The lens has two update paths, distinguished by event, not by comment:
 *
 *   UI.SET_LENS  — user interaction (the lens switcher). State-gated: accepted in
 *                  `active`, dropped in `navigating` (it can be stale).
 *   UI.SYNC_LENS — authoritative sync from the URL (cold load, a forward city
 *                  switch whose link carries the lens, or a Back/Forward restore).
 *                  Handled at the machine root, so it applies in *every* state —
 *                  the URL is the source of truth for the destination lens, which
 *                  is navigation state, never stale interaction.
 *
 * Actions are defined inline in setup so they pick up the machine's context +
 * event types — same decision as the map machine.
 */

export const uiMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actions: {
    assignLens: assignFromEvent("UI.SET_LENS", "lens", "lens"),
    // Authoritative lens from the URL. The spawning city reads this lens to pick
    // its leg (see city `raiseInitialLens`), so the loader sends UI.SYNC_LENS
    // before CITY.CHANGED; forwarding to the outgoing city here is needless.
    syncLens: assignFromEvent("UI.SYNC_LENS", "lens", "lens"),
    assignHover: assignFromEvent("UI.SET_HOVER", "hoveredListing", (event) =>
      event.id ? { id: event.id, source: event.source } : null,
    ),
    assignSelectedId: assignFromEvent("UI.SELECT", "selectedId", "id"),
    forwardLensToCity: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "UI.SET_LENS");
      const city = system.get(SystemId.CITY) as CityMachineActor | undefined;
      if (city)
        enqueue.sendTo(city, { type: "LENS.CHANGED", lens: event.lens });
    }),
    // Analyse has no listing selection — clear it through the same UI.SELECT
    // action (raised, not an inline write) so the map paint stays in sync.
    clearSelectionOnAnalyse: enqueueActions(({ event, enqueue }) => {
      assertEvent(event, "UI.SET_LENS");
      if (event.lens === "analyse")
        enqueue.raise({ type: "UI.SELECT", id: null });
    }),
    // The selection lives here; the map owns the MapRef, so mirror every change
    // to it. No loop — MAP.SELECTION_CHANGED only paints, it never forwards back.
    notifyMapSelect: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "UI.SELECT");
      const map = system.get(SystemId.MAP) as MapMachineActor | undefined;
      if (map)
        enqueue.sendTo(map, { type: "MAP.SELECTION_CHANGED", id: event.id });
    }),
    clearSelectionAndHover: assign({
      selectedId: null,
      hoveredListing: null,
    }),
  },
}).createMachine({
  id: "ui",
  context: Context.Context,
  initial: "active",
  // Scene-session reset fanned from root (navigation left `/city`): return to the
  // initial `active` state and clear transient selection/hover. Lens is restored
  // from the URL on re-show, so it is left alone.
  on: {
    "SCENE.RESET": { target: ".active", actions: "clearSelectionAndHover" },
    // Suppression-immune: the URL is authoritative for lens in every state.
    "UI.SYNC_LENS": { actions: "syncLens" },
  },
  states: {
    active: {
      on: {
        "UI.SET_LENS": {
          actions: [
            "assignLens",
            "forwardLensToCity",
            "clearSelectionOnAnalyse",
          ],
        },
        "UI.SELECT": { actions: ["assignSelectedId", "notifyMapSelect"] },
        "UI.SET_HOVER": { actions: "assignHover" },
        SUSPEND: {
          target: "navigating",
          actions: "clearSelectionAndHover",
        },
      },
    },
    navigating: {
      on: {
        RESUME: { target: "active" },
      },
    },
  },
});

export type UiMachineActor = ActorRefFrom<typeof uiMachine>;
