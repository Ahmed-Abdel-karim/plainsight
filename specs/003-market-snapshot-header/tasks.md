---
description: "Task list for Market Title + Honest Snapshot Label"
---

# Tasks: Market Title + Honest Snapshot Label

**Input**: Design documents from `specs/003-market-snapshot-header/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Automated test tasks ARE included. The project has a configured test runner (`pnpm test` → `vitest run`) with Testing Library + `vitest-axe` and colocated component tests (e.g. `components/city-picker/*.test.tsx`). The constitution's Testing Layers require the display layer (presentational components) to be integration-tested with fixtures and accessibility-first queries; this story adds colocated display + a11y tests for the new header. Route wiring / `notFound()` stay manual/E2E per the constitution.

**Organization**: Tasks are grouped by user story (US1 → US2 → US3) so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- All paths are relative to the repository root.

## Path Conventions

Single Next.js application. New work lives in `components/scene/` (the header + its colocated tests) and `app/[city]/page.tsx`; reused primitives live under `data/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the workspace is ready. The plan introduces no new runtime dependencies, store, or request-time API.

- [x] T001 Confirm no new dependencies are needed (plan.md "Technical Context" adds none) and that `components/scene/` already exists from E1-S2 (it hosts the new header and its tests).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify the data and test primitives every story relies on. These are verification gates — change something only if a gap is found, and record it.

**⚠️ CRITICAL**: No user story work should begin until these are confirmed.

- [x] T002 [P] Verify the data the header reads exists as designed: `CityDataset.snapshotLabel: string` is present per city (`data/contract.ts`) with values like `" 9/2025"` in `data/json/${slug}.json`, and `selectScopeAggregates(dataset, { type: "city" })` returns `dataset.cityAggregates` whose `listingCount` is the active-scope total (`data/selectors.ts`). Record any gap; do not change shapes silently.
- [x] T003 [P] Verify the test harness the colocated tests rely on: `pnpm test` runs `vitest run`, `vitest-axe` is available, and `test/fixtures/dataset.ts` exports `datasetFixture` carrying `name: "London"` and `snapshotLabel: " 9/2025"` (the leading-space case the header must trim).

**Checkpoint**: Data layer + test harness confirmed — user stories can begin.

---

## Phase 3: User Story 1 - Title, Count, and Snapshot Read as One Header (Priority: P1) 🎯 MVP

**Goal**: Render a single market header at the top of the city scene showing the market title (city name), the active scope's total listing count, and a snapshot label together, and retire the standalone E1-S2 scope label so the count appears in exactly one place.

**Independent Test**: Open `/london`; confirm one header shows `London`, `61,963 listings`, and a snapshot label grouped together, and that no separate scope label remains in the sidebar.

### Implementation for User Story 1

- [x] T004 [P] [US1] Create `components/scene/market-header.tsx` (synchronous presentational Server Component) with props `{ cityName: string; listingCount: number; snapshotLabel: string }`. Render inside a single `<header>`: the title as `<h1>` (`type-title text-foreground`) showing `cityName`; the count as `{listingCount.toLocaleString("en")} listings` wrapped in a `role="status"` / `aria-live="polite"` element with `tabular-nums`; and the snapshot label as static text `Data: {snapshotLabel.trim()} snapshot`. Group count + snapshot on one line (e.g. with an `aria-hidden` `·` separator) using token utilities only — no raw colors/spacing/typography, no shadcn fork. (data-model.md "Market Header"; contracts/ui-contract.md "Market Header".)
- [x] T005 [US1] Update `components/scene/city-scene.tsx`: accept a `snapshotLabel: string` prop; render `<MarketHeader cityName=… listingCount=… snapshotLabel=… />` above the existing `flex … lg:flex-row` map+sidebar row; stop importing/rendering `<ScopeLabel>` (depends on T004).
- [x] T006 [US1] Update `components/scene/sidebar-region.tsx`: remove the scope-label slot (the `children` it used to host the label) and keep only the deferred-analytics placeholder `Skeleton`s, so the sidebar no longer renders the count (FR-009).
- [x] T007 [US1] Remove `components/scene/scope-label.tsx` (consolidated into the header) and confirm no remaining imports of it exist anywhere (its only consumer was `city-scene.tsx`).
- [x] T008 [US1] Update `app/[city]/page.tsx`: pass `snapshotLabel={dataset.snapshotLabel}` into `<CityScene>` alongside the existing `cityName` and the scope-aggregate `listingCount`; keep data fetching, `await`, and `notFound()` in this async route boundary (depends on T005).
- [x] T009 [P] [US1] Create `components/scene/market-header.test.tsx`: render `<MarketHeader>` with `datasetFixture` values (`cityName="London"`, a fixture `listingCount`, `snapshotLabel=" 9/2025"`); assert the title via `getByRole("heading", { name: "London" })`, the count text, and the snapshot label are all present together in one header (accessibility-first queries, no loader mocking).
- [x] T010 [US1] Verify US1 per quickstart.md step 3 and `rules/react-components.md`: one header shows title + count + snapshot grouped, no sidebar scope label remains, and the component uses only shadcn-compatible token utilities (no `components/ui/*` edited/forked, no raw styling values).

**Checkpoint**: A supported `/[city]` route renders the consolidated market header independently.

---

## Phase 4: User Story 2 - The Snapshot Label Is Honest and Per-City (Priority: P2)

**Goal**: The snapshot label reads as a dated, past snapshot of the exact form `Data: {snapshot} snapshot`, never uses "live"/"current"/"real-time" or present-tense framing, and shows each city's own contract-sourced date.

**Independent Test**: On `/london` the label reads exactly `Data: 9/2025 snapshot` (trimmed), contains none of the banned words, and `/amsterdam` and `/berlin` show their own contract-sourced snapshot values.

**Depends on US1**: the snapshot label is rendered by `market-header.tsx` (T004).

### Implementation for User Story 2

- [x] T011 [US2] Extend `components/scene/market-header.test.tsx`: assert the rendered snapshot label is exactly `Data: 9/2025 snapshot` from the fixture `snapshotLabel=" 9/2025"` (proves the `.trim()` and the `Data: … snapshot` template), and assert the header text contains none of `live`, `current`, `real-time` and no present-tense "is/are now" framing (FR-007). (Same file as T009 — sequential, not parallel.)
- [x] T012 [P] [US2] Create `components/scene/market-header.a11y.test.tsx`: render `<MarketHeader>` with `datasetFixture` and assert `axe(container)` has no violations, the `<h1>` heading is present, and the polite live region (`role="status"`) wrapping the count is present.
- [x] T013 [US2] Verify US2 per quickstart.md step 4 in the running app: `/london` shows `Data: 9/2025 snapshot` with no leading/doubled space; `/amsterdam` and `/berlin` each show their own snapshot value sourced from the data (not hard-coded), with honest wording in dark and light themes.

**Checkpoint**: US1 + US2 — the header now carries an honest, per-city snapshot label.

---

## Phase 5: User Story 3 - The Count Stays Truthful as the View Narrows (Priority: P3)

**Goal**: The header count is derived from the active scope's aggregates (not a per-city literal), so it is correct today (whole-city total) and will reflect a narrower scope when later epics add narrowing/filters.

**Independent Test**: The header count equals the active scope's `listingCount` from the data for each city, and is sourced from `selectScopeAggregates(...)` rather than a constant.

**Depends on US1**: the count is wired in `app/[city]/page.tsx` (T008) and rendered by `market-header.tsx` (T004).

### Implementation for User Story 3

- [x] T014 [US3] Confirm `app/[city]/page.tsx` derives the header count from `selectScopeAggregates(dataset, scope).listingCount` for the active `scope` (today `{ type: "city" }`), and that no per-city count literal is introduced anywhere in `components/scene/*` (FR-004). Adjust only if a gap is found.
- [x] T015 [US3] Extend `components/scene/market-header.test.tsx`: render `<MarketHeader listingCount={…}>` with a distinct fixture count and assert it renders grouped via `toLocaleString("en")` (e.g. `1,000 listings`), proving the count is prop/aggregate-derived and formatting is correct. (Same file as T009/T011 — sequential.)
- [x] T016 [US3] Verify US3 per quickstart.md step 5 in the running app: the header count matches each city's total from `data/json/${slug}.json` (e.g. London `61,963`, Amsterdam `5,874`, Manchester `6,562`).

**Checkpoint**: All three stories function independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across stories.

- [x] T017 [P] Run static checks and the test suite, fixing any findings: `pnpm format:check`, `pnpm lint:strict`, `pnpm test`, `pnpm build` (quickstart.md "Build And Static Checks").
- [ ] T018 Run a full quickstart.md manual acceptance pass across US1–US3 (header grouping, honest per-city snapshot, scope-derived count, keyboard/heading/live-region, theme + responsive, reload).
- [x] T019 [P] Confirm no placeholder/TODO text remains in the new/changed files (`components/scene/market-header.tsx`, `city-scene.tsx`, `sidebar-region.tsx`, `app/[city]/page.tsx`), that `components/scene/scope-label.tsx` is fully removed with no dangling imports, and that the `CLAUDE.md` SPECKIT marker points to `specs/003-market-snapshot-header/plan.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — verification gate that blocks all stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
  - US1 (P1) is the MVP and creates the header component + wiring every later story builds on.
  - US2 (P2) and US3 (P3) depend on US1's component/wiring but are independently testable aspects (honest label vs. scope-derived count).
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- US1: T004 (component) → T005/T006/T007 (scene wiring + scope-label removal) → T008 (page wiring); T009 test can run in parallel with the wiring once T004 exists; T010 verifies last.
- US2: T011 and T015 (US3) edit the same test file created in T009 — run them sequentially, not in parallel. T012 (separate a11y file) is parallelizable.
- US3: T014 (confirm wiring) → T015 (test) → T016 (manual verify).

### Parallel Opportunities

- T002 and T003 (Foundational verifications) can run in parallel.
- T004 (component) and T009 (its first test) touch different files and can proceed together once the component's prop shape is fixed.
- T012 (a11y test, separate file) is independent of the display-test edits in T011/T015.
- T017 and T019 (Polish) can run in parallel.
- ⚠️ Do NOT parallelize T009, T011, and T015 — they all edit `components/scene/market-header.test.tsx`.

---

## Parallel Example: Foundational

```bash
# Launch the two foundational verifications together:
Task: "Verify CityDataset.snapshotLabel + selectScopeAggregates city scope (data/contract.ts, data/selectors.ts)"
Task: "Verify Vitest + vitest-axe + datasetFixture snapshotLabel ' 9/2025' (test/fixtures/dataset.ts)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1 — the consolidated header showing title + count + snapshot together, with the old scope label removed.
4. **STOP and VALIDATE**: Open `/london` and confirm the three elements read as one header with no duplicate count.
5. Deploy/demo if ready.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 → header shows title + count + snapshot together (MVP).
3. US2 → snapshot label is honest and per-city (focused tests + a11y).
4. US3 → count is scope-derived and truthful (wiring confirmation + test).
5. Each story adds value without breaking the previous.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps each task to a user story for traceability.
- The display tests (T009/T011/T015) accrete in one file — keep them sequential.
- Verification covers the risky behavior: the honest snapshot label (trim + banned-word-free) and the scope-derived count.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
