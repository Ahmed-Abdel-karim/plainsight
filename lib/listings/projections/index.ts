/**
 * Turn a city's listings + a resolved selection into the projections the UI
 * needs: scope stats, the browse list, and the city hex grid. The listings are
 * passed in, so the same code runs in the client worker and in the offline
 * generator that writes the materialized aggregates.
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

/** Runtime-ready listing selection: scope plus resolved room/price filters. */
export interface ResolvedListingSelection {
  readonly neighbourhood: string | null;
  readonly filters: ListingFilters;
}

/**
 * The selection step for a resolved listing selection — narrow to neighbourhood,
 * then apply room/price filters. Written as a data-first Remeda `pipe` in each
 * projection below.
 */
export function selectListingsBySelection<
  T extends ScopableListing & FilterableListing,
>(selection: ResolvedListingSelection): (listings: readonly T[]) => T[] {
  return (listings: readonly T[]) =>
    pipe(
      listings,
      narrowToNeighbourhood<T>(selection.neighbourhood),
      filterListings<T>(selection.filters),
    );
}

/** Project the scope stats for a resolved listing selection. */
export function projectScopeStats(
  listings: readonly Listing[],
  selection: ResolvedListingSelection,
  priceCap: number,
): ScopeAggregates {
  return pipe(
    listings,
    selectListingsBySelection<Listing>(selection),
    computeAggregates(priceCap),
  );
}

/** Project the sorted Browse list for a resolved listing selection. */
export function projectBrowseListings<
  T extends ScopableListing & FilterableListing & SortableListing,
>(
  listings: readonly T[],
  selection: ResolvedListingSelection,
  sort: SortKey,
): T[] {
  return pipe(
    listings,
    selectListingsBySelection<T>(selection),
    sortListings(sort),
  );
}

/**
 * Project the city-wide hex density grid. Neighbourhood scope is intentionally
 * ignored; only room-type and price filters affect the grid.
 */
export function projectCityHexes(
  listings: readonly Listing[],
  filters: ListingFilters,
  resolution: HexResolution,
): HexCell[] {
  return pipe(
    listings,
    selectListingsBySelection<Listing>({ neighbourhood: null, filters }),
    aggregateHexes(resolution),
  );
}
