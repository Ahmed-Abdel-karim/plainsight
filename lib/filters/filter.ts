import type { Listing } from "@/data/contract";
import type { ListingFilters } from "@/data/types";

/**
 * Apply the active filter state to a listing array. Pure and isomorphic — the
 * SAME function backs the server `getFilteredAggregates` path and the client
 * live-recompute path, so the map and the charts can never disagree about what
 * "the filtered set" is.
 *
 * - `roomTypes: []` means "all types" (no room-type constraint).
 * - `priceRange` is an inclusive `[min, max]` band in the city's currency.
 */
export function filterListings(
  listings: readonly Listing[],
  filters: ListingFilters,
): Listing[] {
  const [min, max] = filters.priceRange;
  const roomTypes = filters.roomTypes;
  const allRoomTypes = roomTypes.length === 0;

  return listings.filter((listing) => {
    if (!allRoomTypes && !roomTypes.includes(listing.roomType)) return false;
    if (listing.price < min || listing.price > max) return false;
    return true;
  });
}
