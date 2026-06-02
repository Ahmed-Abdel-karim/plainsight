/**
 * Listings Web Worker. On `load` it fetches and parses the city's full listings
 * feed *on this thread* (the ~68 ms JSON.parse never blocks the UI), holds it,
 * and answers `aggregates` queries by recomputing over the in-memory rows. Only
 * the small `ScopeAggregates` result is posted back — the 62k-row array stays in
 * the worker, so the structured-clone cost of shipping it to the main thread is
 * never paid.
 */
import type { Listing } from "@/data/contract";

import { aggregatesFor } from "./compute";
import type { ListingsRequest, ListingsResponse } from "./protocol";

// The worker global typed as `Worker` gives usable postMessage/onmessage
// signatures without pulling the "webworker" lib (which conflicts with "dom").
const ctx = self as unknown as Worker;

let listings: Listing[] | null = null;

function post(message: ListingsResponse) {
  ctx.postMessage(message);
}

ctx.onmessage = async (event: MessageEvent<ListingsRequest>) => {
  const message = event.data;
  try {
    switch (message.type) {
      case "load": {
        const res = await fetch(`/data/${message.slug}-listings.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        listings = (await res.json()) as Listing[];
        post({ type: "ready", slug: message.slug, count: listings.length });
        return;
      }
      case "aggregates": {
        if (!listings) throw new Error("listings not loaded");
        post({
          type: "aggregates",
          id: message.id,
          result: aggregatesFor(listings, message.scope, message.filters),
        });
        return;
      }
    }
  } catch (err) {
    const reqId = "id" in message ? message.id : undefined;
    post({
      type: "error",
      id: reqId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
