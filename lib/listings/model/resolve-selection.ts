/**
 * Turns the app's canonical stored listing selection into the runtime
 * `{ neighbourhood, filters }` a projection consumes, and answers the two
 * questions every consumer asks: its identity and whether it is the city-wide
 * default the server precomputes.
 *
 * Pure — it composes the filter codec (`@/lib/filters/normalize`).
 */
import type { FilterBounds } from "@/data/types";
import {
  isDefaultFilters,
  resolveFilters,
  type StoredFilter,
} from "@/lib/filters/normalize";

import type { ResolvedListingSelection } from "../projections";

/** The persisted selection: the stored room/price filter plus the scope
 *  neighbourhood (null = city-wide). The shape the city actor holds and the URL
 *  serialises. */
export interface StoredListingSelection extends StoredFilter {
  readonly nbhd: string | null;
}

/** Resolve the stored selection into the runtime selection a projection reads. */
export function resolveListingSelection(
  stored: StoredListingSelection,
  bounds: FilterBounds,
): ResolvedListingSelection {
  return {
    neighbourhood: stored.nbhd,
    filters: resolveFilters(stored, bounds),
  };
}

/** Stable signature of a resolved selection for stale-result protection. */
export function listingSelectionKey(
  selection: ResolvedListingSelection,
): string {
  return JSON.stringify({
    neighbourhood: selection.neighbourhood,
    roomTypes: [...selection.filters.roomTypes].sort(),
    priceRange: selection.filters.priceRange,
  });
}

/** True when the stored selection is the city-wide default selection. */
export function isDefaultListingSelection(
  stored: StoredListingSelection,
  bounds: FilterBounds,
): boolean {
  return stored.nbhd === null && isDefaultFilters(stored, bounds);
}
