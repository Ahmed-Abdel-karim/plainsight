import { describe, expect, it } from "vitest";

import type {
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "@/lib/listings";

import { ProcessController } from "../process-controller";

type ProcessType = ProcessRequestMessage["type"];
const LONDON = { slug: "london", snapshotId: "2025-09" };
const BERLIN = { slug: "berlin", snapshotId: "2025-09" };

/** A request. Only `type`/`slug`/`snapshotId`/`requestId` matter to coordination
 *  (it is content-addressed); params are irrelevant, so they are stubbed. */
const req = (
  type: ProcessType,
  dataset: { slug: string; snapshotId: string },
  requestId: string,
): ProcessRequestMessage =>
  ({
    type,
    ...dataset,
    requestId,
    params: {},
  }) as unknown as ProcessRequestMessage;

const ok = (
  type: ProcessType,
  dataset: { slug: string; snapshotId: string },
  requestId: string,
): ProcessResponseMessage =>
  ({
    status: "success",
    ...dataset,
    requestId,
    payload: { type, data: [] },
  }) as unknown as ProcessResponseMessage;

const fail = (
  type: ProcessType,
  dataset: { slug: string; snapshotId: string },
  requestId: string,
): ProcessResponseMessage =>
  ({
    status: "error",
    ...dataset,
    requestId,
    payload: { type, error: new Error("compute failed") },
  }) as unknown as ProcessResponseMessage;

function setup() {
  const posted: ProcessRequestMessage[] = [];
  const emitted: ProcessResponseMessage[] = [];
  const controller = new ProcessController({
    postRequest: (m) => posted.push(m),
    emitResult: (r) => emitted.push(r),
  });
  const postedIds = () => posted.map((m) => m.requestId);
  const emittedIds = () => emitted.map((r) => r.requestId);
  return { controller, posted, emitted, postedIds, emittedIds };
}

describe("ProcessController coordination", () => {
  it("holds a request until its dataset is loaded, then flushes it", () => {
    const { controller, postedIds } = setup();

    controller.request(req("hexes", LONDON, "h1"));
    expect(postedIds()).toEqual([]); // data not loaded — held

    controller.dataReady(LONDON);
    expect(postedIds()).toEqual(["h1"]);
  });

  it("keeps one request in flight and coalesces to the newest target", () => {
    const { controller, postedIds, emittedIds } = setup();
    controller.dataReady(LONDON);

    controller.request(req("hexes", LONDON, "h1")); // posts immediately
    controller.request(req("hexes", LONDON, "h2")); // held behind h1
    controller.request(req("hexes", LONDON, "h3")); // newest wins over h2
    expect(postedIds()).toEqual(["h1"]);

    // h1 settles: it is superseded (h3 is newest), so it is not delivered; the
    // latest target posts instead.
    controller.receiveResponse(ok("hexes", LONDON, "h1"));
    expect(postedIds()).toEqual(["h1", "h3"]);
    expect(emittedIds()).toEqual([]);

    controller.receiveResponse(ok("hexes", LONDON, "h3"));
    expect(emittedIds()).toEqual(["h3"]);
  });

  it("delivers a response that matches the latest request", () => {
    const { controller, emittedIds } = setup();
    controller.dataReady(LONDON);
    controller.request(req("hexes", LONDON, "h1"));

    controller.receiveResponse(ok("hexes", LONDON, "h1"));
    expect(emittedIds()).toEqual(["h1"]);
  });

  it("serves an identical request from cache without a new post", () => {
    const { controller, postedIds, emittedIds } = setup();
    controller.dataReady(LONDON);
    controller.request(req("hexes", LONDON, "h1"));
    controller.receiveResponse(ok("hexes", LONDON, "h1")); // cached

    controller.request(req("hexes", LONDON, "h1")); // identical → cache hit
    expect(postedIds()).toEqual(["h1"]); // no second post
    expect(emittedIds()).toEqual(["h1", "h1"]); // re-delivered
  });

  it("routes by process type — a hexes reply never touches aggregates", () => {
    const { controller, emitted } = setup();
    controller.dataReady(LONDON);
    controller.request(req("hexes", LONDON, "h1"));
    controller.request(req("aggregates", LONDON, "a1"));

    controller.receiveResponse(ok("hexes", LONDON, "h1"));
    expect(emitted.map((r) => r.payload.type)).toEqual(["hexes"]);
  });

  it("passes an error response through without caching it", () => {
    const { controller, emitted, postedIds } = setup();
    controller.dataReady(LONDON);
    controller.request(req("hexes", LONDON, "h1"));

    controller.receiveResponse(fail("hexes", LONDON, "h1"));
    expect(emitted).toHaveLength(1);
    expect(emitted[0].status).toBe("error");

    // Re-requesting the same id is not served from cache (errors aren't cached).
    controller.request(req("hexes", LONDON, "h1"));
    expect(postedIds()).toEqual(["h1", "h1"]);
  });

  it("serializes a new city's recompute behind the old city's in-flight one (shared channel)", () => {
    const { controller, postedIds, emittedIds } = setup();
    controller.dataReady(LONDON);
    controller.request(req("hexes", LONDON, "L1")); // london in flight
    expect(postedIds()).toEqual(["L1"]);

    // Switch to berlin: its request coalesces onto the shared hexes channel but
    // is held while london's L1 is still in flight — no double post.
    controller.dataReady(BERLIN);
    controller.request(req("hexes", BERLIN, "B1"));
    expect(postedIds()).toEqual(["L1"]);

    // London's slow reply finally lands: it is stale (B1 is latest) so it is
    // dropped, and berlin's held request posts.
    controller.receiveResponse(ok("hexes", LONDON, "L1"));
    expect(postedIds()).toEqual(["L1", "B1"]);
    expect(emittedIds()).toEqual([]);

    controller.receiveResponse(ok("hexes", BERLIN, "B1"));
    expect(emittedIds()).toEqual(["B1"]);
  });

  it("reset abandons channels and forgets the loaded dataset, keeping cache", () => {
    const { controller, postedIds, emittedIds } = setup();
    controller.dataReady(LONDON);
    controller.request(req("hexes", LONDON, "h1"));
    controller.receiveResponse(ok("hexes", LONDON, "h1")); // cached

    controller.reset();

    // Data is forgotten: a request is held until a fresh dataReady.
    controller.request(req("aggregates", LONDON, "a1"));
    expect(postedIds()).toEqual(["h1"]); // nothing new posted

    // But the cache survived: the earlier result still serves instantly.
    controller.request(req("hexes", LONDON, "h1"));
    expect(emittedIds()).toEqual(["h1", "h1"]);
  });
});
