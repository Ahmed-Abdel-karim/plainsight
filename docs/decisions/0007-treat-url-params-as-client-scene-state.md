# 0007. Treat URL Params as Client Scene State

## Context

Plainsight URLs need to preserve meaningful scene state. A user should be able
to refresh, bookmark, share, or navigate browser history and recover the current
lens, scope, filters, and Browse selection.

Those parameters are not intended to define canonical server-rendered pages. The
product goal is not to create indexable filtered routes for every room type,
price range, neighbourhood, lens, or selected listing. The canonical page-start
data is the city snapshot context and its materialized KPIs.

Reading `searchParams` in the server route would make the route depend on
request-specific URL state. That would work against the static shell and Cache
Components model for little product value, because the parameters describe an
interactive client scene rather than server route identity.

## Decision

Treat URL parameters as client scene-state serialization.

The server route renders the canonical city page from static snapshot metadata
and materialized aggregates. It does not read search params to compute filtered
server output.

On the client, the scene URL loader reads the URL once, seeds the scene actors,
and normalizes state into the runtime. After the scene is settled, the root actor
mirrors semantic state back to the URL.

URL-backed state is limited to meaningful scene state:

- lens;
- neighbourhood/scope;
- filters;
- selected listing in Browse.

Runtime-only state stays out of the URL:

- map camera and zoom;
- hover state;
- MapLibre instance and source readiness;
- worker status;
- navigation suppression;
- transient loading and error coordination.

## Consequences

City routes stay static and cacheable. Server Components can focus on canonical
city context and page-start KPIs instead of request-specific filter variants.

The URL remains useful for bookmarks, sharing, refresh recovery, and browser
navigation without turning every interaction into a server-rendered route
variant.

The client runtime must own URL hydration and write-back carefully. It needs a
single schema, deterministic defaults, and suppression during city navigation so
stale state is not written while the active city is being replaced.

Some URL combinations require normalization. For example, listing selection is a
Browse-only concept, so a listing param is ignored or cleared when the active
lens is Analyse.

## Current Implementation Note

`lib/search-params.ts` defines the scene URL schema and serialization.
`SceneUrlLoader` reads the URL once on the client, applies lens before city
input, and only hydrates listing selection for Browse. `UrlWriteSync` observes
semantic state and asks root to sync. Root only writes URL state while settled;
during city switching, `URL.SYNC` is ignored.

## Rejected Alternatives

- **Read `searchParams` in the server page:** makes filtered scene state part of
  request-time rendering, but weakens the static/cacheable route model and
  creates little value because filtered combinations are not canonical pages.
- **Keep all scene state out of the URL:** simpler runtime, but loses bookmark,
  share, refresh, and browser-history recovery.
- **Put map camera and hover in the URL:** more complete serialization, but
  makes the URL noisy and couples transient interaction state to navigation.
- **Let components independently write URL params:** reduces central plumbing,
  but risks inconsistent defaults, stale writes during navigation, and multiple
  competing URL contracts.

## References

- [Architecture](../architecture.md)
- [Persist Scene Runtime in Route Group](0004-persist-scene-runtime-in-route-group.md)
- [Tier City Snapshots and Share Calculation Core](0006-tier-city-snapshots-and-share-calculation-core.md)
