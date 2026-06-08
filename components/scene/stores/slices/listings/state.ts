"use client";

import type { CityListingsClient } from "@/lib/listings/client";
import type { ScopeAggregates } from "@/data/contract";
import type { HexCell } from "@/lib/hex/types";

export interface ListingsState {
  client: CityListingsClient | null;
  slug: string | null;
  aggregates: ScopeAggregates | null;
  hexCells: HexCell[];
  fetchError: Error | null;
  processError: Error | null;
}

export const initialListingsState: ListingsState = {
  client: null,
  slug: null,
  aggregates: null,
  hexCells: [],
  fetchError: null,
  processError: null,
};
