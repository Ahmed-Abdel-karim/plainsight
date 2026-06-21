/**
 * Projection — the single entity that turns a Dataset (the immutable city
 * listings) and a Query (scope + filters) into the derived outputs: scope stats,
 * the browse list, and the hex density grid.
 *
 * Pure and isomorphic by design: the Dataset is passed *in*, so the same code
 * runs in the client worker (live recompute as the user drags filters) and in an
 * offline snapshot generator (baking the materialized aggregate cube). One
 * implementation is what guarantees the precomputed cube and a live recompute can
 * never disagree on "the output for this query".
 */
import type { Listing, ScopeAggregates } from "@/data/contract";
import type { ListingFilters, Scope, SortKey } from "@/data/types";
import { computeAggregates, filterListings, sortListings } from "@/lib/filters";
import type { FilterableListing } from "@/lib/filters/filter";
import type { SortableListing } from "@/lib/filters/sort";
import { aggregateHexes } from "@/lib/hex/aggregate";
import type { HexCell, HexResolution } from "@/lib/hex/types";

import { type ScopableListing, scopeListings } from "./compute";

const CITY_WIDE: Scope = { type: "city" };

/** A selection over the dataset: which neighbourhood (or city-wide) and which
 *  room/price filters — the two axes a projection narrows by. */
export interface ListingQuery {
  readonly scope: Scope;
  readonly filters: ListingFilters;
}

/** The narrowing spine: scope first, then room/price filters. Every projection
 *  derives from this subset. Generic over the row shape — it accepts any object
 *  carrying the scope + filter fields, so the worker's `Listing` and Browse's
 *  `BrowsePointProperties` both narrow through the same code. */
export function applyQuery<T extends ScopableListing & FilterableListing>(
  listings: readonly T[],
  query: ListingQuery,
): T[] {
  return filterListings(scopeListings(listings, query.scope), query.filters);
}

/** Scope stats — median, room mix, hosts, histogram, and `listingCount` — for
 *  the query. The header count is a field of this, not a separate projection. */
export function projectStats(
  listings: readonly Listing[],
  query: ListingQuery,
): ScopeAggregates {
  return computeAggregates(applyQuery(listings, query));
}

/** The browse list: the query's subset, sorted. Generic over the row shape, so
 *  the Browse tier (`BrowsePointProperties`) projects through the same path as a
 *  full `Listing`. */
export function projectList<
  T extends ScopableListing & FilterableListing & SortableListing,
>(listings: readonly T[], query: ListingQuery, sort: SortKey): T[] {
  return sortListings(applyQuery(listings, query), sort);
}

/** The hex density grid. Hexes are definitionally city-wide — they consume the
 *  filter axis only — so the scope is pinned to city over the same spine. */
export function projectHexes(
  listings: readonly Listing[],
  filters: ListingFilters,
  resolution: HexResolution,
): HexCell[] {
  return aggregateHexes(
    applyQuery(listings, { scope: CITY_WIDE, filters }),
    resolution,
  );
}
