# Tasks: Curated City Picker

**Input**: Design documents from `specs/001-curated-city-picker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Automated test tasks are not included because the feature specification did not request TDD or automated tests. Verification tasks cover formatting, linting, build, browser, keyboard, responsive, and accessibility acceptance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because the task touches different files and does not depend on incomplete tasks.
- **[Story]**: Maps task to a user story. User story phase tasks use `[US1]`.
- Each task includes exact file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the project baseline and data source before implementation.

- [x] T001 Verify `data/json/cities.json` contains exactly Manchester, London, Berlin, and Amsterdam with unique non-empty `slug` values
- [x] T002 Verify `data/loaders.ts` exports `getCitiesData()` and maps city index entries into the UI-facing city shape used by the picker
- [x] T003 Verify `next.config.ts` keeps `cacheComponents: true` enabled for cached server data loading

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared route and component structure required before the user story can be completed.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create the city picker component directory at `components/city-picker/`
- [x] T005 Create `components/city-picker/CityPicker.tsx` as a Client Component accepting a typed `cities` prop
- [x] T006 Create `app/[city]/page.tsx` with a dynamic city route shell that loads city data by slug and returns not found for unknown slugs

**Checkpoint**: Component and route structure exists; User Story 1 implementation can begin.

---

## Phase 3: User Story 1 - Choose a Launch City (Priority: P1) MVP

**Goal**: Maya can open `/`, see exactly the curated launch cities, and select one by pointer or keyboard to navigate to `/${slug}`.

**Independent Test**: Load `/`, confirm the cards match `data/json/cities.json`, click a card to navigate, then repeat with keyboard Tab plus Enter and Space.

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement the responsive card grid structure in `components/city-picker/CityPicker.tsx`
- [x] T008 [P] [US1] Implement each city card in `components/city-picker/CityPicker.tsx` using shadcn `Card` composition and `Link` navigation to `/${slug}`
- [x] T009 [US1] Add keyboard Space activation for focused city cards in `components/city-picker/CityPicker.tsx`
- [x] T010 [US1] Add visible focus, hover, and active styles using token classes only in `components/city-picker/CityPicker.tsx`
- [x] T011 [US1] Render city name, country, country flag, frame, tone, formatted listing count, and snapshot label in `components/city-picker/CityPicker.tsx`
- [x] T012 [US1] Replace the placeholder landing page in `app/page.tsx` with an async Server Component that calls `getCitiesData()` and renders `CityPicker`
- [x] T013 [US1] Add an empty-state branch in `app/page.tsx` for an empty launch city data set
- [x] T014 [US1] Implement known-slug generation in `app/[city]/page.tsx` from the launch city data source
- [x] T015 [US1] Ensure unknown slugs return the not-found state in `app/[city]/page.tsx`
- [x] T016 [US1] Verify interactive UI follows `rules/react-components.md`, including shadcn composition and token-only styling in `components/city-picker/CityPicker.tsx`

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validate quality gates and acceptance behavior after the MVP is complete.

- [x] T017 Run `pnpm format:check` and fix any formatting issues in touched files
- [x] T018 Run `pnpm lint:strict` and fix any lint warnings or errors in touched files
- [x] T019 Run `pnpm build` and fix any build errors caused by the city picker or dynamic city route
- [x] T020 Manually verify `/` shows exactly the four launch city cards from `data/json/cities.json`
- [x] T021 Manually verify clicking Manchester, London, Berlin, and Amsterdam cards navigates to `/manchester`, `/london`, `/berlin`, and `/amsterdam`
- [ ] T022 Manually verify keyboard Tab reaches every city card and Enter activates the focused card
- [ ] T023 Manually verify keyboard Space activates the focused city card
- [ ] T024 Manually verify focused city cards have a visible focus ring in dark and light themes
- [ ] T025 Manually verify the card grid reflows on mobile width without hiding or duplicating launch cities
- [x] T026 Manually verify `/not-a-launch-city` returns the not-found state

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; confirms existing project and data assumptions.
- **Foundational (Phase 2)**: Depends on Setup completion; creates files needed for the story implementation.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **Polish (Phase 4)**: Depends on User Story 1 completion.

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other user stories. This is the MVP and complete feature scope.

### Within User Story 1

- T007 and T008 can be started after T005 because both work within the new component.
- T009 depends on T008 because Space activation applies to the rendered link/card target.
- T010 and T011 depend on the card structure from T007 and T008.
- T012 depends on T005 and uses the completed component.
- T014 and T015 depend on T006.
- T016 runs after UI implementation tasks T007 through T015.

### Parallel Opportunities

- T001, T002, and T003 can be verified independently.
- T004, T005, and T006 are small setup tasks but should be completed in order to avoid missing files.
- T007 and T008 can be worked in parallel within `components/city-picker/CityPicker.tsx` only if coordinated carefully.
- T014 and T015 can be worked in parallel with T010 and T011 because they touch `app/[city]/page.tsx`.
- Manual checks T020 through T026 can be split after T017 through T019 pass.

---

## Parallel Example: User Story 1

```bash
# After T005 exists, coordinate these component tasks:
Task: "Implement the responsive card grid structure in components/city-picker/CityPicker.tsx"
Task: "Implement each city card using shadcn Card composition and Link navigation in components/city-picker/CityPicker.tsx"

# After route and component implementation, split manual acceptance checks:
Task: "Verify click navigation for all launch cities"
Task: "Verify keyboard Enter and Space activation"
Task: "Verify responsive card grid behavior"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Implement `CityPicker` and the landing page integration.
3. Implement the minimal dynamic city route shell.
4. Run static checks and build.
5. Complete manual browser, keyboard, and responsive acceptance checks.

### Incremental Delivery

1. Data and route assumptions verified.
2. City picker component created.
3. Landing page renders data-backed city cards.
4. Slug route navigation succeeds for all launch cities.
5. Accessibility and responsive checks pass.

## Notes

- Do not duplicate the launch city list in component code; use `getCitiesData()`.
- Do not copy prototype HTML or CSS from `design/app/RentalScope Landing.html`; rebuild the visual direction with shadcn composition and token classes.
- Do not introduce Zustand for this feature.
- Keep `/` server-rendered except for the narrow Client Component needed for Space-key activation.
