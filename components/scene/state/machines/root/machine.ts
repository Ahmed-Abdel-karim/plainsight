import { assign, enqueueActions, sendTo, setup } from "xstate";

import { cityMachine } from "../city/machine";
import { mapMachine } from "../map/machine";
import { uiMachine } from "../ui/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

/**
 * Scene root machine — the single actor system mounted at `(scene)` layout. It
 * brings up every child machine, choosing the mechanism per lifetime:
 *
 *   - `map` / `ui` are **invoked**: their lifecycle is the session's, so they
 *     run for as long as `running` is active and are reachable via the
 *     receptionist (`system.get('map' | 'ui')`).
 *   - `city` is **spawned** on `CITY.CHANGED` and stopped/replaced on the next
 *     navigation — a dynamic, event-driven lifetime that `invoke` can't express.
 *     Its `worker` child is invoked by `city` (a later step).
 *
 * `running` is refined into `idle ⇄ navigating` to own the city-switch window:
 *   - `NAV.START` (city-switcher click) enters `navigating`, stamps `pendingSlug`,
 *     and fans out to `map` + `ui` so they enter their own suppressed/navigating
 *     states. Single dispatch — root is the only fan-out point.
 *   - `CITY.READY` (city converged) exits back to `idle` and clears `pendingSlug`.
 *     Map and ui receive `CITY.READY` directly from `city` — root does not relay.
 *   - `CITY.CHANGED` sits on the `running` parent so it fires from both children
 *     (first city from home picker arrives in `idle`; city-switch arrives in
 *     `navigating` after `NAV.START`).
 *
 * Assembled with `setup().createMachine()` per the project's XState v5 file
 * layout (context / input / events / actions / machine).
 */
export const rootMachine = setup({
  types: {
    input: {} as Input.Input,
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actors: {
    map: mapMachine,
    ui: uiMachine,
    city: cityMachine,
  },
  actions: {
    // Stub — real implementation injected via machine.provide() in SceneProvider,
    // which closes over the QueryClient available from React context.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prefetchCity: (_ctx, _params: { slug: string }) => {},
  },
}).createMachine({
  id: "scene",
  context: Context.Context,
  initial: "running",
  states: {
    running: {
      invoke: [
        { src: "map", systemId: "map", input: {} },
        { src: "ui", systemId: "ui", input: {} },
      ],
      initial: "idle",
      states: {
        idle: {
          on: {
            "NAV.START": {
              target: "navigating",
              // Single fan-out point: root forwards to both session machines.
              // Map gets the slug (to prefetch); ui only needs the signal.
              actions: [
                {
                  type: "prefetchCity",
                  params: ({ event }) => ({ slug: event.slug }),
                },
                assign({ pendingSlug: ({ event }) => event.slug }),
                sendTo(
                  ({ system }) => system.get("map"),
                  ({ event }) => ({
                    type: "NAV.START" as const,
                    slug: event.slug,
                  }),
                ),
                sendTo(({ system }) => system.get("ui"), {
                  type: "NAV.START" as const,
                }),
              ],
            },
          },
        },
        navigating: {
          on: {
            "NAV.START": {
              // Re-nav before first city lands: latest-wins slug stamp.
              // Map and ui are already in their suppressed/navigating states.
              actions: assign({ pendingSlug: ({ event }) => event.slug }),
            },
            "CITY.READY": {
              target: "idle",
              actions: assign({ pendingSlug: null }),
            },
          },
        },
      },
      // CITY.CHANGED is on the running parent so it fires from both idle and
      // navigating: first city arrives in idle (no NAV.START from home picker);
      // city-switch arrives in navigating (after NAV.START from city-switcher).
      on: {
        "CITY.CHANGED": {
          actions: [
            enqueueActions(({ context, enqueue }) => {
              if (context.cityRef) enqueue.stopChild(context.cityRef);
            }),
            assign({
              cityRef: ({ spawn, event }) =>
                spawn("city", {
                  systemId: "city",
                  input: { framing: event.payload },
                }),
            }),
          ],
        },
      },
    },
  },
});
