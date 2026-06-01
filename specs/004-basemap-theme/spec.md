# Feature Specification: Themed Base Map (Dark-Default, Light Option)

**Feature Branch**: `004-basemap-theme`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "As Maya, I want a clean dark map by default and a light option, so that the data layers read clearly and I can switch for my environment. Acceptance criteria: Dark base style renders by default; light style available via the app theme control. Base map carries no distracting POI clutter that competes with data layers. Theme switch swaps base style and all overlays/legends without a full reload."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Dark base map reads clearly by default (Priority: P1)

Maya opens a city scene and the map region presents a calm, low-contrast **dark** base map. The base map recedes visually so that any data placed on top of it (priced pins, neighborhood shading, legends) is what draws her eye. Nothing on the base map competes for attention.

**Why this priority**: The whole reason Maya wants control over the base map is so the _data_ reads clearly. A dark, quiet default is the single most valuable slice: it establishes the legible canvas that every later data layer depends on. Delivered alone, it already changes the experience from a generic gray placeholder to a purposeful analytics canvas.

**Independent Test**: Load any supported city with no theme preference set and confirm the map region renders the dark base style with muted land/water/road treatment and restrained labeling — verifiable purely by viewing the default scene.

**Acceptance Scenarios**:

1. **Given** a first-time visitor with no stored theme preference, **When** the city scene loads, **Then** the base map renders in the dark style by default.
2. **Given** the dark base map is shown, **When** Maya looks at the map region, **Then** land, water, and road treatments are low-contrast and subordinate to the foreground, leaving visual headroom for data layers.
3. **Given** the dark base map is shown, **When** the page is reloaded or its URL is shared and reopened, **Then** the dark default (or the visitor's chosen theme) renders consistently without a flash of the wrong style.

---

### User Story 2 - Switch to a light base map for the environment (Priority: P2)

Maya is in a bright room and the dark map is harder to read, so she uses the app's theme control to switch to a **light** base map. The base map restyles to a light, equally clutter-free canvas, and her choice persists as she moves between cities and across sessions.

**Why this priority**: The light option is the second half of the stated need ("switch for my environment"), but it is only meaningful once the dark default canvas exists. It broadens reach (lighting conditions, personal preference, accessibility) without being required for the core legibility win.

**Independent Test**: From the default dark scene, activate the app theme control to choose light, and confirm the base map adopts the light style and stays light on navigation and reload — verifiable through the theme control alone.

**Acceptance Scenarios**:

1. **Given** the dark base map is shown, **When** Maya selects the light option from the app theme control, **Then** the base map restyles to the light variant.
2. **Given** Maya has chosen the light style, **When** she navigates to a different city or returns in a later session, **Then** the light style is retained as her preference.
3. **Given** either style is active, **When** Maya reads the base map, **Then** the light and dark variants are each clutter-free and keep the base map subordinate to data layers.

---

### User Story 3 - Theme switch restyles base and overlays together, in place (Priority: P2)

When Maya toggles the theme, the base map style **and** every map-associated overlay and legend update together, instantly, with no full-page reload, map re-initialization, or jarring flash. The scene stays put — same city, same view — only the styling changes.

**Why this priority**: A coherent, in-place switch is what makes the control feel trustworthy rather than disruptive. It is tied with the light option because a switch that requires a reload, or that leaves overlays/legends mismatched against the new base, would undermine the feature's value.

**Independent Test**: Toggle the theme while observing the map region and any visible legend, and confirm both update in the same interaction with no reload and no period where overlays/legends use the previous theme's styling — verifiable by watching a single toggle.

**Acceptance Scenarios**:

1. **Given** the city scene is open, **When** Maya toggles the theme, **Then** the base map style updates without a full-page reload.
2. **Given** overlays and/or legends are present on or beside the map, **When** Maya toggles the theme, **Then** those overlays and legends restyle in the same interaction so none are left in the previous theme's styling.
3. **Given** Maya toggles the theme, **When** the switch completes, **Then** the map keeps its current city and framing — only styling changes, not the data shown.

---

### Edge Cases

- **No stored preference**: A visitor who has never chosen a theme MUST get the dark default (not a system-derived or random style).
- **Stored "light" preference on first paint**: When a returning light-mode visitor loads a scene, the base map MUST paint light immediately, with no visible flash of dark first.
- **Reduced motion**: If any transition is applied during the style swap, it MUST respect `prefers-reduced-motion` and degrade to an immediate, motion-free change.
- **Style assets unavailable**: If the resources needed to render the base map cannot load, the map region MUST degrade to a quiet, theme-appropriate placeholder (never a blank or broken region) so the scene is never empty.
- **Theme toggled with no overlays yet present**: Toggling before any data overlays/legends exist MUST still correctly restyle the base map (the overlay-coherence rule applies to whatever is present at switch time).
- **Contrast at the extremes**: Both styles MUST preserve legible contrast for base-map labels and for the data layers drawn on top, in both themes.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST render a **dark** base map style by default for visitors with no stored theme preference.
- **FR-002**: The system MUST offer a **light** base map style selectable through the existing app theme control.
- **FR-003**: The base map MUST present a clutter-free canvas — it MUST NOT show distracting points-of-interest (business/POI markers, icon clutter, promotional labels) that compete with data layers.
- **FR-004**: The base map MUST be visually subordinate to foreground data layers in both styles, using restrained, low-emphasis treatment for land, water, roads, and labels.
- **FR-005**: When the theme is switched, the system MUST update the base map style **without a full-page reload** and without re-initializing the scene's data or framing.
- **FR-006**: When the theme is switched, the system MUST restyle all map-associated overlays and legends **together with** the base map, so no overlay or legend is left in the prior theme's styling.
- **FR-007**: The selected theme MUST persist across navigation between cities and across sessions (consistent with the app's existing theme persistence).
- **FR-008**: The default and the persisted choice MUST render consistently on reload and when a scene URL is shared, with no flash of the incorrect style on first paint.
- **FR-009**: Both base map styles MUST meet WCAG 2.1 AA contrast for base-map labels and MUST preserve legibility of data layers drawn on top, in both themes.
- **FR-010**: Any visual transition applied during the style swap MUST respect `prefers-reduced-motion`.
- **FR-011**: If base-map style resources fail to load, the map region MUST present a quiet, theme-appropriate fallback rather than a blank or broken region.
- **FR-012**: The base map styling MUST be defined so that current and future map overlays/legends inherit theme-correct styling automatically when the theme changes. This feature MUST ship at least one concrete, theme-aware overlay or legend on/beside the map so the coherent in-place switch (FR-006) is demonstrable end-to-end today, even though the full interactive data layers are deferred to a later epic (E4/E5).

### Scope & Rendering

- **FR-013**: This feature MUST render an actual, visible themed base map now — a real dark/light map canvas in the map region — replacing the current non-interactive placeholder. Full interactive behaviors (zoom/pan, priced pins, neighborhood selection) remain deferred to E4/E5; this feature delivers the legible, themed canvas they will build on.
- **FR-014**: The base map MUST present recognizable street-level geography for the active city (streets, water, land, place context) using a restrained, low-emphasis treatment, sourced from a **free, no-API-key map provider**. Resolved in planning: the base map is rendered from **OpenFreeMap** vector tiles, using the ready-made **dark** style as the dark default and the **positron** (POI-removed) style as the light option; the theme control swaps between the two styles in place.
- **FR-015**: The map MUST display the provider's required attribution (OpenFreeMap / OpenMapTiles / OpenStreetMap) in a visible, legible form, and that attribution MUST remain readable (WCAG 2.1 AA) in both the dark and light styles.

### Key Entities _(include if feature involves data)_

- **Base Map Style**: A named visual treatment of the base map canvas (dark, light). Defines the appearance of land, water, roads, neighborhood boundaries, and base labels, and the deliberate absence of POI clutter. Two variants exist and map one-to-one onto the app's theme.
- **Theme Preference**: The visitor's selected or default theme (dark by default), persisted by the app and shared by app chrome and the base map so a single choice drives both.
- **Map Overlay / Legend**: Theme-aware visual elements layered on or beside the base map (e.g., data shading, pins, legends) that must restyle in lockstep with the base map on a theme switch. At least one concrete instance ships in this feature to demonstrate the coherent switch (see FR-012); the full set of interactive data overlays is deferred to E4/E5.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of first-time visitors (no stored preference) see the dark base map on initial load.
- **SC-002**: A visitor can switch between dark and light base maps using a single app theme control, with the base map restyled within one interaction (no additional steps, no page reload).
- **SC-003**: On a theme switch, 100% of visible map overlays and legends match the newly selected theme immediately after the switch — none remain in the prior theme's styling.
- **SC-004**: On reload or shared-URL open, the rendered base map matches the visitor's persisted preference (or the dark default) with no observable flash of the wrong style.
- **SC-005**: Both base map styles pass WCAG 2.1 AA contrast checks for base-map labels, and data-layer sample elements remain distinguishable against the base in both styles.
- **SC-006**: In a quick review, evaluators confirm neither base map style shows POI/business markers or icon clutter that competes with foreground data.
- **SC-007**: The theme switch completes with no full-page reload and no loss of the current city or map framing in 100% of trials.

## Constitutional Requirements _(mandatory for UI or state changes)_

- **CR-001**: The theme control MUST be reachable and operable by keyboard with a visible focus state, and expose an accessible name and current state (consistent with the existing app theme control).
- **CR-002**: The themed base map MUST reflow correctly across desktop and mobile layouts without clipping the map region or dropping controls/legends.
- **CR-003**: Both dark and light styles MUST work as complete themes (no half-themed elements), MUST meet WCAG 2.1 AA contrast, and any switch transition MUST honor `prefers-reduced-motion`.
- **CR-004**: The theme choice MUST persist and stay consistent on reload and across cities (reload-safe), and the default MUST be deterministic (dark) rather than environment-dependent.

## Assumptions

- The existing app theme control (dark by default, light option, class-based theming, persistence) is the single mechanism for choosing the base map style; this feature does **not** introduce a separate map-only theme toggle. ("via the app theme control" in the request.)
- The app already establishes dark as the default theme and persists the visitor's choice; this feature reuses that behavior rather than redefining persistence.
- The dark↔light base-map switch is achieved by selecting the matching ready-made OpenFreeMap style (dark / positron); bespoke per-token recoloring of the tile basemap is **not** required for this feature (it may be revisited later if tighter brand cohesion with `--map-*` tokens is wanted). The existing `--map-*` tokens and `.map-chrome` remain the source of truth for the app-drawn chrome (legend, overlay outline, controls), not the tile basemap.
- "No POI clutter" means the base map shows no third-party business/points-of-interest markers; the **positron** light style already removes POIs, and the **dark** style's POI layers are hidden if present. Minimal orientation labels (major place/water names) are acceptable.
- The interactive map (zoom/pan/drill-down) renders client-side; the page, scene, and map region remain server-rendered, with the map confined to the smallest client boundary. Tile data is fetched client-side from the provider at runtime (outside the app's server cache); the city's cached dataset/boundaries are passed in as props.
- The set of supported cities and the scene shell (map region + sidebar) established by earlier features are reused unchanged except for what the base map requires.
- Interactive map behaviors (priced pins, neighborhood selection) and their full data legends are governed by later epics; this feature delivers the **real, themed tile base map plus the neighbourhood overlay and one concrete themed legend** to prove the coherent switch — not the interactive data-exploration layers.

## Dependencies

- Existing app-wide theme provider and theme control (dark default, light option, persistence, no-flash first paint).
- A free, no-API-key map tile provider (**OpenFreeMap**) and a WebGL map renderer for its vector styles.
- Existing `--map-*` tokens / `.map-chrome` for the app-drawn map chrome (legend, overlay, controls), and the cached per-city boundary data (`getCityBoundaries`).
- The existing city scene shell that hosts the map region.
