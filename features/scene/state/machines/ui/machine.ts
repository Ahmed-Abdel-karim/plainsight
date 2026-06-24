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
 * SUSPEND enters `navigating` and clears stale selection/hover (lens persists).
 * RESUME exits back to `active`.
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
