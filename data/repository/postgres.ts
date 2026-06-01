import "server-only";

import type {
  CityIndexEntry,
  CityMeta,
  Listing,
  Neighbourhood,
  ScopeAggregates,
} from "@/data/contract";

import type { CityRepository, ListingPage, SnapshotRef } from "./port";

/**
 * Thrown by every method until the Postgres/PostGIS adapter is wired. Its
 * existence is the point: flip `DATA_SOURCE=postgres` and the failure is an
 * explicit, typed "not yet implemented" — proof the seam routes here, not a
 * silent fallback. Schema lives in `data/sql/schema.sql`.
 */
class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `postgresRepository.${method} is not implemented yet — see data/sql/schema.sql`,
    );
    this.name = "NotImplementedError";
  }
}

/**
 * The swap target. Each method documents the query that would replace the
 * static adapter's in-memory work; the split mirrors the principle — materialised
 * reads hit `scope_aggregates`, computed reads `GROUP BY` over `listings`.
 *
 * Methods declare no parameters (TypeScript allows an implementation to take
 * fewer args than the port) so the stub stays signature-clean; wiring later
 * adds a `pg` client, parameterises the sketched SQL (`$1`, `$2`, …),
 * `ST_AsGeoJSON`-es geometry, and defaults `snapshotId` to
 * `cities.latest_snapshot_id`.
 */
export const postgresRepository: CityRepository = {
  async listCities(): Promise<CityIndexEntry[]> {
    // SELECT c.slug, c.name, c.country, cs.frame, cs.snapshot_label,
    //        sa.listing_count
    //   FROM cities c
    //   JOIN city_snapshot cs ON cs.snapshot_id = c.latest_snapshot_id
    //   JOIN scope_aggregates sa
    //     ON sa.snapshot_id = c.latest_snapshot_id AND sa.scope_type = 'city'
    throw new NotImplementedError("listCities");
  },

  async listSnapshots(): Promise<SnapshotRef[]> {
    // SELECT id, city_slug, label, captured_at
    //   FROM snapshots WHERE city_slug = $1 ORDER BY captured_at DESC
    throw new NotImplementedError("listSnapshots");
  },

  async getCityMeta(): Promise<CityMeta | null> {
    // SELECT c.slug, c.name, c.country, c.currency, c.hex_enabled,
    //        ST_AsGeoJSON(c.bbox), ST_AsGeoJSON(c.center),
    //        cs.frame, cs.snapshot_label, cs.price_cap, cs.price_scale
    //   FROM cities c JOIN city_snapshot cs ON cs.snapshot_id = $2
    //  WHERE c.slug = $1
    throw new NotImplementedError("getCityMeta");
  },

  async getBoundaries(): Promise<null> {
    // SELECT json_build_object('type','FeatureCollection','features',
    //   json_agg(json_build_object('type','Feature','id', id,
    //     'geometry', ST_AsGeoJSON(geom)::json,
    //     'properties', json_build_object('id', id, 'name', name))))
    //   FROM neighbourhoods WHERE city_slug = $1
    throw new NotImplementedError("getBoundaries");
  },

  async getNeighbourhoods(): Promise<Neighbourhood[]> {
    // SELECT n.id, n.name, sa.median_price, sa.listing_count, sa.meets_floor
    //   FROM neighbourhoods n
    //   JOIN scope_aggregates sa
    //     ON sa.scope_type = 'neighbourhood' AND sa.scope_id = n.id
    //    AND sa.snapshot_id = $2
    //  WHERE n.city_slug = $1
    throw new NotImplementedError("getNeighbourhoods");
  },

  async getNeighbourhood(): Promise<Neighbourhood | undefined> {
    // ... getNeighbourhoods with an added `AND n.id = $2`
    throw new NotImplementedError("getNeighbourhood");
  },

  async getListing(): Promise<Listing | undefined> {
    // SELECT * FROM listings WHERE snapshot_id = $3 AND id = $2 AND city_slug = $1
    throw new NotImplementedError("getListing");
  },

  async getScopeAggregates(): Promise<ScopeAggregates | null> {
    // Pure materialised lookup — the cheap path:
    // SELECT listing_count, median_price, multi_listing_host_share,
    //        avg_reviews_per_month, meets_floor, room_type_mix, top_hosts,
    //        price_histogram
    //   FROM scope_aggregates
    //  WHERE snapshot_id = $3 AND scope_type = $scopeType AND scope_id = $scopeId
    throw new NotImplementedError("getScopeAggregates");
  },

  async getListingsForScope(): Promise<Listing[]> {
    // SELECT * FROM listings
    //  WHERE snapshot_id = $3 AND city_slug = $1 [AND neighbourhood_id = $scopeId]
    throw new NotImplementedError("getListingsForScope");
  },

  async getFilteredAggregates(): Promise<ScopeAggregates | null> {
    // Computed on demand — the GROUP BY the materialised table can't pre-bake:
    // SELECT count(*), percentile_cont(0.5) WITHIN GROUP (ORDER BY price), ...
    //   FROM listings
    //  WHERE snapshot_id = $3 AND city_slug = $1 [AND neighbourhood_id = $scopeId]
    //    AND (cardinality($roomTypes) = 0 OR room_type = ANY($roomTypes))
    //    AND price BETWEEN $priceMin AND $priceMax
    throw new NotImplementedError("getFilteredAggregates");
  },

  async queryListings(): Promise<ListingPage> {
    // SELECT *, count(*) OVER () AS total FROM listings
    //  WHERE ... ORDER BY $sort LIMIT $limit OFFSET $offset
    throw new NotImplementedError("queryListings");
  },
};
