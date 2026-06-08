"use client";

import {
  CityListingsClient,
  type ListingsCallbacks,
} from "@/lib/listings/client";
import type { Scope } from "@/data/types";
import type { ListingFilters } from "@/data/types";
import type { HexResolution } from "@/lib/hex/types";
import type { SetFn, GetFn } from "../types";
import type { ListingsState } from "./state";

function buildCallbacks(set: SetFn<ListingsState>): ListingsCallbacks {
  return {
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
}

export function createListingsActions(
  set: SetFn<ListingsState>,
  get: GetFn<ListingsState>,
) {
  const callbacks = buildCallbacks(set);

  // (Re)create the per-city worker client, disposing the previous one. Idempotent
  // — a no-op while the slug is unchanged — and cheap, since the worker itself
  // only spawns on the first request. Every request ensures its own client, so
  // no subscription has to run before another to "adopt" the city first; there is
  // no inter-subscription ordering to preserve.
  const ensureClient = (slug: string) => {
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
  };

  return {
    requestAggregates: (
      slug: string,
      scope: Scope,
      filters: ListingFilters,
      isDefault: boolean,
    ) => {
      if (isDefault) return;
      ensureClient(slug);
      get().client?.requestProcess({
        type: "aggregates",
        params: { scope, filters },
      });
    },
    requestHexes: (
      slug: string,
      filters: ListingFilters,
      resolution: HexResolution,
    ) => {
      ensureClient(slug);
      get().client?.requestProcess({
        type: "hexes",
        params: { filters, resolution },
      });
    },
  };
}

export type ListingsActions = ReturnType<typeof createListingsActions>;
