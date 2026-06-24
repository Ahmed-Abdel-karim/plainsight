/**
 * Turn a city's listings + a query (which neighbourhood, which room/price filter)
 * into the things the UI needs: the scope stats, the browse list, and the hex
 * grid. The listings are passed in, so the same code runs in the client worker
 * (live recompute as the user drags filters) and in the offline generator that
 * writes the materialized aggregates — one implementation, so the precomputed
 * numbers and a live recompute can never disagree.
 */
import type { Listing, ScopeAggregates } from "@/data/contract";
import type { ListingFilters, SortKey } from "@/data/types";
import { computeAggregates, filterListings, sortListings } from "@/lib/filters";
import type { FilterableListing } from "@/lib/filters/filter";
import type { SortableListing } from "@/lib/filters/sort";
import { aggregateHexes } from "@/lib/hex/aggregate";
import type { HexCell, HexResolution } from "@/lib/hex/types";

import { narrowToNeighbourhood, type ScopableListing } from "../model";
import { pipe } from "remeda";

/** A query over the listings: which neighbourhood (`null` = whole city) and which
 *  room/price filter. */
export interface ListingQuery {
  readonly neighbourhood: string | null;
  readonly filters: ListingFilters;
}

/** The selection step for a query — narrow to neighbourhood, then the room/price
 *  filter — as a function over listings. Composed (via `flow`) into each read
 *  below. Generic over the row shape, so the worker's `Listing` and Browse's
 *  `BrowsePointProperties` share one path. */
export function selectListings<T extends ScopableListing & FilterableListing>(
  query: ListingQuery,
): (listings: readonly T[]) => T[] {
  return (listings: readonly T[]) =>
    pipe(
      listings,
      narrowToNeighbourhood<T>(query.neighbourhood),
      filterListings<T>(query.filters),
    );
}

/** The scope stats (median, room mix, hosts, histogram, `listingCount`) for a
 *  query. The header count is a field of this, not a separate read. */
export function statsFor(
  listings: readonly Listing[],
  query: ListingQuery,
  priceCap: number,
): ScopeAggregates {
  return pipe(
    listings,
    selectListings<Listing>(query),
    computeAggregates(priceCap),
  );
}

/** The browse list for a query, sorted. Generic over the row shape, so the Browse
 *  tier (`BrowsePointProperties`) goes through the same path as a full `Listing`. */
export function listingsFor<
  T extends ScopableListing & FilterableListing & SortableListing,
>(listings: readonly T[], query: ListingQuery, sort: SortKey): T[] {
  return pipe(listings, selectListings<T>(query), sortListings(sort));
}

/** The hex density grid. Hexes are always city-wide — they read the filter only —
 *  so the neighbourhood is pinned to whole-city. */
export function hexesFor(
  listings: readonly Listing[],
  filters: ListingFilters,
  resolution: HexResolution,
): HexCell[] {
  return pipe(
    listings,
    selectListings<Listing>({ neighbourhood: null, filters }),
    aggregateHexes(resolution),
  );
}
