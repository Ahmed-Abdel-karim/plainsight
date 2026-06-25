import { afterEach, describe, expect, it } from "vitest";

import { makeMapCityPayload } from "@/test/fixtures/browse";
import { makeAggregates } from "@/test/fixtures/dataset";

import type { CityMachineActor } from "../city/machine";
import type { UiMachineActor } from "../ui/machine";
import type { TransportCommand } from "../worker/transport";
import { setupSceneSystem } from "./utils";

type PostCommand = Extract<TransportCommand, { type: "POST" }>;
type CancelCommand = Extract<TransportCommand, { type: "CANCEL" }>;

const posts = (commands: TransportCommand[]): PostCommand[] =>
  commands.filter((c): c is PostCommand => c.type === "POST");
const cancels = (commands: TransportCommand[]): CancelCommand[] =>
  commands.filter((c): c is CancelCommand => c.type === "CANCEL");

/** The id the worker stamped on the first POST of a process type — the request
 *  the converge-time entry actions issued. */
const firstRequestId = (commands: TransportCommand[], type: string) =>
  posts(commands).find((c) => c.message.type === type)?.message.requestId;

const filter = { roomTypes: [], priceRange: null, nbhd: null };

/**
 * Worker coalescing as explicit state: each process type is a parallel region
 * (`idle` ⇄ `busy`). A request while `busy` cancels the in-flight task and starts
 * the new one (cancel + restart, not queue); a reply whose id is no longer the
 * region's current id — the dead reply of a cancelled task — is dropped. Driven
 * through the connected system (real root/city/worker, fake transport).
 */
describe("worker cancellation and coalescing", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  /** Spawn a city and converge its load so the analyse leg posts the two
   *  converge-time recomputes (hexes then aggregates), both now in flight. */
  const convergedCity = () => {
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
    return { framing, city };
  };

  it("cancels the in-flight recomputes and restarts them on a filter change", () => {
    const { city } = convergedCity();
    const commands = scene!.transport.commands;
    const hexId = firstRequestId(commands, "hexes");
    const aggId = firstRequestId(commands, "aggregates");

    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });

    expect(cancels(commands)).toEqual(
      expect.arrayContaining([
        { type: "CANCEL", requestId: hexId },
        { type: "CANCEL", requestId: aggId },
      ]),
    );
    const restarted = posts(commands).filter(
      (c) => c.message.requestId > (aggId ?? 0),
    );
    expect(restarted.map((c) => c.message.type)).toEqual(
      expect.arrayContaining(["hexes", "aggregates"]),
    );
    expect(
      restarted.every((c) => c.message.params.filters.roomTypes.length === 1),
    ).toBe(true);
  });

  it("drops the dead reply of a cancelled request and delivers the current one", () => {
    const { framing, city } = convergedCity();
    const commands = scene!.transport.commands;
    const staleAggId = firstRequestId(commands, "aggregates");

    city.send({
      type: "FILTER.SET_ROOM_TYPES",
      roomTypes: ["Entire home/apt"],
    });
    expect(city.getSnapshot().context.aggregates).toBeNull();

    scene!.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        requestId: staleAggId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });
    expect(city.getSnapshot().context.aggregates).toBeNull();

    scene!.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "aggregates", data: makeAggregates() },
      },
    });
    expect(city.getSnapshot().context.aggregates).not.toBeNull();
  });

  it("cancels every in-flight process on WORKER.CANCEL and returns to idle", () => {
    convergedCity();
    const commands = scene!.transport.commands;
    const hexId = firstRequestId(commands, "hexes");
    const aggId = firstRequestId(commands, "aggregates");

    scene!.worker?.send({ type: "WORKER.CANCEL" });

    expect(
      scene!.worker
        ?.getSnapshot()
        .matches({ hexes: "idle", aggregates: "idle" }),
    ).toBe(true);
    expect(cancels(commands)).toEqual(
      expect.arrayContaining([
        { type: "CANCEL", requestId: hexId },
        { type: "CANCEL", requestId: aggId },
      ]),
    );
    // The load region cancels the in-flight city load too (cache kept worker-side).
    expect(commands).toContainEqual({ type: "CANCEL_LOAD" });
  });

  it("cancels in-flight recomputes when the lens switches to browse", () => {
    convergedCity();
    const commands = scene!.transport.commands;
    const hexId = firstRequestId(commands, "hexes");
    const aggId = firstRequestId(commands, "aggregates");

    (scene!.ui as UiMachineActor).send({ type: "UI.SET_LENS", lens: "browse" });

    expect(cancels(commands)).toEqual(
      expect.arrayContaining([
        { type: "CANCEL", requestId: hexId },
        { type: "CANCEL", requestId: aggId },
      ]),
    );
    expect(
      scene!.worker
        ?.getSnapshot()
        .matches({ hexes: "idle", aggregates: "idle" }),
    ).toBe(true);
  });

  it("cancels in-flight recomputes when the city is replaced", () => {
    convergedCity();
    const commands = scene!.transport.commands;
    const hexId = firstRequestId(commands, "hexes");
    const aggId = firstRequestId(commands, "aggregates");

    scene!.actor.send({
      type: "CITY.CHANGED",
      payload: makeMapCityPayload({ slug: "berlin" }),
      filter,
    });

    expect(cancels(commands)).toEqual(
      expect.arrayContaining([
        { type: "CANCEL", requestId: hexId },
        { type: "CANCEL", requestId: aggId },
      ]),
    );
  });

  it("keeps the hexes and aggregates regions independent", () => {
    const { framing, city } = convergedCity();

    expect(
      scene!.worker
        ?.getSnapshot()
        .matches({ hexes: "busy", aggregates: "busy" }),
    ).toBe(true);

    scene!.transport.reply({
      type: "TRANSPORT.PROCESS_REPLY",
      message: {
        status: "success",
        slug: framing.slug,
        snapshotId: framing.snapshotId,
        payload: { type: "hexes", data: [] },
      },
    });

    expect(
      scene!.worker
        ?.getSnapshot()
        .matches({ hexes: "idle", aggregates: "busy" }),
    ).toBe(true);
    expect(city.getSnapshot().context.hexCells).toEqual([]);
    expect(city.getSnapshot().context.aggregates).toBeNull();
  });
});
