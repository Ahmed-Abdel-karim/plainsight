import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";

import type { CityMachineActor } from "../city/machine";
import type { CityErrorEmitted } from "../city/events";
import { setupSceneSystem } from "./utils";

/**
 * The city machine's failure signals — the contract the toast layer subscribes
 * to. Driven through the connected system (real root + worker, fake transport)
 * by sending the worker replies the city reacts to, asserting the emitted
 * `city.error` and the resulting state. Surfacing happens in jsdom (the toast
 * test); here we prove the machine emits each failure once, current-slug only.
 */
describe("city machine error signals", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  function startCity() {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({
      type: "CITY.CHANGED",
      payload: framing,
      filter: { roomTypes: [], priceRange: null, nbhd: null },
    });
    const city = scene.city as CityMachineActor;
    const emitted: CityErrorEmitted[] = [];
    city.on("city.error", (event) => emitted.push(event));
    return {
      city,
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      emitted,
    };
  }

  it("emits a load error and enters error on a current-slug fetch failure", () => {
    const { city, slug, snapshotId, emitted } = startCity();

    city.send({
      type: "WORKER.FETCH_ERROR",
      slug,
      snapshotId,
      error: new Error("boom"),
    });

    expect(city.getSnapshot().value).toEqual({ analyse: "error" });
    expect(emitted).toEqual([{ type: "city.error", kind: "load" }]);
  });

  it("drops a fetch failure addressed to a city we've navigated past", () => {
    const { city, snapshotId, emitted } = startCity();

    city.send({
      type: "WORKER.FETCH_ERROR",
      slug: "stale-slug",
      snapshotId,
      error: new Error("boom"),
    });

    expect(city.getSnapshot().value).toEqual({ analyse: "loading" });
    expect(emitted).toEqual([]);
  });

  it("emits a process error with its type and stays ready", () => {
    const { city, slug, snapshotId, emitted } = startCity();
    city.send({ type: "WORKER.FETCH_OK", slug, snapshotId, count: 3 });

    city.send({
      type: "WORKER.PROCESS_ERROR",
      slug,
      snapshotId,
      processType: "hexes",
      error: new Error("compute failed"),
    });

    expect(city.getSnapshot().value).toEqual({ analyse: "ready" });
    expect(emitted).toEqual([
      { type: "city.error", kind: "process", processType: "hexes" },
    ]);
  });

  it("drops a process error addressed to a city we've navigated past", () => {
    const { city, snapshotId, slug, emitted } = startCity();
    city.send({ type: "WORKER.FETCH_OK", slug, snapshotId, count: 3 });

    city.send({
      type: "WORKER.PROCESS_ERROR",
      slug: "stale-slug",
      snapshotId,
      processType: "hexes",
      error: new Error("compute failed"),
    });

    expect(city.getSnapshot().value).toEqual({ analyse: "ready" });
    expect(emitted).toEqual([]);
  });

  it("routes a current-slug process error through the worker to a toast", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({
      type: "CITY.CHANGED",
      payload: framing,
      filter: { roomTypes: [], priceRange: null, nbhd: null },
    });
    const city = scene.city as CityMachineActor;
    const emitted: CityErrorEmitted[] = [];
    city.on("city.error", (event) => emitted.push(event));
    // Converge so analyse.ready posts the recompute requests (slots pending).
    city.send({
      type: "WORKER.FETCH_OK",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      count: 3,
    });

    // A worker process error for the current city — deliverProcess must carry
    // its slug/snapshotId through so the city's guard accepts it.
    scene.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "error",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", error: new Error("compute failed") },
      },
    });

    expect(emitted).toEqual([
      { type: "city.error", kind: "process", processType: "hexes" },
    ]);
  });
});
