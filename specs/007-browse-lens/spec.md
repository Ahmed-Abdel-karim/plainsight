# Feature Specification: Browse Lens — Listings List, Map Dots & Detail Drawer

**Feature Branch**: `007-browse-lens`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "check the document that we discussed before and the designs — specify the feature of showing the lists when the user changes the browse / analysis tab"

## Clarifications

### Session 2026-06-02

- Q: How should filtered listings be represented on the map at full scale (London ≈ 62k)? → A: Every matching listing as an individual dot on a single circle-marker map layer (not per-listing marker "pins"); the layer filters live with the price/room controls.
- Q: While in Browse, can the user still change the neighbourhood scope from the map? → A: Yes — neighbourhood boundaries stay visible and clickable in Browse; selecting one narrows the list and the dots. Only the hex price layer is hidden.
- Q: Where does the listing detail drawer appear when a listing is selected? → A: Floating over the map — a side panel on desktop and a bottom sheet over the map on mobile; the list stays visible behind it.
- Q: Should an open listing's detail be shareable/restorable via the URL? → A: Yes — the selected listing id is encoded in the URL alongside the lens and filters; a shared link or reload reopens that listing's drawer in Browse.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Switch to Browse and see the listings list (Priority: P1)

A renter opens a city, which defaults to the **Analyse** lens (the price map and the analysis
dashboard). They select the **Browse** tab. The sidebar's analysis dashboard is replaced by a
scrollable list of every listing that matches the current neighbourhood scope and filters —
each row showing a photo placeholder, title, room type, neighbourhood, and nightly price —
with a live result count ("N of total") above it. Selecting **Analyse** again restores the
dashboard. The same content serves the mobile bottom sheet.

**Why this priority**: This is the core of the request — the list that appears when the user
changes the Browse/Analyse tab. Without it there is no Browse lens. It delivers standalone
value: a renter can scan individual listings filtered to their criteria.

**Independent Test**: Toggle the tab and assert the sidebar/sheet content swaps between the
dashboard and the list, and that the list and its count reflect the active filter/scope set.

**Acceptance Scenarios**:

1. **Given** the Analyse lens, **When** the user selects Browse, **Then** the sidebar shows
   the listings list and a result count for the current scope and filters.
2. **Given** the Browse lens with an active price or room-type filter, **When** the filter
   changes, **Then** the list and its count update to the new matching set.
3. **Given** the Browse lens, **When** the user selects Analyse, **Then** the analysis
   dashboard returns and any selected or hovered listing is cleared.

---

### User Story 2 - Listings as map dots, linked to the list (Priority: P1)

In Browse, the hex price layer on the map is replaced by a single circle-marker layer that
renders **every matching listing as an individual dot**. The neighbourhood boundaries remain
visible and clickable, so the user can still narrow the scope from the map (which narrows both
the list and the dots). Hovering a card in the list emphasizes its dot on the map; hovering or
focusing a dot emphasizes its card and scrolls it into view. This ties the spatial and tabular
views together so a user can move between "where" and "which" fluidly.

**Why this priority**: The map is the primary surface of the product; a Browse list that
ignores the map would feel disconnected. The two-way hover link is what makes the list a map
companion rather than a separate page.

**Independent Test**: Hover a list card and confirm the matching dot highlights; hover a dot
and confirm the matching card highlights and scrolls into view.

**Acceptance Scenarios**:

1. **Given** the Browse lens activates, **Then** the hex layer is hidden and a dot for every
   filtered listing is shown on the map.
2. **Given** a hovered list card, **Then** the matching map dot is visually emphasized.
3. **Given** a hovered or focused map dot, **Then** the matching card is emphasized and
   scrolled into view.
4. **Given** the Browse lens, **When** the user clicks a neighbourhood boundary on the map,
   **Then** the scope narrows to that neighbourhood and the list, count, and dots update.

---

### User Story 3 - Open a listing's detail drawer (Priority: P1)

Selecting a listing — from either a list card or a map dot — opens a detail drawer that floats
over the map (a side panel on desktop, a bottom sheet over the map on mobile, with the list
still visible behind it), showing the photo placeholder, title, room type, neighbourhood,
nightly price, host (with a multi-host indicator), reviews per month, review count, minimum
nights, and the data-snapshot provenance. The selected listing is reflected in the URL, so the
drawer is shareable and restored on reload. The drawer closes on Esc, on its close control, or
when another listing is selected, restoring focus to the element that opened it.

**Why this priority**: Inspecting a single listing's detail is the natural endpoint of
browsing; it completes the renter's journey from filtered set → individual choice.

**Independent Test**: Click a card (or dot) and confirm the drawer opens with that listing's
fields; press Esc or the close control and confirm the drawer dismisses and focus returns to
the trigger.

**Acceptance Scenarios**:

1. **Given** the Browse lens, **When** a listing is selected, **Then** its detail drawer opens
   floating over the map showing that listing's fields, and the selected listing appears in the
   URL.
2. **Given** an open drawer, **When** the user presses Esc, the close control, or selects
   another listing, **Then** the drawer closes or replaces its content and focus is managed
   correctly.
3. **Given** a URL carrying a selected listing in the Browse lens, **When** the page loads,
   **Then** that listing's drawer opens.

---

### User Story 4 - Sort the list (Priority: P2)

A sort control re-orders the list by price ascending (the default), price descending, most
reviews per month, or most reviewed. Changing the sort reorders the visible list without
changing which listings match.

**Why this priority**: Sorting sharpens the list into a decision tool (cheapest first, most
proven first), but the list is usable without it — hence P2, below the core list, map link,
and detail.

**Independent Test**: Change the sort and confirm the visible order changes while the result
count (the matching set) is unchanged.

**Acceptance Scenarios**:

1. **Given** the list, **When** the user changes the sort option, **Then** the visible order
   updates and the matching set (and its count) is unchanged.

---

### Edge Cases

- When the active filters or neighbourhood scope match no listings, the lens shows an empty
  state with a summary of the active filters and a reset affordance — no list rows, no dots,
  no drawer.
- When the matching set is very large (the largest city is ≈ 62,000 listings), the list
  remains smooth to scroll and every match is reachable, and every matching listing is drawn as
  a dot on the map.
- When the currently selected listing falls out of the filter set (because a filter changed),
  its drawer closes and the selection clears (and is removed from the URL).
- When the user switches cities while in Browse, the list, dots, current selection, and sort
  reset to the newly selected city.
- When the Browse data is still loading on first activation, the list and dots show a loading
  state rather than a broken or misleadingly empty view.
- When a shared URL references a listing that does not exist in the loaded set, the lens opens
  with no drawer (selection ignored) rather than erroring.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to switch between the **Analyse** and **Browse** lenses via a
  tab control that floats over the map; Analyse is the default lens.
- **FR-002**: In the Browse lens, the system MUST replace the sidebar/sheet analysis dashboard
  with a scrollable list of listings matching the active neighbourhood scope and filters
  (price range and room type).
- **FR-003**: Each list item MUST show a photo placeholder, title, room type (with its color
  cue and a text label), neighbourhood, and nightly price; a result count of the form "N of
  total" MUST sit above the list and update live as filters change.
- **FR-004**: The list MUST allow the entire matching set to be reached by scrolling — including
  in the largest city — without degrading scroll responsiveness.
- **FR-005**: Users MUST be able to sort the list by price ascending (default), price
  descending, most reviews per month, and most reviewed.
- **FR-006**: In the Browse lens the system MUST hide the hex price layer and show every
  matching listing as an individual dot on a single circle-marker map layer; in the Analyse
  lens the dots MUST be hidden and the hex layer restored.
- **FR-007**: Hovering a list card MUST emphasize its corresponding map dot, and
  hovering/focusing a map dot MUST emphasize its corresponding card and scroll it into view.
- **FR-008**: Selecting a listing (from a card or a dot) MUST open a detail drawer — floating
  over the map as a side panel on desktop and a bottom sheet over the map on mobile, leaving the
  list visible behind it — showing the title, room type, neighbourhood, nightly price, host
  (with a multi-host indicator), reviews per month, review count, minimum nights, and the
  data-snapshot provenance. (Availability is intentionally excluded — it is not in the dataset;
  see research D3.)
- **FR-009**: The detail drawer MUST close on Esc, on its close control, or when another
  listing is selected, and MUST restore focus to the element that opened it.
- **FR-010**: Switching to the Analyse lens, switching cities, or applying a filter that
  excludes the selected listing MUST clear the current selection and hover state (and remove
  the selected listing from the URL).
- **FR-011**: The active lens AND the selected listing MUST be reflected in the URL so that a
  Browse view — including an open listing's detail — can be shared and is restored on reload,
  consistent with how filter state is already carried in the URL.
- **FR-012**: When the active scope and filters match no listings, the system MUST show an
  empty state with a summary of the active filters and a reset affordance.
- **FR-013**: In the Browse lens the neighbourhood boundaries MUST remain visible and
  selectable on the map; selecting a neighbourhood MUST narrow the list, its count, and the dots
  to that neighbourhood, and clearing it MUST return to the city-wide scope.

### Key Entities

- **Lens (view mode)**: the active analytical perspective — `analyse` or `browse`.
- **Listing (Browse detail)**: an individual rental, with identifier, title, nightly price,
  room type, neighbourhood, map location (for its dot), host name and multi-host flag, reviews
  per month, review count, availability, minimum nights, and a photo placeholder cue.
- **Listing filters**: the room-type set and price range, shared across both lenses.
- **Sort key**: the chosen ordering of the list (price ascending/descending, most
  reviews/month, most reviewed).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Switching between Analyse and Browse swaps the sidebar content in under ~150 ms,
  with no full-page reload.
- **SC-002**: In the largest city, scrolling the full filtered list stays smooth with no
  perceptible jank, and every matching listing is reachable.
- **SC-003**: Changing a filter updates the list, its count, and the map dots to the new
  matching set in under ~300 ms.
- **SC-004**: Hovering a list card highlights its map dot (and vice versa) within one frame of
  the pointer event.
- **SC-005**: Opening a shared Browse URL reopens directly in the Browse lens with the same
  filters applied — and, if the URL names a listing, with that listing's drawer open — on first
  load.
- **SC-006**: 100% of list, sort, and drawer actions are reachable and operable by keyboard, in
  both the dark and light themes, with an automated accessibility check reporting no
  violations.

## Constitutional Requirements _(mandatory for UI or state changes)_

- **CR-001**: There is a full keyboard path to the tab toggle, the sort control, every list
  item, and the drawer; the drawer traps focus while open and restores focus to its trigger on
  close.
- **CR-002**: The Browse list adapts by container size (not a device flag) to serve both the
  desktop sidebar and the mobile sheet; the detail drawer presents as an over-map side panel on
  desktop and an over-map bottom sheet on mobile from the same component; interactive targets in
  the mobile presentation are at least 44px tall.
- **CR-003**: The lens works in both the default dark theme and the light theme; lens and
  drawer transitions respect reduced-motion preferences; the result count is announced via a
  live region; and room type is never conveyed by color alone (a text label accompanies the
  color cue).
- **CR-004**: The active lens, the filters, and the selected listing live in URL/client state
  (no server reading of request-time parameters), and the Browse listing data is fetched at
  runtime on the client, preserving the app's cached-by-default server rendering.

## Assumptions

- The Browse listing data is a per-listing point set emitted by the existing data-split
  pipeline alongside the analytics tier, loaded on the client the first time Browse is
  activated (matching the existing "tier the data by view, load lazily" pattern from the
  data-architecture decision record).
- The map filters its own listing dots (one circle-marker layer, not per-listing marker
  elements) for price and room type as those filters change — the same filter state already
  drives the analysis recompute; no per-listing server round-trip is needed to open the drawer.
- Photo placeholders (no real listing imagery) are acceptable for the first version, matching
  the design prototype.
- The feature reuses the existing filter state, the listings compute engine, the neighbourhood
  scope selection, and the price/room-type filter contract — it introduces no new server data
  fetching.
- Scope is the four launch cities; the largest (London) at ≈ 62,000 listings is the
  performance target for the list and the map dots.
- The Analyse/Browse tab and the sort and drawer controls are built from the project's
  mandated shared component layer (no hand-rolled controls).
