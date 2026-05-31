---
description: "Task list for City Establishes the Default Analysis Scope"
---

# Tasks: City Establishes the Default Analysis Scope

**Input**: Design documents from `specs/002-city-default-scope/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: No automated test tasks are included — the spec did not request tests or TDD, and the project has no test runner configured (`package.json` defines only format/lint/build). Per the constitution, verification is done via static checks (`pnpm format:check`, `pnpm lint:strict`, `pnpm build`) and the manual keyboard/responsive/theme checks in `quickstart.md`.

**Organization**: Tasks are grouped by user story (US1 → US2 → US3) so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- All paths are relative to the repository root.

## Path Conventions

Single Next.js application. New work lives under `app/[city]/` and `components/scene/`; existing reused primitives live under `data/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare for the new scene components. The plan introduces no new runtime dependencies (no map library, no Zustand store).

- [x] \101 Confirm no new dependencies are needed (plan.md "Technical Context" adds none) and create the `components/scene/` directory for the new scene components.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify the existing route and data primitives every story relies on. These are verification tasks — make a change only if a gap is found, and record it.

**⚠️ CRITICAL**: No user story work should begin until these are confirmed.

- [x] \102 [P] Verify Cache Components is enabled (`cacheComponents: true` in `next.config.ts`) so `app/[city]/page.tsx` can keep `"use cache"`, matching the 001 pattern.
- [x] \103 [P] Verify the data primitives the scene depends on exist and behave as the design assumes: `getCityDataset(slug): Promise<CityDataset | null>` returns `null` for unknown slugs (`data/loaders.ts`), `selectScopeAggregates(dataset, { type: "city" })` returns `dataset.cityAggregates` (`data/selectors.ts`), and the `Scope` type is `{ type: "city" } | { type: "neighbourhood"; id: string }` (`data/types.ts`). Record any gap; do not change shapes silently.
- [x] \104 Verify the supported-city set stays data-backed and aligned (FR-002): each slug in `data/json/cities.json` (the picker's source, used by `generateStaticParams`) has a matching `data/json/${slug}.json` dataset — london, berlin, manchester, amsterdam — so the route and picker cannot drift.

**Checkpoint**: Route + data layer confirmed — user stories can begin.

---

## Phase 3: User Story 1 - City Is the Default Scope (Priority: P1) 🎯 MVP

**Goal**: On a supported `/[city]` route, set the active analysis scope to the whole city and render a scene composed of a map region and a sidebar region, both against city scope.

**Independent Test**: Open `/london`; confirm both a map region and a sidebar region render against the city (no blank/missing region) and the content describes the whole city, with no narrowing.

### Implementation for User Story 1

- [x] \105 [P] [US1] Create `components/scene/map-region.tsx` (Server Component) — a non-interactive placeholder map region using shadcn `Skeleton` (`components/ui/skeleton.tsx`) and token utilities only; labelled region that is never blank. The interactive map is deferred to a later epic (per contracts/ui-contract.md "map region").
- [x] \106 [P] [US1] Create `components/scene/sidebar-region.tsx` (Server Component) — a sidebar shell that exposes a scope-label slot (e.g. `children`) and clearly-marked placeholder slots for deferred analytics, per contracts/ui-contract.md "sidebar region".
- [x] \107 [US1] Create `components/scene/city-scene.tsx` (Server Component) composing `<MapRegion>` and `<SidebarRegion>` into the responsive scene layout (desktop: regions laid out together without overlap; tablet/mobile: reflow without hiding either region), accepting the city name and city-scope aggregates as props (depends on T005, T006).
- [x] \108 [US1] Update `app/[city]/page.tsx`: keep `"use cache"` and `generateStaticParams`; `await params`, call `getCityDataset(city)`, call `notFound()` when the dataset is `null`, set scope `const scope: Scope = { type: "city" }`, derive `selectScopeAggregates(dataset, scope)`, and render `<CityScene city={dataset.name} aggregates={...} />` (depends on T007). Remove the placeholder heading markup.
- [x] \109 [US1] Verify the scene composition follows `rules/react-components.md`: only shadcn `Skeleton` and token utilities are used, no `components/ui/*` file is edited or forked, and no raw colors/arbitrary spacing are introduced.
- [x] \110 [US1] Verify US1 per quickstart.md steps 2–3 and 7–8: a supported city renders both regions against city scope (no blank region), the regions reflow across desktop/mobile without hiding either region, dark/light stay readable, and a reload renders the same city-scoped scene (URL-derived scope).

**Checkpoint**: A supported `/[city]` route renders the city-scoped scene shell independently.

---

## Phase 4: User Story 2 - Scope Label Names the City and Its Total (Priority: P2)

**Goal**: Display a scope label inside the scene showing the active city's name and its total listing count, sourced from the city data and formatted with digit grouping.

**Independent Test**: Open `/london` and `/amsterdam`; confirm each scope label shows that city's name and its own total (`London · 61,963 listings`, `Amsterdam · 5,874 listings`).

**Depends on US1**: the scope label is rendered inside the sidebar region (T006) via the scene wiring (T007/T008).

### Implementation for User Story 2

- [x] \111 [P] [US2] Create `components/scene/scope-label.tsx` (Server Component) rendering `"{cityName} · {count} listings"` where `count = aggregates.listingCount` formatted with `toLocaleString("en")`; wrap in `role="status"` / `aria-live="polite"` so a future scope change is announced (baseline for E1-S3), per data-model.md "Scope Label" and contracts/ui-contract.md. Accept `cityName` and `count` (or aggregates) as props; do not hard-code per-city values.
- [x] \112 [US2] Render `<ScopeLabel>` inside `components/scene/sidebar-region.tsx` and thread `cityName` + city-scope aggregates from `app/[city]/page.tsx` through `components/scene/city-scene.tsx` into it (depends on T011 and US1 T006–T008).
- [x] \113 [US2] Verify US2 per quickstart.md step 4: the label shows the city name and grouped total for multiple cities, the figures match `data/json/${slug}.json` (data-backed, not hard-coded), the count reads as understandable text, and the label is readable in dark/light themes.

**Checkpoint**: US1 + US2 both work — the city-scoped scene now carries the data-backed scope label.

---

## Phase 5: User Story 3 - Graceful Not-Found Routes Back to the Picker (Priority: P3)

**Goal**: An unsupported `/[city]` slug renders a graceful not-found view (no crash, no blank map, no scene regions) with a keyboard-accessible action back to the picker at `/`.

**Independent Test**: Open `/atlantis`; confirm a graceful not-found view with a working, keyboard-accessible back-to-picker action — and no city scene regions.

**Depends on US1**: the `notFound()` trigger in `app/[city]/page.tsx` is wired in T008.

### Implementation for User Story 3

- [x] \114 [P] [US3] Create `app/[city]/not-found.tsx` (Server Component) — a graceful not-found view that renders none of the scene regions and no other city's content, with a back-to-picker action built as shadcn `Button` `asChild` wrapping a Next `Link` to `/`, per contracts/ui-contract.md "Not-Found View".
- [x] \115 [US3] Verify the unknown-slug path resolves to `app/[city]/not-found.tsx` via the `notFound()` branch (US1 T008) and that matching is exact: case/whitespace variants (e.g. `/London`, `/london%20`) and unknown slugs all resolve to the not-found view, per data-model.md and spec Edge Cases. Adjust only if a gap is found.
- [x] \116 [US3] Verify US3 per quickstart.md steps 5–6: the not-found view shows no crash/raw error/blank map/scene regions; the back-to-picker action is keyboard reachable with a visible focus ring, activates with Enter, lands on `/`; and it is readable in dark/light themes.

**Checkpoint**: All three stories function independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across stories.

- [x] \117 [P] Run static checks and fix any findings: `pnpm format:check`, `pnpm lint:strict`, `pnpm build` (per quickstart.md "Build And Static Checks").
- [x] \118 Run a full quickstart.md acceptance pass across US1–US3 (city scope, scope label, not-found + keyboard) in the running app.
- [x] \119 [P] Confirm no placeholder/TODO text remains in the new files (`app/[city]/page.tsx`, `app/[city]/not-found.tsx`, `components/scene/*`) and that `CLAUDE.md` SPECKIT marker still points to `specs/002-city-default-scope/plan.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — verification gate that blocks all stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
  - US1 (P1) is the MVP and has no story dependencies.
  - US2 (P2) depends on US1 (scope label lives in the sidebar region created in US1).
  - US3 (P3) depends on US1 (uses the `notFound()` trigger wired in T008) but is independent of US2.
- **Polish (Phase 6)**: Depends on the desired stories being complete.

### Within Each User Story

- US1: leaf regions (T005, T006) → scene composition (T007) → page wiring (T008) → verification (T009, T010).
- US2: label component (T011) → wiring into sidebar/scene/page (T012) → verification (T013).
- US3: not-found view (T014) → trigger/matching verification (T015) → acceptance verification (T016).

### Parallel Opportunities

- T002 and T003 (Foundational verifications) can run in parallel.
- T005 and T006 (US1 leaf region components, different files) can run in parallel.
- T011 (US2) and T014 (US3) are different files and can be drafted in parallel once US1 is complete, since US3 does not depend on US2.
- T017 and T019 (Polish) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# After Foundational, launch the two leaf region components together:
Task: "Create components/scene/map-region.tsx (placeholder map region, Skeleton)"
Task: "Create components/scene/sidebar-region.tsx (sidebar shell with scope-label slot)"
# Then T007 composes them, T008 wires the page.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001).
2. Phase 2: Foundational verifications (T002–T004).
3. Phase 3: User Story 1 (T005–T010).
4. **STOP and VALIDATE**: a supported city renders the city-scoped scene shell.
5. Demo if ready.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 → city-scoped scene shell → validate → demo (MVP).
3. US2 → data-backed scope label → validate → demo.
4. US3 → graceful not-found + back-to-picker → validate → demo.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- Several Foundational/verification tasks are confirm-only; if a task finds the assumed behavior is missing, record the gap rather than silently changing a shared shape.
- All new components are Server Components; no Zustand store or map library is introduced in this story.
- Commit after each task or logical group.
