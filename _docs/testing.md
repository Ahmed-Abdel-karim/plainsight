# Testing Strategy

Draft placeholder. Fill this after the refactor.

## Purpose

Plainsight tests protect user-visible behavior, architecture boundaries, and
high-risk data/map interactions. Tests should explain the contract they protect.
They should not chase coverage for its own sake.

Reference:

- Node.js test-writing guide - used for the rule that tests should be minimal,
  isolated, and understandable when they fail:
  https://github.com/nodejs/node/blob/main/doc/contributing/writing-tests.md

## Philosophy

Use the Testing Trophy:

```text
static checks -> unit -> integration -> E2E
```

Integration is the center of gravity. Put each check at the cheapest, most
deterministic layer that still gives confidence.

Rules:

- No goalless tests.
- No coverage percentage target.
- Prefer user-visible contracts over implementation details.
- Mock only boundaries that are outside our control or unrenderable in the test
  environment.

Reference:

- Kent C. Dodds - used for the Testing Trophy and "mostly integration" principle:
  https://kentcdodds.com/blog/write-tests

## Layers

### Static Checks

Use static checks for formatting, linting, and type safety.

Commands:

```bash
pnpm format:check
pnpm lint:strict
pnpm exec tsc --noEmit
```

### Unit Tests

Use unit tests for pure logic that does not need React, DOM, workers, or WebGL.

Examples:

- filter logic
- sort logic
- hex aggregation
- search-param parsing
- data selectors
- listing compute kernels

### Machine Tests

Use machine tests for XState actor behavior that can be proven without React,
DOM, or WebGL.

Examples:

- root/map/city/ui/worker actor transitions
- city-switch races
- map transition gating
- suppressed-to-interactive timing
- worker command routing
- error paths

Reference:

- XState docs - used for actor tests with `createActor`, `start`, `send`, and
  `getSnapshot`:
  https://stately.ai/docs/testing

### UI Integration Tests

Use UI integration tests for rendered behavior. Prefer real components, real
state wiring, MSW-backed data, and thin mocks at unrenderable boundaries.

Rules:

- Query by role and accessible name first.
- Use `user-event` for user actions.
- Assert what the user can observe.
- Run axe on rendered UI regions.
- Avoid implementation assertions.

Reference:

- Testing Library guiding principles - used for user-centered assertions and
  role/name-first queries:
  https://testing-library.com/docs/guiding-principles

### E2E Tests

Use E2E for real user journeys, not isolated functionality tests.

A good E2E test follows a common workflow a real user would perform and asserts
only the browser-only facts or cross-layer handoffs along that journey.

Examples:

- City picker -> real WebGL map boot -> analysis filter -> hex inspect -> Browse
  lens -> map point select -> listing drawer -> URL state.
- Cold deep link -> restored map/listing state -> theme swap without page reload.

Do not create one E2E test per filter, sort option, component, or chart. Those
belong in unit, machine, or UI integration tests.

Reference:

- Playwright docs - used for browser test isolation, user-visible behavior,
  traces, screenshots, retries, and debugging:
  https://playwright.dev/docs/writing-tests

### Accessibility

Split accessibility checks by what each layer can actually evaluate, then put
each at the cheapest layer that proves it.

Rules:

- Gate structural a11y at integration with `vitest-axe` `axe(container)`: roles,
  accessible names, `alt` text, heading order, ARIA validity, list nesting. These
  run on every change, so a regression surfaces earliest. Do not repeat them in
  E2E.
- Gate `color-contrast` only at E2E with `@axe-core/playwright`. jsdom does no
  layout or paint, so the contrast rule can never fail there (axe marks it
  `incomplete`). Scan in both dark and light, and only for surfaces the resting
  page scans never render (the Browse list, an open detail drawer, the mobile
  drawer).
- Test keyboard operability at integration with `user-event` (native buttons and
  Radix dialogs work in jsdom): `Enter`/`Space` activation, `Escape` to dismiss.
  vaul keeps a closed drawer mounted in jsdom (no animation-end to unmount), so
  assert the user-visible effect (e.g. the row's `aria-pressed` clears), not the
  node's removal.
- Leave focus trap, focus return, and focus-on-open to E2E. Radix/vaul
  `FocusScope` does not run under jsdom, so these need a real browser; skip them
  unless a real bug appears.
- A modal drawer makes the rest of the page inert, so an over-map control like the
  theme toggle is unreachable while it is open. Close the drawer before switching
  theme, then reopen.

Reference:

- Playwright accessibility testing - used for `AxeBuilder`, WCAG tag scoping, and
  scanning specific page states:
  https://playwright.dev/docs/accessibility-testing

## Mocking Rules

Mock only where the real dependency cannot run reliably in the chosen layer.

Allowed examples:

- MapLibre / `react-map-gl` at the render boundary in jsdom.
- Worker transport in machine and integration tests.
- Network/data seams through MSW.

Guardrails:

- Keep mocks thin and centralized.
- Mock external boundaries, not project logic.
- Back important mocks with an E2E drift test.

## File Structure

Keep tests close to the code they verify.

Use local `__tests__/` folders for area-owned tests:

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

## Test Shape

A test should make the behavior visible:

1. Arrange with a `setup*` or `render*` helper.
2. Act in the test body.
3. Assert the contract through observable output.

Avoid helpers that hide the behavior being tested.

## When To Add Or Change Tests

Add or update tests when:

- adding user-visible behavior
- fixing a bug
- changing an architecture boundary
- changing state-machine behavior
- changing data transformation logic
- changing browser-only map behavior

Do not add tests only to raise coverage.

## Commands

```bash
pnpm test
pnpm run test:e2e
pnpm lint:strict
pnpm exec tsc --noEmit
pnpm build
```

## Contributor Reference

The shape of this file follows the contributor-facing style used by large
projects: explain the test layers, where tests belong, how to run them, and how
to avoid unreliable tests.

Reference:

- Next.js contributor testing docs - used as the model for a practical,
  contributor-facing testing guide:
  https://github.com/vercel/next.js/blob/canary/contributing/core/testing.md
