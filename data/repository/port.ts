/**
 * Plainsight — Repository port (the swap seam)
 * -----------------------------------------------------------------------------
 * The single interface every data source implements. Components and route
 * handlers depend on THIS, never on a concrete adapter, so the static-JSON
 * source can be swapped for Postgres by changing one factory — no call-site
 * churn. Return types are the `@/data/contract` shapes verbatim.
 *
 * Methods split along the principle this product runs on:
 *  - MATERIALISED reads (`getScopeAggregates`, meta, boundaries) are O(1)
 *    lookups of a pre-baked, snapshot-immutable cube.
 *  - COMPUTED reads (`getFilteredAggregates`, `queryListings`) recompute over
 *    the unbounded filter space on demand.
 *
 * Snapshot dimension: every city-scoped read accepts an optional `snapshotId`
 * (defaults to the latest). The static adapter only ships one snapshot and
 * ignores it; a real DB keys `listings`/`scope_aggregates` by it for history.
 */
import type {
  CityIndexEntry,
  CityMeta,
  Listing,
  Neighbourhood,
  ScopeAggregates,
} from "@/data/contract";
import type { ListingFilters, Scope, SortKey } from "@/data/types";
import type { NeighbourhoodBoundaries } from "@/lib/geo/types";

/** One captured Inside Airbnb monthly snapshot for a city. */
export interface SnapshotRef {
  id: string;
  citySlug: string;
  label: string;
  /** ISO date of capture; empty string when the source does not track it. */
  capturedAt: string;
}

/** A page of listings plus the total matching the query (for pagination/UI). */
export interface ListingPage {
  items: Listing[];
  total: number;
}

export interface ListingQueryPage {
  offset: number;
  limit: number;
}

export interface CityRepository {
  /** City index for the picker. */
  listCities(): Promise<CityIndexEntry[]>;
  /** Snapshots available for a city, newest first. */
  listSnapshots(slug: string): Promise<SnapshotRef[]>;

  // --- Materialised, snapshot-immutable reads -------------------------------
  getCityMeta(slug: string, snapshotId?: string): Promise<CityMeta | null>;
  getBoundaries(slug: string): Promise<NeighbourhoodBoundaries | null>;
  getNeighbourhoods(
    slug: string,
    snapshotId?: string,
  ): Promise<Neighbourhood[]>;
  getNeighbourhood(
    slug: string,
    id: string,
    snapshotId?: string,
  ): Promise<Neighbourhood | undefined>;
  getListing(
    slug: string,
    id: number,
    snapshotId?: string,
  ): Promise<Listing | undefined>;
  /** Pre-baked aggregate cube for a scope (city-wide or one neighbourhood). */
  getScopeAggregates(
    slug: string,
    scope: Scope,
    snapshotId?: string,
  ): Promise<ScopeAggregates | null>;

  // --- Computed, on-demand reads --------------------------------------------
  /** Raw listings for a scope — e.g. to hydrate the client map's layers. */
  getListingsForScope(
    slug: string,
    scope: Scope,
    snapshotId?: string,
  ): Promise<Listing[]>;
  /** Aggregates recomputed over a filtered slice (deep-links, large cities). */
  getFilteredAggregates(
    slug: string,
    scope: Scope,
    filters: ListingFilters,
    snapshotId?: string,
  ): Promise<ScopeAggregates | null>;
  /** Filtered + sorted + paginated listings for the Browse list. */
  queryListings(
    slug: string,
    scope: Scope,
    filters: ListingFilters,
    sort: SortKey,
    page?: ListingQueryPage,
    snapshotId?: string,
  ): Promise<ListingPage>;
}
