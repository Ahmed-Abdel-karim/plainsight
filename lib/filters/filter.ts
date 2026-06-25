import type { Listing } from "@/data/contract";
import type { ListingFilters } from "@/data/types";

import { isAllRoomTypes } from "./normalize";

/** The fields the price/room-type filter reads. Both `Listing` and the Browse
 * `BrowsePointProperties` satisfy it, so one predicate serves both paths. */
export type FilterableListing = Pick<Listing, "roomType" | "price">;

/**
 * Apply the active filter state to a listing array. Pure and isomorphic — the
 * SAME function backs the worker's Analyse recompute (hex + cards) and the
 * Browse list/dots, so they can never disagree about what "the filtered set" is.
 * Generic over the row shape.
 *
 * - `roomTypes: []` means "all types" (no room-type constraint).
 * - `priceRange` is an inclusive `[min, max]` band in the city's currency; an
 *   `Infinity` upper bound means no cap (the slider's top handle is at the
 *   `priceCap` ceiling — see `resolvePriceBand`).
 */
export function filterListings<T extends FilterableListing>(
  filters: ListingFilters,
) {
  return function (listings: readonly T[]): T[] {
    const [min, max] = filters.priceRange;
    const roomTypes = filters.roomTypes;
    const allRoomTypes = isAllRoomTypes(roomTypes);

    return listings.filter((listing) => {
      if (!allRoomTypes && !roomTypes.includes(listing.roomType)) return false;
      if (listing.price < min || listing.price > max) return false;
      return true;
    });
  };
}
