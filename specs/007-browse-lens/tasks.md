# Tasks: Browse Lens — Listings List, Map Dots & Detail Drawer

**Input**: Design documents from `/specs/007-browse-lens/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included where the plan calls for them — Vitest **unit** tests for the pure kernel
(`lib/browse` sort comparators, projection shape) and **integration** tests for presentational
components (listing card/list/summary/sort/detail) with role/name queries. The WebGL circle layer,
hover linkage, drawer focus, deep-link restore, theme swap, and large-city smoothness are verified
**manually** via the `run-app` skill (not unit-testable in jsdom — same posture as 004/006).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US4)
- Exact file paths are included in each description

## Path Conventions

Single Next.js app at repository root (`components/`, `lib/`, `data/`, `scripts/`, `public/data/`)
per plan.md → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the new dependencies and primitives the Browse lens is built from.

- [x] T001 [P] Add `@tanstack/react-virtual` to `package.json` and install (headless list
      virtualization; ships its own types) — research D7, plan Primary Dependencies.
- [x] T002 [P] Add the stock shadcn **Tabs** primitive at `components/ui/tabs.tsx`
      (`npx shadcn@latest add tabs`) — research D9, used by the lens toggle.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The Browse data tier, types, pure kernel, URL/store state, and the shared
fetch+derive hook that **every** user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 [P] Add `BrowsePointProperties` and `BrowsePoint` types to `data/contract.ts`
      (Listing minus `h3`, plus point geometry; **no `availability`** field) — data-model.md,
      contracts/browse-tier.md.
- [x] T004 Add `projectPoints(listings)` to `scripts/split-city-data.ts` and emit
      `public/data/{slug}-points.geojson` (compact `FeatureCollection<Point, BrowsePointProperties>`)
      for every city in `cities.json` — contracts/browse-tier.md (Producer).
- [x] T005 [P] Unit test the projection in `scripts/split-city-data.test.ts` (or sibling): asserts
      1:1 feature count vs `Listing[]`, `[lng, lat]` order, `roomType ∈ ROOM_TYPES`, no
      `availability` key — contracts/browse-tier.md (Invariants).
- [x] T006 Run `npx tsx scripts/split-city-data.ts` to regenerate the tiers and verify each
      `public/data/{slug}-points.geojson` exists with the expected count — quickstart.md Prereqs.
- [x] T007 [P] Implement pure `comparatorFor(key: SortKey)` in `lib/browse/sort.ts` for
      `price_asc` (default), `price_desc`, `reviews_desc`, `review_count_desc`; null
      `reviewsPerMonth` sorts last; ties break by listing `id` — research D8.
- [x] T008 [P] Unit test `lib/browse/sort.ts` in `lib/browse/sort.test.ts`: all four `SortKey`s,
      null-`reviewsPerMonth`-last, stable tie-break by id — research D8, quickstart Tests.
- [x] T009 [P] Add the scene-level lens hook `components/scene/use-lens.ts` (nuqs **shallow**:
      `lens` = `parseAsStringLiteral(["analyse","browse"])` default `analyse` `clearOnDefault`;
      `listing` = `parseAsInteger`; `setLens("analyse")` clears `listing`) returning
      `UseLensResult` — contracts/lens-and-map.md (URL state), research D4.
- [x] T010 [P] Add `POINTS_SOURCE_ID = "browse-points"` and
      `POINTS_CIRCLE_LAYER_ID = "browse-points-circle"` to
      `components/scene/map/constants.ts` — contracts/lens-and-map.md (Points layer).
- [x] T011 Add the ephemeral `hoveredListingId: number | null` slice +
      `setHoveredListingId` action + `useHoveredListingId` selector to
      `components/scene/map/map-store.ts` (hex slice untouched) — data-model.md (Store slice).
- [x] T012 Add the shared `components/scene/browse/use-browse-points.ts` hook: lazy, ref-counted
      `fetch('/data/{slug}-points.geojson')` + parse cached per slug; exposes
      `{ status: "loading"|"ready"|"error", points }`; provides the memoized **filtered+sorted**
      `BrowsePointProperties[]` over active `ListingFilters` + neighbourhood `Scope` + `SortKey`
      (`lib/filters` predicate + `lib/browse` comparator, default `price_asc`) — depends on T003,
      T007; contracts/browse-tier.md (Consumer), research D2.

**Checkpoint**: Data tier, types, pure sort, URL/store state, and the derive hook exist and are
unit-green — user stories can now begin.

---

## Phase 3: User Story 1 - Switch to Browse and see the listings list (Priority: P1) 🎯 MVP

**Goal**: A floating Analyse/Browse tab swaps the sidebar/sheet dashboard for a virtualized
listings list with a live "N of total" count that tracks the active scope and filters.

**Independent Test**: Toggle the tab → sidebar/sheet content swaps between the dashboard and the
list; with a price/room filter active, the list and its count reflect the matching set; selecting
Analyse restores the dashboard.

### Implementation for User Story 1

- [x] T013 [P] [US1] Create the placeholder thumbnail `components/scene/browse/listing-thumb.tsx`
      (striped placeholder keyed by `imageVariant`; port of design Thumb) — FR-003.
- [x] T014 [P] [US1] Create the row `components/scene/browse/listing-card.tsx` (shadcn **Button**:
      thumb + title + room type **label + color cue** + neighbourhood name + nightly price; ≥44px
      tall) — FR-003, CR-003.
- [x] T015 [P] [US1] Create `components/scene/browse/browse-summary.tsx` rendering "N of total"
      in an `aria-live` region — FR-003, CR-003.
- [x] T016 [P] [US1] Create `components/scene/browse/browse-empty.tsx` (empty state summarizing
      active filters + a reset affordance) — FR-012.
- [x] T017 [US1] Create `components/scene/browse/listing-list.tsx` virtualizing the full
      filtered+sorted set with `@tanstack/react-virtual` (renders only visible rows; resolves
      `neighbourhoodId`→name via `{slug}-meta.json`) — FR-004, SC-002.
- [x] T018 [US1] Create `components/scene/browse/sidebar-browse.tsx` wiring `use-browse-points`
      → `browse-summary` + `listing-list` + `browse-empty`, with a loading **skeleton** while
      `status === "loading"` — FR-002, edge case (loading), CR-002 (container-query layout).
- [x] T019 [US1] Create `components/scene/lens-tabs.tsx` (shadcn Tabs in an over-map
      `.map-chrome`, bound to the `lens` param via `use-lens`) — FR-001.
- [x] T020 [US1] Update `components/scene/sidebar-content.tsx` to render `SidebarAnalysis` or
      `SidebarBrowse` by `lens`; switching to Analyse restores the dashboard — FR-002, US1 AC3.
- [x] T021 [US1] Update `components/scene/city-scene.tsx` to mount `<LensTabs>` over the map
      (Analyse default) — FR-001.
- [x] T022 [P] [US1] Integration tests with fixtures (role/name queries) for `listing-card`
      (fields render) and `browse-summary` (count + live region) — plan Testing, quickstart Tests.
- [x] T023 [US1] Verify US1 in `run-app`: tab swaps dashboard↔list with no reload (SC-001),
      count tracks filters, keyboard path to the tab + list rows, container reflow to the mobile
      sheet, room type label-not-color-only, dark + light — CR-001/002/003, SC-001.

**Checkpoint**: Browse shows the live, virtualized, filter-aware list — independently demoable MVP.

---

## Phase 4: User Story 2 - Listings as map dots, linked to the list (Priority: P1)

**Goal**: In Browse the hex layer is hidden and every matching listing is a dot on a single
circle layer (GPU-filtered by price/room/scope); hovering a card ↔ dot emphasizes the other and
scrolls the card into view; neighbourhood boundaries stay clickable to narrow scope.

**Independent Test**: Browse hides the hex layer and draws a dot per filtered listing; hover a
card → its dot emphasizes; hover a dot → its card emphasizes and scrolls into view; click a
boundary → list, count, and dots narrow.

### Implementation for User Story 2

- [x] T024 [P] [US2] Create `components/scene/map/points/point-colors.ts` — per-theme room-type
      **hex** ramp mirroring `--cat-1..5` (Rule 3 exception) — plan Constraints, research D5.
- [x] T025 [US2] Create `components/scene/map/points/points-layer.tsx` — `<Source>` (geojson,
      `POINTS_SOURCE_ID`, `promoteId: "id"`) + `circle` `<Layer>` (`POINTS_CIRCLE_LAYER_ID`):
      `circle-color` match on `roomType`; radius/stroke enlarge on `feature-state.hover|selected`,
      zoom-interpolated — contracts/lens-and-map.md (Points layer), research D5.
- [x] T026 [US2] Create `components/scene/map/points/use-points-layer.ts` — build + apply the GPU
      `setFilter` expression from `ListingFilters` + neighbourhood scope; toggle layer
      `visibility` by lens; sync `feature-state` hover/selected from store + `use-lens` — SC-003,
      contracts/lens-and-map.md (GPU filter).
- [x] T027 [US2] Update `components/scene/map/map-canvas.tsx` to mount `<PointsLayer>` in Browse,
      toggle hex(`none`)/points(`visible`) visibility and `interactiveLayerIds`, and wire dot
      `onMouseMove`→`setHoveredListingId` and dot click→`selectListing` — FR-006, US2 AC1.
- [x] T028 [US2] Wire the two-way hover bridge: in `listing-card.tsx` `onMouseEnter`/`onFocus`→
      `setHoveredListingId(id)` (clear on leave/blur); in `listing-list.tsx` observe
      `hoveredListingId` and `scrollIntoView({block:"nearest"})` **only** when the hover
      originated from the map — FR-007, SC-004.
- [x] T029 [US2] Ensure a Browse neighbourhood-boundary click narrows the scope so the list,
      count, and dots all update (boundaries stay visible/clickable; only the hex fill is hidden)
      — FR-013, US2 AC4.
- [x] T030 [US2] Verify US2 in `run-app`: hex hidden + dots shown, filter updates dots+list+count
      ≤~300ms, hover both ways within a frame, boundary-click narrows scope, London ~62k draws all
      dots and scrolls smoothly — FR-006/007/013, SC-002/003/004.

**Checkpoint**: The spatial (dots) and tabular (list) views are linked both ways and scope-aware.

---

## Phase 5: User Story 3 - Open a listing's detail drawer (Priority: P1)

**Goal**: Selecting a listing (card or dot) opens an over-map detail drawer (right panel ≥lg,
bottom sheet <lg) reading the selected feature's properties; the selection is in the URL so it is
shareable and restored on reload; Esc/close/another-select close it and restore focus.

**Independent Test**: Click a card or dot → drawer opens with that listing's fields (no
availability); Esc/close → dismisses and focus returns to the trigger; a `?lens=browse&listing=ID`
URL reopens that drawer on load; an unknown id opens Browse with no drawer.

### Implementation for User Story 3

- [x] T031 [US3] Create `components/scene/browse/listing-detail.tsx` — single shadcn **Drawer**
      (vaul) with `direction="right"` ≥lg / `"bottom"` <lg via a viewport hook; renders the
      selected feature's title, room type, neighbourhood, price, host (+ multi-host =
      `hostListingsCount >= 2`), reviews/month, review count, min nights, and snapshot provenance
      — **no `availability`** — FR-008, research D3/D6, CR-002.
- [x] T032 [US3] Mount `<ListingDetail>` over the map in `components/scene/city-scene.tsx`, opened
      from the `listing` param (reads the in-memory feature by id; the list stays mounted behind)
      — FR-008, US3 AC1.
- [x] T033 [US3] Wire selection lifecycle via `use-lens.selectListing`: card/dot click selects;
      Esc, close control, selecting another, switching to Analyse, switching cities, or a filter
      that excludes the selection all clear `listing` + hover and **restore focus to the trigger**
      — FR-009, FR-010, edge cases (filtered-out / city switch).
- [x] T034 [US3] Handle deep-link restore: on load `lens=browse&listing=ID` opens that drawer; an
      id absent from the loaded/filtered set is ignored (Browse, no drawer, no error) — FR-011,
      SC-005, edge case (unknown id).
- [x] T035 [P] [US3] Integration test `listing-detail` body with a fixture (role/name): asserts
      host/multi-host, reviews/mo, review count, min nights, provenance render and that
      **availability is absent** — plan Testing, research D3.
- [x] T036 [US3] Verify US3 in `run-app`: drawer floats over the map (panel ≥lg / sheet <lg),
      focus trap + Esc + focus restore, deep-link open, reduced-motion transitions, dark + light,
      axe clean — FR-008/009/011, CR-001/003, SC-005/006.

**Checkpoint**: All three P1 stories complete — the full core Browse journey (list → map → detail).

---

## Phase 6: User Story 4 - Sort the list (Priority: P2)

**Goal**: A sort control reorders the visible list by price asc (default), price desc, most
reviews/month, or most reviewed — without changing which listings match.

**Independent Test**: Change the sort → visible order changes while the result count (matching
set) is unchanged.

### Implementation for User Story 4

- [x] T037 [P] [US4] Create `components/scene/browse/sort-control.tsx` (shadcn **Select** over the
      four `SortKey`s, labelled) — FR-005, research D8.
- [x] T038 [US4] Add Browse sort state (default `price_asc`, reset on city switch) and feed the
      chosen `SortKey` into `use-browse-points`; mount `<SortControl>` in `sidebar-browse.tsx`
      above the list — FR-005, edge case (city switch resets sort).
- [x] T039 [P] [US4] Integration test `sort-control` (role/name): selecting an option invokes the
      change with the right `SortKey` — plan Testing.
- [x] T040 [US4] Verify US4 in `run-app`: changing the sort reorders the list while the count is
      unchanged; full keyboard path to the control — US4 AC1, CR-001.

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across stories.

- [x] T041 [P] Update `docs/` / `CLAUDE.md` pointers if the Browse tier or lens state needs a note
      (data tiers, client-only nuqs lens/listing state).
- [x] T042 Run `npm test` (sort + projection unit, presentational integration) and the typecheck +
      lint (strict, no `any`) — quickstart Tests.
- [x] T043 Full `run-app` quickstart pass over every Verify scenario (SC-001…SC-005) including
      empty state and the large-city scale check (London ~62k) — quickstart Verify.
- [x] T044 Automated accessibility check (axe) clean in **both** dark and light themes across the
      tab, sort, list, and drawer — SC-006, CR-001/003.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phases 3–6)**: all depend on Foundational. US1/US2/US3 are all P1; US2 and US3
  build on the list surface and lens/store state from Foundational + US1. US4 (P2) extends US1.
- **Polish (Phase 7)**: depends on all targeted stories.

### User Story Dependencies

- **US1 (P1)**: after Foundational. No dependency on other stories (MVP).
- **US2 (P1)**: after Foundational; reuses `listing-card`/`listing-list` from US1 for the hover
  bridge (T028) — sequence US1 → US2, or stub the cards if parallelizing.
- **US3 (P1)**: after Foundational; selection can be triggered from a US1 card or a US2 dot, but
  the drawer itself reads the foundational hook and `use-lens` — independently testable from a card.
- **US4 (P2)**: after US1 (mounts the control into `sidebar-browse.tsx` and feeds the foundational
  derive hook).

### Within Each User Story

- Pure/data tasks before the components that consume them.
- Leaf components (`[P]`) before the container that composes them.
- `run-app` verification last in each story.

### Parallel Opportunities

- T001, T002 (Setup) run in parallel.
- In Foundational: T003, T005, T007, T008, T009, T010 are `[P]` (distinct files); T011 and T012
  follow (T012 depends on T003 + T007).
- In US1: T013, T014, T015, T016 (leaf components) run in parallel before T017/T018.
- Integration tests (T022, T035, T039) run in parallel with sibling component work once their
  component exists.

---

## Parallel Example: User Story 1

```bash
# After Foundational, launch the US1 leaf components together:
Task: "Create listing-thumb.tsx in components/scene/browse/"
Task: "Create listing-card.tsx in components/scene/browse/"
Task: "Create browse-summary.tsx in components/scene/browse/"
Task: "Create browse-empty.tsx in components/scene/browse/"
# then compose: listing-list.tsx -> sidebar-browse.tsx -> sidebar-content.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational (CRITICAL — blocks everything).
2. Phase 3 US1 → **STOP and VALIDATE**: Browse shows the live virtualized list + count.
3. Demo: the list that appears when the user changes the Browse/Analyse tab.

### Incremental Delivery

1. Foundation ready (tier + types + pure sort + lens/store + derive hook).
2. US1 → list/count/tab (MVP). 3. US2 → map dots + hover link. 4. US3 → detail drawer + deep-link.
3. US4 → sort. Each adds value without breaking the prior increment.

---

## Notes

- `[P]` = different files, no incomplete dependencies. `[Story]` maps a task to US1–US4.
- **availability is intentionally excluded** everywhere (research D3) — the spec's FR-008/US3 and
  Key Entities still mention it; the data tier, drawer, and tests omit it. Consider a one-line spec
  edit to drop it (flagged in research D3).
- WebGL / pointer / focus / theme / scale behaviour is verified via `run-app`, not jsdom.
- Commit after each task or logical group.
