"use client";

/**
 * Main-thread handle to the listings Web Worker. Spawns one worker per city,
 * exposes a `ready` promise that resolves once the feed is parsed, and a
 * promise-based `aggregates(scope, filters)` that runs the recompute off-thread.
 * Requests are correlated by id so concurrent filter drags resolve correctly.
 */
import type { ScopeAggregates } from "@/data/contract";
import type { ListingFilters, Scope } from "@/data/types";

import type { ListingsRequest, ListingsResponse } from "./protocol";

type Pending = {
  resolve: (result: ScopeAggregates) => void;
  reject: (error: Error) => void;
};

export class CityListingsClient {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private resolveReady!: (count: number) => void;
  private rejectReady!: (error: Error) => void;

  /** Resolves with the row count once the worker has parsed the feed. */
  readonly ready: Promise<number>;

  constructor(slug: string) {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url));
    this.ready = new Promise<number>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = (event: MessageEvent<ListingsResponse>) =>
      this.handle(event.data);
    this.worker.onerror = (event) =>
      this.rejectReady(new Error(event.message || "worker error"));
    this.post({ type: "load", slug });
  }

  private post(message: ListingsRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: ListingsResponse) {
    switch (message.type) {
      case "ready":
        this.resolveReady(message.count);
        return;
      case "aggregates":
        this.pending.get(message.id)?.resolve(message.result);
        this.pending.delete(message.id);
        return;
      case "error": {
        const error = new Error(message.message);
        if (message.id !== undefined) {
          this.pending.get(message.id)?.reject(error);
          this.pending.delete(message.id);
        } else {
          this.rejectReady(error);
        }
        return;
      }
    }
  }

  /** Recompute filtered aggregates for a scope, off the main thread. */
  aggregates(scope: Scope, filters: ListingFilters): Promise<ScopeAggregates> {
    const id = this.nextId++;
    return new Promise<ScopeAggregates>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.post({ type: "aggregates", id, scope, filters });
    });
  }

  dispose() {
    this.worker.terminate();
    this.pending.clear();
  }
}
