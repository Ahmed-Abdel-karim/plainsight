/**
 * Pure recompute the worker runs over the in-memory city listings. Kept free of
 * any worker/DOM globals so it is unit-testable on its own and shares the exact
 * isomorphic `@/lib/filters` engine the server's filtered path uses — the client
 * and server can never disagree on what "the filtered set" is.
 */
import type { Listing, ScopeAggregates } from "@/data/contract";
import type { ListingFilters, Scope } from "@/data/types";
import { computeAggregates, filterListings } from "@/lib/filters";

/** Narrow the city listings to the active scope (city-wide or one neighbourhood). */
export function scopeListings(
  listings: readonly Listing[],
  scope: Scope,
): readonly Listing[] {
  if (scope.type === "city") return listings;
  return listings.filter((l) => l.neighbourhoodId === scope.id);
}

/** Filtered aggregates for a scope — the live twin of `getScopeAggregates`. */
export function aggregatesFor(
  listings: readonly Listing[],
  scope: Scope,
  filters: ListingFilters,
): ScopeAggregates {
  return computeAggregates(
    filterListings(scopeListings(listings, scope), filters),
  );
}
