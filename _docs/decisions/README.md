# Architecture Decision Records

This log records decisions that are important enough to constrain future work.
Each ADR stays short and focused on one decision.

ADRs in this log are accepted decisions for the project. A replaced decision
remains in the log and is marked `Superseded` with a link to its replacement.

## When To Add An ADR

Add an ADR when a change:

- Chooses one architecture or state-management approach over another.
- Creates or changes a long-lived boundary.
- Affects how contributors should structure future work.
- Trades off performance, accessibility, deployment, cost, or maintainability.
- Supersedes a previous decision.

Do not use ADRs for ordinary implementation notes, naming rules, or style
preferences. Put those in `conventions.md`.

## Index

- `0000-template.md` - ADR template.
- `0001-adopt-feature-based-architecture.md` - Adopt feature-based architecture.
- `0002-use-xstate-for-scene-orchestration.md` - Use XState for scene
  orchestration.
- `0003-use-immutable-city-snapshots.md` - Use immutable city snapshots.

## Decision Queue

- `0004` - Tier city snapshots into materialized server summaries and complete
  client detail.
- `0005` - Run interactive analytical computation in a Web Worker.
- `0006` - Keep one persistent MapLibre map in the scene route-group layout.
- `0007` - Use client-side `next-themes` rather than server-cookie theming.
