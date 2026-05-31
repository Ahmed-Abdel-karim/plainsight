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
- [x] T002 Verify `data/loaders.ts` exports `getCitiesData()` and that `toData()` maps each `CityIndexEntry` into the UI-facing `CityData` shape used by the picker (formatting `listingCount` into a `listings` display string)
- [x] T003 Verify `next.config.ts` keeps `cacheComponents: true` enabled and configures `images.qualities` for the city card images

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared route and component structure required before the user story can be completed.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Create the city picker component directory at `components/city-picker/`
- [x] T005 Create `components/city-picker/city-picker.tsx` as an async Server Component (donut outer ring, `rules/react-components.md` Rule 11) that calls `getCitiesData()` and renders one card per launch city
- [x] T006 Create `components/city-picker/city-images.ts` mapping each launch slug to a static image asset in `public/cities/${slug}.png`
- [x] T007 Create `app/[city]/page.tsx` with a dynamic city route shell that loads city data by slug and returns not found for unknown slugs

**Checkpoint**: Component and route structure exists; User Story 1 implementation can begin.

---

## Phase 3: User Story 1 - Choose a Launch City (Priority: P1) MVP

**Goal**: Maya can open `/`, see exactly the curated launch cities, and select one by pointer or keyboard to navigate to `/${slug}`.

**Independent Test**: Load `/`, confirm the cards match `data/json/cities.json`, click a card to navigate, then repeat with keyboard Tab plus Enter and Space.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement the responsive card grid structure with a `nav`/list landmark in `components/city-picker/city-picker.tsx`
- [x] T009 [P] [US1] Create `components/city-picker/city-card.tsx` rendering a single card with shadcn `Card` composition and the resolved city image
- [x] T010 [US1] Create `components/city-picker/card-link.tsx` (`"use client"`) wrapping each card in a Next.js `Link` to `/${slug}`
- [x] T011 [US1] Add keyboard Space activation for focused card links in `components/city-picker/card-link.tsx`
- [x] T012 [US1] Add visible focus, hover, and active styles using token classes only in `components/city-picker/card-link.tsx`
- [x] T013 [US1] Render city name, country, frame, formatted listing count, snapshot label, and city image in `components/city-picker/city-card.tsx`
- [x] T014 [US1] Set a descriptive accessible name (city name, country, frame, listing count, snapshot label) on each card link in `components/city-picker/card-link.tsx`
- [x] T015 [US1] Render `<CityPicker />` from `app/page.tsx`; the Server Component loads its own data, so do not fetch in the page or prop-drill the city list
- [x] T016 [US1] Implement known-slug generation in `app/[city]/page.tsx` via `generateStaticParams()` from `getCitiesData()`
- [x] T017 [US1] Ensure unknown slugs return the not-found state in `app/[city]/page.tsx`
- [x] T018 [US1] Verify interactive UI follows `rules/react-components.md`, including kebab-case filenames, the donut pattern, shadcn composition, and token-only styling across the `components/city-picker/` files

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validate quality gates and acceptance behavior after the MVP is complete.

- [x] T019 Run `pnpm format:check` and fix any formatting issues in touched files
- [x] T020 Run `pnpm lint:strict` and fix any lint warnings or errors in touched files
- [x] T021 Run `pnpm build` and fix any build errors caused by the city picker or dynamic city route
- [x] T022 Manually verify `/` shows exactly the four launch city cards from `data/json/cities.json`
- [x] T023 Manually verify clicking Manchester, London, Berlin, and Amsterdam cards navigates to `/manchester`, `/london`, `/berlin`, and `/amsterdam`
- [ ] T024 Manually verify keyboard Tab reaches every city card and Enter activates the focused card
- [ ] T025 Manually verify keyboard Space activates the focused city card
- [ ] T026 Manually verify focused city cards have a visible focus ring in dark and light themes
- [ ] T027 Manually verify the card grid reflows on mobile width without hiding or duplicating launch cities
- [x] T028 Manually verify `/not-a-launch-city` returns the not-found state

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

- T008 works in `city-picker.tsx` after T005 exists.
- T009 (`city-card.tsx`) and T010 (`card-link.tsx`) can be built after the grid renders cards.
- T011 depends on T010 because Space activation applies to the rendered link target.
- T012, T013, and T014 depend on the card and link structure from T009 and T010.
- T015 depends on T005 and renders the completed Server Component.
- T016 and T017 depend on T007.
- T018 runs after UI implementation tasks T008 through T017.

### Parallel Opportunities

- T001, T002, and T003 can be verified independently.
- T004 through T007 are small setup tasks but should be completed in order to avoid missing files.
- T008 and T009 touch different files and can be worked in parallel.
- T016 and T017 (in `app/[city]/page.tsx`) can be worked in parallel with the card tasks T012 through T014.
- Manual checks T022 through T028 can be split after T019 through T021 pass.

---

## Parallel Example: User Story 1

```bash
# After the grid renders cards, coordinate these component tasks:
Task: "Create city-card.tsx with shadcn Card composition and the city image"
Task: "Create card-link.tsx with Next.js Link navigation to /${slug}"

# After route and component implementation, split manual acceptance checks:
Task: "Verify click navigation for all launch cities"
Task: "Verify keyboard Enter and Space activation"
Task: "Verify responsive card grid behavior"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Implement `city-picker.tsx`, `city-card.tsx`, `card-link.tsx`, and the landing page integration.
3. Implement the minimal dynamic city route shell.
4. Run static checks and build.
5. Complete manual browser, keyboard, and responsive acceptance checks.

### Incremental Delivery

1. Data and route assumptions verified.
2. City picker component files created.
3. Landing page renders data-backed city cards.
4. Slug route navigation succeeds for all launch cities.
5. Accessibility and responsive checks pass.

## Notes

- Do not duplicate the launch city list in component code; the Server Component calls `getCitiesData()`.
- Do not copy prototype HTML or CSS from the design reference; rebuild the visual direction with shadcn composition and token classes.
- Do not introduce Zustand for this feature.
- Keep `/` server-rendered (page-level `"use cache"`) except for the narrow `card-link.tsx` Client Component needed for Space-key activation.
- The city image is a static asset resolved by slug (`city-images.ts`), rendered decoratively (`alt=""`); the card's accessible name carries the city identity.
