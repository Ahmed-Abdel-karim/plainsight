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
import { workerMachine } from "../worker/machine";
import * as Context from "./context";
import type * as Events from "./events";

/**
 * Scene root — a flat coordinator. It invokes the session machines and
 * translates the two lifecycle inputs into the shared map/ui suppression pair:
 * `NAV.STARTED` (from `navigation`) → `SUSPEND`; `CITY.READY`/`CITY.FAILED`
 * (from `city`) → `RESUME`. It owns the `city` actor's spawn/stop and mirrors
 * settled selection to the URL. No gate, no pending state — that lives in
 * `navigation`.
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
    stopOldCity: enqueueActions(({ context, enqueue }) => {
      if (context.cityRef) enqueue.stopChild(context.cityRef);
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
  context: Context.Context,
  invoke: [
    { src: "map", systemId: SystemId.MAP, input: {} },
    { src: "ui", systemId: SystemId.UI, input: {} },
    { src: "worker", systemId: SystemId.WORKER, input: {} },
    { src: "navigation", systemId: SystemId.NAVIGATION },
  ],
  on: {
    "NAV.STARTED": { actions: "fanSuspend" },
    "CITY.CHANGED": { actions: ["stopOldCity", "startNewCity"] },
    "CITY.READY": { actions: "fanResume" },
    "CITY.FAILED": { actions: "fanResume" },
    "URL.SYNC": { actions: "syncUrl" },
  },
});

export type RootMachineActor = ActorRefFrom<typeof rootMachine>;
