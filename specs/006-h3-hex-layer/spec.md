# Feature Specification: Hexagonal Price Map (Default Scene View)

**Feature Branch**: `006-h3-hex-layer`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "let's specify the h3 layer, write a appropriate business user story"

## Overview

When a visitor opens a city, the scene should open on a **price map**: every short-term-rental
listing is rolled up into a grid of equal-area **hexagonal cells**, each shaded by the **typical
(median) nightly price** of the listings inside it, using the city's sequential price ramp.
Instead of a wall of tens of thousands of overlapping pins, the visitor sees, at a glance, _how
prices vary_ across the city — and, because a cell only appears where listings exist, _where_
rentals are. The grid **gets finer as the visitor zooms in** — a coarse city-wide overview
resolves into neighbourhood-level texture — and it **reacts to the active filters** so the picture
always reflects the segment the visitor cares about. This view is the lightweight first impression
of a city, shown before a visitor chooses to browse individual listings.

## Clarifications

### Session 2026-06-02

- Q: What metric shades the hexagons (count vs. price vs. toggle)? → A: Median price, mapped onto
  the city's sequential price ramp (resolved from the design prototype's aggregated price layer).
  Listing count is shown only on per-cell inspect, not encoded by color.
- Q: Which price statistic represents a cell? → A: Median (consistent with the prototype's "Median"
  cell readout and the app's locked "median, not mean" price decision).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See how prices vary across the city, at a glance (Priority: P1)

A market explorer opens a city and immediately sees a hexagonal price map of the whole city.
Each hex is shaded along the city's price ramp by the median nightly price inside it, so pricier
pockets stand out from cheaper ones; areas with no listings show no hex. Within seconds, and
without zooming or clicking, they can point to the priciest and cheapest parts of the city.

**Why this priority**: This is the feature's core value and the default entry experience. A single
glance answers "how do nightly prices vary across this city, and where are the listings?" — the
question that motivates everything else. It stands alone as a shippable, demonstrable MVP even with
no zoom refinement or filtering.

**Independent Test**: Open each launch city; confirm a hexagonal price map renders on first view
(no interaction), pricier cells are visually distinguishable from cheaper cells along the ramp, and
an on-screen legend maps the ramp colors to price ranges.

**Acceptance Scenarios**:

1. **Given** a visitor opens a city scene, **When** the scene finishes loading, **Then** a
   hexagonal price map of that city is shown by default with a legend mapping the ramp to prices.
2. **Given** the price map is shown, **When** the visitor compares two areas, **Then** the area
   whose listings have a higher median price is shaded toward the higher end of the ramp.
3. **Given** an area of the city has no listings, **When** the map is shown, **Then** that area
   has no hex (or a clearly "empty" appearance), not a misleading filled cell.

---

### User Story 2 - Zoom from city overview to neighbourhood texture (Priority: P2)

The explorer zooms into a part of the city. As they zoom, the hexagons subdivide into smaller
cells, revealing finer price patterns within a district that looked uniform at the city-wide zoom.
Zooming back out re-coarsens the grid into a clean overview.

**Why this priority**: A single fixed cell size is either too coarse to be useful up close or too
fine to read from afar. Zoom-adaptive detail is what makes the price map usable across the whole
range of exploration, but the P1 overview already delivers value without it.

**Independent Test**: From a city-wide view, zoom in stepwise and confirm the hexes become smaller
and reveal more spatial price detail at closer zooms, then re-coarsen on zoom-out — with the map
staying readable and responsive throughout.

**Acceptance Scenarios**:

1. **Given** the city-wide price map, **When** the visitor zooms in, **Then** the hexagons become
   smaller and resolve finer price detail within the visible area.
2. **Given** a zoomed-in view, **When** the visitor zooms back out, **Then** the grid returns to a
   coarser overview without leaving stale or mismatched cells behind.
3. **Given** the visitor reaches the closest supported zoom, **When** they continue, **Then** the
   grid holds at its finest supported cell size rather than degrading or disappearing.

---

### User Story 3 - Prices reflect my active filters (Priority: P2)

The explorer narrows the view with the existing filters (e.g. a price band, a room type). The
hexagonal price map recomputes each cell's median over only the matching listings, so the price
pattern they see is for the segment they selected — not the whole market.

**Why this priority**: Without filter reactivity the price map and the rest of the scene would tell
two different stories about "the current set." Keeping them consistent is essential to trust, but
the unfiltered overview (P1) is still independently valuable.

**Independent Test**: Apply a filter that excludes a large share of listings and confirm the hex
shading recolours (and empties where no listings match), then returns to the full picture when the
filter is removed.

**Acceptance Scenarios**:

1. **Given** the price map is shown, **When** the visitor applies a price or room-type filter,
   **Then** each hex recolours to the median price of only the listings matching the filter.
2. **Given** a filter is active, **When** the visitor clears it, **Then** the price map returns to
   representing the full set of listings.
3. **Given** a filter excludes every listing in an area, **When** it is applied, **Then** that
   area's hexes disappear or read as empty.

---

### User Story 4 - Inspect a single hex's numbers (Priority: P3)

The explorer hovers (on desktop) or taps (on touch) a hexagon to see the exact figures behind the
shade for that cell — its **median nightly price** and **how many listings** it contains.

**Why this priority**: Turns the qualitative price impression into concrete numbers for a spot of
interest. Valuable, but the visual price story (P1–P3) works without per-cell readouts.

**Independent Test**: Hover/tap several hexes and confirm each shows a small readout with the
cell's median price and listing count, and that it dismisses cleanly.

**Acceptance Scenarios**:

1. **Given** the price map, **When** the visitor hovers or taps a hexagon, **Then** a concise
   readout shows that cell's median price and listing count.
2. **Given** a readout is open, **When** the visitor moves away or taps elsewhere, **Then** the
   readout dismisses.

---

### Edge Cases

- **Very few listings**: a city (or a heavily filtered set) with very few listings still renders a
  legible, non-misleading map rather than a single giant or invisible cell.
- **No matching listings**: when a filter excludes everything, the map shows an explicit empty
  state, not a blank ambiguous canvas.
- **Listings outside any known area**: listings that fall outside the city's mapped boundaries are
  still placed into the grid (they have a location) and not silently dropped.
- **Rapid interaction**: fast successive zoom or filter changes settle on the correct final state
  without flicker or a stuck intermediate grid.
- **Theme switch**: toggling between the dark and light base map keeps the price ramp legible and
  the legend accurate (the ramp has a dark and a light variant).
- **Single-listing cell**: a cell containing one listing shows that listing's price as the median,
  shaded normally.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST present a hexagonal price map of the city's listings as the default
  visualization when a city scene opens, without requiring any visitor interaction.
- **FR-002**: The system MUST aggregate listings into equal-area hexagonal cells and shade each
  cell by the **median nightly price** of the listings inside it, using the city's sequential price
  ramp.
- **FR-003**: The system MUST display a legend that maps the price ramp to price ranges and is
  legible in both themes.
- **FR-004**: The system MUST make hexagon size responsive to zoom — coarser when zoomed out, finer
  when zoomed in — across the scene's supported zoom range.
- **FR-005**: The system MUST cap cell refinement at a defined finest level and a defined coarsest
  level, holding steady beyond those bounds rather than failing.
- **FR-006**: The system MUST recompute the map against the active filters (price range, room type)
  so each cell's median reflects only matching listings.
- **FR-007**: The system MUST represent areas with no (matching) listings as empty rather than as
  filled cells.
- **FR-008**: Visitors MUST be able to inspect an individual hexagon to see its median price and
  listing count.
- **FR-009**: The system MUST keep the price map consistent with the rest of the scene's current
  filtered set, so the map and the summary figures never disagree about "the current listings."
- **FR-010**: The system MUST render legibly over both the dark (default) and light base maps.
- **FR-011**: The price map MUST remain readable and responsive for the largest launch city (tens
  of thousands of listings).

### Key Entities _(include if feature involves data)_

- **Listing**: an individual short-term rental with a location, a price, and a room type; the unit
  being aggregated. (Existing.)
- **Hex cell**: an equal-area hexagonal area of the map at a given level of detail; carries the
  **median price** (which drives its color) and the **listing count** (shown on inspect), for the
  current filtered set.
- **Detail level**: the granularity of the grid for a given zoom — coarser levels cover larger
  areas, finer levels smaller ones; bounded by a coarsest and a finest supported level.
- **Price ramp**: the city's sequential color scale spanning its price range, with a dark-theme and
  a light-theme variant; maps a cell's median price to a color. (Existing.)
- **Filter state**: the visitor's active price range and room-type selection, which determines
  which listings are aggregated into the cells. (Existing.)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On opening any launch city, the price map is visible within 2 seconds on a typical
  broadband connection.
- **SC-002**: A first-time viewer can correctly identify the city's most expensive area within 10
  seconds of the map appearing, with no instruction.
- **SC-003**: Zooming in or out updates the grid to the appropriate level of detail within 200 ms
  of the zoom settling, with no visible stale cells.
- **SC-004**: Applying or clearing a filter updates the price map within 300 ms.
- **SC-005**: The experience holds for the largest launch city (tens of thousands of listings) with
  no perceptible lag during zoom or filtering.
- **SC-006**: The price ramp and legend remain legible (meet contrast expectations) in both the
  dark and light themes.
- **SC-007**: The price map and the scene's summary figures report the same listing total for any
  given filter state (zero discrepancy).

## Constitutional Requirements _(mandatory for UI or state changes)_

- **CR-001**: Any price-map controls (e.g. a hex inspect affordance or legend toggle, if present)
  are keyboard-operable with a visible focus indicator; the map itself remains keyboard pannable
  and zoomable.
- **CR-002**: The price map and its legend reflow correctly across desktop and mobile layouts and
  remain usable on touch (tap to inspect a cell).
- **CR-003**: The price ramp is legible in both themes, color choices meet contrast expectations,
  and grid/zoom transitions respect a reduced-motion preference (no essential information conveyed
  only through animation; price is also available numerically on inspect).
- **CR-004**: The price map honors the scene's existing shared filter state (including any
  URL-encoded filter state) so a shared link reproduces the same filtered view.

## Assumptions

- **The cell metric is median nightly price** (resolved in Clarifications). Color encodes price;
  listing count is surfaced only on per-cell inspect. A visitor-facing toggle to recolour by count
  is out of scope for this feature.
- **Cell color uses the existing city price ramp** (the sequential `price` scale already defined
  for the scene, with dark/light variants); this feature does not introduce a new color system.
- **The hex price map is the default scene visualization**, distinct from the existing
  neighbourhood outline/choropleth and the individual-listing Browse view; switching between those
  views is governed by existing scene navigation and is out of scope here.
- **Filtering is limited to the existing price-range and room-type filters**; no new filter types
  are introduced by this feature.
- **The grid spans a small, fixed set of detail levels** mapped to the scene's zoom range, with a
  defined coarsest and finest level; the finest level is bounded by the precision of listing
  locations already available.
- **Listing locations and prices are already known** for every listing; this feature only
  aggregates and visualizes them and does not change how listings are sourced.
- **All four launch cities are in scope**, including the largest by listing count.
