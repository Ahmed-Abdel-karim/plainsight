# 0003. Use Immutable City Snapshots

## Context

Plainsight is a scenario-based market explorer. Each city is a bounded model of
the market at a known point in time, and every view must work from the same
coherent dataset.

The first version is a read-only application. It has no user accounts, uploads,
live ingestion, or continuously changing records. Those capabilities would
require a different product and operational boundary. The current deployment
must also remain practical for a personal Vercel project.

## Decision

Each city is published as an immutable, versioned snapshot in external object
storage. Public assets are delivered through CDN-backed URLs rather than through
Vercel Functions. A configurable asset base URL keeps the application independent
of the storage provider.

The first version has no database or persistent application backend. Next.js may
read and cache the small server-facing parts of a snapshot, while the browser
fetches the larger public assets directly. The data contract and repository
boundary remain stable across both paths.

New data is published as a new snapshot instead of mutating the active one.
Uploads, live data, and automated ingestion remain possible enhancements, but
would require their own persistence, validation, and cache-invalidation design.

## Consequences

Every part of a city scene uses reproducible data from the same point in time.
Deployment remains low-cost and avoids database operations, migrations, and
server-side analytical infrastructure.

The available cities and snapshot sizes must remain deliberate. Data freshness
is limited by the publishing process, and the application depends on external
object storage being available.

How a snapshot is divided between immediate server-rendered summaries and full
client detail is a separate decision. Off-main-thread analytical processing is
also recorded separately.

## Current Implementation Note

The current repository keeps server-facing tiers in `data/snapshots`
(`manifest`, `meta`, and `aggregates`) and browser-facing tiers under
`public/city-assets/{slug}/{snapshotId}/` by default (`analytics`, `points`, and
`boundaries`). `NEXT_PUBLIC_CITY_ASSET_BASE_URL` can move the browser-facing
tiers to an external asset origin without changing the data contract.

## Rejected Alternatives

- **Database-backed application:** appropriate for live records, user uploads,
  and server queries, but unnecessary for a read-only first version built from
  dated scenarios.
- **Bundle or proxy all data through Vercel:** simpler operationally, but the
  largest files leave little deployment headroom and exceed the documented
  Vercel Function response limit.

## References

- [Deployment research](../../PORTFOLIO_FINALIZATION.md#deployment-research-note-large-data-delivery)
- [Vercel Function limits](https://vercel.com/docs/functions/limitations)
