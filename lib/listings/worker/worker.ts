/**
 * The listings Web Worker entry — a generic dispatcher over the extendable
 * `processes` registry. A single TanStack Query `QueryClient` is the one source of
 * truth: it holds every visited snapshot's parsed listings (one
 * `["listings", slug, snapshotId]`
 * query each) and provides all the cache + retry control. The worker is
 * session-lifetime and serves many cities, so each request carries its snapshot identity;
 * the load is retried with capped exponential backoff, and any process marked
 * `cacheResults` is memoised by `[type, slug, snapshotId, params]`, so an identical recompute
 * returns instantly without re-running `execute`. Because rows live here for the
 * whole session, revisiting a city is a cache hit — no refetch.
 *
 * Only the small results — never the rows — cross the `postMessage` boundary.
 * Messages use the framework's `{ status, payload }` envelope; the caller routes
 * a reply by `payload.type` (`"load"` ⇒ the city fetch; otherwise a process).
 */
import { CancelledError, QueryClient } from "@tanstack/query-core";

import type { Listing } from "@/data/contract";
import { fetchJson } from "@/lib/fetch-json";
import { queryDefaults } from "@/lib/query/config";

import { processes } from "./processes";
import type { ProcessContext } from "./types";
import type { RequestMessage, ResponseMessage } from ".";

// The worker global typed as `Worker` gives usable postMessage/onmessage
// signatures without pulling the "webworker" lib (which conflicts with "dom").
const ctx = self as unknown as Worker;

/**
 * One query client for the worker's lifetime, on the same shared defaults
 * (`@/lib/query/config`) as the app's React Query layer — capped-exponential
 * backoff so the load *feels* like every other fetch, and `staleTime`/`gcTime:
 * Infinity` so rows and cached process results live for the whole session (the
 * worker is disposed when the city changes).
 */
const queryClient = new QueryClient({ defaultOptions: queryDefaults });

/** In-flight process aborters, keyed by the request's id. A `cancel` aborts and
 *  drops; the result is never posted once its controller has aborted. */
const inflight = new Map<number, AbortController>();

function post(message: ResponseMessage) {
  ctx.postMessage(message);
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

ctx.onmessage = async (event: MessageEvent<RequestMessage>) => {
  const message = event.data;

  // Abort the named in-flight process; a result that already raced past the
  // abort is dropped below by the `signal.aborted` check.
  if (message.type === "cancel") {
    const controller = inflight.get(message.payload.requestId);
    controller?.abort();
    inflight.delete(message.payload.requestId);
    return;
  }

  // Abort an in-flight city load (city change / lens leaving analyse). `revert`
  // is the default, so the cancellation keeps any already-cached rows — it only
  // stops the outstanding fetch.
  if (message.type === "cancelLoad") {
    void queryClient.cancelQueries({ queryKey: ["listings"] });
    return;
  }

  // The one-time city load: fetch + parse the rows (retried via the query
  // client), cache them, and report the count. A failure here is terminal.
  if (message.type === "load") {
    const { slug: citySlug, snapshotId, assetUrl } = message.payload;
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: ["listings", citySlug, snapshotId],
        queryFn: ({ signal }) => fetchJson<Listing[]>(assetUrl, { signal }),
      });
      post({
        status: "success",
        slug: citySlug,
        snapshotId,
        payload: {
          type: "load",
          data: { slug: citySlug, snapshotId, count: rows.length },
        },
      });
    } catch (err) {
      // A cancelled load was abandoned on purpose — stay silent so no stale
      // FETCH_ERROR reaches the (already gone) city.
      if (err instanceof CancelledError) return;
      post({
        status: "error",
        slug: citySlug,
        snapshotId,
        payload: { type: "load", error: toError(err) },
      });
    }
    return;
  }

  // A recompute: dispatch through the registry, injecting the worker-owned rows.
  // `cacheResults` processes are memoised by their params via the query client.
  const process = processes[message.type] as {
    execute: (params: unknown, ctx: ProcessContext) => unknown;
    cacheResults?: boolean;
  };
  const controller = new AbortController();
  inflight.set(message.requestId, controller);
  try {
    // Read the rows for *this request's* slug — the worker holds several cities'
    // caches at once, so we can't rely on a single "current" slug.
    const listings = queryClient.getQueryData<Listing[]>([
      "listings",
      message.slug,
      message.snapshotId,
    ]);
    if (!listings) throw new Error("listings not loaded");
    const context: ProcessContext = { listings };
    const data = process.cacheResults
      ? await queryClient.fetchQuery({
          // Slug in the key so two cities sharing filter params don't collide.
          queryKey: [
            message.type,
            message.slug,
            message.snapshotId,
            message.params,
          ],
          queryFn: () => process.execute(message.params, context),
        })
      : process.execute(message.params, context);
    if (controller.signal.aborted) return;
    post({
      status: "success",
      slug: message.slug, // echo the request's slug for stale-reply drop (5.3)
      snapshotId: message.snapshotId,
      requestId: message.requestId,
      payload: { type: message.type, data },
    } as ResponseMessage);
  } catch (err) {
    if (controller.signal.aborted) return;
    post({
      status: "error",
      slug: message.slug,
      snapshotId: message.snapshotId,
      requestId: message.requestId,
      payload: { type: message.type, error: toError(err) },
    } as ResponseMessage);
  } finally {
    inflight.delete(message.requestId);
  }
};
