# E2E Implementation Plan

Status: Complete

## Progress

- [x] Create tracking document
- [x] Install Playwright and MapGrab dependencies
- [x] Add Playwright config and scripts
- [x] Add MapGrab instrumentation gate
- [x] Add E2E support helpers
- [x] Add exploration journey spec
- [x] Add deep-link/theme spec
- [x] Add CI workflow
- [x] Run verification commands
- [x] Confirm production bundle excludes MapGrab

## Summary

Add a Chromium-only Playwright E2E layer for the two journeys documented in
`docs/e2e-scenarios.md`: the exploration flow and the cold deep-link/theme
restore flow. Use MapGrab's official split packages: `@mapgrab/map-interface`
for app-side map instrumentation and `@mapgrab/playwright` for Playwright
fixtures and matchers.

## Key Changes

- Install required packages:
  - `pnpm add @mapgrab/map-interface`
  - `pnpm add -D @playwright/test @mapgrab/playwright`
  - `pnpm exec playwright install --with-deps chromium` for local and CI browser
    setup.
- Add scripts to `package.json`:
  - `test:e2e`: `playwright test`
  - `test:e2e:ui`: `playwright test --ui`
- Add `playwright.config.ts`:
  - Chromium-only project.
  - `baseURL: "http://localhost:3000"`.
  - `webServer` runs `pnpm build` then `pnpm start`, with
    `NEXT_PUBLIC_E2E=true`.
  - Software WebGL launch args: `--use-gl=angle`,
    `--use-angle=swiftshader`.
  - `trace: "on-first-retry"` and CI retries.
- Instrument `components/scene/map/map-canvas.tsx`:
  - In `handleLoad`, after `reportMapLoaded(...)` and `updateMapTheme()`,
    dynamically import `@mapgrab/map-interface` only when
    `process.env.NEXT_PUBLIC_E2E === "true"`.
  - Call `installMapGrab(mapRef.current.getMap(), "mainMap")`.
- Add `e2e/support/index.ts`:
  - Merge `@playwright/test` with `@mapgrab/playwright` fixtures.
  - Export merged `test` and `expect`.
- Add `e2e/support/map.ts`:
  - Wrap MapGrab selectors for `mainMap`, `hex-price-fill`, and
    `browse-points-circle`.
  - Provide helpers for map readiness, rendered feature counts, pointer targets,
    feature state, center/bounds/style URL, and layer visibility.

## Test Scenarios

- Add `e2e/exploration.spec.ts` with one `test()` and named `test.step()`
  sections:
  - Navigate from city picker to London and wait for real WebGL map readiness.
  - Change analysis filters and assert the hex layer re-renders via MapGrab
    feature query/state.
  - Zoom and assert hex render state changes.
  - Hover a real hex feature and assert `.hex-inspect-popup` content is visible.
  - Switch to Browse and assert points visible, hex hidden, and pointer hits
    points.
  - Filter to Hotel and assert rendered point count drops.
  - Sort price low-to-high and lightly assert first real DOM listing order.
  - Click a map point and assert selected feature state, detail drawer, and
    `?listing=<id>` URL.
- Add `e2e/deep-link.spec.ts`:
  - Navigate fresh to
    `/london?lens=browse&nbhd=camden&price=100,300&listing=<known-id>`.
  - Assert restored map scope/center or bounds, selected point feature state, and
    open drawer.
  - Click `Switch to light theme`; assert style URL changes from OpenFreeMap
    `dark` to `positron`, map remains ready, and the page does not reload.

## CI

- Add `.github/workflows/e2e.yml` because no existing `.github` workflow is
  present.
- Workflow steps:
  - Checkout.
  - Setup Node and pnpm.
  - `pnpm install --frozen-lockfile`.
  - `pnpm exec playwright install --with-deps chromium`.
  - `pnpm run test:e2e`.
  - Upload Playwright report/traces on failure.

## Verification

- Run:
  - `pnpm run test:e2e`
  - `pnpm run test`
  - `pnpm run lint:strict`
  - `pnpm exec tsc --noEmit`
- Confirm production bundle gating:
  - Build without `NEXT_PUBLIC_E2E=true`.
  - Search `.next/static` for `installMapGrab` / `@mapgrab/map-interface`; no
    client bundle hit should remain.
  - This only holds because `.env` commits `NEXT_PUBLIC_E2E=false`. An _undefined_
    `NEXT_PUBLIC_` var is left as a runtime lookup, not inlined — so the guard
    isn't a build-time constant and webpack keeps the gated `import()` chunk.
    Defining it as `false` makes the branch statically dead, dropping the MapGrab
    chunk. Playwright's `NEXT_PUBLIC_E2E=true pnpm build` overrides `.env` via the
    shell, so E2E builds keep the instrumentation.
- Preserve existing dirty worktree changes; only touch files needed for this E2E
  setup.
