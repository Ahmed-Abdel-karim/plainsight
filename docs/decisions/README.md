# Architecture Decision Records

This folder records load-bearing architecture decisions for Plainsight.

An ADR belongs here when a decision:

- affects future implementation choices;
- has meaningful alternatives;
- explains a tradeoff that is not obvious from code alone;
- should remain understandable to future contributors and reviewers.

The implementation is the source of truth. If an ADR no longer matches the
implementation, update the ADR or add a new one that supersedes it.

## Accepted decisions

- [0001. Adopt Feature-Based Architecture](0001-adopt-feature-based-architecture.md)
- [0002. Use XState for Scene Orchestration](0002-use-xstate-for-scene-orchestration.md)
- [0003. Use Immutable City Snapshots](0003-use-immutable-city-snapshots.md)
- [0004. Persist Scene Runtime in Route Group](0004-persist-scene-runtime-in-route-group.md)
- [0005. Use Worker as Client Compute Boundary](0005-use-worker-as-client-compute-boundary.md)
- [0006. Tier City Snapshots and Share Calculation Core](0006-tier-city-snapshots-and-share-calculation-core.md)
- [0007. Treat URL Params as Client Scene State](0007-treat-url-params-as-client-scene-state.md)

## When to add a new ADR

Add a new ADR when the project makes a decision that changes one of these
boundaries:

- route/runtime ownership;
- data delivery, materialization, or calculation integrity;
- actor topology or lifecycle ownership;
- worker, map, or browser-only execution boundaries;
- URL semantics or shareable state;
- testing strategy for high-risk contracts;
- deployment or operational constraints that affect architecture.

Do not add an ADR for routine refactors, local component structure, styling
details, or implementation notes that are already clear from the code.

## Format

Use the existing ADR format:

```md
# 000N. Decision Title

## Context

Why the decision became necessary.

## Decision

What was chosen.

## Consequences

What improves, what tradeoffs are accepted, and what future contributors must
remember.

## Current Implementation Note

Optional. Use when the implementation has details that future readers need to
check against the current architecture.

## Rejected Alternatives

The main alternatives considered and why they were not chosen.

## References

Links to related docs, ADRs, or external references.
```
