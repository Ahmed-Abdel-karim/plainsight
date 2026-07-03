import {
  type ActorRefFrom,
  assertEvent,
  assign,
  sendParent,
  setup,
} from "xstate";

import { createEventAssigner } from "../utils";
import * as Context from "./context";
import type * as Events from "./events";

const assignFromEvent = createEventAssigner<Context.Context, Events.Events>();

export const navigationMachine = setup({
  types: {
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actions: {
    setPending: assignFromEvent("NAV.INTENT", "pendingPath", "path"),
    setCurrent: assignFromEvent("NAV.COMMIT", "currentPath", "path"),
    clearPending: assign({ pendingPath: null }),
    // Scene reset: return to the initial resting context (a re-entering
    // transition to `idle` re-resolves the state). Clearing `currentPath` makes
    // the next route commit on re-show behave like a cold first commit.
    resetToInitial: assign(() => ({ ...Context.Context })),
    started: sendParent(({ event }) => {
      assertEvent(event, ["NAV.INTENT", "NAV.COMMIT"]);
      return { type: "NAV.STARTED" as const, path: event.path };
    }),
    ended: sendParent(({ event }) => {
      assertEvent(event, ["NAV.INTENT", "NAV.COMMIT"]);
      return { type: "NAV.ENDED" as const, path: event.path };
    }),
  },
  guards: {
    differsFromCurrent: ({ context, event }) =>
      "path" in event && event.path !== context.currentPath,
    differsFromPending: ({ context, event }) =>
      "path" in event && event.path !== context.pendingPath,
    isReNavigation: ({ context, event }) =>
      context.currentPath !== null &&
      "path" in event &&
      event.path !== context.currentPath,
  },
}).createMachine({
  id: "navigation",
  context: Context.Context,
  initial: "idle",
  // Scene-session reset fanned from root (navigation left `/city`); valid from
  // any state — re-enter `idle` and drop the initial resting context.
  on: {
    "SCENE.RESET": {
      target: ".idle",
      actions: "resetToInitial",
    },
  },
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
