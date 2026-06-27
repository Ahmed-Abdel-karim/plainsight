# 0004. Persist Scene Runtime in Route Group

## Context

Plainsight has two different application surfaces: the home route and the city
scene. The home route is a lightweight entry point. The city scene is a
long-lived geospatial runtime with a MapLibre map, XState actor system, scene
React Query cache, URL synchronization, notifications, panels, and worker-backed
city projections.

City-to-city navigation should not behave like a full scene restart. The map
instance, map event wiring, actor system, and scene-level cache are expensive
client resources. Recreating them on every city route change would make
navigation feel heavier and would increase the number of race windows around map
readiness, source loading, URL writes, and stale worker replies.

The opposite placement is also wrong. Mounting the scene runtime in the root app
layout would make non-scene routes pay for geospatial client JavaScript and
browser-only map setup that they do not use.

## Decision

Mount the scene runtime in the `(scene)` route group layout.

`app/(scene)/layout.tsx` owns the scene React Query provider, `SceneProvider`,
scene notifications, and persistent map. The city route provides the active city
input, while the layout keeps the runtime alive across city-to-city navigation.

The home route remains outside this route group and does not mount the scene
runtime.

Leaving the `(scene)` route group intentionally tears down the map, actors,
scene cache, and worker session.

## Consequences

City-to-city navigation can reuse the same map and scene actor system. The root
actor can model a city switch explicitly by suppressing map/UI interaction,
replacing the city actor, and resuming the scene when the next city is ready or
has failed.

The home route stays lightweight and avoids scene-specific client JavaScript.
Scene state is scoped to the product surface that owns it instead of leaking into
the global application shell.

The route group layout becomes a meaningful runtime boundary. Contributors must
avoid moving scene providers into root layout for convenience and must avoid
mounting map-owned behavior inside individual city pages.

## Current Implementation Note

`app/(scene)/layout.tsx` mounts `QueryProvider`, `SceneProvider`,
`SceneNotifications`, and `MapView`. `app/layout.tsx` remains the global shell and
does not mount the scene runtime.

The active city is introduced by the city page and `SceneUrlLoader`; root then
spawns/replaces the city actor for that slug. Map and UI actors live for the
scene-layout session, while the city actor is route-scoped.

## Rejected Alternatives

- **Mount scene runtime in root layout:** preserves runtime across all routes,
  but makes the home page and any future non-scene route pay for MapLibre,
  XState scene actors, and scene-only providers.
- **Mount scene runtime in `[city]/page.tsx`:** keeps ownership close to the
  route, but recreates the map and actor system on every city navigation.
- **Let every scene component own its own local runtime:** reduces central
  setup, but loses one lifecycle boundary for map suppression, stale async
  results, URL sync, and worker cancellation.

## References

- [Architecture](../architecture.md)
- [Use XState for Scene Orchestration](0002-use-xstate-for-scene-orchestration.md)
