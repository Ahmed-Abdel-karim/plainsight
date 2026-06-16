/**
 * The listings Web Worker entry — a generic dispatcher over the extendable
 * `processes` registry. A single TanStack Query `QueryClient` is the one source of
 * truth: it holds every visited city's parsed listings (one `["listings", slug]`
 * query each) and provides all the cache + retry control. The worker is
 * session-lifetime and serves many cities, so each request carries its own `slug`;
 * the load is retried with capped exponential backoff, and any process marked
 * `cacheResults` is memoised by `[type, slug, params]`, so an identical recompute
 * returns instantly without re-running `execute`. Because rows live here for the
 * whole session, revisiting a city is a cache hit — no refetch.
 *
 * Only the small results — never the rows — cross the `postMessage` boundary.
 * Messages use the framework's `{ status, payload }` envelope; the caller routes
 * a reply by `payload.type` (`"load"` ⇒ the city fetch; otherwise a process).
 */
import { QueryClient } from "@tanstack/query-core";

import type { Listing } from "@/data/contract";
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

async function loadAnalytics(slug: string): Promise<Listing[]> {
  const res = await fetch(`/api/cities/${slug}/analytics`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Listing[];
}

function post(message: ResponseMessage) {
  ctx.postMessage(message);
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

ctx.onmessage = async (event: MessageEvent<RequestMessage>) => {
  const message = event.data;

  // The one-time city load: fetch + parse the rows (retried via the query
  // client), cache them, and report the count. A failure here is terminal.
  if (message.type === "load") {
    const citySlug = message.payload;
    try {
      const rows = await queryClient.fetchQuery({
        queryKey: ["listings", citySlug],
        queryFn: () => loadAnalytics(citySlug),
      });
      post({
        status: "success",
        slug: citySlug,
        payload: { type: "load", data: { slug: citySlug, count: rows.length } },
      });
    } catch (err) {
      post({
        status: "error",
        slug: citySlug,
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
  try {
    // Read the rows for *this request's* slug — the worker holds several cities'
    // caches at once, so we can't rely on a single "current" slug.
    const listings = queryClient.getQueryData<Listing[]>([
      "listings",
      message.slug,
    ]);
    if (!listings) throw new Error("listings not loaded");
    const context: ProcessContext = { listings };
    const data = process.cacheResults
      ? await queryClient.fetchQuery({
          // Slug in the key so two cities sharing filter params don't collide.
          queryKey: [message.type, message.slug, message.params],
          queryFn: () => process.execute(message.params, context),
        })
      : process.execute(message.params, context);
    post({
      status: "success",
      slug: message.slug, // echo the request's slug for stale-reply drop (5.3)
      payload: { type: message.type, data },
    } as ResponseMessage);
  } catch (err) {
    post({
      status: "error",
      slug: message.slug,
      payload: { type: message.type, error: toError(err) },
    } as ResponseMessage);
  }
};
