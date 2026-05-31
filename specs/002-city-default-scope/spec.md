# Feature Specification: City Establishes the Default Analysis Scope

**Feature Branch**: `002-city-default-scope`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "City establishes the default analysis scope. As Maya, I want the chosen city to become the default scope for everything, so that all analytics describe that city until I narrow further. Acceptance criteria: On /[city], scope = whole city; the scene (map + sidebar) renders against city scope. Scope label reads the city name and total count (ties to E1-S3). An unknown or unsupported /[city] slug renders a graceful not-found that routes back to the picker (no crash, no blank map)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - City Is the Default Scope (Priority: P1)

After choosing a city in the picker, Maya lands on that city's route and the whole experience is already scoped to that city. Everything she sees — the scene layout and the scope label — describes the entire city, with no further configuration, so she has an honest city-wide baseline before she decides to narrow further.

**Why this priority**: This is the bridge between picking a city and analysing it. Without a defined default scope, every downstream analytics surface (neighbourhood drill-down, filters, KPI header) has no baseline to recompute from. It establishes the single foundational concept — "the current scope is the whole city" — that the rest of the product narrows against.

**Independent Test**: Navigate to a supported city route (e.g. `/london`), confirm the scene renders the map region and sidebar region against the city, and confirm the scope label names that city. Delivers value as the verifiable city-wide starting state.

**Acceptance Scenarios**:

1. **Given** Maya selects a supported city in the picker, **When** she arrives at `/[city]`, **Then** the active analysis scope is the whole city (not a neighbourhood or filtered subset).
2. **Given** Maya is on a supported `/[city]` route, **When** the page loads, **Then** the scene presents both a map region and a sidebar region rendered against the city scope, with no blank or missing region.
3. **Given** Maya has not narrowed the scope, **When** she reads the scene, **Then** every scope-dependent surface present in this story describes the whole city rather than any narrower selection.

---

### User Story 2 - Scope Label Names the City and Its Total (Priority: P2)

While viewing a city, Maya can read a scope label that tells her exactly what the current numbers describe: the city name and the city's total listing count. This anchors her trust that the figures are city-wide and tied to the dated snapshot, and it gives the later scope-label story (E1-S3) a working baseline to build on.

**Why this priority**: The label is how Maya knows what scope she is looking at. It is the user-visible proof that "scope = whole city" and the reference point she will watch change when she later narrows scope. It depends on Story 1's scope being established.

**Independent Test**: Load a supported city route and confirm the scope label shows the city's name and its formatted total listing count drawn from the city data.

**Acceptance Scenarios**:

1. **Given** Maya is on `/[city]` with city scope active, **When** she reads the scope label, **Then** it shows the city's name.
2. **Given** Maya is on `/[city]` with city scope active, **When** she reads the scope label, **Then** it shows the city's total listing count in a human-readable, grouped format.
3. **Given** two cities with different totals, **When** Maya visits each route, **Then** each scope label reflects that city's own name and total, sourced from the city data and not hard-coded.

---

### User Story 3 - Graceful Not-Found Routes Back to the Picker (Priority: P3)

When Maya (or a shared/stale link) lands on a `/[city]` slug that is not a supported city, she sees a clear, on-brand not-found state instead of a crash, an error, or a blank map — and from there she has an obvious, keyboard-accessible way back to the city picker to choose a supported city.

**Why this priority**: This protects the entry experience from broken or outdated deep links. It is lower priority than establishing the scope itself, but it is required for the route to behave safely for every possible slug. It builds on Story 1's notion of "supported cities".

**Independent Test**: Navigate to a slug that is not in the supported city set (e.g. `/atlantis`) and confirm a graceful not-found view appears with a working, keyboard-accessible control that returns to the picker at `/`.

**Acceptance Scenarios**:

1. **Given** Maya navigates to a `/[city]` slug that is not a supported city, **When** the page resolves, **Then** she sees a graceful not-found view rather than a crash, raw error, or blank map.
2. **Given** the not-found view is shown, **When** Maya looks for a way forward, **Then** there is a clearly labelled action that returns her to the city picker at `/`.
3. **Given** the not-found view is shown, **When** Maya uses only a keyboard, **Then** she can reach and activate the back-to-picker action with a visible focus indicator.
4. **Given** Maya activates the back-to-picker action, **When** it completes, **Then** she is on the picker at `/` and can select a supported city.

### Edge Cases

- A slug that differs from a supported slug only by case or surrounding whitespace (e.g. `/London`, `/london%20`) is treated as not-found rather than silently matched, unless it exactly matches a supported slug.
- A slug that is empty or that targets the root resolves to the picker, not the city scene.
- A supported city whose total listing count is present but unusually small still renders a valid scope label with that count (no special-casing in this story).
- The not-found view must not attempt to render any city scene region (no map region, no sidebar populated with another city's data).
- The not-found action returns to the picker without leaving the user stranded on a dead route (e.g. via browser back returning to the same broken slug).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: On a supported `/[city]` route, the system MUST set the active analysis scope to the whole city by default, without requiring any user configuration.
- **FR-002**: The set of supported cities MUST be derived from the city data source (the same source the picker uses), not from a separate hard-coded list, so the route and the picker cannot drift apart.
- **FR-003**: On a supported `/[city]` route, the scene MUST render both a map region and a sidebar region, each presented against the active city scope.
- **FR-004**: All scope-dependent content shown in this story MUST describe the whole city while no narrower scope is selected.
- **FR-005**: The system MUST display a scope label that shows the active city's name.
- **FR-006**: The scope label MUST display the city's total listing count, sourced from the city data, formatted as a grouped, human-readable number.
- **FR-007**: The scope label's city name and total count MUST be read from the city data for the active slug and MUST NOT be hard-coded per city.
- **FR-008**: When a `/[city]` slug does not match a supported city, the system MUST render a graceful not-found view instead of crashing, surfacing a raw error, or showing a blank map.
- **FR-009**: The not-found view MUST provide a clearly labelled, keyboard-accessible action that returns the user to the city picker at `/`.
- **FR-010**: Slug matching MUST treat only exact matches to a supported city slug as valid; non-matching slugs (including case or whitespace variants that do not exactly match) MUST resolve to the not-found view.
- **FR-011**: The not-found view MUST NOT render the city scene regions or any other city's scoped content.

### Key Entities _(include if feature involves data)_

- **Analysis Scope**: The current lens that all analytics describe. In this story its only state is "whole city"; it is the baseline that later stories narrow (e.g. to a neighbourhood).
- **Supported City**: A city present in the city data source, identified by a stable human-readable slug, carrying at least a display name and a total listing count.
- **Scope Label**: A user-visible summary of the active scope, composed of the city name and the city's total listing count.
- **Scene**: The city analysis surface composed of a map region and a sidebar region; in this story it is the city-scoped shell that later epics populate with the interactive map and analytics.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From the picker, selecting any supported city lands Maya on a city-scoped scene in a single navigation, with no configuration step in between.
- **SC-002**: On every supported city route, the scope label correctly names that city and shows its total listing count matching the city data, for 100% of supported cities.
- **SC-003**: Every unsupported slug produces the graceful not-found view — zero crashes, raw errors, or blank maps across a sample of invalid slugs.
- **SC-004**: From the not-found view, a user reaches the picker in one action, using either pointer or keyboard alone.
- **SC-005**: A reviewer can confirm, without reading code, that the displayed figures describe the whole city (the scope label states the city and its total).

## Constitutional Requirements _(mandatory for UI or state changes)_

- **CR-001**: The not-found view's back-to-picker action MUST be keyboard reachable and activatable with a visible focus indicator.
- **CR-002**: The city scene shell (map region + sidebar region) and the not-found view MUST render correctly across desktop and mobile layouts without hiding the scope label or the back-to-picker action.
- **CR-003**: The scope label and not-found view MUST preserve dark and light theme readability and meaningful accessible names; the scope label's total count is a meaningful figure and MUST be conveyed as understandable text.
- **CR-004**: The active scope MUST be derived from the URL slug so the city scene is reload-safe and shareable, and the supported-city set MUST stay data-backed so routes do not drift from the picker.

## Assumptions

- This is story E1-S2. The "scene" delivered here is the city-scoped shell — a map region and a sidebar region wired to city scope — not the interactive priced-pin map or the analytics charts, which belong to later epics (E4–E7). _(Confirmed with stakeholder.)_
- "Total count" in the scope label means the city's total listing count (the `listingCount` figure carried per city in the data), formatted with digit grouping. _(Confirmed with stakeholder.)_
- The not-found behaviour is a rendered graceful not-found view with an explicit, keyboard-accessible action back to the picker — not an automatic redirect. _(Confirmed with stakeholder.)_
- The city data source of truth is the project data directory used by the picker (city index plus per-city datasets), so "supported cities" are exactly the cities the picker offers: Manchester, London, Berlin, and Amsterdam at launch.
- The city route is the root-level slug route (e.g. `/london`), consistent with the curated city picker story (001).
- The full scope model already distinguishes city scope from narrower scopes; this story exercises only the city-scope default and leaves narrowing to later stories.
- The provided design direction for the scene and not-found state is the visual target, applied through the project's component and token rules rather than copied implementation.
