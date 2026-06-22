import { type ActorRefFrom, assign, sendParent, setup } from "xstate";

import * as Context from "./context";
import type * as Events from "./events";

export const navigationMachine = setup({
  types: {
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actions: {
    setPending: assign({
      pendingPath: ({ event }) => ("path" in event ? event.path : null),
    }),
    setCurrent: assign({
      currentPath: ({ event }) => ("path" in event ? event.path : null),
    }),
    clearPending: assign({ pendingPath: null }),
    started: sendParent(({ event }) => ({
      type: "NAV.STARTED" as const,
      path: event.path,
    })),
    ended: sendParent(({ event }) => ({
      type: "NAV.ENDED" as const,
      path: event.path,
    })),
  },
  guards: {
    differsFromCurrent: ({ context, event }) =>
      event.path !== context.currentPath,
    differsFromPending: ({ context, event }) =>
      event.path !== context.pendingPath,
    // An external nav over an established route (Back/Forward, mid-session URL
    // change) — suppresses. The very first commit (currentPath === null) is the
    // initial route, not a transition, so it falls through to a silent setCurrent.
    isReNavigation: ({ context, event }) =>
      context.currentPath !== null && event.path !== context.currentPath,
  },
}).createMachine({
  id: "navigation",
  context: Context.Context,
  initial: "idle",
  states: {
    idle: {
      on: {
        "NAV.INTENT": {
          guard: "differsFromCurrent",
          target: "navigating",
          actions: ["setPending", "started"],
        },
        "NAV.COMMIT": [
          {
            guard: "isReNavigation",
            actions: ["started", "setCurrent", "ended"],
          },
          // Initial route (or same-path re-commit) — establish current, no
          // suppression so deep-link seeding lands on an active ui.
          { actions: "setCurrent" },
        ],
      },
    },
    navigating: {
      on: {
        "NAV.INTENT": {
          guard: "differsFromPending",
          actions: ["setPending", "started"],
        },
        "NAV.COMMIT": {
          target: "idle",
          actions: ["setCurrent", "clearPending", "ended"],
        },
      },
    },
  },
});

export type NavigationMachineActor = ActorRefFrom<typeof navigationMachine>;
