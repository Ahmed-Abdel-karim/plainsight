# Implementation Plan: Market Title + Honest Snapshot Label

**Branch**: `003-market-snapshot-header` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-market-snapshot-header/spec.md`

## Summary

Replace the E1-S2 sidebar scope label with a single market header at the top of the city scene that shows three elements together: the market title (city name), the active scope's total listing count, and an honest, dated snapshot label of the form `Data: {snapshot} snapshot`. The title and count are read from the city dataset for the active slug (`dataset.name`; `selectScopeAggregates(dataset, { type: "city" }).listingCount`), and the snapshot value comes from the per-city data contract field `dataset.snapshotLabel`, rendered trimmed and verbatim (numeric `9/2025`, not a spelled-out month). A new presentational Server Component `components/scene/market-header.tsx` renders the group; `city-scene.tsx` hosts it above the map + sidebar row and stops rendering the standalone `scope-label.tsx`, which is removed so the count lives in exactly one place. The count keeps polite live-region semantics so later scope narrowing (E4) announces changes without re-plumbing. No new dependency, store, or request-time API is introduced.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.6 App Router

**Primary Dependencies**: Existing data layer (`getCityDataset`, `selectScopeAggregates`, `CityDataset`, `Scope`), Tailwind CSS 4 token utilities and `app/tokens.css` typography classes (`type-title`, `type-body`, `tabular-nums`); Vitest + Testing Library + `vitest-axe` for colocated display/a11y tests

**Storage**: Static JSON in `data/json` — per-city datasets (`${slug}.json`) loaded via cached `getCityDataset()`; the snapshot value is the existing `snapshotLabel` field on `CityDataset` / `CityIndexEntry`

**Testing**: Colocated `market-header.test.tsx` (display/integration with fixtures) and `market-header.a11y.test.tsx` (axe), plus `pnpm format:check`, `pnpm lint:strict`, `pnpm build`, and manual browser + keyboard acceptance

**Target Platform**: Web application served by Next.js

**Project Type**: Single Next.js application

**Performance Goals**: Header renders from cached static data on the server with no client JS added; title, count, and snapshot derive once per request

**Constraints**: Follow `rules/react-components.md` (token vocabulary, no raw colors/spacing/typography); preserve `cacheComponents: true`; derive everything from the URL slug + contract (reload-safe/shareable); snapshot label must never use "live"/"current"/"real-time"/present-tense framing; meet WCAG 2.1 AA contrast and keep the count in a polite live region

**Scale/Scope**: One new presentational component (`market-header.tsx`) with colocated display + a11y tests; `city-scene.tsx` and `app/[city]/page.tsx` updated to pass the snapshot value and host the header; `scope-label.tsx` removed and `sidebar-region.tsx` simplified; four supported launch cities

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Next.js App Router**: PASS. `market-header.tsx` is a synchronous presentational Server Component receiving plain props; no Client Component is introduced. `app/[city]/page.tsx` stays an async Server Component that resolves the dataset and passes primitives down.
- **Cache Components**: PASS. The header reads no request-time APIs (`cookies()`/`headers()`/`searchParams`); it receives `cityName`, `listingCount`, and `snapshotLabel` as primitives. The page continues to read only cached static data via `getCityDataset()`.
- **Zustand**: PASS. No store is added. Scope remains `{ type: "city" }` derived from the slug on the server; the count is passed as a prop. Client narrowing state is deferred to E4.
- **React Components**: PASS. The header has no interactive control, so no shadcn primitive is required; it composes existing token typography utilities (`type-title`, `type-body`, `tabular-nums`, `text-foreground`/`text-muted-foreground`) per `rules/react-components.md` and hard-codes no colors, spacing, or typography. No shadcn component is forked.
- **Accessibility**: PASS. The market title is the scene's `<h1>`; the count sits in a `role="status"` / `aria-live="polite"` region so future scope changes announce; the snapshot label reads as understandable text; the header reflows across desktop/mobile without dropping any element and preserves dark/light contrast. No motion is introduced.
- **Type Safety And Verification**: PASS. Props are explicitly typed (`cityName: string`, `listingCount: number`, `snapshotLabel: string`); the count reuses the typed `ScopeAggregates.listingCount`; no `any`/unsafe casts. Verification covers the risky behavior: the honest snapshot label (trimmed, banned-word-free), the grouped count, and the title — via colocated display + axe tests, with route wiring checked manually.

## Project Structure

### Documentation (this feature)

```text
specs/003-market-snapshot-header/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
app/
└── [city]/
    └── page.tsx              # UPDATED — pass dataset.snapshotLabel into the scene
                              #   alongside cityName + scope-aggregate count

components/
└── scene/
    ├── market-header.tsx     # NEW (Server, presentational) — title (h1) + count
    │                         #   (polite live region) + "Data: {snapshot} snapshot"
    ├── market-header.test.tsx     # NEW — display/integration test with fixtures
    ├── market-header.a11y.test.tsx# NEW — axe (no violations, heading + live region)
    ├── city-scene.tsx        # UPDATED — render <MarketHeader> above the map+sidebar
    │                         #   row; stop rendering <ScopeLabel>
    ├── sidebar-region.tsx    # UPDATED — drop the scope-label slot; keep analytics
    │                         #   placeholder skeletons
    ├── scope-label.tsx       # REMOVED — consolidated into market-header.tsx
    ├── map-region.tsx        # UNCHANGED
    └── …

data/
├── loaders.ts                # getCityDataset() (existing, cached) — supplies snapshotLabel
├── selectors.ts              # selectScopeAggregates() (existing) → count for active scope
└── contract.ts               # CityDataset.snapshotLabel (existing field) — source of truth
```

**Structure Decision**: Single Next.js application. Add `components/scene/market-header.tsx` as a synchronous presentational Server Component and host it at the top of `city-scene.tsx`, above the existing `flex lg:flex-row` row that holds the sidebar and map regions. Update `app/[city]/page.tsx` to pass `snapshotLabel={dataset.snapshotLabel}` along with the city name and the scope-aggregate count. Remove `scope-label.tsx` and drop its slot from `sidebar-region.tsx` so the active scope's title and count appear only in the header (FR-009). Tests are colocated next to the component following the existing `city-picker` pattern (`*.test.tsx` + `*.a11y.test.tsx`).

## Phase 0: Research

See [research.md](./research.md). All clarifications were resolved during `/speckit-specify` (numeric snapshot, header consolidation, city-name-only title); no NEEDS CLARIFICATION remain.

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md), and [quickstart.md](./quickstart.md).

## Post-Design Constitution Check

- **Next.js App Router**: PASS. The new component is a presentational Server Component; the route stays async server-only.
- **Cache Components**: PASS. No request-time APIs added; the header consumes primitives derived from cached static data.
- **Zustand**: PASS. No store; the count is URL-derived server state passed as a prop.
- **React Components**: PASS. The header composes token typography utilities only; no shadcn fork, no raw styling values.
- **Accessibility**: PASS. The UI contract requires an `<h1>` title, a polite live-region count, an honest text snapshot label, responsive reflow, and theme/contrast compliance, verified by colocated axe tests.
- **Type Safety And Verification**: PASS. Typed primitive props reuse existing contract types; display + a11y tests cover the risky behavior and the testing-layer split (selection already unit-tested in 002; display integration-tested here; route wiring checked manually/E2E).

## Complexity Tracking

No constitutional violations or complexity exceptions are required.
