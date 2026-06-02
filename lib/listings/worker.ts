/**
 * Listings Web Worker — the scene's analytics engine. On `load` it fetches and
 * parses the city's lightweight **analytics tier** *on this thread* (the
 * JSON.parse never blocks the UI), holds it, and answers `aggregates` (sidebar
 * cards) and `hexes` (the price map) queries by recomputing over the in-memory
 * rows. Only the small result — `ScopeAggregates` or `HexCell[]` — is posted
 * back; the per-listing rows never cross the boundary.
 *
 * The analytics rows are a structural subset of `Listing` (the contract's tier
 * guarantee), so the isomorphic `lib/filters` engine runs over them unchanged.
 */
import type { Listing } from "@/data/contract";

import { aggregatesFor, hexesFor } from "./compute";
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
        const res = await fetch(`/data/${message.slug}-analytics.json`);
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
      case "hexes": {
        if (!listings) throw new Error("listings not loaded");
        post({
          type: "hexes",
          id: message.id,
          cells: hexesFor(listings, message.filters, message.resolution),
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
