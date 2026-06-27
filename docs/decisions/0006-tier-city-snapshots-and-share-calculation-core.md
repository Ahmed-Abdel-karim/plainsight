# 0006. Tier City Snapshots and Share Calculation Core

## Context

Each city snapshot contains data with different access patterns.

The page-start experience needs small canonical data: available cities, city
metadata, snapshot labels, map framing, price scale, city KPIs, neighbourhood
KPIs, and the neighbourhood list. These values should be available to Server
Components and should remain static and cacheable.

The interactive scene needs larger browser-facing assets: listing analytics,
map points, and neighbourhood boundaries. These assets are required for
MapLibre/WebGL rendering, Browse, filtering, and worker projections, but they
should not be parsed by the server just to render page-start KPIs.

The project also needs calculation integrity. Materialized KPIs and live client
recomputation should not drift because two different implementations define what
a filtered scope, median price, room mix, host concentration, or hex grid means.

## Decision

Split city snapshots into server-rendered materialized tiers and browser-facing
interactive tiers.

Server/RSC tiers live under `data/snapshots`:

- manifest;
- meta;
- aggregates.

Browser-facing interactive tiers live under city asset URLs:

- analytics;
- points;
- boundaries.

Server/RSC code reads materialized aggregate tiers as committed snapshot data. It
does not recalculate city and neighbourhood KPIs at request time.

Snapshot materialization and runtime recomputation share the same pure
calculation core. The offline aggregate generator, client worker, and Browse
projection all use the shared `lib/listings` and `lib/filters` projection
modules.

## Consequences

Canonical city pages can start from static, cacheable metadata and materialized
KPIs without loading or parsing the full interactive dataset on the server.
Large browser-facing assets can be delivered as immutable public assets and can
move to an external asset origin without changing the repository contract.

The same calculation model is used across snapshot generation and client
interaction. This makes the materialized read model a verified projection of the
same rules used by the runtime, not a separate backend implementation that can
silently drift.

Snapshot updates require a generation and publishing step. When calculation
rules change, materialized aggregate files must be regenerated and reviewed with
the code change. Data freshness is bounded by the snapshot publishing process,
not by live records.

## Current Implementation Note

`data/repository/static-json.ts` reads server-facing tiers from
`data/snapshots` with `"use cache"` and `cacheLife("max")`. `loadAggregates`
reads `aggregates.json`, and server selectors choose the city or neighbourhood
aggregate directly.

The aggregate generator rebuilds `aggregates.json` from the public analytics
rows, city metadata, and boundaries. The generator test compares generated output
with the committed aggregate file. Runtime aggregate recomputation uses
`projectScopeStats`; hex recomputation uses `projectCityHexes`; Browse uses
`projectBrowseListings`.

## Rejected Alternatives

- **Single large snapshot file:** simpler to publish, but forces unrelated server
  and client paths to load data they do not need.
- **Server recomputation from raw listings on every request:** keeps one runtime
  compute path, but weakens the static/cacheable page-start model and parses
  large data for values that are already materialized.
- **Separate backend and frontend calculation implementations:** may look clean
  by layer, but creates a data-integrity risk when KPI or filtering rules change.
- **Database-backed analytical queries:** appropriate for live records and user
  data, but unnecessary for the current read-only snapshot product.

## References

- [Architecture](../architecture.md)
- [Use Immutable City Snapshots](0003-use-immutable-city-snapshots.md)
- [Use Worker as Client Compute Boundary](0005-use-worker-as-client-compute-boundary.md)
