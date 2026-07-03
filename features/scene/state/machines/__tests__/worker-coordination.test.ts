import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import type { CityMachineActor } from "../city/machine";
import { makePrefetch } from "../root/prefetch";
import type { UiMachineActor } from "../ui/machine";
import { finishLoad, setupSceneSystem } from "./utils";

const loads = (scene: ReturnType<typeof setupSceneSystem>) =>
  scene.transport.commands.filter((c) => c.type === "LOAD");

/** The id the controller stamped on the first worker post of a process type — the
 *  request the converge-time entry actions issued. */
const firstRequestId = (
  scene: ReturnType<typeof setupSceneSystem>,
  type: string,
) => scene.transport.workerPosts.find((p) => p.type === type)?.requestId;

const workerMode = (scene: ReturnType<typeof setupSceneSystem>): string =>
  (scene.worker?.getSnapshot().value as { mode: string }).mode;

const workerData = (scene: ReturnType<typeof setupSceneSystem>): string =>
  (scene.worker?.getSnapshot().value as { data: string }).data;

const filter = { roomTypes: [], priceRange: null, nbhd: null };

/**
 * Worker coordination at the machine level — driven through the connected system
 * (real root/city/worker + controller, faked Worker). The machine runs two
 * parallel regions: `data` (`unloaded → loading → loaded`, with `error`) owns
 * dataset identity and load lifecycle; `mode` (`suspended ⇄ active`) gates whether
 * calculation requests are forwarded and results delivered. The coalescing/cache
 * invariants themselves live in the controller and are unit-tested in
 * `worker/controller/__tests__/process-controller.test.ts`.
 */
describe("worker coordination", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  /** Spawn a city and converge its load (so it enters `data.loaded`, routes
   *  `FETCH_OK` to the city, and the ready leg's recomputes flush to the worker). */
  const convergedCity = () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });
    finishLoad(scene, framing);
    const city = scene.city as CityMachineActor;
    return { framing, city };
  };

  it("starts unloaded and suspended", () => {
    scene = setupSceneSystem();

    expect(workerData(scene)).toBe("unloaded");
    expect(workerMode(scene)).toBe("suspended");
  });

  it("posts fresh requests with the new filter on a filter change", () => {
    const { framing, city } = convergedCity();
    const settled = scene!.transport.workerPosts.length; // converge hexes + aggregates

    // The converge-time recomputes are in flight, so this filter change coalesces
    // onto each channel's target (newest wins), not posted yet.
    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });
    expect(scene!.transport.workerPosts).toHaveLength(settled);

    // Draining the in-flight responses re-posts the latest (new-filter) targets.
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: [] },
    });
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "aggregates", data: makeAggregates() },
    });

    const restarted = scene!.transport.workerPosts.slice(settled);
    expect(restarted.map((p) => p.type)).toEqual(
      expect.arrayContaining(["hexes", "aggregates"]),
    );
    expect(
      restarted.every((p) => p.params.filters.roomTypes.length === 1),
    ).toBe(true);
  });

  it("drops the dead response of an outdated request and delivers the current one", () => {
    const { framing, city } = convergedCity();
    const staleAggId = firstRequestId(scene!, "aggregates");

    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });
    expect(city.getSnapshot().context.aggregates).toBeNull();

    // The outdated (converge-filter) reply is dropped, not delivered.
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      requestId: staleAggId,
      payload: { type: "aggregates", data: makeAggregates() },
    });
    expect(city.getSnapshot().context.aggregates).toBeNull();

    // The current (new-filter) reply is delivered.
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "aggregates", data: makeAggregates() },
    });
    expect(city.getSnapshot().context.aggregates).not.toBeNull();
  });

  it("settles outdated work without reposting a target already served from cache", () => {
    const { framing, city } = convergedCity();
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];

    // Cache resolution 6, then start resolution 7.
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: cells },
    });
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 7 });
    const postsWithSeven = scene!.transport.workerPosts.length;

    // Returning to resolution 6 is served immediately from cache while 7 is still
    // running. When 7 settles it must not repost the already-served 6.
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 6 });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: [] },
    });

    expect(scene!.transport.workerPosts).toHaveLength(postsWithSeven);
  });

  it("delivers a process error for the current request and keeps the last result", () => {
    const { framing, city } = convergedCity();
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: cells },
    });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);

    // A later hexes recompute fails — the last good result stays on screen.
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 7 });
    scene!.transport.workerReply({
      status: "error",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", error: new Error("compute failed") },
    });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("suspended mode settles and caches an in-flight response without delivering it", () => {
    const { framing, city } = convergedCity();
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];

    // Suspend, then land the in-flight converge-time hexes response.
    scene!.worker?.send({ type: "WORKER.SUSPEND" });
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: cells },
    });
    // Settled + cached, but not delivered while suspended.
    expect(city.getSnapshot().context.hexCells).toBeNull();

    // Resuming and re-requesting the identical hexes serves the cache with no new
    // worker post.
    const hexPostsBefore = scene!.transport.workerPosts.filter(
      (p) => p.type === "hexes",
    ).length;
    scene!.worker?.send({ type: "WORKER.RESUME" });
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 6 });
    expect(
      scene!.transport.workerPosts.filter((p) => p.type === "hexes"),
    ).toHaveLength(hexPostsBefore);
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("suspended mode settles a failure without delivering it", () => {
    const { framing, city } = convergedCity();
    const before = scene!.transport.workerPosts.length;

    scene!.worker?.send({ type: "WORKER.SUSPEND" });
    scene!.transport.workerReply({
      status: "error",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", error: new Error("compute failed") },
    });

    expect(scene!.transport.workerPosts).toHaveLength(before);
    expect(city.getSnapshot().context.hexCells).toBeNull();
  });

  it("switching the lens to browse suspends the worker without cancelling the load", () => {
    convergedCity();

    (scene!.ui as UiMachineActor).send({ type: "UI.SET_LENS", lens: "browse" });

    expect(workerMode(scene!)).toBe("suspended");
    expect(scene!.transport.commands).not.toContainEqual({
      type: "CANCEL_LOAD",
    });
  });

  it("returning to analyse re-requests and serves the cached results", () => {
    const { framing, city } = convergedCity();
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];

    // Settle both converge-time recomputes so they are cached.
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: cells },
    });
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "aggregates", data: makeAggregates() },
    });
    const settledPosts = scene!.transport.workerPosts.length;

    const ui = scene!.ui as UiMachineActor;
    ui.send({ type: "UI.SET_LENS", lens: "browse" });
    ui.send({ type: "UI.SET_LENS", lens: "analyse" });

    // Back in analyse: both recomputes are re-requested but served from cache —
    // no new worker posts — and the cached hexes are re-delivered.
    expect(scene!.transport.workerPosts).toHaveLength(settledPosts);
    expect(workerMode(scene!)).toBe("active");
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("re-delivers a cached result without a new post on an identical request", () => {
    const { framing, city } = convergedCity();
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];
    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: cells },
    });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);

    const before = scene!.transport.workerPosts.filter(
      (p) => p.type === "hexes",
    ).length;

    // An identical hex request: the map hasn't moved, so `requestHexes` rebuilds
    // the same content key as the converge request → served from cache.
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 6 });

    expect(
      scene!.transport.workerPosts.filter((p) => p.type === "hexes"),
    ).toHaveLength(before);
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("routes a hexes response without touching aggregates", () => {
    const { framing, city } = convergedCity();

    scene!.transport.workerReply({
      status: "success",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      payload: { type: "hexes", data: [] },
    });

    expect(city.getSnapshot().context.hexCells).toEqual([]);
    expect(city.getSnapshot().context.aggregates).toBeNull();
  });

  it("acknowledges an identical load from cache without a new transport load", () => {
    const { framing } = convergedCity();
    expect(loads(scene!)).toHaveLength(1);

    // A new city actor for the same dataset (a revisit) must not wait on a
    // transport round-trip — the loaded worker acknowledges it from cache.
    scene!.actor.send({ type: "CITY.CHANGED", payload: framing, filter });

    expect(loads(scene!)).toHaveLength(1);
    expect(scene!.transport.commands).not.toContainEqual({
      type: "CANCEL_LOAD",
    });
    expect((scene!.city as CityMachineActor).getSnapshot().value).toEqual({
      analyse: "ready",
    });
  });

  it("replacing the city loads the new dataset without cancelling the worker", () => {
    convergedCity();

    scene!.actor.send({
      type: "CITY.CHANGED",
      payload: makeMapCityPayload({ slug: "berlin" }),
      filter,
    });

    const loaded = loads(scene!);
    expect(loaded).toHaveLength(2);
    expect(loaded[1]).toMatchObject({ payload: { slug: "berlin" } });
    expect(scene!.transport.commands).not.toContainEqual({
      type: "CANCEL_LOAD",
    });
  });

  it("deduplicates an identical load already in flight", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });

    scene.worker?.send({
      type: "WORKER.REQUEST_LOAD",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });

    expect(loads(scene)).toHaveLength(1);
  });

  it("cancels only the in-flight load on WORKER.CANCEL_LOAD and returns to unloaded", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });
    const city = scene.city as CityMachineActor;

    expect(loads(scene)).toHaveLength(1);
    expect(workerData(scene)).toBe("loading");

    scene.worker?.send({ type: "WORKER.CANCEL_LOAD" });

    expect(scene.transport.commands).toContainEqual({ type: "CANCEL_LOAD" });
    expect(workerData(scene)).toBe("unloaded");
    expect(
      (scene.worker!.getSnapshot().context as { requestedDataset: unknown })
        .requestedDataset,
    ).toBeNull();

    // A late response for the cancelled load is ignored — the city never converges.
    finishLoad(scene, framing);
    expect(city.getSnapshot().value).toEqual({ analyse: "loading" });
  });

  it("drops an outdated load response and accepts only the current identity", () => {
    scene = setupSceneSystem();
    const london = makeMapCityPayload();
    const berlin = makeMapCityPayload({ slug: "berlin" });
    scene.actor.send({ type: "CITY.CHANGED", payload: london, filter });
    scene.worker?.send({
      type: "WORKER.REQUEST_LOAD",
      slug: berlin.slug,
      snapshotId: berlin.snapshotId,
      assetUrl: `/city-assets/${berlin.slug}/${berlin.snapshotId}/analytics.json`,
    });

    finishLoad(scene, london);
    expect(workerData(scene)).toBe("loading");

    finishLoad(scene, berlin);
    expect(workerData(scene)).toBe("loaded");
    expect(scene.worker?.getSnapshot().context.loadedDataset).toEqual({
      slug: berlin.slug,
      snapshotId: berlin.snapshotId,
    });
  });

  it("returns to loading on a same-dataset retry after a load failure", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });

    scene.transport.response({
      type: "TRANSPORT.LOAD_RESPONSE",
      message: {
        status: "error",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "load", error: new Error("load failed") },
      },
    });
    expect(workerData(scene)).toBe("error");

    scene.worker?.send({
      type: "WORKER.REQUEST_LOAD",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });
    expect(workerData(scene)).toBe("loading");
  });

  it("recovers from a transport failure on the next load", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();

    scene.transport.response({
      type: "TRANSPORT.WORKER_ERROR",
      error: new Error("worker crashed"),
    });
    expect(workerData(scene)).toBe("error");

    scene.worker?.send({
      type: "WORKER.REQUEST_LOAD",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });
    expect(workerData(scene)).toBe("loading");
    expect(loads(scene)).toHaveLength(1);
  });

  it("resumes worker mode before an Analyse navigation prefetch load", () => {
    const queryClient = new QueryClient();
    scene = setupSceneSystem({
      prefetch: makePrefetch({ berlin: "2025-09" }, queryClient),
    });
    expect(workerMode(scene)).toBe("suspended");

    scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });

    expect(workerMode(scene)).toBe("active");
    expect(loads(scene)).toContainEqual({
      type: "LOAD",
      payload: {
        slug: "berlin",
        snapshotId: "2025-09",
        assetUrl: "/city-assets/berlin/2025-09/analytics.json",
      },
    });
  });

  it("reuses a destination prefetch load across city replacement", () => {
    const queryClient = new QueryClient();
    const snapshotById = { london: "2025-09", berlin: "2025-09" };
    scene = setupSceneSystem({
      prefetch: makePrefetch(snapshotById, queryClient),
    });

    // Converge london in analyse.
    const london = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: london, filter });
    finishLoad(scene, london);

    // Navigating toward berlin warms its load during the nav window (prefetch),
    // even though no berlin city actor exists yet.
    scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });
    const berlinLoads = () =>
      loads(scene!).filter((c) => c.payload.slug === "berlin");
    expect(berlinLoads()).toHaveLength(1);

    // The prefetch load resolves while london is still the current city.
    const berlin = makeMapCityPayload({ slug: "berlin" });
    finishLoad(scene, berlin);

    // The berlin city actor is now spawned: it reuses the warmed load (cached ack,
    // no second transport round-trip, no cancel) and converges to ready.
    scene.actor.send({ type: "CITY.CHANGED", payload: berlin, filter });
    expect(berlinLoads()).toHaveLength(1);
    expect(scene.transport.commands).not.toContainEqual({
      type: "CANCEL_LOAD",
    });
    expect((scene.city as CityMachineActor).getSnapshot().value).toEqual({
      analyse: "ready",
    });
  });
});
