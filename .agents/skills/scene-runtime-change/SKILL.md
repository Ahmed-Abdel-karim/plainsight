---
name: scene-runtime-change
description: Safely change the Plainsight XState scene runtime. Use for edits to features/scene/state, actor machines, events, context or input contracts, React actor providers and hooks, worker coordination, city navigation, URL synchronization, suppression, cancellation, stale-result handling, or actor lifetime and ownership.
---

# Change the Scene Runtime

Preserve the session-lifetime scene and its race-safety contracts while changing
XState logic or React integration.

## Ground the change

1. Read `docs/architecture.md`, `docs/runtime-orchestration.md`, and the relevant
   machines and tests.
2. Read ADRs 0002, 0004, 0005, and 0007 when the change touches actor topology,
   persistent layout ownership, worker execution, or URL state.
3. For XState or `@xstate/react` API work, resolve the library through Context7
   and query the current v5 documentation with the full task.
4. State which actor owns the behavior, its lifetime, its inputs and outputs,
   and the observable contract before editing. Keep local UI, remote cache, and
   URL state outside XState unless the documented ownership model requires it.

## Implement the behavior

- Preserve the scene session in `app/(scene)/layout.tsx`; do not recreate the
  map, query cache, worker, or session actors on city navigation.
- Use invoked actors for work scoped to a state and spawned actors for dynamic
  or explicitly managed lifetimes. Follow current implementation and tests for
  exposure through stable refs or system IDs; do not apply a blanket rule.
- Keep event, input, context, and output contracts typed. Define implementations
  through `setup(...)` and keep actor communication explicit.
- Treat navigation, worker replies, and URL writes as concurrent boundaries.
  Cover cancellation, replacement, stale identity, repeated navigation,
  bounded failure, and teardown where relevant.
- Keep worker computation on the shared pure calculation core. Do not duplicate
  filter, aggregate, or snapshot semantics inside a machine or transport.
- Update runtime diagrams or an ADR only when the documented topology,
  ownership, sequence, or load-bearing decision changes.

## Verify

1. Run the smallest relevant machine tests while iterating.
2. Add or update tests for every changed transition and race-sensitive failure
   path. Assert observable snapshots, events, and effects rather than machine
   internals.
3. Run `pnpm lint:strict`, `pnpm exec tsc --noEmit`, and `pnpm test` when the
   change crosses actor or React boundaries.
4. If rendered behavior, navigation, map interaction, hydration, theme, or
   accessibility changes, follow `.agents/skills/run-app/SKILL.md` after the
   automated checks and inspect its screenshots.
5. Report any relevant gate that did not run.
