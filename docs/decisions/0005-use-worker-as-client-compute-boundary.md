# 0005. Use Worker as Client Compute Boundary

## Context

The scene is frontend-first: the browser holds the full city snapshot, so filter
and analysis results can be derived locally instead of round-tripping to a
backend. But city-scale projections — filtering tens of thousands of listings,
recomputing aggregates, rebuilding hex grids — are heavy enough to block the main
thread if run in render or event handlers. They also need cancellation and
stale-result handling, since a filter drag, lens change, or navigation can make
an in-flight projection irrelevant before it finishes.

## Decision

Use a Web Worker, alive for the scene session, as the compute boundary for
expensive city projections.

The worker caches parsed rows for visited cities and runs typed projection
commands; the scene actor system decides when requests start, cancel, or are
accepted. Only results cross back — rows stay in the worker. The worker defines no
calculation rules of its own; it calls the shared `lib/listings` / `lib/filters`
modules.

## Consequences

Filters and map-resolution changes recompute over the full snapshot without
blocking map or UI. Rows stay cached for the session, repeated requests are
memoized, and heavy work has one explicit owner instead of leaking across hooks
and effects. The cost is infrastructure: typed messages, cancellation, request
IDs, stale-reply checks, and worker lifecycle — accepted over a less responsive
client or a request-time backend path.

## Measured Cost

Benchmarked on the real London snapshot (61,963 listings) via the same shared
modules the worker calls. The decision boundary is the **50 ms long-task
threshold**.

| Work                             | Cost (mean / p99) | Home        | Why                                   |
| -------------------------------- | ----------------- | ----------- | ------------------------------------- |
| Analyse recompute, whole-city    | **80 / 93 ms**    | Worker      | crosses 50 ms; recurs per filter/zoom |
| Analyse recompute, filtered      | 35 / 46 ms        | Worker      | same path, lighter input              |
| One-time row parse (16.2 MB)     | 31 / 38 ms        | Worker      | one `JSON.parse` at city open         |
| Browse filter + sort, whole-city | **18 / 27 ms**    | Main thread | under 50 ms; no hex/aggregation       |
| Browse filter + sort, filtered   | 10 / 13 ms        | Main thread | already virtualized                   |

Analyse recompute runs past the threshold and repeats on every interaction, so
the worker keeps it off the responsive thread. Browse filter is ~4× cheaper and
stays under the threshold, so it stays on the main thread; moving it would only
add result serialization and an async cycle. The worker offloads cost, it does
not make the work faster — same code, run off the thread that must stay
responsive. Download is excluded (async latency, not blocking); Browse points
parsing stays on the main thread (see project boundaries). Figures are desktop;
phone is tracked under mobile support.

Conditions: i7-13620H, Node 24.14, Ubuntu 24.04 (WSL2), hex resolution 6, London
2025-09. Reproduce: `lib/listings/__bench__/recompute.bench.ts`.

## Current Implementation Note

The root actor invokes the worker for the scene lifetime; the thread is created
lazily on first command, so entering the scene pays no upfront setup. The process
registry covers aggregate (`projectScopeStats`) and hex (`projectCityHexes`)
projections. Browse list projection runs on the main thread (see Measured Cost).

## Rejected Alternatives

- **Main-thread-only recomputation:** simpler, but blocks map/UI during
  city-scale projections (80 ms+ per recompute).
- **Request-time backend projection API:** adds network latency and backend
  ops to interactions over data already loaded in the scene.
- **Precompute every filter combination:** impractical once scope, room type,
  price, and resolution combine.
- **One worker per city actor:** clearer ownership, but more churn and loses
  session cache across revisited cities.

## References

- [Architecture](../architecture.md)
- [Use XState for Scene Orchestration](0002-use-xstate-for-scene-orchestration.md)
- [Use Immutable City Snapshots](0003-use-immutable-city-snapshots.md)
