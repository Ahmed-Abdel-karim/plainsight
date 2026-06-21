import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import type { CityMachineActor } from "../city/machine";
import type { TransportCommand } from "../worker/transport";
import { mountFakeMap, setupSceneSystem } from "./utils";

type PostCommand = Extract<TransportCommand, { type: "POST" }>;
const posts = (commands: TransportCommand[]): PostCommand[] =>
  commands.filter((c): c is PostCommand => c.type === "POST");

/**
 * Connected scene system — the real root + map + ui + worker actors wired together,
 * driven by events and asserted on snapshots (no DOM, no Web Worker). The map gate
 * has its own executable spec (`map/transition-gating.test.ts`); this pins the boot
 * shape and the root → city → worker wiring everything else builds on.
 */
describe("connected scene system", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  it("boots into running.idle with map, ui and worker invoked, and no city yet", () => {
    scene = setupSceneSystem();

    expect(scene.actor.getSnapshot().value).toEqual({ running: "idle" });
    expect(scene.map).toBeDefined();
    expect(scene.ui).toBeDefined();
    expect(scene.worker).toBeDefined();
    expect(scene.city).toBeUndefined();
  });

  it("spawns the city and drives a worker load when a city is dispatched", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();

    scene.actor.send({
      type: "CITY.CHANGED",
      payload: framing,
      filter: { roomTypes: [], priceRange: null, nbhd: null },
    });

    expect(scene.city).toBeDefined();
    expect(scene.transport.commands).toContainEqual({
      type: "LOAD",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });
  });

  it("fans a converged city out to both the map (hexes) and analysis (aggregates)", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({
      type: "CITY.CHANGED",
      payload: framing,
      filter: { roomTypes: [], priceRange: null, nbhd: null },
    });

    (scene.city as CityMachineActor).send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });

    const types = posts(scene.transport.commands).map((c) => c.message.type);
    expect(types).toContain("hexes");
    expect(types).toContain("aggregates");
  });

  it("fans a filter change out to both a hex and an aggregate recompute", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({
      type: "CITY.CHANGED",
      payload: framing,
      filter: { roomTypes: [], priceRange: null, nbhd: null },
    });
    const city = scene.city as CityMachineActor;
    city.send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });

    // Settle the converge-time recomputes so the coalescing slots are free and
    // the filter-driven requests post immediately rather than queueing.
    scene.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: [] },
      },
    });
    scene.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });

    const settled = posts(scene.transport.commands).length;
    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });

    const fresh = posts(scene.transport.commands).slice(settled);
    expect(fresh.map((c) => c.message.type)).toEqual(
      expect.arrayContaining(["hexes", "aggregates"]),
    );
    expect(
      fresh.every((c) => c.message.params.filters.roomTypes.length === 1),
    ).toBe(true);
  });

  // A switcher click fires NAV.START before CITY.CHANGED; browser Back/Forward
  // remounts the route and fires CITY.CHANGED alone. The root must recognize the
  // latter as navigation so every in-scene switch enters the same gate.
  describe("route-initiated city change (Back/Forward) is gated like a click", () => {
    const filter = { roomTypes: [], priceRange: null, nbhd: null };
    const citySlug = (scene: ReturnType<typeof setupSceneSystem>) =>
      (scene.city as CityMachineActor).getSnapshot().context.framing?.slug;

    it("opens the gate when a route change replaces a different city", () => {
      scene = setupSceneSystem();
      const map = mountFakeMap(scene);

      // First entry — no outgoing city to suppress, so it stays ungated.
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });
      expect(scene.actor.getSnapshot().value).toEqual({ running: "idle" });
      expect(scene.map?.getSnapshot().value).toEqual({ ready: "interactive" });

      // Back/Forward to a different city — CITY.CHANGED with no NAV.START.
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "berlin" }),
        filter,
      });

      expect(scene.actor.getSnapshot().value).toEqual({
        running: "navigating",
      });
      expect(scene.actor.getSnapshot().context.pendingSlug).toBe("berlin");
      expect(scene.map?.getSnapshot().value).toEqual({ ready: "suppressed" });
      expect(scene.ui?.getSnapshot().value).toBe("navigating");
      expect(citySlug(scene)).toBe("berlin");
      expect(map.removeFeatureState).toHaveBeenCalled();
    });

    it("leaves the first scene entry ungated", () => {
      scene = setupSceneSystem();
      mountFakeMap(scene);

      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });

      expect(scene.actor.getSnapshot().value).toEqual({ running: "idle" });
      expect(scene.map?.getSnapshot().value).toEqual({ ready: "interactive" });
      expect(scene.ui?.getSnapshot().value).toBe("active");
    });

    it("holds the gate across rapid consecutive route changes (latest-wins)", () => {
      scene = setupSceneSystem();
      mountFakeMap(scene);

      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "berlin" }),
        filter,
      });
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "amsterdam" }),
        filter,
      });

      expect(scene.actor.getSnapshot().value).toEqual({
        running: "navigating",
      });
      expect(scene.actor.getSnapshot().context.pendingSlug).toBe("amsterdam");
      expect(scene.map?.getSnapshot().value).toEqual({ ready: "suppressed" });
      expect(citySlug(scene)).toBe("amsterdam");
    });

    it("does not double-gate when a switcher click precedes CITY.CHANGED", () => {
      scene = setupSceneSystem();
      mountFakeMap(scene);

      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });

      // Switcher path: NAV.START opens the gate, then CITY.CHANGED for the same
      // target arrives in `navigating`.
      scene.actor.send({
        type: "NAV.START",
        slug: "berlin",
        snapshotId: "2025-09",
      });
      expect(scene.actor.getSnapshot().value).toEqual({
        running: "navigating",
      });

      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "berlin" }),
        filter,
      });

      expect(scene.actor.getSnapshot().value).toEqual({
        running: "navigating",
      });
      expect(scene.actor.getSnapshot().context.pendingSlug).toBe("berlin");
      expect(scene.map?.getSnapshot().value).toEqual({ ready: "suppressed" });
      expect(citySlug(scene)).toBe("berlin");
    });
  });

  // A failed in-scene transition must still end the gate — otherwise root stays
  // navigating, map stays suppressed, and ui keeps dropping input forever.
  describe("a failed city load lifts the transition gate (recovery)", () => {
    const filter = { roomTypes: [], priceRange: null, nbhd: null };

    const expectGated = (scene: ReturnType<typeof setupSceneSystem>) => {
      expect(scene.actor.getSnapshot().value).toEqual({
        running: "navigating",
      });
      expect(scene.map?.getSnapshot().value).toEqual({ ready: "suppressed" });
      expect(scene.ui?.getSnapshot().value).toBe("navigating");
    };
    const expectRecovered = (scene: ReturnType<typeof setupSceneSystem>) => {
      expect(scene.actor.getSnapshot().value).toEqual({ running: "idle" });
      expect(scene.actor.getSnapshot().context.pendingSlug).toBeNull();
      expect(scene.map?.getSnapshot().value).toEqual({ ready: "interactive" });
      expect(scene.ui?.getSnapshot().value).toBe("active");
    };

    it("lifts the gate when the incoming Analyse load fails", () => {
      scene = setupSceneSystem();
      mountFakeMap(scene);
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "berlin" }),
        filter,
      });
      expectGated(scene);

      (scene.city as CityMachineActor).send({
        type: "WORKER.FETCH_ERROR",
        slug: "berlin",
        snapshotId: "2025-09",
        error: new Error("boom"),
      });

      expect((scene.city as CityMachineActor).getSnapshot().value).toEqual({
        analyse: "error",
      });
      expectRecovered(scene);
    });

    it("lifts the gate when the incoming Browse load fails", async () => {
      scene = setupSceneSystem({ failBrowse: true });
      mountFakeMap(scene);
      scene.ui?.send({ type: "UI.SET_LENS", lens: "browse" });
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "berlin" }),
        filter,
      });
      expectGated(scene);

      // The browse loader rejects on a microtask; let it settle.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((scene.city as CityMachineActor).getSnapshot().value).toEqual({
        browse: "error",
      });
      expectRecovered(scene);
    });

    it("leaves a first-entry failure ungated (nothing to recover)", () => {
      scene = setupSceneSystem();
      mountFakeMap(scene);
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });

      (scene.city as CityMachineActor).send({
        type: "WORKER.FETCH_ERROR",
        slug: "london",
        snapshotId: "2025-09",
        error: new Error("boom"),
      });

      expect((scene.city as CityMachineActor).getSnapshot().value).toEqual({
        analyse: "error",
      });
      // Never gated, so CITY.FAILED is a harmless no-op everywhere.
      expectRecovered(scene);
    });
  });
});
