# Plainsight Agent Rules

This is the canonical instruction file for every coding agent working in this
repository. `CLAUDE.md` imports this file. Do not maintain a second copy of these
rules in tool-specific files.

The implementation is the behavioral source of truth. This file is the source
of truth for how agents change that implementation. The documents under `docs/`
provide requirements, diagrams, rationale, and deeper guidance; keep them
aligned with code and with this file.

## Working agreement

- Inspect the relevant implementation and documentation before changing code.
- Complete the requested scope, including proportionate verification. Pause
  only for destructive actions, unresolved high-impact ambiguity, external
  authority, or a material expansion of scope.
- Preserve unrelated worktree changes. Never discard, overwrite, stage, or
  commit another contributor's work as part of an unrelated task.
- Prefer focused changes over speculative abstractions, compatibility layers,
  or opportunistic cleanup.
- Use `pnpm` and the scripts declared in `package.json`.
- Treat formatter, TypeScript, ESLint, tests, builds, and browser checks as
  executable gates. Do not restate mechanically enforced rules in code comments.
- Report which checks ran and any relevant checks that did not run.

## Read the relevant context

Use the smallest set that covers the change:

- `docs/project-boundaries.md`: product requirements, non-goals, privacy,
  accessibility, browser support, and operational constraints.
- `docs/architecture.md`: system shape, ownership, data tiers, rendering, and
  runtime safety.
- `docs/runtime-orchestration.md`: XState topology and runtime sequences.
- `docs/conventions.md`: expanded contributor examples and conventions.
- `docs/testing.md`: test layers, mocks, file placement, and release evidence.
- `docs/decisions/README.md` and the relevant ADR: rationale for load-bearing
  architecture decisions.
- `SECURITY.md`: supported versions and private vulnerability reporting.

Read architecture, conventions, and the relevant ADR before changing a module,
data, route, runtime, or ownership boundary. Read runtime orchestration before
changing actor topology or event flow. Read testing guidance before introducing
a new test pattern or mock boundary.

## Current external documentation

Use Context7 whenever a task asks about a library, framework, SDK, API, CLI, or
cloud service, including syntax, configuration, setup, migrations, and
library-specific debugging. Do this even for familiar tools because repository
versions may be newer than model knowledge.

1. Call `resolve-library-id` with the library name and the full task unless the
   user supplied an exact `/org/project` Context7 ID.
2. Select the best exact, reputable, relevant match; prefer a version-specific
   ID when the task names a version.
3. Call `query-docs` with that ID and the user's full question.
4. Base library-specific guidance on the returned documentation.

Do not use Context7 for business-logic debugging, general programming concepts,
code review, repository refactors, or scripts that do not depend on an external
API.

## Product invariants

- Plainsight is a public, read-only short-term-rental market explorer. Do not
  add accounts, mutations, uploads, administration, booking, or a persistent
  application backend without an explicit product and architecture decision.
- Present immutable, dated Inside Airbnb observations. Never describe them as
  live, current, predictive, estimated availability, or booking inventory.
- A city version is one coherent snapshot. Header counts, filters, Analyse,
  Browse, map layers, and listing details must use the same city, snapshot,
  scope, and filter semantics.
- Preserve attribution and provenance. Do not invent fields the source data
  does not provide.
- The map enhances the workflow; it must not be the only way to understand
  counts, filters, selections, loading, errors, or listing evidence.
- Dark is the deterministic default theme. Light theme must work without a page
  reload or loss of scene state.
- The product has no custom behavioral tracking or session replay. Sentry is
  errors-only and must not receive identity, request bodies, query strings,
  cookies, sensitive headers, tracing, replay, logs, or profiling.
- Large public snapshot assets are delivered directly through a configurable
  CDN/object-storage base URL, not proxied through Vercel Functions.

## Architecture and dependency direction

Plainsight uses feature-based architecture:

```text
app/ -> features/ -> components/{ui,theme}, data, lib
data/ -> lib/
lib/ -> domain-kernel types only
```

- `app/` owns routes, layouts, metadata, and composition. Routes compose
  features; they do not own domain algorithms or fetch data that belongs to a
  feature data boundary.
- Product code lives in `features/<feature>/`. `features/home` and
  `features/scene` must not import each other.
- `components/` contains shared cross-feature UI, theme, query, utilities, and
  application chrome only.
- `data/` owns snapshot contracts, server-facing loaders, repositories, and read
  models. It must not depend on application or UI layers.
- `lib/` owns pure reusable and worker-safe logic. It must not import runtime
  loaders, repositories, selectors, React, or application/UI layers.
- `data/contract.ts` and `data/types.ts` form the type-only domain kernel that
  pure logic may model against; their location does not authorize `lib/` to
  import other `data/` runtime modules.

Scene sub-domains are `analysis`, `browse`, `map`, `state`, and `shared`:

- A sub-domain must not import another sub-domain's internals.
- Cross-sub-domain scene code belongs in `shared/`; actor machines and hooks
  belong in `state/`; broadly reusable pure logic belongs in `lib/`.
- Things that change together should live together. Do not create a shared
  abstraction until ownership and multiple consumers justify it.

### Imports and public APIs

- Use `@/` imports across features and shared layers.
- Within a feature, use direct relative imports for nearby siblings. Switch to
  `@/features/<feature>/...` before a path would require three or more `../`
  segments.
- `app/` imports a feature through its root public API.
- Barrels mark a real boundary: feature roots and cohesive multi-consumer
  subsystems only. Do not add leaf or convenience barrels.
- Internal feature modules import one another directly, not through their own
  public barrel.
- Never combine server-only and client-safe exports in a client-imported barrel.
  Client code imports shared contracts directly rather than through server
  loader barrels.

### Files and components

- Use kebab-case filenames. Exported React components remain PascalCase.
- Use `View` for route or sub-domain compositions such as `HomeView` and
  `SceneView`.
- Prefer stable product terms: `lens` means Analyse/Browse mode; `scope` means
  city/neighbourhood narrowing.
- Co-locate a component used by only one parent unless a server/client boundary
  requires a separate module. Do not wrap a single leaf file in a folder plus a
  barrel.
- Keep Server Components as the default. Add `"use client"` only where browser
  APIs, interactivity, client actors, or hooks require it, and push that boundary
  toward leaves.
- Mark server-only modules with `import "server-only"`. Keep MapLibre and other
  browser-only code behind client boundaries.
- Data-dependent feature components own their loading boundary and pass serializable
  data into focused client views. Routes compose them, using Suspense where the
  route genuinely streams. Keep any skeleton near the component and match its
  layout closely enough to avoid avoidable shifts.

## Data and calculation integrity

- City snapshots are immutable and versioned. Publish a new version instead of
  changing files beneath an active version.
- Keep small server/RSC tiers (`manifest`, `meta`, `aggregates`) separate from
  browser tiers (`analytics`, `points`, `boundaries`). Do not load large
  interactive tiers merely to render page-start summaries.
- Server Components read committed materialized aggregates; they do not
  recompute city KPIs from raw rows at request time.
- Snapshot generation, worker projections, and Browse filtering/sorting share
  the same pure calculation core in `lib/listings` and `lib/filters`.
- A calculation-rule change requires regenerated materialized output and a test
  proving committed aggregates match a rebuild from analytics rows.
- Keep prices in each city's configured currency. Do not normalize currencies or
  infer legality, profitability, availability, or data quality.

## Scene runtime

- Mount the scene runtime in `app/(scene)/layout.tsx`, not root layout or a city
  page. The map, scene actors, query cache, and worker session persist across
  city routes and tear down when leaving the route group.
- XState owns lifecycle coordination and race-prone cross-domain state, not
  every local UI value. Keep component-local state in React, remote/cache state
  in Next.js or TanStack Query, and semantic navigable state in the URL.
- Root coordinates city replacement, navigation suppression, and URL-write
  gating. Map, UI, navigation, worker, and city actors retain their documented
  ownership and lifetime.
- Actors read synchronously by React must expose stable refs through root
  context. Actor-to-actor communication may use system IDs. Follow the current
  implementation and tests for the exact exposure mechanism rather than an old
  blanket rule about `invoke` or `system.get`.
- Suppress stale map/UI interaction during city navigation. Cancel outgoing
  worker work, reject stale replies by request and snapshot identity, and resume
  on either city readiness or bounded failure.
- Use a session-lifetime Web Worker for expensive city projections. The worker
  routes typed commands and uses the shared pure calculation core; it must not
  define separate filter or aggregate semantics.
- Keep the last good analytical result only when the UI clearly reports that a
  failed recomputation may leave it stale.

### URL state

- Treat query parameters as client scene-state serialization, not canonical
  server-rendered route variants.
- URL-backed state is limited to lens, neighbourhood scope, room and price
  filters, and Browse listing selection.
- Camera, zoom, hover, MapLibre readiness, worker status, suppression, and
  transient errors remain runtime-only.
- Use one parsing/serialization schema, normalize invalid values, and suppress
  URL writes while switching cities. Listing selection is Browse-only.

## UI and accessibility

- Use an existing `components/ui/*` primitive for standard interactive controls.
  Compose it with props and `className`; do not fork it into a feature-local
  copy. Modify a shared primitive only for a genuine system-wide requirement.
- `app/tokens.css` is the design-token source of truth. Use semantic color,
  spacing, typography, radius, map, and motion utilities instead of raw chrome
  values or arbitrary one-off measurements.
- Reserve price and category hues for maps, legends, and data visualizations.
  Do not use data hues as ordinary interface chrome.
- MapLibre style expressions may require literal colors. Keep those documented
  mirrors synchronized with their tokens.
- Use the stock `.dark` class theme mechanism consistently; do not mix it with a
  second theme attribute system.
- Use translucent `map-chrome` surfaces only for controls over the canvas.
  Panels, cards, and drawers use solid application surfaces.
- Share feature content between desktop panels and mobile drawers. Do not create
  duplicated mobile/desktop implementations or behavior-changing `isMobile`
  props when layout and container queries can express the presentation.
- Meet WCAG 2.2 Level AA for first-party UI and core workflows. Every non-spatial
  action needs a keyboard path, visible focus, and an accessible name.
- Convey state without color or map position alone. Respect reduced motion,
  preserve focus on dialogs/drawers, provide text loading/error states, and keep
  touch targets usable on small screens.
- Automated axe checks are necessary but not sufficient. Browser-visible
  acceptance also requires keyboard, contrast, focus, responsive, and visual
  verification at the appropriate layer.

## Comments and documentation

Prefer self-documenting code: better names, smaller functions, clearer types, and
stronger module boundaries come before comments.

Use comments only when they add information the code cannot express clearly:

- Explain why a non-obvious decision exists.
- Document a public contract, boundary, lifecycle, or invariant.
- Call out timing, ordering, caching, or concurrency constraints.
- Explain framework-specific tradeoffs, browser limitations, accessibility
  rationale, worker behavior, or actor coordination.
- Link to an external reference when the code depends on outside behavior.

Do not use comments to:

- Repeat what the code already says.
- Preserve implementation history, feature IDs, task IDs, or old component names.
- Describe previous versions of the code.
- Leave commented-out code.
- Narrate obvious JSX, simple assignments, or straightforward imports.

Use `/** ... */` JSDoc for exported public contracts when the name and type are
not enough. Use `//` for local implementation notes. Keep both short.

When code changes, update or delete nearby comments in the same change. A stale
comment is a bug.

### Documentation

- Put each durable idea in its canonical supporting document: requirements in
  project boundaries, system shape in architecture, runtime sequences in
  runtime orchestration, test policy in testing, and decision rationale in an
  ADR.
- When code changes a documented contract, update the relevant supporting doc in
  the same change. Do not update unrelated documents for completeness theater.
- Add an ADR for a load-bearing choice with meaningful alternatives, not for a
  routine refactor or local implementation detail. Accepted ADR history is
  superseded rather than silently rewritten.

## Testing and verification

Use the cheapest deterministic layer that proves the changed contract:

- Static checks for formatting, lint, types, and architecture boundaries.
- Unit tests for pure filters, sorting, URL parsing, geo logic, calculation
  kernels, selectors, and snapshot generation.
- Machine tests for XState transitions, navigation races, suppression, worker
  routing, cancellation, stale results, and error paths.
- UI integration tests for rendered behavior, state wiring, semantic queries,
  keyboard actions, and accessibility. Prefer real components and `user-event`.
- E2E tests for complete browser journeys, MapLibre/WebGL behavior, focus,
  contrast, responsive interaction, theme changes, URL restoration, and bounded
  browser failures.

Additional rules:

- Integration is the center of gravity; do not chase a coverage percentage.
- Test user-visible contracts rather than implementation details.
- Mock external or unrenderable boundaries only: network through MSW,
  MapLibre/react-map-gl at the jsdom boundary, worker transport, and missing
  browser APIs. Do not mock project logic.
- Keep tests close to the code under `__tests__/`; reserve `test/` for shared
  fixtures, render helpers, MSW, and centralized mocks.
- Back important browser-boundary mocks with at least one real-browser drift
  check.
- Add or update tests for behavior changes, bug fixes, boundaries, machine
  behavior, data transformations, materialized output, map behavior, and
  accessibility contracts.

Risk-based verification means running focused checks while iterating and broader
checks when a change crosses layers or affects build/runtime behavior. The main
commands are:

```bash
pnpm format:check
pnpm lint:strict
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm run test:e2e
```

For browser-visible scene, map, responsive, hydration, interaction, theme, or
accessibility changes, use the repository `run-app` skill after automated checks.
Inspect its screenshots; a passing DOM checklist over a visually broken map is
not success.

## Repository workflows and security

- When the user asks to file or track work, use the repository `/issue` skill
  and the label vocabulary in `.github/labels.sh`.
- Do not create or modify external issues, pull requests, deployments, or
  services unless the request authorizes that external side effect.
- Never expose, commit, echo, or use discovered secrets. Keep temporary browser
  artifacts and reports under `/tmp`, not in the repository.
- Do not file security vulnerabilities as public issues. Follow `SECURITY.md`:
  use GitHub private vulnerability reporting when available, otherwise contact
  the maintainer privately.
