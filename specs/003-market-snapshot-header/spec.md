# Feature Specification: Market Title + Honest Snapshot Label

**Feature Branch**: `003-market-snapshot-header`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "E1-S3 — Market title + honest snapshot label. As Maya, I want the city title, total listing count, and the data's snapshot date shown together, so that I read every number knowing exactly what point in time it represents. Acceptance criteria: Header shows market title, total listing count for current scope, and a snapshot label in the form Data: [Month] [Year] snapshot. The label never uses 'live', 'current', 'real-time', or present-tense framing. Count reflects active filters/scope (so it stays truthful as the view changes). Snapshot date is sourced from the data contract per city (not hard-coded in the UI)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Title, Count, and Snapshot Read as One Header (Priority: P1)

When Maya opens a city, the market title, the total listing count for what she is looking at, and the data's snapshot date all appear together as a single header. She never reads a number in isolation — the count and the snapshot date sit side by side, so she immediately understands that every figure below describes that city at that one point in time.

**Why this priority**: This is the whole point of the story: pairing the numbers with the date they belong to. Without the three elements shown together, a reader can mistake a dated snapshot figure for a live number. This header is the trust anchor the rest of the analytics surfaces (KPIs, charts, drill-downs) rely on, and it consolidates the placeholder scope label shipped in E1-S2 into the honest header those epics build on.

**Independent Test**: Navigate to a supported city route (e.g. `/london`) and confirm the header shows the city's market title, its total listing count, and a snapshot label together in one place, with no separate or duplicated count elsewhere in the scene.

**Acceptance Scenarios**:

1. **Given** Maya is on a supported `/[city]` route, **When** the page loads, **Then** the header presents the market title, the total listing count, and a snapshot label together as one group.
2. **Given** Maya reads the header, **When** she looks at the count, **Then** the snapshot date is visible alongside it so she can tell what point in time the count describes.
3. **Given** the header is shown, **When** Maya scans the rest of the scene, **Then** the active scope's count appears only in the header and is not duplicated in a separate scope label.

---

### User Story 2 - The Snapshot Label Is Honest and Per-City (Priority: P2)

The snapshot label tells Maya, in plain dated language, that she is looking at a past snapshot — never that the data is live, current, or real-time. The date it shows is the city's own snapshot date, read from the shared data contract, so two different cities can show two different dates and neither is invented in the interface.

**Why this priority**: Honesty about timeliness is the product's core promise ("built on dated public snapshots"). A label that implied live data — or that hard-coded one date across all cities — would break that promise. This depends on Story 1's header existing to host the label.

**Independent Test**: Load a supported city route and confirm the snapshot label reads in the form "Data: [snapshot] snapshot", contains none of the words "live", "current", or "real-time" and no present-tense "is/are now" framing, and that its date matches the city's snapshot value in the data contract.

**Acceptance Scenarios**:

1. **Given** Maya is on `/[city]`, **When** she reads the snapshot label, **Then** it is phrased as a dated, past snapshot in the form "Data: [snapshot] snapshot".
2. **Given** the snapshot label is shown, **When** its wording is inspected, **Then** it contains none of "live", "current", "real-time", and no present-tense framing that implies the data is up to the moment.
3. **Given** two cities whose data contract carries snapshot values, **When** Maya visits each route, **Then** each header shows that city's own snapshot date sourced from the contract, not a value hard-coded in the interface.

---

### User Story 3 - The Count Stays Truthful as the View Narrows (Priority: P3)

The count in the header describes the active scope, not a fixed city total baked into the page. Today the active scope is the whole city, so the header shows the city total; but because the count is derived from whatever scope is active, it will keep telling the truth when later epics let Maya narrow to a neighbourhood or apply filters.

**Why this priority**: This protects the header from becoming a lie the moment the product gains narrowing and filtering. It is lower priority because no narrowing UI exists yet in this story, but wiring the count to the active scope now is what keeps it honest later. It builds on Story 1's header.

**Independent Test**: Confirm the header's count equals the active scope's computed listing count (today the whole-city total) and is demonstrably derived from the scope's aggregates rather than a hard-coded literal, so a change of scope would change the count.

**Acceptance Scenarios**:

1. **Given** Maya is on `/[city]` with the whole city as the active scope, **When** she reads the header count, **Then** it equals the city's total listing count from the data.
2. **Given** the header count is shown, **When** its source is examined, **Then** the count is taken from the active scope's aggregates, not a constant fixed per city in the interface.
3. **Given** the active scope were to narrow (a capability delivered in a later epic), **When** the scope changes, **Then** the header count would reflect the narrower scope's count without any change to the header itself.

### Edge Cases

- A city whose stored snapshot value carries surrounding whitespace (e.g. `" 9/2025"`) still renders cleanly as "Data: 9/2025 snapshot" with no doubled or leading spaces.
- A supported city with an unusually small total still renders a valid, grouped count in the header (no special-casing, no suppression).
- Two cities with the same snapshot date both display it correctly; the display must not assume the dates differ, and must not assume they are the same.
- The header count must never be a literal copied per city into the interface; if the underlying scope total changes in the data, the displayed count changes with it.
- The snapshot label must remain honest and readable in both light and dark themes and across desktop and mobile widths, never truncated to the point of dropping the date.
- When the active scope is the whole city (the only scope in this story), the count is the city total; the header makes no claim that it is a filtered or live figure.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The city scene MUST present a header that shows three elements together: the market title, the total listing count for the active scope, and a snapshot label.
- **FR-002**: The market title MUST be the active city's name, sourced from the city data for the current slug, and MUST NOT be hard-coded per city in the interface.
- **FR-003**: The header MUST display the total listing count for the active scope, formatted as a grouped, human-readable number consistent with the existing count formatting.
- **FR-004**: The displayed count MUST be derived from the active scope's aggregates, not a constant fixed per city, so it reflects the active scope and remains truthful when scope narrowing or filtering is introduced in later epics.
- **FR-005**: The header MUST display a snapshot label in the form "Data: {snapshot} snapshot", where {snapshot} is the city's snapshot value taken from the data contract and rendered with any surrounding whitespace trimmed.
- **FR-006**: The snapshot value MUST be sourced from the per-city field in the shared data contract, MUST NOT be hard-coded in the interface, and each city MUST show its own snapshot value.
- **FR-007**: The snapshot label MUST NOT contain the words "live", "current", or "real-time", and MUST NOT use present-tense framing that implies the data is up to the moment; it MUST frame the data as a past, dated snapshot.
- **FR-008**: The title, count, and snapshot label MUST be grouped together as a single header so that a reader sees each number alongside the snapshot date it describes.
- **FR-009**: The header MUST be the single place the active scope's title and count are shown in the scene; the standalone scope label shipped in E1-S2 MUST be consolidated into this header so the count is not duplicated and cannot drift.
- **FR-010**: The header MUST render for every supported city route, using that city's own title, count, and snapshot value.
- **FR-011**: Changing a city's snapshot value in the data contract MUST change what the header displays for that city with no change to interface code.

### Key Entities _(include if feature involves data)_

- **Market Header**: The user-visible grouping at the top of the city scene that carries the market title, the active scope's listing count, and the snapshot label together. Consolidates the E1-S2 scope label.
- **Market Title**: The active city's display name, read from the city data for the current slug.
- **Snapshot Label**: A dated, past-tense statement of when the data was captured, of the form "Data: {snapshot} snapshot", where {snapshot} is the city's contract-sourced snapshot value.
- **Active Scope Count**: The total listing count for the currently active analysis scope, derived from that scope's aggregates. In this story the active scope is always the whole city, so the count is the city total.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On 100% of supported city routes, the header shows the city's market title, the active scope's total listing count, and a snapshot label, all visible together in one group.
- **SC-002**: Across all supported cities, the snapshot label contains zero occurrences of "live", "current", or "real-time", and zero present-tense "is/are now"-style framing.
- **SC-003**: A reviewer can confirm, without reading code, that every header number is read alongside its snapshot date because the date sits within the same header group as the title and count.
- **SC-004**: Each supported city's displayed snapshot date matches that city's value in the data contract for 100% of cities, and editing that value changes the display without any interface code change.
- **SC-005**: The header count equals the active scope's computed listing count (today the whole-city total) for 100% of supported cities and is demonstrably derived rather than a per-city literal.
- **SC-006**: The active scope's count appears in exactly one place in the scene (the header), with no duplicate count surface remaining from E1-S2.

## Constitutional Requirements _(mandatory for UI or state changes)_

- **CR-001**: The header is non-interactive text and MUST NOT trap keyboard focus or insert spurious tab stops; any interactive element later added to it MUST be keyboard reachable with a visible focus indicator.
- **CR-002**: The header MUST reflow across desktop and mobile layouts without hiding or fully truncating the market title, the count, or the snapshot label.
- **CR-003**: The header MUST preserve readability and sufficient contrast in both light and dark themes; the count and the snapshot date MUST be conveyed as understandable text, and the count MUST update through a polite live region so later scope changes announce without re-plumbing.
- **CR-004**: The header MUST derive from the URL slug and the data contract so it is reload-safe and shareable, and the snapshot value MUST stay data-backed so the displayed date cannot drift from the contract.

## Assumptions

- This is story E1-S3 and builds directly on the E1-S2 city scene. The new header consolidates and replaces the standalone E1-S2 sidebar scope label (city name · count), so the active scope's title and count live in one place. _(Confirmed with stakeholder.)_
- The snapshot label renders the stored snapshot value as-is (numeric month/year, e.g. "9/2025"), trimmed of surrounding whitespace, in the form "Data: 9/2025 snapshot"; the month is not spelled out. _(Confirmed with stakeholder.)_
- The market title is the city name only (e.g. "London"); country and market-frame text are not part of the title. _(Confirmed with stakeholder.)_
- "Total listing count for current scope" resolves to the whole-city total in this story because neighbourhood narrowing and filters are later epics (E4/E7). This story wires the count to the active scope's aggregates so it stays truthful when those land, but does not itself implement narrowing or filtering.
- The per-city snapshot value is a required field already present in the shared data contract (carried on both the city index and the per-city dataset) and is assumed always present for supported cities.
- Count formatting uses the same grouped, locale-based formatting established in E1-S2 (e.g. "61,963 listings").
- The provided design direction is the visual target, applied through the project's component and token rules rather than copied implementation.
