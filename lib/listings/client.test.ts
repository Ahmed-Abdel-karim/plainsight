import { describe, expect, it, vi } from "vitest";

import { CityListingsClient, type ListingsCallbacks } from "./client";
import type { ResponseMessage } from "./worker";

/** A minimal Worker stand-in: records posts and replays replies synchronously. */
class FakeWorker {
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  posted: { type: string; slug?: string }[] = [];
  addEventListener(type: string, cb: (e: unknown) => void) {
    (this.listeners[type] ??= []).push(cb);
  }
  removeEventListener() {}
  postMessage(message: { type: string; slug?: string }) {
    this.posted.push(message);
  }
  terminate() {}
  emit(message: ResponseMessage) {
    this.listeners.message?.forEach((cb) => cb({ data: message }));
  }
}

function setup(slug = "london") {
  const worker = new FakeWorker();
  const callbacks: ListingsCallbacks = {
    onFetchSuccess: vi.fn(),
    onFetchError: vi.fn(),
    onProcessSuccess: vi.fn(),
    onProcessError: vi.fn(),
  };
  const client = new CityListingsClient({
    slug,
    callbacks,
    createWorker: () => worker as unknown as Worker,
  });
  return { worker, callbacks, client };
}

const hexRequest = {
  type: "hexes" as const,
  params: {
    filters: { roomTypes: [], priceRange: [0, 1] as [number, number] },
    resolution: 6 as const,
  },
};

describe("CityListingsClient slug stamping (Rule 5.3)", () => {
  it("stamps the request with the bound slug and sends it once ready", () => {
    const { worker, client } = setup("london");
    client.requestProcess(hexRequest);
    worker.emit({
      status: "success",
      slug: "london",
      payload: { type: "load", data: { slug: "london", count: 1 } },
    });

    const sent = worker.posted.find((m) => m.type === "hexes");
    expect(sent?.slug).toBe("london");
  });

  it("drops a reply whose slug no longer matches, delivers the matching one", () => {
    const { worker, callbacks, client } = setup("london");
    client.requestProcess(hexRequest);
    worker.emit({
      status: "success",
      slug: "london",
      payload: { type: "load", data: { slug: "london", count: 1 } },
    });

    // A reply tagged for a different city is ignored.
    worker.emit({
      status: "success",
      slug: "paris",
      payload: { type: "hexes", data: [] },
    });
    expect(callbacks.onProcessSuccess).not.toHaveBeenCalled();

    // The matching reply is delivered, carrying its slug for the store to stamp.
    worker.emit({
      status: "success",
      slug: "london",
      payload: { type: "hexes", data: [] },
    });
    expect(callbacks.onProcessSuccess).toHaveBeenCalledWith({
      type: "hexes",
      payload: [],
      slug: "london",
    });
  });
});
