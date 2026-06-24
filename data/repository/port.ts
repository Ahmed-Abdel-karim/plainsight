/**
 * Plainsight — Repository port (the server-render data seam)
 * -----------------------------------------------------------------------------
 * The single interface the server data source implements. The loaders depend on
 * THIS, never on a concrete adapter, so where the materialised tiers come from
 * stays in one place. Return types are the `@/data/contract` shapes verbatim.
 *
 * Every method is a MATERIALISED read — an O(1) lookup of a pre-baked,
 * snapshot-immutable tier (meta, the aggregates cube, boundaries). The product
 * does all filtering client-side (the worker for Analyse, a main-thread memo for
 * Browse over the `points` tier), so there are no server-side computed/query
 * reads here.
 */
import type {
  CityIndexEntry,
  CityMeta,
  Neighbourhood,
  ScopeAggregates,
  StatsSnapshot,
} from "@/data/contract";

export interface CityRepository {
  /** City index for the picker. */
  listCities(): Promise<CityIndexEntry[]>;

  /** Framing tier: name, snapshot label, currency, bbox, price scale, … */
  getCityMeta(slug: string, snapshotId: string): Promise<CityMeta | null>;
  /** Neighbourhood list (id, name, median, count) from the materialised cube. */
  getNeighbourhoods(slug: string, snapshotId: string): Promise<Neighbourhood[]>;
  /** Pre-baked aggregates for a neighbourhood (`null` = whole city). */
  getScopeAggregates(
    slug: string,
    snapshotId: string,
    neighbourhood: string | null,
  ): Promise<ScopeAggregates | null>;
  /** The unfiltered aggregates for every scope, reshaped from the cube — the
   *  payload the client seeds as `initialData`. */
  getStatsSnapshot(
    slug: string,
    snapshotId: string,
  ): Promise<StatsSnapshot | null>;
}
