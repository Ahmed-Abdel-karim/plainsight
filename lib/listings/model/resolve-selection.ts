/**
 * Turns the app's canonical *stored* selection (room/price filter + neighbourhood)
 * into the runtime `{ neighbourhood, filters }` a {@link ListingQuery} consumes,
 * and answers the two questions every consumer asks: its identity (for skipping a
 * redundant recompute) and whether it is the city-wide default the server
 * precomputes (so a precomputed result can stand in for a live one).
 *
 * Pure — it composes the filter codec (`@/lib/filters/normalize`).
 */
import type { FilterBounds } from "@/data/types";
import {
  isDefaultFilters,
  resolveFilters,
  type StoredFilter,
} from "@/lib/filters/normalize";

import type { ListingQuery } from "../projections";

/** The persisted selection: the stored room/price filter plus the scope
 *  neighbourhood (null = city-wide). The shape the city actor holds and the URL
 *  serialises. */
export interface StoredQuery extends StoredFilter {
  readonly nbhd: string | null;
}

/** Resolve the stored selection into the runtime `{ scope, filters }` a
 *  projection narrows by. */
export function resolveQuery(
  stored: StoredQuery,
  bounds: FilterBounds,
): ListingQuery {
  return {
    neighbourhood: stored.nbhd,
    filters: resolveFilters(stored, bounds),
  };
}

/** Stable signature of a query — order-stable fields (`roomTypes` sorted) so a
 *  reordered-but-equal selection still matches. Lets a consumer skip a redundant
 *  recompute when nothing that affects the output changed. */
export function queryKey(query: ListingQuery): string {
  return JSON.stringify({
    neighbourhood: query.neighbourhood,
    roomTypes: [...query.filters.roomTypes].sort(),
    priceRange: query.filters.priceRange,
  });
}

/** True when the stored selection is the city-wide default view — the one the
 *  server pre-bakes — so a consumer can read the precomputed projection instead
 *  of running a live recompute. */
export function isDefaultView(
  stored: StoredQuery,
  bounds: FilterBounds,
): boolean {
  return stored.nbhd === null && isDefaultFilters(stored, bounds);
}
