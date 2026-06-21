import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  setup,
} from "xstate";

import type { CityMachineActor } from "../city/machine";
import { SystemId } from "../constants";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

/**
 * UI machine — cross-navigation UI state (lens, selection, hover).
 *
 * Two states enforce the navigation window as machine topology rather than guards:
 *
 *   active     — normal interaction: all UI.* events accepted.
 *   navigating — city change in flight: UI.* events are structurally dropped so
 *                stale selection/hover from the old city can't leak into the new
 *                city's first render. Mirrors map's ready.suppressed window.
 *
 * NAV.START enters `navigating` and clears stale selection/hover (lens persists).
 * CITY.READY exits back to `active`. A second NAV.START while already navigating
 * re-clears and stays put (latest-wins).
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
    // Switching to "analyse" also clears the selected listing.
    assignLens: assign({
      lens: ({ context, event }) =>
        event.type === "UI.SET_LENS" ? event.lens : context.lens,
      selectedId: ({ context, event }) =>
        event.type === "UI.SET_LENS" && event.lens === "analyse"
          ? null
          : context.selectedId,
    }),
    assignHover: assign({
      hoveredListingId: ({ context, event }) =>
        event.type === "UI.SET_HOVER" ? event.id : context.hoveredListingId,
      hoverSource: ({ context, event }) =>
        event.type === "UI.SET_HOVER"
          ? event.id === null
            ? null
            : event.source
          : context.hoverSource,
    }),
    // Sets the selected listing id (UI.SELECT).
    assignSelectedId: assign({
      selectedId: ({ event }) => {
        assertEvent(event, "UI.SELECT");
        return event.id;
      },
    }),
    forwardLensToCity: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "UI.SET_LENS");
      const city = system.get(SystemId.CITY) as CityMachineActor | undefined;
      if (city)
        enqueue.sendTo(city, { type: "LENS.CHANGED", lens: event.lens });
    }),
    clearSelectionAndHover: assign({
      selectedId: null,
      hoveredListingId: null,
      hoverSource: null,
    }),
  },
}).createMachine({
  id: "ui",
  context: Context.Context,
  initial: "active",
  states: {
    active: {
      on: {
        "UI.SET_LENS": { actions: ["assignLens", "forwardLensToCity"] },
        "UI.SELECT": { actions: "assignSelectedId" },
        "UI.SET_HOVER": { actions: "assignHover" },
        "NAV.START": {
          target: "navigating",
          actions: "clearSelectionAndHover",
        },
      },
    },
    navigating: {
      on: {
        "CITY.READY": { target: "active" },
        // Terminal load failure: re-enable UI controls so the user can recover
        // (switch city / lens). Lens persists; selection was cleared on NAV.START.
        "CITY.FAILED": { target: "active" },
      },
    },
  },
});

export type UiMachineActor = ActorRefFrom<typeof uiMachine>;
