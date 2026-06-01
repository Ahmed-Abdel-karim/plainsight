-- Plainsight — relational schema (the shape behind the repository port)
-- ============================================================================
-- What the `data/json` files look like as a database. Postgres + PostGIS,
-- snapshot-keyed so historical comparison across monthly Inside Airbnb captures
-- is designed-in, not retrofitted. The `postgresRepository` adapter targets
-- this; the `staticJsonRepository` serves the equivalent of the LATEST snapshot.
--
-- Principle encoded here: `scope_aggregates` is a MATERIALISED cube refreshed at
-- ingest (keep a snapshot of the aggregates) — O(1) reads for the default view.
-- The unbounded filtered slice is computed live with a GROUP BY over `listings`.

CREATE EXTENSION IF NOT EXISTS postgis;

-- One captured monthly snapshot per city. Everything time-varying hangs off this.
CREATE TABLE snapshots (
  id          text PRIMARY KEY,            -- e.g. 'london-2025-09'
  city_slug   text NOT NULL,
  label       text NOT NULL,               -- display label, e.g. ' 9/2025'
  captured_at date NOT NULL,
  source      text NOT NULL DEFAULT 'inside-airbnb'
);

-- Stable city identity (does not change between snapshots).
CREATE TABLE cities (
  slug               text PRIMARY KEY,
  name               text NOT NULL,
  country            text NOT NULL,
  currency           text NOT NULL,
  hex_enabled        boolean NOT NULL DEFAULT false,
  bbox               geometry(Polygon, 4326) NOT NULL,
  center             geometry(Point, 4326) NOT NULL,
  latest_snapshot_id text REFERENCES snapshots (id)
);

-- Snapshot-varying city metadata (the `CityMeta` not on `cities`).
CREATE TABLE city_snapshot (
  snapshot_id    text PRIMARY KEY REFERENCES snapshots (id),
  city_slug      text NOT NULL REFERENCES cities (slug),
  frame          text NOT NULL,
  snapshot_label text NOT NULL,
  price_cap      numeric NOT NULL,         -- 99th-percentile cap
  price_scale    jsonb   NOT NULL          -- { breaks:number[], min, max }
);

-- Neighbourhood polygons (replaces {slug}-boundaries.geojson). Served to the
-- client via ST_AsGeoJSON. Treated as stable across snapshots.
CREATE TABLE neighbourhoods (
  city_slug text NOT NULL REFERENCES cities (slug),
  id        text NOT NULL,                 -- slug; matches listings.neighbourhood_id
  name      text NOT NULL,
  geom      geometry(MultiPolygon, 4326) NOT NULL,
  PRIMARY KEY (city_slug, id)
);

-- The raw fact table. `neighbourhood_id` is assigned at ingest by point-in-
-- polygon (ST_Contains); listings outside every polygon get '__unassigned__'.
CREATE TABLE listings (
  snapshot_id         text NOT NULL REFERENCES snapshots (id),
  id                  bigint NOT NULL,
  city_slug           text NOT NULL REFERENCES cities (slug),
  host_id             bigint NOT NULL,
  host_name           text,
  neighbourhood_id    text NOT NULL,
  geom                geometry(Point, 4326) NOT NULL,
  room_type           text NOT NULL,       -- RoomType enum value
  price               numeric NOT NULL,
  min_nights          integer NOT NULL,
  number_of_reviews   integer NOT NULL,
  reviews_per_month   numeric,             -- NULL = never reviewed
  host_listings_count integer NOT NULL,
  image_variant       integer NOT NULL,
  h3                  text,                -- precomputed hex cell; NULL if disabled
  PRIMARY KEY (snapshot_id, id)
);

-- The MATERIALISED aggregate cube. One row per (snapshot, scope). Refreshed at
-- ingest by the same logic as lib/filters/computeAggregates. scope_type is
-- 'city' (scope_id = city_slug) or 'neighbourhood' (scope_id = neighbourhood id).
CREATE TABLE scope_aggregates (
  snapshot_id              text NOT NULL REFERENCES snapshots (id),
  city_slug                text NOT NULL REFERENCES cities (slug),
  scope_type               text NOT NULL CHECK (scope_type IN ('city', 'neighbourhood')),
  scope_id                 text NOT NULL,
  listing_count            integer NOT NULL,
  median_price             numeric,
  multi_listing_host_share numeric,        -- NULL below MIN_LISTING_FLOOR
  avg_reviews_per_month    numeric,        -- mean over reviewed listings; NULL if none
  meets_floor              boolean NOT NULL,
  room_type_mix            jsonb   NOT NULL,
  top_hosts                jsonb   NOT NULL DEFAULT '[]',  -- empty below floor
  price_histogram          jsonb   NOT NULL DEFAULT '[]',
  PRIMARY KEY (snapshot_id, scope_type, scope_id)
);

-- Indexes ---------------------------------------------------------------------
-- Spatial: point-in-polygon at ingest, viewport queries.
CREATE INDEX listings_geom_gix       ON listings       USING gist (geom);
CREATE INDEX neighbourhoods_geom_gix ON neighbourhoods USING gist (geom);
-- Scope narrowing for getListingsForScope / queryListings.
CREATE INDEX listings_scope_idx ON listings (snapshot_id, city_slug, neighbourhood_id);
-- The filtered path: WHERE room_type = ANY(...) AND price BETWEEN ...
CREATE INDEX listings_filter_idx ON listings (snapshot_id, city_slug, room_type, price);
-- Hex lens lookups.
CREATE INDEX listings_h3_idx ON listings (h3) WHERE h3 IS NOT NULL;
