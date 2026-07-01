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
 * a response by `payload.type` (`"load"` ⇒ the city fetch; otherwise a process).
 */
import { CancelledError, QueryClient } from "@tanstack/query-core";

import type { Listing } from "@/data/contract";
import { fetchJson } from "@/lib/fetch-json";
import { queryDefaults } from "@/lib/query/config";

import { getProcess, type ResolvedProcess } from "./processes";
import type { ProcessContext } from "./types";
import type {
  LoadDataRequestMessage,
  ProcessRequestMessage,
  RequestMessage,
  ResponseMessage,
} from ".";

const ctx = self as unknown as Worker;

const queryClient = new QueryClient({ defaultOptions: queryDefaults });

function post(message: ResponseMessage) {
  ctx.postMessage(message);
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

async function handleLoadListingsData(message: LoadDataRequestMessage) {
  const { slug: citySlug, snapshotId, assetUrl } = message.payload;
  try {
    await queryClient.fetchQuery({
      queryKey: ["listings", citySlug, snapshotId],
      queryFn: ({ signal }) => fetchJson<Listing[]>(assetUrl, { signal }),
    });
    post({
      status: "success",
      slug: citySlug,
      snapshotId,
      payload: {
        type: "load",
        data: { slug: citySlug, snapshotId },
      },
    });
  } catch (err) {
    if (err instanceof CancelledError) return;
    post({
      status: "error",
      slug: citySlug,
      snapshotId,
      payload: { type: "load", error: toError(err) },
    });
  }
}

async function computeProcessResult(
  process: ResolvedProcess,
  message: ProcessRequestMessage,
  context: ProcessContext,
): Promise<unknown> {
  if (process.cacheResults) {
    return queryClient.fetchQuery({
      // Slug in the key so two cities sharing filter params don't collide.
      queryKey: [
        message.type,
        message.slug,
        message.snapshotId,
        message.params,
      ],
      queryFn: () => process.execute(message.params, context),
    });
  }
  return process.execute(message.params, context);
}

async function handleProcess(message: ProcessRequestMessage) {
  try {
    const listings = queryClient.getQueryData<Listing[]>([
      "listings",
      message.slug,
      message.snapshotId,
    ]);
    if (!listings) throw new Error("listings not loaded");
    const context: ProcessContext = { listings };
    const process = getProcess(message.type);
    const data = await computeProcessResult(process, message, context);
    post({
      status: "success",
      slug: message.slug,
      snapshotId: message.snapshotId,
      requestId: message.requestId,
      payload: { type: message.type, data },
    } as ResponseMessage);
  } catch (err) {
    post({
      status: "error",
      slug: message.slug,
      snapshotId: message.snapshotId,
      requestId: message.requestId,
      payload: { type: message.type, error: toError(err) },
    } as ResponseMessage);
  }
}

ctx.onmessage = async (event: MessageEvent<RequestMessage>) => {
  const message = event.data;

  switch (message.type) {
    case "cancelLoad": {
      void queryClient.cancelQueries({ queryKey: ["listings"] });
      return;
    }

    case "load": {
      await handleLoadListingsData(message);
      return;
    }

    default: {
      await handleProcess(message);
    }
  }
};
