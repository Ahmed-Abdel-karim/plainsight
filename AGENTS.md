# Plainsight Agent Rules

This is the canonical instruction file for every coding agent in this
repository. `CLAUDE.md` imports it. The implementation is the behavioral source
of truth; this file defines how agents change it; `docs/` records requirements,
architecture, rationale, and detailed contributor guidance.

## Working agreement

- Inspect relevant implementation and documentation before changing code.
- Complete the requested scope with proportionate verification. Pause only for
  destructive actions, unresolved high-impact ambiguity, external authority, or
  material scope expansion.
- Preserve unrelated worktree changes. Never discard, overwrite, stage, or
  commit another contributor's work.
- Prefer focused changes over speculative abstractions, compatibility layers,
  or opportunistic cleanup.
- Use `pnpm` and scripts declared in `package.json`.
- Treat formatter, TypeScript, ESLint, tests, builds, and browser checks as
  executable gates. Report which checks ran and which relevant checks did not.

## Read the relevant context

Use the smallest set that covers the change:

- `docs/project-boundaries.md`: product requirements, non-goals, privacy,
  accessibility, browser support, and operational constraints.
- `docs/architecture.md`: system shape, ownership, data tiers, rendering, and
  runtime safety.
- `docs/runtime-orchestration.md`: XState topology and runtime sequences.
- `docs/conventions.md`: contributor examples and conventions.
- `docs/testing.md`: test layers, mocks, placement, and release evidence.
- `docs/decisions/README.md` plus relevant ADRs: load-bearing rationale.
- `SECURITY.md`: supported versions and private vulnerability reporting.

Read architecture, conventions, and the relevant ADR before changing a module,
data, route, runtime, or ownership boundary. Read runtime orchestration before
changing actor topology or event flow. Read testing guidance before introducing
a test pattern or mock boundary.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in
`node_modules/next/dist/docs/`. Your training data is outdated — the docs are
the source of truth.

<!-- END:nextjs-agent-rules -->

For other libraries, frameworks, SDKs, APIs, CLIs, and cloud services, use
Context7 even when the API seems familiar: resolve the exact library ID, query
the current docs with the full task, and base library-specific work on the
result. Do not use Context7 for business logic, repository refactors, code
review, or general programming concepts.

## Repository skills

Skills define repeatable procedures; this file, project docs, and implementation
define policy and contracts. Read and follow a skill when its trigger matches:

- `.agents/skills/scene-runtime-change/SKILL.md`: XState machines, actor
  contracts, providers, workers, navigation, URL synchronization, and lifecycle.
- `.agents/skills/run-app/SKILL.md`: browser-visible scene, map, responsive,
  hydration, interaction, theme, or accessibility changes.
- `.agents/skills/issue/SKILL.md`: file or track work as a GitHub issue, only
  when the user authorizes that external side effect.

## Product invariants

- Plainsight is a public, read-only short-term-rental market explorer. Do not
  add accounts, mutations, uploads, administration, booking, or a persistent
  backend without an explicit product and architecture decision.
- Present immutable, dated Inside Airbnb observations. Never call them live,
  current, predictive, estimated availability, or booking inventory.
- A city version is one coherent snapshot. Counts, filters, Analyse, Browse,
  map layers, and listing details must share city, version, scope, and semantics.
- Preserve source attribution and provenance; do not invent unavailable fields.
- The map enhances the workflow but cannot be the only representation of
  counts, filters, selection, loading, errors, or listing evidence.
- Dark is the deterministic default. Light theme must work without reload or
  loss of scene state.
- No custom behavioral tracking or replay. Sentry is errors-only and must not
  receive identity, bodies, query strings, cookies, sensitive headers, tracing,
  replay, logs, or profiling.
- Serve large public snapshot assets directly from the configurable CDN/object
  storage base URL, never through Vercel Functions.

## Architecture and state ownership

Dependency direction is:

```text
app/ -> features/ -> components/{ui,theme}, data, lib
data/ -> lib/
lib/ -> domain-kernel types only
```

- `app/` owns routes, layouts, metadata, and composition; feature data access
  and domain algorithms stay outside routes.
- Product code lives in `features/<feature>/`; sibling features and scene
  sub-domains do not import one another's internals.
- `components/` contains cross-feature primitives and application chrome;
  `data/` owns snapshot contracts and server-facing access; `lib/` stays pure,
  reusable, worker-safe, and free of runtime/UI dependencies.
- Use `@/` across boundaries and direct relative imports for nearby feature
  siblings. Barrels mark real public boundaries, not leaf convenience APIs.
- Keep Server Components as the default. Push `"use client"` to interactive or
  browser-dependent leaves, mark server-only modules, and never mix server-only
  and client-safe exports in a client-imported barrel.
- Mount the persistent scene runtime in `app/(scene)/layout.tsx`. Route changes
  replace the active city actor without recreating the map, query cache, worker,
  or session actors.
- XState owns lifecycle coordination and race-prone cross-domain state; React
  owns local UI state; Next.js/TanStack Query own remote cache state; the URL
  owns semantic navigable state.
- During city changes, suppress stale interaction, cancel outgoing worker work,
  reject stale replies by request and snapshot identity, and resume on bounded
  readiness or failure.
- URL state is limited to lens, neighbourhood scope, room/price filters, and
  Browse selection. Camera, hover, readiness, worker status, suppression, and
  transient errors remain runtime-only.

## Data and UI integrity

- Publish a new immutable city version instead of changing active snapshot
  files. Keep small server tiers separate from large browser tiers.
- Server Components read committed materialized aggregates. Snapshot generation,
  worker projections, and Browse share the pure calculation core. Calculation
  changes require regenerated output and a committed-aggregate equality test.
- Keep prices in each city's configured currency. Do not infer legality,
  profitability, availability, or data quality.
- Use existing `components/ui/*` primitives and semantic tokens from
  `app/tokens.css`; do not fork primitives or use data hues as ordinary chrome.
- Share feature content between desktop panels and mobile drawers. Meet WCAG
  2.2 AA for first-party core workflows, with keyboard paths, visible focus,
  accessible names, non-color meaning, reduced-motion support, and text states.

## Documentation and verification

- Prefer names, types, boundaries, and small functions over comments. Comment
  only non-obvious rationale, contracts, lifecycle, ordering, concurrency,
  framework tradeoffs, or accessibility constraints.
- Put requirements in project boundaries, system shape in architecture,
  sequences in runtime orchestration, test policy in testing, and load-bearing
  rationale in ADRs. Update the canonical document when its contract changes.
- Use the cheapest deterministic test layer that proves the changed contract:
  unit tests for pure logic, machine tests for actor behavior, UI integration
  tests for rendered semantics, and E2E/`run-app` for real browser behavior.
- Test user-visible contracts. Mock only external or unrenderable boundaries;
  keep tests near code under `__tests__/` and shared infrastructure under `test/`.

Main gates:

```bash
pnpm format:check
pnpm lint:strict
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm run test:e2e
```

Run focused checks while iterating and broader checks when changes cross layers
or affect build/runtime behavior. Browser-visible scene changes require the
`run-app` skill and screenshot inspection after automated checks.

## Security and external actions

- Do not create or modify issues, pull requests, deployments, or services unless
  the request authorizes that external side effect.
- Never expose, commit, echo, or use discovered secrets. Keep temporary browser
  artifacts and reports under `/tmp`, not in the repository.
- Never file security vulnerabilities publicly. Follow `SECURITY.md` and use
  private vulnerability reporting or contact the maintainer privately.
