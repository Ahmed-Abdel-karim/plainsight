import {
  type ActorRefFrom,
  assertEvent,
  assign,
  enqueueActions,
  setup,
} from "xstate";

import { syncSceneUrl } from "@/lib/search-params";

import { cityMachine } from "../city/machine";
import { SystemId } from "../constants";
import { mapMachine } from "../map/machine";
import { navigationMachine } from "../navigation/machine";
import { type UiMachineActor, uiMachine } from "../ui/machine";
import { workerMachine } from "../worker";
import * as Context from "./context";
import type * as Events from "./events";

/**
 * Root coordinator. It spawns the persistent `map`/`ui`/`navigation`/`worker`
 * actors in context (the refs the React tree reads), then translates the two
 * lifecycle inputs into the shared map/ui
 * suppression pair: `NAV.STARTED` (from `navigation`) → `SUSPEND`;
 * `CITY.READY`/`CITY.FAILED` (from `city`) → `RESUME`. It owns the `city` actor's
 * spawn/stop and mirrors settled selection to the URL. Its two states gate that
 * mirror: `URL.SYNC` writes only in `settled`; while `switching` (a city switch
 * is in flight, until `CITY.READY`/`CITY.FAILED`) the signal is dropped so a
 * switch's intermediate selection/filter clears never clobber the URL. Pending
 * *path* state lives in `navigation`.
 */
export const rootMachine = setup({
  types: {
    context: {} as Context.Context,
    events: {} as Events.Events,
  },
  actors: {
    map: mapMachine,
    ui: uiMachine,
    city: cityMachine,
    worker: workerMachine,
    navigation: navigationMachine,
  },
  actions: {
    // Injected at the provider boundary (see root/prefetch.ts), closured over
    // the slug→snapshot map + app QueryClient. The default keeps the machine
    // self-contained and testable without a data dependency.
    prefetch: () => {},
    fanSuspend: enqueueActions(({ system, enqueue }) => {
      for (const id of [SystemId.MAP, SystemId.UI] as const) {
        const ref = system.get(id);
        if (ref) enqueue.sendTo(ref, { type: "SUSPEND" });
      }
    }),
    fanResume: enqueueActions(({ system, enqueue }) => {
      for (const id of [SystemId.MAP, SystemId.UI] as const) {
        const ref = system.get(id);
        if (ref) enqueue.sendTo(ref, { type: "RESUME" });
      }
    }),
    // Scene reset fan-out: forward SCENE.RESET to every session actor so each
    // returns itself to its initial resting state (map/ui/worker/navigation own
    // their own reset). The city is replaced on re-show by the page's CITY.CHANGED.
    fanReset: enqueueActions(({ context, system, enqueue }) => {
      enqueue.sendTo(context.mapRef, { type: "SCENE.RESET" });
      enqueue.sendTo(context.uiRef, { type: "SCENE.RESET" });
      enqueue.sendTo(context.navigationRef, { type: "SCENE.RESET" });
      const worker = system.get(SystemId.WORKER);
      if (worker) enqueue.sendTo(worker, { type: "SCENE.RESET" });
    }),
    // Replacing the city: just stop the outgoing city actor. The worker is no
    // longer cancelled slug-agnostically — the new city's identity-aware load
    // replaces old data when needed (preserving a matching destination prefetch),
    // and any stale recompute response is rejected by request + snapshot identity.
    // No-op on the first spawn, when there is no outgoing city.
    stopOldCity: enqueueActions(({ context, enqueue }) => {
      if (!context.cityRef) return;
      enqueue.stopChild(context.cityRef);
    }),
    startNewCity: assign({
      cityRef: ({ spawn, event }) => {
        assertEvent(event, "CITY.CHANGED");
        return spawn("city", {
          systemId: SystemId.CITY,
          input: { framing: event.payload, filter: event.filter },
        });
      },
    }),
    // Reads the live ui + city snapshots at call time so it can never write
    // stale defaults; no-ops before a city exists.
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
  },
}).createMachine({
  id: "scene",
  context: ({ spawn }) => ({
    mapRef: spawn("map", { systemId: SystemId.MAP, input: {} }),
    uiRef: spawn("ui", { systemId: SystemId.UI, input: {} }),
    navigationRef: spawn("navigation", { systemId: SystemId.NAVIGATION }),
    cityRef: null,
  }),
  invoke: [{ src: "worker", systemId: SystemId.WORKER, input: {} }],
  initial: "settled",
  states: {
    settled: {
      on: {
        "NAV.STARTED": {
          target: "switching",
          actions: ["fanSuspend", "prefetch"],
        },
        "URL.SYNC": { actions: "syncUrl" },
      },
    },
    switching: {
      on: {
        // Re-navigation while a switch is still in flight: re-suspend, stay.
        "NAV.STARTED": { actions: ["fanSuspend", "prefetch"] },
        "CITY.READY": { target: "settled", actions: "fanResume" },
        "CITY.FAILED": { target: "settled", actions: "fanResume" },
        // URL.SYNC intentionally unhandled — dropped until the switch settles.
      },
    },
  },
  on: {
    "CITY.CHANGED": { actions: ["stopOldCity", "startNewCity"] },
    // Navigation left `/city` (Activity hides the scene): return to the resting
    // window and fan the reset to every session actor so the preserved snapshot
    // rehydrates clean. The city is re-driven on re-show by CITY.CHANGED.
    "SCENE.RESET": {
      target: ".settled",
      actions: "fanReset",
    },
  },
});

export type RootMachineActor = ActorRefFrom<typeof rootMachine>;
