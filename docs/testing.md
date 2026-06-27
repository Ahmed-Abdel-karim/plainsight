# Testing Strategy

Plainsight tests protect user-visible behavior, architecture boundaries, and
high-risk data/map interactions. Tests should explain the contract they protect.
They should not chase coverage for its own sake.

## Philosophy

Use the Testing Trophy:

```text
static checks -> unit -> integration -> E2E
```

Integration is the center of gravity. Put each check at the cheapest,
most deterministic layer that still gives confidence.

Rules:

- No goalless tests.
- No coverage percentage target.
- Prefer user-visible contracts over implementation details.
- Mock only boundaries that are outside our control or unrenderable in the test
  environment.

## Static checks

Use static checks for formatting, linting, and type safety.

```bash
pnpm format:check
pnpm lint:strict
pnpm exec tsc --noEmit
```

## Unit tests

Use unit tests for pure logic that does not need React, DOM, workers, or WebGL.

Examples:

- filter logic;
- sort logic;
- hex aggregation;
- search-param parsing;
- data selectors;
- listing compute kernels;
- materialized aggregate generation and snapshot equality.

Generator tests are data-contract tests. They rebuild committed aggregate tiers
from public analytics rows and compare generated output with the checked-in
snapshot. Their purpose is to catch drift between the materialized read model
and runtime projection logic.

## Machine tests

Use machine tests for XState actor behavior that can be proven without React,
DOM, or WebGL.

Examples:

- root/map/city/ui/worker actor transitions;
- city-switch races;
- map transition gating;
- suppression-to-interactive timing;
- worker command routing;
- stale-result handling;
- error paths.

## UI integration tests

Use UI integration tests for rendered behavior. Prefer real components, real
state wiring, MSW-backed data, and thin mocks at unrenderable boundaries.

Rules:

- Query by role and accessible name first.
- Use `user-event` for user actions.
- Assert what the user can observe.
- Run axe on rendered UI regions.
- Avoid implementation assertions.

## E2E tests

Use E2E for real browser journeys, not isolated functionality tests.

Good E2E candidates:

- city picker -> map boot -> Analyse filter -> hex inspect -> Browse lens -> map
  point select -> listing drawer -> URL state;
- cold deep link -> restored state -> theme swap without page reload;
- map-unavailable or worker-failure recovery when browser-only boundaries fail.

Do not create one E2E test per filter, sort option, component, or chart. Those
belong in unit, machine, or UI integration tests.

## Accessibility checks

Split accessibility checks by what each layer can evaluate.

Integration:

- roles;
- accessible names;
- `alt` text;
- heading order;
- ARIA validity;
- list nesting;
- keyboard activation for non-map controls.

E2E:

- color contrast;
- focus trap and focus return;
- focus-on-open behavior;
- reduced-motion behavior;
- mobile drawer and over-map control interactions.

Rules:

- Do not rely on jsdom for layout or paint checks.
- Do not repeat every integration accessibility scan in E2E.
- Test keyboard paths for every non-spatial action.
- The map is a visual enhancement; core workflow meaning must also exist as
  text or semantics.

## Mocking rules

Mock only where the real dependency cannot run reliably in the chosen layer.

Allowed:

- MapLibre / `react-map-gl` at the render boundary in jsdom;
- worker transport in machine and integration tests;
- network/data seams through MSW;
- browser APIs missing from the test environment.

Guardrails:

- Keep mocks thin and centralized.
- Mock external boundaries, not project logic.
- Back important mocks with at least one browser-level drift test.

## File placement

Keep tests close to the code they verify.

```text
feature-or-module/
  __tests__/
    area.test.tsx
    queries.ts
    utils.ts
    data.ts
```

Use global `test/` only for shared helpers:

```text
test/
  render.tsx
  fixtures/
  mocks/
  msw/
  scene/
```

## Test shape

A test should make behavior visible:

1. Arrange with a `setup*` or `render*` helper.
2. Act in the test body.
3. Assert the contract through observable output.

Avoid helpers that hide the behavior being tested.

## When to add or change tests

Add or update tests when changing:

- user-visible behavior;
- bug fixes;
- architecture boundaries;
- state-machine behavior;
- data transformation logic;
- materialized snapshot or aggregate generation logic;
- browser-only map behavior;
- accessibility contracts.

Do not add tests only to raise coverage.

## Commands

```bash
pnpm test
pnpm run test:e2e
pnpm lint:strict
pnpm exec tsc --noEmit
pnpm build
```

## References

- Node.js test-writing guide: minimal, isolated, understandable tests.
- Kent C. Dodds Testing Trophy: mostly integration, with cheaper checks below.
- XState testing docs: actor tests with `createActor`, `start`, `send`, and
  `getSnapshot`.
- Testing Library guiding principles: user-centered assertions.
- Playwright docs: browser journeys, traces, screenshots, retries, and
  accessibility scans.
