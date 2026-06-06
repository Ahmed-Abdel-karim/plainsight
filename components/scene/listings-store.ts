"use client";

/**
 * The listings worker, as a store — but only as a **thin interface** over the
 * client. The client (`CityListingsClient`) is the per-city engine: it owns the
 * worker, lazy load, readiness, and per-channel supersession. This store holds
 * *no policy*. It is three things:
 *
 *   1. the holder of the single client instance (shared across the twice-mounted
 *      sidebar + the hex layer — a module-global owner replaces the old
 *      ref-counted registry);
 *   2. dispatch-only actions the triggers call (`requestAggregates`,
 *      `requestHexes`);
 *   3. the client's **single subscriber** — its four sinks map straight to state
 *      slabs: results into `aggregates` / `hexCells`, failures into `fetchError`
 *      / `processError`. (Unlike before, a failed recompute no longer vanishes
 *      silently — it lands in `processError`; presentation is wired separately.)
 *
 * The triggers live in `AnalysisCards` (aggregates) and `MapCanvas` (hexes + the
 * active city) — both already client islands behind Suspense / `ssr: false`, so
 * nothing store-reading touches the prerendered PPR shell (which would shift
 * hydration). The client is **session-scoped**: created lazily on the first
 * request, disposed + reset only when the city changes, so toggling a filter
 * never re-fetches the analytics feed.
 */
import { create } from "zustand";

import type { ScopeAggregates } from "@/data/contract";
import type { ListingFilters, Scope } from "@/data/types";
import type { HexCell, HexResolution } from "@/lib/hex/types";
import {
  CityListingsClient,
  type ListingsCallbacks,
} from "@/lib/listings/client";

interface State {
  client: CityListingsClient | null;
  slug: string | null;
  /** Latest filtered aggregate, or `null` until the first non-default recompute. */
  aggregates: ScopeAggregates | null;
  /** Latest hex cells for the active filters + resolution. */
  hexCells: HexCell[];
  /** Terminal city-load failure (session-blocking); cleared on a later success. */
  fetchError: Error | null;
  /** Last recompute failure (informational — the last good result stays shown). */
  processError: Error | null;
}

interface Actions {
  /**
   * Point the store at a city. On a real change it disposes the old client and
   * clears every slab; the new client is created lazily on the first request.
   * Called by every trigger (idempotent), so whichever island mounts first wins.
   */
  syncCity: (slug: string) => void;
  /** Recompute the scope's filtered aggregates (skipped at the default view). */
  requestAggregates: (
    scope: Scope,
    filters: ListingFilters,
    isDefault: boolean,
  ) => void;
  /** Recompute the price hexes for the active filters + zoom resolution. */
  requestHexes: (filters: ListingFilters, resolution: HexResolution) => void;
}

export const useListingsStore = create<State & { actions: Actions }>()((
  set,
  get,
) => {
  /**
   * The client's four sinks, mapped straight to state slabs: results into
   * `aggregates` / `hexCells`, failures into `fetchError` / `processError`.
   * This is the store's *whole* job over the client — no promise or
   * cancellation bookkeeping; readiness and per-channel coalescing live in the
   * client. (A failed recompute no longer vanishes silently — it lands in
   * `processError`; presentation is wired separately.)
   */
  const callbacks: ListingsCallbacks = {
    onFetchSuccess: () => set({ fetchError: null }),
    onFetchError: (error) => set({ fetchError: error }),
    onProcessSuccess: (result) =>
      set(
        result.type === "aggregates"
          ? { aggregates: result.payload, processError: null }
          : { hexCells: result.payload, processError: null },
      ),
    onProcessError: (_type, error) => set({ processError: error }),
  };

  return {
    client: null,
    slug: null,
    aggregates: null,
    hexCells: [],
    fetchError: null,
    processError: null,
    actions: {
      // Create the client up front (with its sinks) on a real city change; the
      // worker + load stay lazy inside it (kicked off by the first request).
      // Called by every trigger (idempotent on an unchanged slug), so whichever
      // island mounts first owns the instance.
      syncCity: (slug) => {
        if (get().slug === slug) return;
        get().client?.dispose();
        set({
          slug,
          client: new CityListingsClient({ slug, callbacks }),
          aggregates: null,
          hexCells: [],
          fetchError: null,
          processError: null,
        });
      },
      requestAggregates: (scope, filters, isDefault) => {
        // At the default view the cards render the server's pre-baked
        // aggregates; computing them here would be wasted work.
        if (isDefault) return;
        get().client?.requestProcess({
          type: "aggregates",
          params: { scope, filters },
        });
      },
      requestHexes: (filters, resolution) => {
        get().client?.requestProcess({
          type: "hexes",
          params: { filters, resolution },
        });
      },
    },
  };
});

export const useListingsActions = () =>
  useListingsStore((state) => state.actions);
export const useFilteredAggregates = () =>
  useListingsStore((state) => state.aggregates);
export const useListingsHexCells = () =>
  useListingsStore((state) => state.hexCells);
export const useFetchError = () =>
  useListingsStore((state) => state.fetchError);
export const useProcessError = () =>
  useListingsStore((state) => state.processError);
