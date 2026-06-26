/**
 * Listings service — the single data API over a city's immutable rows. You hand
 * it the rows + price bounds once, then ask it for projections by listing
 * selection: stats, the browse list, the city hex grid, and a count.
 *
 * A thin façade over the existing pure projection functions — same math, one
 * entry point — so it runs identically in the worker, on the main thread, and in
 * an offline stats generator. Only its serialisable {@link StatsSnapshot} crosses
 * a thread/network boundary; the instance itself does not.
 */
import type {
  Listing,
  RoomType,
  ScopeAggregates,
  StatsSnapshot,
} from "@/data/contract";
import type { FilterBounds, SortKey } from "@/data/types";
import type { HexCell, HexResolution } from "@/lib/hex/types";

import {
  projectBrowseListings,
  projectCityHexes,
  projectScopeStats,
  selectListingsBySelection,
} from "../projections";
import {
  isDefaultListingSelection,
  resolveListingSelection,
  type StoredListingSelection,
} from "../model/resolve-selection";

/** Stored UI selection: scope plus room/price filters. */
export interface ListingSelection {
  readonly neighbourhood: string | null;
  readonly roomTypes: RoomType[];
  readonly priceRange: [number, number] | null;
}

/** The empty selection — whole city, all room types, full price range. */
export const UNFILTERED_SELECTION: ListingSelection = {
  neighbourhood: null,
  roomTypes: [],
  priceRange: null,
};

/** The shaped numbers a scope renders (KPIs, room mix, hosts, histogram). */
export type Stats = ScopeAggregates;

export type { StatsSnapshot };

export interface ListingsService {
  getStats(selection: ListingSelection): Stats;
  getListings(selection: ListingSelection, sort: SortKey): Listing[];
  /**
   * Returns the city-wide hex density grid. Neighbourhood scope is intentionally
   * ignored; only room-type and price filters affect the grid.
   */
  getCityHexes(
    selection: ListingSelection,
    resolution: HexResolution,
  ): HexCell[];
  getListingCount(selection: ListingSelection): number;
  isUnfiltered(selection: ListingSelection): boolean;
  /** The unfiltered stats snapshot for the city and each neighbourhood. */
  getUnfilteredStatsSnapshot(): StatsSnapshot;
}

function toStored(selection: ListingSelection): StoredListingSelection {
  return {
    nbhd: selection.neighbourhood,
    roomTypes: selection.roomTypes,
    priceRange: selection.priceRange,
  };
}

/** Build a listings service over a city's rows and price bounds. */
export function createListingsService(
  rows: readonly Listing[],
  bounds: FilterBounds,
): ListingsService {
  const resolveSelection = (selection: ListingSelection) =>
    resolveListingSelection(toStored(selection), bounds);

  const getStats = (selection: ListingSelection) =>
    projectScopeStats(rows, resolveSelection(selection), bounds.max);

  return {
    getStats,
    getListings: (selection, sort) =>
      projectBrowseListings(rows, resolveSelection(selection), sort),
    getCityHexes: (selection, resolution) =>
      projectCityHexes(rows, resolveSelection(selection).filters, resolution),
    getListingCount: (selection) =>
      selectListingsBySelection(resolveSelection(selection))(rows).length,
    isUnfiltered: (selection) =>
      isDefaultListingSelection(toStored(selection), bounds),
    getUnfilteredStatsSnapshot: () => ({
      city: getStats(UNFILTERED_SELECTION),
      neighbourhoods: Object.fromEntries(
        neighbourhoodIds(rows).map((id) => [
          id,
          getStats({ ...UNFILTERED_SELECTION, neighbourhood: id }),
        ]),
      ),
    }),
  };
}

function neighbourhoodIds(rows: readonly Listing[]): string[] {
  return [...new Set(rows.map((row) => row.neighbourhoodId))];
}
