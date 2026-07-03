import type { ProcessRequestMessage } from "@/lib/listings";

import type * as Events from "./events";

/** A recompute's deterministic identity over type, dataset, and parameters. */
function requestKey(
  type: ProcessRequestMessage["type"],
  slug: string,
  snapshotId: string,
  params: ProcessRequestMessage["params"],
): string {
  return JSON.stringify([type, slug, snapshotId, params]);
}

function buildHexes(event: Events.WorkerRequestHexes): ProcessRequestMessage {
  const params = { filters: event.filters, resolution: event.hexResolution };
  return {
    type: "hexes",
    params,
    slug: event.slug,
    snapshotId: event.snapshotId,
    requestId: requestKey("hexes", event.slug, event.snapshotId, params),
  };
}

function buildAggregates(
  event: Events.WorkerRequestAggregates,
): ProcessRequestMessage {
  const params = {
    neighbourhood: event.neighbourhood,
    filters: event.filters,
    priceCap: event.priceCap,
  };
  return {
    type: "aggregates",
    params,
    slug: event.slug,
    snapshotId: event.snapshotId,
    requestId: requestKey("aggregates", event.slug, event.snapshotId, params),
  };
}

/** The transport request a calculation event asks for. Its `requestId` is content
 *  derived, so an identical intent rebuilds the same key and matches its cache. */
export function buildRequest(
  event: Events.WorkerRequestHexes | Events.WorkerRequestAggregates,
): ProcessRequestMessage {
  return event.type === "WORKER.REQUEST_HEXES"
    ? buildHexes(event)
    : buildAggregates(event);
}
