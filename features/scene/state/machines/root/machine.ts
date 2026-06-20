import { assertEvent, assign, enqueueActions, setup } from "xstate";

import { syncSceneUrl } from "@/lib/search-params";

import { cityMachine } from "../city/machine";
import { SystemId } from "../constants";
import { type MapMachineActor, mapMachine } from "../map/machine";
import { type UiMachineActor, uiMachine } from "../ui/machine";
import { workerMachine } from "../worker/machine";
import * as Context from "./context";
import type * as Events from "./events";
import type * as Input from "./input";

/**
 * Scene root machine — the single actor system mounted at `(scene)` layout. It
 * brings up every child machine, choosing the mechanism per lifetime:
 *
 *   - `map` / `ui` / `worker` are **invoked**: their lifecycle is the session's,
 *     so they run for as long as `running` is active and are reachable via the
 *     receptionist (`system.get('map' | 'ui' | 'worker')`). The `worker` is shared
 *     across cities so its listings cache survives navigation (revisiting a city
 *     is a cache hit, not a refetch).
 *   - `city` is **spawned** on `CITY.CHANGED` and stopped/replaced on the next
 *     navigation — a dynamic, event-driven lifetime that `invoke` can't express.
 *     It sends requests to the session `worker` and receives slug-stamped replies.
 *
 * `running` is refined into `idle ⇄ navigating` to own the city-switch window:
 *   - `NAV.START` (city-switcher click) sits on the `running` parent so it fires
 *     from both children: it prefetches the slug, stamps `pendingSlug`, fans out
 *     to `map` + `ui` (their suppressed/navigating states), and targets
 *     `navigating`. From `idle` that's the normal entry; from `navigating` (a
 *     re-click before the first city converged) it self-reenters and re-runs with
 *     the latest slug — latest-wins. Single dispatch — root is the only fan-out point.
 *   - `CITY.READY` (city's data loaded) exits back to `idle` and clears `pendingSlug`.
 *     Map and ui receive `CITY.READY` directly from `city` — root does not relay.
 *   - `CITY.CHANGED` also sits on the `running` parent so it fires from both
 *     children (first city from home picker arrives in `idle`; city-switch arrives
 *     in `navigating` after `NAV.START`).
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
    worker: workerMachine,
  },
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    prefetchCity: (_ctx, _params: { slug: string }) => {
      // Stub — real implementation injected via machine.provide() in SceneProvider,
    },

    // Mirror the settled scene selection to the URL. Reads the *live* ui + city
    // snapshots at call time rather than a React closure, so it can never write
    // stale defaults. Gated to `idle` by the machine topology, so it never runs
    // mid-navigation. No-ops before a city exists (deep-link seed not yet
    // applied) — the URL is left untouched until there's real state to mirror.
    syncUrl: ({ context, system }) => {
      const ui = (
        system.get(SystemId.UI) as UiMachineActor | undefined
      )?.getSnapshot();
      const city = context.cityRef?.getSnapshot();
      if (!ui || !city) return;
      syncSceneUrl({
        lens: ui.context.lens,
        selectedId: ui.context.selectedId,
        roomTypes: city.context.filter.roomTypes,
        priceRange: city.context.filter.priceRange,
        nbhd: city.context.filter.nbhd,
      });
    },

    // Remember which city slug we're navigating to (NAV.START). Latest-wins
    // when a second NAV.START arrives before the first city converges.
    setPendingCitySlug: assign({
      pendingSlug: ({ event }) => {
        assertEvent(event, "NAV.START");
        return event.slug;
      },
    }),
    // Clear the pending slug once the city converges (CITY.READY).
    clearPendingCitySlug: assign({ pendingSlug: null }),
    // Tell both session machines a city switch started, so they enter their
    // suppressed/navigating states. Map gets the slug (to prefetch); ui only
    // needs the signal.
    sendNavStartToChildren: enqueueActions(({ event, system, enqueue }) => {
      assertEvent(event, "NAV.START");
      const map = system.get(SystemId.MAP) as MapMachineActor | undefined;
      const ui = system.get(SystemId.UI) as UiMachineActor | undefined;
      if (map) enqueue.sendTo(map, { type: "NAV.START", slug: event.slug });
      if (ui) enqueue.sendTo(ui, { type: "NAV.START" });
    }),
    // Stop the outgoing city actor before its replacement is spawned.
    stopOldCity: enqueueActions(({ context, enqueue }) => {
      if (context.cityRef) enqueue.stopChild(context.cityRef);
    }),
    // Start a fresh city actor for the new slug, seeded with the URL filter.
    startNewCity: assign({
      cityRef: ({ spawn, event }) => {
        assertEvent(event, "CITY.CHANGED");
        return spawn("city", {
          systemId: SystemId.CITY,
          input: { framing: event.payload, filter: event.filter },
        });
      },
    }),
  },
}).createMachine({
  id: "scene",
  context: Context.Context,
  initial: "running",
  states: {
    running: {
      invoke: [
        { src: "map", systemId: SystemId.MAP, input: {} },
        { src: "ui", systemId: SystemId.UI, input: {} },
        { src: "worker", systemId: SystemId.WORKER, input: {} },
      ],
      initial: "idle",
      states: {
        idle: {
          on: {
            "URL.SYNC": { actions: "syncUrl" },
          },
        },
        navigating: {
          on: {
            "CITY.READY": {
              target: "idle",
              actions: ["clearPendingCitySlug", "syncUrl"],
            },
          },
        },
      },
      on: {
        "CITY.CHANGED": {
          actions: ["stopOldCity", "startNewCity"],
        },
        "NAV.START": {
          target: ".navigating",
          actions: [
            {
              type: "prefetchCity",
              params: ({ event }) => ({ slug: event.slug }),
            },
            "setPendingCitySlug",
            "sendNavStartToChildren",
          ],
        },
      },
    },
  },
});
