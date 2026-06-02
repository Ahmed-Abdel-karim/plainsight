/**
 * Pure recompute the worker runs over the in-memory city listings. Kept free of
 * any worker/DOM globals so it is unit-testable on its own and shares the exact
 * isomorphic `@/lib/filters` engine the server's filtered path uses — the client
 * and server can never disagree on what "the filtered set" is.
 */
import type { Listing, ScopeAggregates } from "@/data/contract";
import type { ListingFilters, Scope } from "@/data/types";
import { computeAggregates, filterListings } from "@/lib/filters";
import { aggregateHexes } from "@/lib/hex/aggregate";
import type { HexCell, HexResolution } from "@/lib/hex/types";

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

/**
 * Hex cells for the filtered set at a resolution. Bins over the SAME
 * `filterListings` the cards use, so the map and the sidebar can never disagree
 * about the filtered listings (FR-009). City-wide scope — the hex map is the
 * whole-city price view, not a per-neighbourhood drill-down.
 */
export function hexesFor(
  listings: readonly Listing[],
  filters: ListingFilters,
  resolution: HexResolution,
): HexCell[] {
  return aggregateHexes(filterListings(listings, filters), resolution);
}
