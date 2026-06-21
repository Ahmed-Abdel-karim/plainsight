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
 *   - `CITY.CHANGED` is handled per-substate. The first city from the home picker
 *     arrives in `idle` ungated; a switcher click arrives in `navigating` (its
 *     `NAV.START` already opened the gate). A route-initiated switch (browser
 *     Back/Forward) also arrives in `idle` with no `NAV.START` — when it replaces
 *     a different city (`isInSceneCityChange`) the root opens the same gate and
 *     synthesizes the `NAV.START` fan-out, so every in-scene switch is gated alike.
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
    prefetchCity: (_ctx, _params: { slug: string; snapshotId: string }) => {
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
    // CITY.CHANGED variant — used when a route-initiated replacement (browser
    // Back/Forward) is recognized as navigation and there was no click-time
    // NAV.START to stamp the pending slug.
    setPendingFromCityChanged: assign({
      pendingSlug: ({ event }) => {
        assertEvent(event, "CITY.CHANGED");
        return event.payload.slug;
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
    // CITY.CHANGED variant of the fan-out: a route-initiated replacement
    // (Back/Forward) has no click-time NAV.START, so the root synthesizes the
    // same signal to drive map → ready.suppressed and ui → navigating. The map
    // still reacts only to NAV.START — root stays the single fan-out point.
    suppressChildrenForCityChange: enqueueActions(
      ({ event, system, enqueue }) => {
        assertEvent(event, "CITY.CHANGED");
        const map = system.get(SystemId.MAP) as MapMachineActor | undefined;
        const ui = system.get(SystemId.UI) as UiMachineActor | undefined;
        if (map)
          enqueue.sendTo(map, {
            type: "NAV.START",
            slug: event.payload.slug,
          });
        if (ui) enqueue.sendTo(ui, { type: "NAV.START" });
      },
    ),
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
  guards: {
    // A CITY.CHANGED that replaces an existing, *different* city is an in-scene
    // navigation (e.g. browser Back/Forward, which never fires a click-time
    // NAV.START). First entry (no current city) and a same-slug re-seed are not
    // navigations and stay ungated.
    isInSceneCityChange: ({ context, event }) => {
      assertEvent(event, "CITY.CHANGED");
      const current = context.cityRef?.getSnapshot().context.framing?.slug;
      return current != null && current !== event.payload.slug;
    },
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
            "CITY.CHANGED": [
              {
                guard: "isInSceneCityChange",
                target: "navigating",
                actions: [
                  "setPendingFromCityChanged",
                  "suppressChildrenForCityChange",
                  "stopOldCity",
                  "startNewCity",
                ],
              },
              { actions: ["stopOldCity", "startNewCity"] },
            ],
          },
        },
        navigating: {
          on: {
            // A switcher click (NAV.START already gated this) or a rapid
            // consecutive history switch lands here. Refresh the pending slug so
            // it tracks the latest target, then swap the city actor.
            "CITY.CHANGED": {
              actions: [
                "setPendingFromCityChanged",
                "stopOldCity",
                "startNewCity",
              ],
            },
            "CITY.READY": {
              target: "idle",
              actions: ["clearPendingCitySlug", "syncUrl"],
            },
            // Terminal load failure: lift the gate so the user can recover. No
            // syncUrl — a failed city is not a selection worth mirroring, and the
            // URL is already at the destination.
            "CITY.FAILED": {
              target: "idle",
              actions: "clearPendingCitySlug",
            },
          },
        },
      },
      on: {
        "NAV.START": {
          target: ".navigating",
          actions: [
            {
              type: "prefetchCity",
              params: ({ event }) => ({
                slug: event.slug,
                snapshotId: event.snapshotId,
              }),
            },
            "setPendingCitySlug",
            "sendNavStartToChildren",
          ],
        },
      },
    },
  },
});
