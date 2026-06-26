import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import type { CityMachineActor } from "../city/machine";
import type { TransportCommand } from "../worker/transport";
import { mountFakeMap, setupSceneSystem } from "./utils";

type PostCommand = Extract<TransportCommand, { type: "POST" }>;
const posts = (commands: TransportCommand[]): PostCommand[] =>
  commands.filter((c): c is PostCommand => c.type === "POST");

const filter = { roomTypes: [], priceRange: null, nbhd: null };

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
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });
  });

  it("fans a converged city out to both the map (hexes) and analysis (aggregates)", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });

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
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });
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
});
