import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import type { CityMachineActor } from "../city/machine";
import type { UiMachineActor } from "../ui/machine";
import type { TransportCommand } from "../worker/transport";
import { setupSceneSystem } from "./utils";

type PostCommand = Extract<TransportCommand, { type: "POST" }>;
const posts = (commands: TransportCommand[]): PostCommand[] =>
  commands.filter((c): c is PostCommand => c.type === "POST");
const postTypes = (commands: TransportCommand[]) =>
  posts(commands).map((c) => c.message.type);

/** Flush the microtask + macrotask queue so the `ensureBrowseReady` promise and
 *  its `onDone` transition settle. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * The per-lens city legs: browse converges on the points tier alone (never the
 * worker), analyse owns the worker load + compute, and switching legs routes via
 * `LENS.CHANGED`. Driven through the connected system (real root/map/ui/worker,
 * fake transport + points loader).
 */
describe("city machine per-lens legs", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  const setLens = (lens: "browse" | "analyse") =>
    (scene!.ui as UiMachineActor).send({ type: "UI.SET_LENS", lens });

  const navigate = (framing = makeMapCityPayload()) => {
    scene!.actor.send({
      type: "CITY.CHANGED",
      payload: framing,
      filter: { roomTypes: [], priceRange: null, nbhd: null },
    });
    return framing;
  };

  it("converges the browse leg on points alone, never touching the worker (P1/P2)", async () => {
    scene = setupSceneSystem();
    setLens("browse"); // lens before spawn — the city reads it in `deciding`
    navigate();
    await tick();

    const city = scene.city as CityMachineActor;
    expect(city.getSnapshot().value).toEqual({ browse: "ready" });
    // No LOAD, no hex/aggregate posts — the worker was never asked.
    expect(scene.transport.commands).toEqual([]);
  });

  it("does not recompute on a filter change while in the browse leg (P2)", async () => {
    scene = setupSceneSystem();
    setLens("browse");
    navigate();
    await tick();
    const city = scene.city as CityMachineActor;

    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });

    expect(scene.transport.commands).toEqual([]);
    // The filter still landed in context (assigned at the parent).
    expect(city.getSnapshot().context.filter.roomTypes).toEqual([
      "Entire home/apt",
    ]);
  });

  it("loads and computes in the analyse leg", () => {
    scene = setupSceneSystem();
    const framing = navigate(); // default lens is analyse

    const city = scene.city as CityMachineActor;
    expect(city.getSnapshot().value).toEqual({ analyse: "loading" });
    expect(scene.transport.commands).toContainEqual({
      type: "LOAD",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });

    city.send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });
    expect(city.getSnapshot().value).toEqual({ analyse: "ready" });
    expect(postTypes(scene.transport.commands)).toEqual(
      expect.arrayContaining(["hexes", "aggregates"]),
    );
  });

  it("routes between legs on LENS.CHANGED", async () => {
    scene = setupSceneSystem();
    const framing = navigate();
    const city = scene.city as CityMachineActor;
    city.send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });
    expect(city.getSnapshot().value).toEqual({ analyse: "ready" });

    setLens("browse");
    await tick();
    expect(city.getSnapshot().value).toEqual({ browse: "ready" });
  });

  it("skips a redundant aggregate recompute when returning to analyse unchanged", async () => {
    scene = setupSceneSystem();
    const framing = navigate();
    const city = scene.city as CityMachineActor;
    city.send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });

    // Settle the first compute so the slots are free and `aggregates` is stored.
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

    setLens("browse");
    await tick();
    const before = postTypes(scene.transport.commands).filter(
      (t) => t === "aggregates",
    ).length;

    setLens("analyse");
    city.send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });
    expect(city.getSnapshot().value).toEqual({ analyse: "ready" });

    const after = postTypes(scene.transport.commands).filter(
      (t) => t === "aggregates",
    ).length;
    expect(after).toBe(before); // no new aggregates request
  });

  it("skips a redundant hex recompute when returning to analyse unchanged", async () => {
    scene = setupSceneSystem();
    const framing = navigate();
    const city = scene.city as CityMachineActor;
    city.send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });

    // Settle the first hex compute so `hexCells` + its key are stored.
    scene.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: [] },
      },
    });

    setLens("browse");
    await tick();
    const before = postTypes(scene.transport.commands).filter(
      (t) => t === "hexes",
    ).length;

    setLens("analyse");
    expect(city.getSnapshot().value).toEqual({ analyse: "ready" });

    const after = postTypes(scene.transport.commands).filter(
      (t) => t === "hexes",
    ).length;
    expect(after).toBe(before); // resolution band unchanged → no new hex request
  });
});
