/**
 * Listings — the single data API over a city's immutable rows. You hand it the
 * rows + price bounds once, then ask it for shaped data by `Filter`: stats for
 * the cards, the browse list, the hex grid, a count. It owns what "unfiltered"
 * means, so callers send a filter and read data without ever branching on
 * default-vs-not.
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
  hexesFor,
  listingsFor,
  selectListings,
  statsFor,
} from "../projections";
import {
  isDefaultView,
  resolveQuery,
  type StoredQuery,
} from "../model/resolve-selection";

/** A selection over the rows: which neighbourhood (null = whole city) and the
 *  room/price filter. The one input every read takes. */
export interface Filter {
  readonly neighbourhood: string | null;
  readonly roomTypes: RoomType[];
  readonly priceRange: [number, number] | null;
}

/** The empty selection — whole city, all room types, full price range. */
export const UNFILTERED: Filter = {
  neighbourhood: null,
  roomTypes: [],
  priceRange: null,
};

/** The shaped numbers a scope renders (KPIs, room mix, hosts, histogram). */
export type Stats = ScopeAggregates;

export type { StatsSnapshot };

export interface Listings {
  getStats(filter: Filter): Stats;
  getListings(filter: Filter, sort: SortKey): Listing[];
  getHexes(filter: Filter, resolution: HexResolution): HexCell[];
  getCount(filter: Filter): number;
  isUnfiltered(filter: Filter): boolean;
  /** The unfiltered stats for the city and each neighbourhood. */
  unfiltered(): StatsSnapshot;
}

function toStored(filter: Filter): StoredQuery {
  return {
    nbhd: filter.neighbourhood,
    roomTypes: filter.roomTypes,
    priceRange: filter.priceRange,
  };
}

/** Build a Listings API over a city's rows. `bounds` is the city's price band,
 *  used to resolve the open-ended price filter (see `resolvePriceBand`). */
export function createListings(
  rows: readonly Listing[],
  bounds: FilterBounds,
): Listings {
  const query = (filter: Filter) => resolveQuery(toStored(filter), bounds);

  const getStats = (filter: Filter) =>
    statsFor(rows, query(filter), bounds.max);

  return {
    getStats,
    getListings: (filter, sort) => listingsFor(rows, query(filter), sort),
    getHexes: (filter, resolution) =>
      hexesFor(rows, query(filter).filters, resolution),
    getCount: (filter) => selectListings(query(filter))(rows).length,
    isUnfiltered: (filter) => isDefaultView(toStored(filter), bounds),
    unfiltered: () => ({
      city: getStats(UNFILTERED),
      neighbourhoods: Object.fromEntries(
        neighbourhoodIds(rows).map((id) => [
          id,
          getStats({ ...UNFILTERED, neighbourhood: id }),
        ]),
      ),
    }),
  };
}

function neighbourhoodIds(rows: readonly Listing[]): string[] {
  return [...new Set(rows.map((row) => row.neighbourhoodId))];
}
