import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import type { CityMachineActor } from "../city/machine";
import type { TransportCommand } from "../worker/transport";
import { setupSceneSystem } from "./utils";

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
    city.send({ type: "WORKER.FETCH_OK", slug: framing.slug, count: 3 });

    // Settle the converge-time recomputes so the coalescing slots are free and
    // the filter-driven requests post immediately rather than queueing.
    scene.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
        payload: { type: "hexes", data: [] },
      },
    });
    scene.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
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
});
