# 0001. Adopt Feature-Based Architecture

## Context

Plainsight began with product UI and reusable UI together under `components/`.
That was reasonable while the city scene was the only substantial product
surface. Once home and scene began evolving separately, `components/` no longer
made it clear whether code belonged to a product capability or was shared UI.

The scene also grew distinct map, browse, analysis, and state areas. Deep and
sideways imports made those relationships harder to understand. Earlier guidance
had deferred `features/` until a second independent domain appeared; home and
scene now satisfy that condition.

## Decision

Product code is organized by feature:

- `features/home` owns the landing experience and curated city picker.
- `features/scene` owns the per-city market explorer, including its map, browse,
  analysis, and actor system.

`components/` will contain shared UI only. `app/` will compose features through
their public APIs. `data/` remains the application-wide IO seam and `lib/` the
shared kernel.

Dependencies flow downward:

    app/ → features/ → components/, data/, lib/
    data/ → lib/
    lib/ → no application layer

Features will not depend on sibling features. Scene sub-domains will place their
shared behavior in `scene/shared` or `scene/state` instead of importing one
another's internals. Conventions document the detailed import rules, which ESLint
enforces where possible.

## Consequences

The top-level structure now shows which code belongs to home, scene, or the
shared application layers. Automated checks can catch boundary violations.

Contributors must still judge when code is genuinely shared, and small
duplication may remain until a shared abstraction is justified. Features express
ownership; they are not independently deployable applications.

## Rejected Alternatives

- **Restructure within `components/`:** less move churn, but product and shared UI
  would remain mixed.
- **Colocate with App Router routes:** suitable for page-owned code, but scene
  spans a persistent layout and multiple city routes.
- **Move everything under `src/`:** separates source from configuration, but does
  not clarify ownership or dependency direction.

## References

- [Conventions](../conventions.md#folder-structure)
- [Architecture](../architecture.md)
