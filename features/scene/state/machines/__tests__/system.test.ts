import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import type { CityMachineActor } from "../city/machine";
import type { UiMachineActor } from "../ui/machine";
import { finishLoad, mountFakeMap, setupSceneSystem } from "./utils";

const filter = { roomTypes: [], priceRange: null, nbhd: null };

/** Flush microtask + macrotask queues so the browse readiness promise settles. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Connected scene system — the real root + map + ui + worker + navigation actors,
 * driven by events and asserted on snapshots (no DOM, no Web Worker). The path
 * tracker itself is specced in `navigation/navigation.test.ts`; this pins the
 * coordinator wiring: city spawn + worker load, and the SUSPEND/RESUME fan-out.
 */
describe("connected scene system", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  it("boots with persistent session actors and no city yet", () => {
    scene = setupSceneSystem();

    expect(scene.map).toBeDefined();
    expect(scene.ui).toBeDefined();
    expect(scene.worker).toBeDefined();
    expect(scene.navigation).toBeDefined();
    expect(scene.city).toBeUndefined();
  });

  it("spawns the city and drives a worker load when a city is dispatched", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();

    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });

    expect(scene.city).toBeDefined();
    expect(scene.transport.commands).toContainEqual({
      type: "LOAD",
      payload: {
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
      },
    });
  });

  it("fans a converged city out to both the map (hexes) and analysis (aggregates)", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });

    finishLoad(scene, framing);

    const types = scene.transport.workerPosts.map((p) => p.type);
    expect(types).toContain("hexes");
    expect(types).toContain("aggregates");
  });

  it("fans a filter change out to both a hex and an aggregate recompute", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });
    const city = scene.city as CityMachineActor;
    finishLoad(scene, framing);

    // Settle the converge-time recomputes so the coalescing channels are free
    // and the filter-driven requests post immediately rather than queueing.
    scene.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: [] },
    });
    scene.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "aggregates", data: makeAggregates() },
    });

    const settled = scene.transport.workerPosts.length;
    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });

    const fresh = scene.transport.workerPosts.slice(settled);
    expect(fresh.map((p) => p.type)).toEqual(
      expect.arrayContaining(["hexes", "aggregates"]),
    );
    expect(fresh.every((p) => p.params.filters.roomTypes.length === 1)).toBe(
      true,
    );
  });

  // The coordinator translates the lifecycle inputs into the shared suppression
  // pair: NAV.STARTED → SUSPEND, CITY.READY/FAILED → RESUME, for map + ui alike.
  describe("suppression fan-out", () => {
    const suspended = (scene: ReturnType<typeof setupSceneSystem>) => {
      expect(
        scene.map?.getSnapshot().matches({ interaction: "suspended" }),
      ).toBe(true);
      expect(scene.ui?.getSnapshot().value).toBe("navigating");
    };
    const interactive = (scene: ReturnType<typeof setupSceneSystem>) => {
      expect(
        scene.map?.getSnapshot().matches({ interaction: "interactive" }),
      ).toBe(true);
      expect(scene.ui?.getSnapshot().value).toBe("active");
    };

    it("suspends map and ui on NAV.STARTED", () => {
      expect.hasAssertions();
      scene = setupSceneSystem();
      mountFakeMap(scene);

      scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });

      suspended(scene);
    });

    it("resumes map and ui on CITY.READY", () => {
      expect.hasAssertions();
      scene = setupSceneSystem();
      mountFakeMap(scene);
      scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });

      scene.actor.send({ type: "CITY.READY" });

      interactive(scene);
    });

    it("leaves a first entry (no NAV.STARTED) un-suppressed", () => {
      expect.hasAssertions();
      scene = setupSceneSystem();
      mountFakeMap(scene);

      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });

      interactive(scene);
    });
  });

  // The URL is authoritative for lens. UI.SET_LENS (user interaction) is dropped
  // while a switch suppresses `ui`, but UI.SYNC_LENS (the URL seed) must land in
  // every state — otherwise Back/Forward would show the last lens, not the URL's.
  describe("URL-authoritative lens sync (Back/Forward restore)", () => {
    it("applies UI.SYNC_LENS while navigating, where UI.SET_LENS is dropped", () => {
      expect.hasAssertions();
      scene = setupSceneSystem();
      const ui = scene.ui as UiMachineActor;

      scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });
      expect(ui.getSnapshot().value).toBe("navigating");

      // User interaction is suppressed mid-switch.
      ui.send({ type: "UI.SET_LENS", lens: "browse" });
      expect(ui.getSnapshot().context.lens).toBe("analyse");

      // The authoritative URL seed is not.
      ui.send({ type: "UI.SYNC_LENS", lens: "browse" });
      expect(ui.getSnapshot().context.lens).toBe("browse");
    });

    it("lands the spawned city on the leg synced mid-switch (restore to browse)", async () => {
      scene = setupSceneSystem();
      mountFakeMap(scene);

      // A Back/Forward city switch: suppression starts, then the loader syncs the
      // restored URL's lens and spawns the city — the order SceneUrlLoader uses.
      scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });
      (scene.ui as UiMachineActor).send({
        type: "UI.SYNC_LENS",
        lens: "browse",
      });
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "berlin" }),
        filter,
      });
      await tick();

      const city = scene.city as CityMachineActor;
      expect(city.getSnapshot().matches("browse")).toBe(true);
      // Browse converges on points alone — the worker is never asked to load.
      expect(scene.transport.commands).toEqual([]);
    });
  });

  describe("URL sync gating", () => {
    it("drops URL.SYNC during a city switch until the incoming city is ready", () => {
      let syncs = 0;
      scene = setupSceneSystem({ onSyncUrl: () => syncs++ });

      scene.actor.send({ type: "URL.SYNC" });
      expect(syncs).toBe(1);

      scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });
      scene.actor.send({ type: "URL.SYNC" });
      expect(syncs).toBe(1);

      scene.actor.send({ type: "CITY.READY" });
      scene.actor.send({ type: "URL.SYNC" });
      expect(syncs).toBe(2);
    });
  });

  // A failed in-scene transition must still resume map + ui — otherwise they stay
  // suppressed and keep dropping input forever.
  describe("a failed city load resumes map and ui (recovery)", () => {
    const startSwitch = (
      scene: ReturnType<typeof setupSceneSystem>,
      incoming: ReturnType<typeof makeMapCityPayload>,
    ) => {
      scene.actor.send({
        type: "CITY.CHANGED",
        payload: makeMapCityPayload({ slug: "london" }),
        filter,
      });
      scene.actor.send({ type: "NAV.STARTED", path: `/${incoming.slug}` });
      scene.actor.send({ type: "CITY.CHANGED", payload: incoming, filter });
    };

    it("resumes when the incoming Analyse load fails", () => {
      scene = setupSceneSystem();
      mountFakeMap(scene);
      const berlin = makeMapCityPayload({ slug: "berlin" });
      startSwitch(scene, berlin);

      expect(
        scene.map?.getSnapshot().matches({ interaction: "suspended" }),
      ).toBe(true);

      (scene.city as CityMachineActor).send({
        type: "WORKER.FETCH_ERROR",
        slug: berlin.slug,
        snapshotId: berlin.snapshotId,
        error: new Error("boom"),
      });

      expect((scene.city as CityMachineActor).getSnapshot().value).toEqual({
        analyse: "error",
      });
      expect(
        scene.map?.getSnapshot().matches({ interaction: "interactive" }),
      ).toBe(true);
      expect(scene.ui?.getSnapshot().value).toBe("active");
    });

    it("resumes when the incoming Browse load fails", async () => {
      scene = setupSceneSystem({ failBrowse: true });
      mountFakeMap(scene);
      scene.ui?.send({ type: "UI.SET_LENS", lens: "browse" });
      const berlin = makeMapCityPayload({ slug: "berlin" });
      startSwitch(scene, berlin);

      expect(
        scene.map?.getSnapshot().matches({ interaction: "suspended" }),
      ).toBe(true);

      // The browse loader rejects on a microtask; let it settle.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect((scene.city as CityMachineActor).getSnapshot().value).toEqual({
        browse: "error",
      });
      expect(
        scene.map?.getSnapshot().matches({ interaction: "interactive" }),
      ).toBe(true);
      expect(scene.ui?.getSnapshot().value).toBe("active");
    });
  });

  // SCENE.RESET is fired from the RouteListener cleanup when `cacheComponents`
  // hides the scene subtree (navigation left `/city`). It returns every session
  // actor to its initial resting state so the preserved XState snapshot rehydrates
  // clean and the next load on re-show is real, not a stale dedupe/cached ack.
  describe("scene reset (SCENE.RESET)", () => {
    const berlin = makeMapCityPayload({ slug: "berlin" });

    const loadedScene = () => {
      const s = setupSceneSystem();
      mountFakeMap(s);
      s.actor.send({ type: "CITY.CHANGED", payload: berlin, filter });
      finishLoad(s, berlin);
      return s;
    };

    it("returns the worker to unloaded/suspended and resets the transport controller", () => {
      scene = loadedScene();
      expect(scene.worker?.getSnapshot().matches({ data: "loaded" })).toBe(
        true,
      );

      scene.actor.send({ type: "SCENE.RESET" });

      const worker = scene.worker!.getSnapshot();
      expect(worker.matches({ data: "unloaded" })).toBe(true);
      expect(worker.matches({ mode: "suspended" })).toBe(true);
      expect(worker.context.loadedDataset).toBeNull();
      expect(scene.transport.commands).toContainEqual({ type: "RESET" });
    });

    it("returns navigation to idle and clears currentPath", () => {
      scene = loadedScene();
      scene.navigation?.send({ type: "NAV.COMMIT", path: "/berlin" });
      expect(scene.navigation?.getSnapshot().context.currentPath).toBe(
        "/berlin",
      );

      scene.actor.send({ type: "SCENE.RESET" });

      const nav = scene.navigation!.getSnapshot();
      expect(nav.value).toBe("idle");
      expect(nav.context.currentPath).toBeNull();
      expect(nav.context.pendingPath).toBeNull();
    });

    it("returns root to settled and resumes map + ui", () => {
      scene = loadedScene();
      scene.actor.send({ type: "NAV.STARTED", path: "/london" });
      expect(
        scene.map?.getSnapshot().matches({ interaction: "suspended" }),
      ).toBe(true);

      scene.actor.send({ type: "SCENE.RESET" });

      expect(scene.actor.getSnapshot().value).toBe("settled");
      expect(
        scene.map?.getSnapshot().matches({ interaction: "interactive" }),
      ).toBe(true);
      expect(scene.ui?.getSnapshot().value).toBe("active");
    });

    it("makes a re-dispatched same-city load a real reload, not a stale dedupe", () => {
      scene = loadedScene();
      const loadsBefore = scene.transport.commands.filter(
        (c) => c.type === "LOAD",
      ).length;

      scene.actor.send({ type: "SCENE.RESET" });
      // Re-show: the page re-dispatches CITY.CHANGED for the same slug.
      scene.actor.send({ type: "CITY.CHANGED", payload: berlin, filter });

      const loadsAfter = scene.transport.commands.filter(
        (c) => c.type === "LOAD",
      ).length;
      expect(loadsAfter).toBeGreaterThan(loadsBefore);
    });
  });
});
