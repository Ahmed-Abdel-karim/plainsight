# 0002. Use XState for Scene Orchestration

## Context

Zustand was chosen first because it was a simple way to store client state. As
the map, UI, city, and worker logic became connected, the problem changed from
storing values to coordinating work.

Subscriptions and middleware reacted after values changed. A coordinator layer
then had to infer what caused each change and what should happen next. This made
behavior timing-dependent and difficult to follow.

The same weakness appeared in several races: map commands could arrive before
MapLibre or its sources were ready; the old city could remain interactive while
a new route loaded; and worker results could arrive after their city was no
longer current. Fast local networking often hid these windows.

## Decision

One XState v5 actor system owns scene orchestration. Actors communicate through
explicit events, while transitions and guards define what is allowed, deferred,
ignored, or treated as the latest request.

Actor boundaries follow ownership and lifetime. Root coordinates the system;
map, UI, city, and worker own their behavior. This avoids one large machine with
many interacting parallel states.

XState is not required for every value. Local interactions remain in React,
navigable state in the URL, and remote data in the server or query cache.

## Consequences

Modeling the states and transitions exposed bugs before the machines were fully
integrated. It made latency-dependent behavior visible even when local
development and existing tests did not reproduce it. The model also provides a
visual, executable specification for machine tests.

XState adds complexity and a learning curve. That cost is accepted because its
boilerplate is cheaper than building, testing, documenting, and maintaining a
custom orchestration layer.

## Current Implementation Note

The implemented scene actor system is mounted by `SceneProvider` in
`app/(scene)/layout.tsx`, not root `app/layout.tsx`. Root currently uses
`settled <-> switching` to gate URL writes and map/UI suspension. The navigation
machine is a separate `NAV.INTENT` / `NAV.COMMIT` path tracker, and the map
machine is parallel with `lifecycle` and `interaction` regions. See
[`../architecture.md`](../architecture.md) for the current topology.

## Rejected Alternatives

- **Redux with redux-observable:** considered from prior experience, but not
  prototyped. It is strong at composing and cancelling event streams, including
  throttling and debouncing. Plainsight's main need was visible lifecycle
  orchestration. XState can still use observable actors if stream processing
  becomes important later.

## References

- [Current architecture](../architecture.md)
- [Historical map transition design](../../docs/map-machine-transition-gating.md)
- [XState documentation](https://stately.ai/docs/xstate)
- [Zustand introduction](https://zustand.docs.pmnd.rs/getting-started/introduction)
- [redux-observable documentation](https://redux-observable.js.org/)
