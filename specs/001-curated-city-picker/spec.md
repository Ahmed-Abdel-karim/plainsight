# Feature Specification: Curated City Picker

**Feature Branch**: `001-curated-city-picker`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "E1-S1 — Curated city picker. As Maya, I want to choose from a small curated set of cities on entry, so that I can start analysing a market I care about without configuring anything. Acceptance criteria: Landing route `/` presents the launch cities as selectable cards according to the provided design; exactly the launch set is shown from the data directory; selecting a city navigates to `/[city]` using a stable, human-readable slug; keyboard cards are focusable and selectable via Enter/Space with visible focus ring."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Choose a Launch City (Priority: P1)

Maya arrives at the product entry route and chooses one city from the curated launch set so she can start analysing that market immediately without configuration.

**Why this priority**: This is the entry point to the product. Without a clear city choice, Maya cannot reach any market analysis experience.

**Independent Test**: Load `/`, confirm the launch city cards match the data-backed launch set, select one city, and verify the app navigates to that city's slug route.

**Acceptance Scenarios**:

1. **Given** Maya opens `/`, **When** the page loads, **Then** she sees one selectable card for each launch city in the data directory and no additional cities.
2. **Given** Maya sees the launch city cards, **When** she selects the London card, **Then** she is navigated to `/london`.
3. **Given** Maya is using only a keyboard, **When** she tabs to a city card and presses Enter or Space, **Then** the focused card is selected and the app navigates to that city's slug route.
4. **Given** a city card has keyboard focus, **When** Maya views the page in dark or light theme, **Then** the card has a visible focus indicator.

### Edge Cases

- If the launch city data set is empty, the landing page shows an empty state instead of hard-coded fallback cities.
- If a city entry is present in the launch set, its card uses the slug from that entry as the only navigation target.
- If a city slug contains multiple words or punctuation in future data, the route still uses the stable slug value already provided by the data source.
- If Maya uses assistive technology, each card exposes the city name, country, market framing, listing count, and snapshot label as understandable text.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The landing route `/` MUST present the curated launch cities as selectable cards.
- **FR-002**: The launch city cards MUST be generated from the city index in the data directory, not from a duplicated hard-coded city list.
- **FR-003**: The page MUST show exactly the cities present in the launch city data set: Manchester, London, Berlin, and Amsterdam.
- **FR-004**: Each card MUST display the city name, country, market framing, descriptive tone, formatted listing count, and snapshot label from the data source.
- **FR-005**: Selecting a city card MUST navigate to `/${slug}`, where `slug` is the stable human-readable slug from the data source.
- **FR-006**: City cards MUST be reachable by keyboard and selectable with Enter and Space.
- **FR-007**: City cards MUST show a visible focus indicator when focused by keyboard.
- **FR-008**: The landing page MUST follow the provided landing design direction while using the project's component and token rules.

### Key Entities _(include if feature involves data)_

- **Launch City**: A curated market entry with slug, name, country, country flag, market frame, descriptive tone, snapshot label, and listing count.
- **City Card**: A selectable representation of one Launch City that communicates the market summary and navigates to the city route.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time user can identify the available launch cities on `/` without opening any controls or configuring filters.
- **SC-002**: The landing page displays exactly four launch city cards that match the current launch data set.
- **SC-003**: Selecting any launch city reaches the matching slug route in one action.
- **SC-004**: A keyboard-only user can reach and activate every city card without using a pointer.
- **SC-005**: During manual accessibility review, every focused city card has a visible focus state in both supported themes.

## Constitutional Requirements _(mandatory for UI or state changes)_

- **CR-001**: City cards must have keyboard focus behavior that users can verify, including visible focus and Enter/Space activation.
- **CR-002**: The card grid must work across desktop and mobile layouts without hiding or duplicating launch cities.
- **CR-003**: The page must preserve dark and light theme readability, reduced-motion expectations, and meaningful accessible names for city choices.
- **CR-004**: The launch set must remain data-backed so the page does not drift from the data directory.

## Assumptions

- The launch city source of truth is `data/json/cities.json`.
- The current launch set is Manchester, London, Berlin, and Amsterdam.
- The provided design is `design/app/RentalScope Landing.html`; it is the visual target, not implementation code to copy.
- The city destination route for this story is the root-level slug route, for example `/london`.
