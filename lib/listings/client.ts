"use client";

/**
 * Main-thread handle to the listings Web Worker — the self-managing per-city
 * engine. It owns everything *within* one city session: it spawns the worker and
 * starts the load **lazily, on the first request**, and it coalesces recompute
 * requests so a fast filter drag can't pile stale work onto the worker. Callers
 * never see the worker or the load handshake.
 *
 * **One slot per process type, at most one in flight.** Each type (`aggregates`,
 * `hexes`, …) keeps a single ref — the latest requested message:
 *
 *   - a new request **overwrites** that ref (newest wins; the superseded one was
 *     never sent, so there is nothing to cancel) and tries to send;
 *   - nothing sends until the worker is `ready`, so requests made *while the feed
 *     is still loading* simply wait in their slot and flush on ready;
 *   - while a type has a request in flight, a new one just updates the slot — it
 *     sends only once the in-flight reply lands;
 *   - if a newer request was queued by the time a reply returns, that reply is
 *     **discarded** and the queued one sent instead.
 *
 * Because only one request of a type is ever outstanding, a worker reply
 * correlates to its request by **type alone** — no request ids, no abort
 * signals. The worker still computes at most the in-flight request plus the final
 * one, and the UI only ever sees the latest result.
 *
 * It reports outward through four sinks — `fetch` (the city load,
 * session-blocking) and `process` (a recompute, informational) each get a
 * success + error callback. The client only *forwards typed facts*; the store
 * (its single subscriber) decides what state to hold. Results never carry the
 * per-listing rows — those stay inside the worker; only the small process outputs
 * cross the boundary.
 *
 * The worker is injectable via `createWorker` purely so tests can drive the
 * client against a fake; real callers omit it and get the bundled worker.
 */
import type { ScopeAggregates } from "@/data/contract";
import type { HexCell } from "@/lib/hex/types";

import type {
  LoadDataResponseMessage,
  ProcessRequestMessage,
  ProcessResponseMessage,
  RequestMessage,
  ResponseMessage,
} from "./worker";

/** The process types the client routes by (the per-type slot key). */
export type ProcessType = ProcessRequestMessage["type"];

/** A recompute result, tagged by type so the store routes it to its slab. */
export type ProcessResult =
  | { type: "aggregates"; payload: ScopeAggregates }
  | { type: "hexes"; payload: HexCell[] };

/**
 * The store's sinks. `fetch` is the one-time city load (a failure is terminal and
 * session-blocking — the worker has already exhausted its retries by the time
 * `onFetchError` fires); `process` is a recompute (a failure is per-request and
 * informational, so the last good result can stay on screen).
 */
export interface ListingsCallbacks {
  onFetchSuccess: (count: number) => void;
  onFetchError: (error: Error) => void;
  onProcessSuccess: (result: ProcessResult) => void;
  onProcessError: (type: ProcessType, error: Error) => void;
}

/**
 * One process type's coalescing state machine, in three states: **empty** (no
 * work), **pending** (a request waiting to send), **in flight** (a request
 * awaiting its reply). At most one request is ever in flight, which is why a
 * reply can correlate to its request by type alone. The owner drives it through
 * three moves — it never touches the fields directly:
 *
 *   - `offer`  — record the latest request; newest wins, so a waiting or
 *     in-flight request is simply overwritten (the superseded one was never
 *     sent, so there is nothing to cancel).
 *   - `take`   — claim the pending request to send, moving to in-flight;
 *     returns `null` when nothing is sendable now (already in flight, or empty).
 *   - `settle` — a reply landed; leave in-flight. Returns `true` if the reply is
 *     the latest (deliver it), `false` if a newer request was queued meanwhile
 *     (discard it — the next `take` yields that queued one instead).
 */
class Slot {
  #pending: ProcessRequestMessage | null = null;
  #inFlight = false;

  offer(message: ProcessRequestMessage) {
    this.#pending = message;
  }

  take(): ProcessRequestMessage | null {
    if (this.#inFlight || !this.#pending) return null;
    const message = this.#pending;
    this.#pending = null;
    this.#inFlight = true;
    return message;
  }

  settle(): boolean {
    if (!this.#inFlight) return false;
    this.#inFlight = false;
    return this.#pending === null;
  }
}

interface Config {
  slug: string;
  callbacks: ListingsCallbacks;
  /** Test seam — omit in app code to use the bundled worker. */
  createWorker?: () => Worker;
}

export class CityListingsClient {
  readonly #slug: string;
  readonly #callbacks: ListingsCallbacks;
  readonly #createWorker: () => Worker;

  #worker: Worker | null = null;
  #status: "idle" | "loading" | "ready" | "failed" = "idle";
  readonly #slots = new Map<ProcessType, Slot>();

  constructor({ slug, callbacks, createWorker }: Config) {
    this.#slug = slug;
    this.#callbacks = callbacks;
    this.#createWorker =
      createWorker ??
      (() => new Worker(new URL("./worker/worker.ts", import.meta.url)));
  }

  /** Record the latest request for its type (dropping any older one in the slot),
   *  spawn the worker on first use, then try to send. */
  requestProcess(message: ProcessRequestMessage) {
    if (this.#status === "failed") return;
    this.#slot(message.type).offer(message); // newest wins
    this.#start();
    this.#send(message.type);
  }

  dispose() {
    this.#worker?.terminate();
    this.#worker = null;
    this.#status = "idle";
    this.#slots.clear();
  }

  #slot(type: ProcessType): Slot {
    let slot = this.#slots.get(type);
    if (!slot) {
      slot = new Slot();
      this.#slots.set(type, slot);
    }
    return slot;
  }

  /** Spawn the worker + kick off the load on first use; idempotent thereafter. */
  #start() {
    if (this.#status !== "idle") return;
    this.#status = "loading";
    const worker = this.#createWorker();
    worker.addEventListener("message", this.#receiveMessage);
    worker.addEventListener("error", this.#onWorkerError);
    this.#worker = worker;
    worker.postMessage({
      type: "load",
      payload: this.#slug,
    } satisfies RequestMessage);
  }

  /** Try to send a type's pending request. The worker must be `ready`; the slot
   *  itself decides whether anything is sendable (idle + something pending),
   *  returning `null` if not — in which case it stays put and sends on `ready`
   *  or the next reply. */
  #send(type: ProcessType) {
    if (this.#status !== "ready") return;
    const message = this.#slot(type).take();
    if (message) this.#worker!.postMessage(message);
  }

  #flushAll() {
    for (const type of this.#slots.keys()) this.#send(type);
  }

  #receiveMessage = ({ data }: MessageEvent<ResponseMessage>) => {
    if (data.payload.type === "load") {
      this.#handleLoad(data as LoadDataResponseMessage);
      return;
    }
    this.#handleProcess(data as ProcessResponseMessage);
  };

  #onWorkerError = (event: ErrorEvent) => {
    this.#failLoad(new Error(event.message || "worker error"));
  };

  #handleLoad(message: LoadDataResponseMessage) {
    if (message.status === "error") {
      this.#failLoad(message.payload.error);
      return;
    }
    this.#status = "ready";
    this.#callbacks.onFetchSuccess(message.payload.data.count);
    this.#flushAll();
  }

  /**
   * Finalize a type's in-flight reply. `settle` tells us whether to deliver it:
   * `false` means it was superseded by a newer request (or there was nothing in
   * flight — a leftover after dispose), so we drop it. The trailing `#send`
   * flushes any queued request and is a no-op otherwise. A delivered reply is a
   * success result or a process error — process errors are informational, so the
   * session stays `ready`.
   */
  #handleProcess(message: ProcessResponseMessage) {
    const type = message.payload.type as ProcessType;
    const slot = this.#slots.get(type);
    if (!slot) return;
    if (slot.settle()) {
      if (message.status === "success") {
        this.#callbacks.onProcessSuccess({
          type: message.payload.type,
          payload: message.payload.data,
        } as ProcessResult);
      } else {
        this.#callbacks.onProcessError(type, message.payload.error);
      }
    }
    this.#send(type); // flushes a queued request; no-op otherwise
  }

  /** A terminal load failure: kill the session and surface it to the fetch sink. */
  #failLoad(error: Error) {
    this.#status = "failed";
    this.#slots.clear();
    this.#callbacks.onFetchError(error);
  }
}
