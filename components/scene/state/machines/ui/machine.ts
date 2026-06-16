import { type ActorRefFrom, assertEvent, assign, setup } from "xstate";

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
    // Sets lens. Switching to "analyse" also clears selectedId — folds the
    // cross-store edge that lived in coordinators/reactions.ts.
    assignLens: assign({
      lens: ({ context, event }) =>
        event.type === "UI.SET_LENS" ? event.lens : context.lens,
      selectedId: ({ context, event }) =>
        event.type === "UI.SET_LENS" && event.lens === "analyse"
          ? null
          : context.selectedId,
    }),
    // Sets hover. Nulls hoverSource when id is null — mirrors setHoveredListing.
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
    // Clears selection + hover on nav start — folds the fan-out.ts reset.
    // Lens is preserved for UX continuity across cities.
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
        "UI.SET_LENS": { actions: "assignLens" },
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
      },
    },
  },
});

export type UiMachineActor = ActorRefFrom<typeof uiMachine>;
