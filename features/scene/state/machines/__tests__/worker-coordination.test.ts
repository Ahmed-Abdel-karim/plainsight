import { afterEach, describe, expect, it } from "vitest";

import type { RoomType } from "@/data/contract";
import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import { QueryClient } from "@tanstack/react-query";

import type { CityMachineActor } from "../city/machine";
import { makePrefetch } from "../root/prefetch";
import type { UiMachineActor } from "../ui/machine";
import type { TransportCommand } from "../worker/transport";
import { finishLoad, setupSceneSystem } from "./utils";

type PostCommand = Extract<TransportCommand, { type: "POST" }>;
type LoadCommand = Extract<TransportCommand, { type: "LOAD" }>;

const posts = (commands: TransportCommand[]): PostCommand[] =>
  commands.filter((c): c is PostCommand => c.type === "POST");

const loads = (commands: TransportCommand[]): LoadCommand[] =>
  commands.filter((c): c is LoadCommand => c.type === "LOAD");

/** The id the worker stamped on the first POST of a process type — the request
 *  the converge-time entry actions issued. */
const firstRequestId = (commands: TransportCommand[], type: string) =>
  posts(commands).find((c) => c.message.type === type)?.message.requestId;

const workerMode = (scene: ReturnType<typeof setupSceneSystem>): string =>
  (scene.worker?.getSnapshot().value as { mode: string }).mode;

const workerData = (scene: ReturnType<typeof setupSceneSystem>): string =>
  (scene.worker?.getSnapshot().value as { data: string }).data;

const filter = { roomTypes: [], priceRange: null, nbhd: null };

/**
 * Worker calculation coordination — driven through the connected system (real
 * root/city/worker, fake transport). The worker runs two parallel regions:
 *
 * - `data` (`unloaded → loading → loaded`) owns dataset identity. A *different*
 *   load replaces the active dataset; an *identical* load is acknowledged from
 *   cache without a transport round-trip. City replacement no longer cancels the
 *   shared worker.
 * - `mode` (`suspended ⇄ active`) gates calculations. While `active`, each type
 *   coalesces (at most one request in flight; newest target wins; an outdated
 *   response re-posts the latest target), and a cache hit re-delivers without a
 *   round-trip. While `suspended` (the browse leg), new requests are omitted and
 *   in-flight responses settle + cache without being delivered.
 */
describe("worker calculation coordination", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  /** Spawn a city and converge its load by driving the load response through the
   *  worker (so it enters `data.loaded`, routes `FETCH_OK` to the city, and the
   *  ready leg posts the two converge-time recomputes, both now in flight). */
  const convergedCity = () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });
    scene.transport.response({
      type: "TRANSPORT.LOAD_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: {
          type: "load",
          data: { slug: framing.slug, snapshotId: framing.snapshotId },
        },
      },
    });
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
    const commands = scene!.transport.commands;
    const settled = posts(commands).length; // the converge-time hexes + aggregates

    // The converge-time hexes + aggregates are in flight, so this filter change
    // is coalesced onto each slot's target (newest wins), not posted yet.
    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });
    expect(posts(commands)).toHaveLength(settled);

    // Draining the in-flight responses re-posts the latest (new-filter) targets.
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: [] },
      },
    });
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });

    const restarted = posts(commands).slice(settled);
    expect(restarted.map((c) => c.message.type)).toEqual(
      expect.arrayContaining(["hexes", "aggregates"]),
    );
    expect(
      restarted.every((c) => c.message.params.filters.roomTypes.length === 1),
    ).toBe(true);
  });

  it("keeps one request in flight after an idle slot posts fresh work", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const aggregatePosts = () =>
      posts(commands).filter((c) => c.message.type === "aggregates");

    // Settle the converge-time aggregate request so the slot becomes idle.
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });
    const settled = aggregatePosts().length;

    // The first filter posts immediately. The second becomes the latest target
    // without posting while that new request is in flight.
    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });
    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Private room"],
    });
    expect(aggregatePosts()).toHaveLength(settled + 1);
    expect(
      scene!.worker?.getSnapshot().context.slots.aggregates.targetRequest,
    ).toMatchObject({
      params: { filters: { roomTypes: ["Private room"] } },
    });

    // Settling the outdated request posts only the latest target.
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });
    expect(aggregatePosts()).toHaveLength(settled + 2);
    expect(aggregatePosts().at(-1)?.message).toMatchObject({
      params: { filters: { roomTypes: ["Private room"] } },
    });
  });

  it("drops the dead response of an outdated request and delivers the current one", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const staleAggId = firstRequestId(commands, "aggregates");

    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });
    expect(city.getSnapshot().context.aggregates).toBeNull();

    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        requestId: staleAggId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });
    expect(city.getSnapshot().context.aggregates).toBeNull();

    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });
    expect(city.getSnapshot().context.aggregates).not.toBeNull();
  });

  it("settles outdated work without reposting a target already served from cache", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];

    // Cache resolution 6, then start resolution 7.
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: cells },
      },
    });
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 7 });
    const postsWithSeven = posts(commands).length;

    // Returning to resolution 6 is served immediately from cache while 7 is
    // still running. When 7 settles, it must not repost the already-served 6.
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 6 });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: [] },
      },
    });

    expect(posts(commands)).toHaveLength(postsWithSeven);
    expect(
      scene!.worker?.getSnapshot().context.slots.hexes.pendingRequestId,
    ).toBeNull();
  });

  it("delivers a process error for the current request and keeps the last result", () => {
    const { framing, city } = convergedCity();
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: cells },
      },
    });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);

    // A later hexes recompute fails — the last good result stays on screen.
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 7 });
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "error",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", error: new Error("compute failed") },
      },
    });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("omits an outdated process error and posts only the latest target", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const staleAggId = firstRequestId(commands, "aggregates");

    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });
    const before = posts(commands).length;
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "error",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        requestId: staleAggId,
        payload: { type: "aggregates", error: new Error("stale failure") },
      },
    });

    expect(posts(commands)).toHaveLength(before + 1);
    expect(posts(commands).at(-1)?.message).toMatchObject({
      type: "aggregates",
      params: { filters: { roomTypes: ["Entire home/apt"] } },
    });
  });

  it("suspended mode settles and caches an in-flight response without delivering it", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];

    // Suspend, then land the in-flight converge-time hexes response.
    scene!.worker?.send({ type: "WORKER.SUSPEND" });
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: cells },
      },
    });
    // Settled + cached, but not delivered while suspended.
    expect(city.getSnapshot().context.hexCells).toBeNull();

    // Resuming and re-requesting the identical hexes serves the suspended cache
    // with no new worker post.
    const hexPostsBefore = posts(commands).filter(
      (c) => c.message.type === "hexes",
    ).length;
    scene!.worker?.send({ type: "WORKER.RESUME" });
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 6 });
    expect(
      posts(commands).filter((c) => c.message.type === "hexes"),
    ).toHaveLength(hexPostsBefore);
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("suspended mode settles a failure without delivering or replacing work", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const before = posts(commands).length;

    scene!.worker?.send({ type: "WORKER.SUSPEND" });
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "error",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", error: new Error("compute failed") },
      },
    });

    expect(posts(commands)).toHaveLength(before);
    expect(city.getSnapshot().context.hexCells).toBeNull();
    expect(
      scene!.worker?.getSnapshot().context.slots.hexes.pendingRequestId,
    ).toBeNull();
  });

  it("switching the lens to browse suspends the worker without cancelling the load", () => {
    convergedCity();
    const commands = scene!.transport.commands;

    (scene!.ui as UiMachineActor).send({ type: "UI.SET_LENS", lens: "browse" });

    expect(workerMode(scene!)).toBe("suspended");
    expect(commands).not.toContainEqual({ type: "CANCEL_LOAD" });
  });

  it("returning to analyse re-requests and serves the cached results", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];

    // Settle both converge-time recomputes so they are cached.
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: cells },
      },
    });
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });
    const settledPosts = posts(commands).length;

    const ui = scene!.ui as UiMachineActor;
    ui.send({ type: "UI.SET_LENS", lens: "browse" });
    ui.send({ type: "UI.SET_LENS", lens: "analyse" });

    // Back in analyse: both recomputes are re-requested but served from cache —
    // no new worker posts — and the cached hexes are re-delivered.
    expect(posts(commands)).toHaveLength(settledPosts);
    expect(workerMode(scene!)).toBe("active");
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("acknowledges an identical load from cache without a new transport load", () => {
    const { framing } = convergedCity();
    const commands = scene!.transport.commands;
    expect(loads(commands)).toHaveLength(1);

    // A new city actor for the same dataset (e.g. a revisit) must not wait on a
    // transport round-trip — the loaded worker acknowledges it from cache.
    scene!.actor.send({ type: "CITY.CHANGED", payload: framing, filter });

    expect(loads(commands)).toHaveLength(1);
    expect(commands).not.toContainEqual({ type: "CANCEL_LOAD" });
    expect((scene!.city as CityMachineActor).getSnapshot().value).toEqual({
      analyse: "ready",
    });
  });

  it("replacing the city loads the new dataset without cancelling the worker", () => {
    convergedCity();
    const commands = scene!.transport.commands;

    scene!.actor.send({
      type: "CITY.CHANGED",
      payload: makeMapCityPayload({ slug: "berlin" }),
      filter,
    });

    const loaded = loads(commands);
    expect(loaded).toHaveLength(2);
    expect(loaded[1]).toMatchObject({ type: "LOAD", slug: "berlin" });
    expect(commands).not.toContainEqual({ type: "CANCEL_LOAD" });
  });

  it("deduplicates an identical load already in flight", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });
    const commands = scene.transport.commands;

    scene.worker?.send({
      type: "WORKER.REQUEST_LOAD",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });

    expect(loads(commands)).toHaveLength(1);
  });

  it("retains calculation intent instead of posting while replacement data loads", () => {
    const { city } = convergedCity();
    const commands = scene!.transport.commands;
    const before = posts(commands).length;
    const berlin = makeMapCityPayload({ slug: "berlin" });

    scene!.worker?.send({
      type: "WORKER.REQUEST_LOAD",
      slug: berlin.slug,
      snapshotId: berlin.snapshotId,
      assetUrl: `/city-assets/${berlin.slug}/${berlin.snapshotId}/analytics.json`,
    });
    expect(workerData(scene!)).toBe("loading");

    // Map lifecycle can still report resolution while navigation interaction is
    // suppressed. The old city's intent is retained, never posted against the
    // data region while it is loading the replacement dataset.
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 7 });
    expect(posts(commands)).toHaveLength(before);
    expect(
      scene!.worker?.getSnapshot().context.slots.hexes.targetRequest,
    ).toMatchObject({ slug: "london", type: "hexes" });
  });

  it("resumes worker mode before an Analyse navigation prefetch load", () => {
    const queryClient = new QueryClient();
    scene = setupSceneSystem({
      prefetch: makePrefetch({ berlin: "2025-09" }, queryClient),
    });
    expect(workerMode(scene)).toBe("suspended");

    scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });

    expect(workerMode(scene)).toBe("active");
    expect(loads(scene.transport.commands)).toContainEqual({
      type: "LOAD",
      slug: "berlin",
      snapshotId: "2025-09",
      assetUrl: "/city-assets/berlin/2025-09/analytics.json",
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
    const commands = scene.transport.commands;

    // Navigating toward berlin warms its load during the nav window (prefetch),
    // even though no berlin city actor exists yet.
    scene.actor.send({ type: "NAV.STARTED", path: "/berlin" });
    const berlinLoads = () =>
      loads(commands).filter((c) => c.slug === "berlin");
    expect(berlinLoads()).toHaveLength(1);

    // The prefetch load resolves while london is still the current city.
    const berlin = makeMapCityPayload({ slug: "berlin" });
    finishLoad(scene, berlin);

    // The berlin city actor is now spawned: it reuses the warmed load (cached
    // ack, no second transport round-trip, no cancel) and converges to ready.
    scene.actor.send({ type: "CITY.CHANGED", payload: berlin, filter });
    expect(berlinLoads()).toHaveLength(1);
    expect(commands).not.toContainEqual({ type: "CANCEL_LOAD" });
    expect((scene.city as CityMachineActor).getSnapshot().value).toEqual({
      analyse: "ready",
    });
  });

  it("cancels only the in-flight load on WORKER.CANCEL_LOAD and returns to unloaded", () => {
    scene = setupSceneSystem();
    const framing = makeMapCityPayload();
    scene.actor.send({ type: "CITY.CHANGED", payload: framing, filter });
    const commands = scene.transport.commands;
    const city = scene.city as CityMachineActor;

    // A load is in flight (the load response is never driven here).
    expect(loads(commands)).toHaveLength(1);
    expect(workerData(scene)).toBe("loading");

    scene.worker?.send({ type: "WORKER.CANCEL_LOAD" });

    // Transport is told to cancel; the data region returns to `unloaded` and
    // forgets the requested dataset.
    expect(commands).toContainEqual({ type: "CANCEL_LOAD" });
    expect(workerData(scene)).toBe("unloaded");
    expect(
      (scene.worker!.getSnapshot().context as { requestedDataset: unknown })
        .requestedDataset,
    ).toBeNull();

    // A late response for the cancelled load is ignored — the city never converges.
    scene.transport.response({
      type: "TRANSPORT.LOAD_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: {
          type: "load",
          data: { slug: framing.slug, snapshotId: framing.snapshotId },
        },
      },
    });
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

  it("preserves retained calculation targets when the matching load fails", () => {
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
    const slots = scene.worker?.getSnapshot().context.slots;
    expect(slots?.hexes.targetRequest).toMatchObject({ slug: framing.slug });
    expect(slots?.aggregates.targetRequest).toMatchObject({
      slug: framing.slug,
    });
    expect(slots?.hexes.pendingRequestId).toBeNull();
    expect(slots?.aggregates.pendingRequestId).toBeNull();

    scene.worker?.send({
      type: "WORKER.REQUEST_LOAD",
      slug: framing.slug,
      snapshotId: framing.snapshotId,
      assetUrl: `/city-assets/${framing.slug}/${framing.snapshotId}/analytics.json`,
    });
    expect(workerData(scene)).toBe("loading");
    expect(
      scene.worker?.getSnapshot().context.slots.hexes.targetRequest,
    ).toMatchObject({ slug: framing.slug });
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
    expect(loads(scene.transport.commands)).toHaveLength(1);
  });

  it("routes a hexes response without touching aggregates", () => {
    const { framing, city } = convergedCity();

    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: [] },
      },
    });

    expect(city.getSnapshot().context.hexCells).toEqual([]);
    expect(city.getSnapshot().context.aggregates).toBeNull();
  });

  it("re-delivers a cached result without a new post on an identical request", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;

    // Settle the converge-time hexes so its result is cached.
    const cells = [{ h3: "hex-1", count: 5, medianPrice: 100, ring: [] }];
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: cells },
      },
    });
    expect(city.getSnapshot().context.hexCells).toEqual(cells);

    const hexPosts = () =>
      posts(commands).filter((c) => c.message.type === "hexes");
    const before = hexPosts().length;

    // An identical hex request: the map hasn't moved, so `requestHexes` rebuilds
    // the same content key as the converge request.
    city.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 6 });

    // Served from cache — no new worker post, result re-delivered.
    expect(hexPosts()).toHaveLength(before);
    expect(city.getSnapshot().context.hexCells).toEqual(cells);
  });

  it("drops a previous city's in-flight recompute reply instead of reposting the new city's work", () => {
    const { framing: london } = convergedCity();
    const commands = scene!.transport.commands;
    // The london converge-time hexes recompute is in flight — its reply is never
    // driven here, and switching cities does not cancel the running worker.
    const staleHexId = firstRequestId(commands, "hexes");

    // Switch to berlin and converge it: berlin posts its own hexes recompute,
    // which becomes the slot's in-flight request.
    const berlin = makeMapCityPayload({ slug: "berlin" });
    scene!.actor.send({ type: "CITY.CHANGED", payload: berlin, filter });
    finishLoad(scene!, berlin);

    const hexPosts = () =>
      posts(commands).filter((c) => c.message.type === "hexes");
    const before = hexPosts().length;
    const berlinHexId =
      scene!.worker?.getSnapshot().context.slots.hexes.pendingRequestId;
    expect(berlinHexId).not.toBe(staleHexId);

    // The slow london recompute finally responds. It is a stale reply for a
    // different request; it must be dropped — never settling berlin's in-flight
    // request nor reposting it (which would double-run the expensive recompute).
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: london.slug,
        snapshotId: london.snapshotId,
        requestId: staleHexId,
        payload: { type: "hexes", data: [] },
      },
    });

    expect(hexPosts()).toHaveLength(before);
    expect(
      scene!.worker?.getSnapshot().context.slots.hexes.pendingRequestId,
    ).toBe(berlinHexId);
  });

  it("identifies the in-flight reply by request id, not city alone, on a return visit", () => {
    // London's converge hexes (empty filter) is in flight; capture its id.
    const { framing: london } = convergedCity();
    const commands = scene!.transport.commands;
    const staleHexId = firstRequestId(commands, "hexes");

    // Away to berlin and back to london — but with a different filter, so london's
    // new converge hexes is a *different* request than the one still in flight.
    const berlin = makeMapCityPayload({ slug: "berlin" });
    scene!.actor.send({ type: "CITY.CHANGED", payload: berlin, filter });
    finishLoad(scene!, berlin);
    const revisitFilter = {
      ...filter,
      roomTypes: ["Entire home/apt"] as RoomType[],
    };
    scene!.actor.send({
      type: "CITY.CHANGED",
      payload: london,
      filter: revisitFilter,
    });
    finishLoad(scene!, london);

    const hexPosts = () =>
      posts(commands).filter((c) => c.message.type === "hexes");
    const before = hexPosts().length;
    const inFlightId =
      scene!.worker?.getSnapshot().context.slots.hexes.pendingRequestId;
    expect(inFlightId).not.toBe(staleHexId);

    // The original london recompute finally responds. Its slug matches the current
    // city, so a city-only check would treat it as in-flight and repost the newer
    // request; the request-id check recognises it as stale and drops it.
    scene!.transport.response({
      type: "TRANSPORT.PROCESS_RESPONSE",
      message: {
        status: "success",
        slug: london.slug,
        snapshotId: london.snapshotId,
        requestId: staleHexId,
        payload: { type: "hexes", data: [] },
      },
    });

    expect(hexPosts()).toHaveLength(before);
    expect(
      scene!.worker?.getSnapshot().context.slots.hexes.pendingRequestId,
    ).toBe(inFlightId);
  });
});
