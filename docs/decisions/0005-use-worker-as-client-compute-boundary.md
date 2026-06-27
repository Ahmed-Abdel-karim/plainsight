# 0005. Use Worker as Client Compute Boundary

## Context

Plainsight is intentionally frontend-first once a city scene is active. The
browser needs the full active city snapshot for map rendering, Browse
interaction, filtering, and city-scale analysis. Sending every filter change to
request-time backend compute would add network latency to interactions that can
be derived from data already available in the scene.

At the same time, city-scale projections are not trivial UI state. Filtering
tens of thousands of listings, recomputing scope aggregates, and rebuilding hex
density grids can block the main thread if they run directly inside React render
or event handlers.

The scene also needs cancellation and stale-result handling. A filter drag, lens
change, city navigation, or map-resolution change can make an older projection
irrelevant before it finishes.

## Decision

Use a session-lifetime Web Worker as the client compute boundary for expensive
city projections.

The worker owns parsed listing rows for visited snapshots and receives typed
commands for loading data and running projection processes. The main scene actor
system coordinates when requests are started, cancelled, ignored, or accepted.
Only projection results cross back to the main thread; the full listing rows stay
inside the worker cache after loading.

The worker does not define separate calculation rules. It calls the shared pure
projection modules from `lib/listings` and `lib/filters`.

## Consequences

Interactive filters and map-resolution changes can recompute over the full city
snapshot without blocking map and UI interaction. Visited city rows can remain in
the worker cache for the scene session, and repeated projection requests can be
memoized by request parameters.

The worker boundary keeps React focused on rendering and XState focused on
orchestration. Heavy projection work has an explicit owner instead of being
spread across hooks, components, and effects.

The trade-off is more infrastructure: typed messages, cancellation, request IDs,
stale-reply checks, and worker lifecycle management. That cost is accepted
because the alternative is either a less responsive client or a request-time
backend path for interactions that are already local to the scene.

## Current Implementation Note

The root actor invokes the worker actor for the scene-layout lifetime. The worker
thread itself is created lazily on the first command, so entering the scene does
not immediately pay the bundled worker setup cost.

The worker process registry currently covers aggregate and hex projections.
Aggregate projection calls `projectScopeStats`, and hex projection calls
`projectCityHexes`. Browse list projection can run on the main thread because it
operates over the Browse collection and feeds a virtualized DOM surface.

## Rejected Alternatives

- **Main-thread-only recomputation:** simpler, but risks blocking map/UI
  interaction during filter changes and city-scale projections.
- **Request-time backend projection API:** centralizes compute, but adds network
  latency and backend operational complexity to interactions over data already
  loaded for the active scene.
- **Precompute every filter combination:** impossible to keep practical once
  filters, scope, room types, price ranges, and map resolution combine.
- **One worker per city actor:** clearer route ownership, but causes more worker
  churn and loses useful session cache across revisited cities.

## References

- [Architecture](../architecture.md)
- [Use XState for Scene Orchestration](0002-use-xstate-for-scene-orchestration.md)
- [Use Immutable City Snapshots](0003-use-immutable-city-snapshots.md)
