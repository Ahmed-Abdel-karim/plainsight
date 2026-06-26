import { describe, expect, it, vi } from "vitest";
import { createActor } from "xstate";

import { transportActor } from "../worker/transport";

/**
 * The worker actor is session-lifetime inside the scene layout. The transport
 * must still defer the real `new Worker()` until a city actually sends a command,
 * so entering the scene shell never pays for a worker thread before it is needed.
 * These tests pin that timing via the `createWorker` seam.
 */
describe("transportActor worker lifecycle", () => {
  function fakeWorker() {
    return {
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
      terminate: vi.fn(),
    } as unknown as Worker;
  }

  it("does not create the worker on start, only on the first command", () => {
    const worker = fakeWorker();
    const createWorker = vi.fn(() => worker);
    const actor = createActor(transportActor, { input: { createWorker } });

    actor.start();
    expect(createWorker).not.toHaveBeenCalled();

    actor.send({
      type: "LOAD",
      slug: "london",
      snapshotId: "v1",
      assetUrl: "/x",
    });
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
  });

  it("reuses the same worker across commands and terminates it on stop", () => {
    const worker = fakeWorker();
    const createWorker = vi.fn(() => worker);
    const actor = createActor(transportActor, { input: { createWorker } });
    actor.start();

    actor.send({
      type: "LOAD",
      slug: "london",
      snapshotId: "v1",
      assetUrl: "/x",
    });
    actor.send({
      type: "LOAD",
      slug: "london",
      snapshotId: "v1",
      assetUrl: "/x",
    });
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);

    actor.stop();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it("does not terminate anything when stopped before any command", () => {
    const worker = fakeWorker();
    const createWorker = vi.fn(() => worker);
    const actor = createActor(transportActor, { input: { createWorker } });

    actor.start();
    actor.stop();
    expect(createWorker).not.toHaveBeenCalled();
    expect(worker.terminate).not.toHaveBeenCalled();
  });
});
