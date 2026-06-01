# UI / Module Contract: Themed Base Map

**Feature**: 004-basemap-theme | **Date**: 2026-05-31 (revised after the tile-provider pivot)

This app exposes no external API. The "contracts" here are the internal component boundaries this feature introduces, plus the observable UI contract that satisfies the spec's acceptance scenarios. The base map renders **OpenFreeMap** vector tiles via **MapLibre GL JS**.

---

## External provider contract — OpenFreeMap

| Aspect       | Contract                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------ |
| Styles       | `https://tiles.openfreemap.org/styles/dark` (dark default), `…/positron` (light, POI-free) |
| Auth         | None — no API key, no account, no cookies.                                                 |
| Limits       | No stated request/view limits; self-hostable if needed.                                    |
| Attribution  | Required: "OpenFreeMap © OpenMapTiles · Data from OpenStreetMap" (FR-015).                 |
| Failure mode | Network/style error → app shows themed "Map unavailable" fallback (FR-011).                |

---

## Component contract — `MapCanvas` (`components/scene/map-canvas.tsx`, **Client**)

| Aspect      | Contract                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kind        | `"use client"` Component — the **only** client island. Uses `react-map-gl/maplibre` backed by `maplibre-gl`.                                     |
| Props       | `{ bbox: [number,number,number,number]; center: [number,number]; boundaries: NeighbourhoodBoundaries; cityName: string }` (all serializable)     |
| Init style  | From `resolvedTheme` (`next-themes`): dark→`dark`, else→`positron`. Correct on first render (no flash).                                          |
| Theme swap  | On `resolvedTheme` change → `mapStyle` changes **in place (no reload)**; declarative overlay stays mounted and POI hiding reruns on `styledata`. |
| Overlay     | Renders `boundaries` as a declarative React Map GL `Source` + `line` layer (`neighbourhoods-outline`).                                           |
| POI removal | positron is POI-free; for `dark`, hide POI/symbol layers via `setLayoutProperty(..., 'visibility','none')`.                                      |
| Attribution | MapLibre `AttributionControl` enabled and legible (AA) in both styles (FR-015).                                                                  |
| A11y        | Container `aria-label="Map of {cityName}"`; keyboard pan/zoom (MapLibre default); no animated camera moves under `prefers-reduced-motion`.       |
| Lifecycle   | One map instance; cleaned up on unmount; reused across theme swaps.                                                                              |
| Types       | `react-map-gl` and `maplibre-gl` types; no `any`/unsafe casts; layer inspection guarded.                                                         |

**Verification** (manual — WebGL/canvas isn't unit-testable in jsdom): dark on first load; toggle → positron in place with no reload; no POI markers in either style; attribution visible + legible both themes; keyboard pan/zoom; no motion under reduced-motion; fallback on forced offline.

---

## Component contract — `MapLegend` (`components/scene/map-legend.tsx`, Server)

| Aspect | Contract                                                                             |
| ------ | ------------------------------------------------------------------------------------ |
| Kind   | Server Component, presentational.                                                    |
| Props  | `{ neighbourhoodCount: number }`                                                     |
| Output | `.map-chrome` floating panel: `text-map-label` heading, swatch, neighbourhood count. |
| Colour | Token utilities only; restyles with the base map via the `.dark` cascade.            |

**Verification** (optional integration `map-legend.test.tsx`): renders heading + count; axe reports no violations.

---

## Component contract — `MapRegion` (`components/scene/map-region.tsx`, Server, UPDATED)

| Aspect   | Contract                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Props    | `{ boundaries: NeighbourhoodBoundaries \| null; bbox; center; cityName: string; neighbourhoodCount: number }` |
| Present  | `boundaries` with ≥1 feature → `<MapCanvas>` + `<MapLegend>`, with a themed loading placeholder until mount.  |
| Fallback | Otherwise (or on map error surfaced upward) → quiet themed "Map unavailable" panel (FR-011), never blank.     |
| Wrapper  | Keeps `<section aria-label="Map" …>` and the existing region sizing.                                          |

---

## Observable UI contract (maps to spec acceptance)

| Spec ref              | Observable behaviour                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| FR-001 / US1          | No stored theme → city scene shows the OpenFreeMap **dark** tile map on first paint.                    |
| FR-002 / US2          | The app theme toggle switches the base map to the **positron (light)** style.                           |
| FR-003 / SC-006       | No POI/business markers — positron is POI-free; POI layers hidden in dark.                              |
| FR-004                | Restrained cartography (dark / positron) keeps the base subordinate to data layers.                     |
| FR-005 / FR-006 / US3 | One toggle swaps the basemap style **and** restyles overlay + legend together, **in place, no reload**. |
| FR-007 / FR-008       | Choice persists across cities/sessions; correct style on first paint (no flash) via `resolvedTheme`.    |
| FR-009 / SC-005       | Attribution + legend meet WCAG 2.1 AA in both styles.                                                   |
| FR-010                | No animated camera moves under `prefers-reduced-motion`; global guard covers chrome.                    |
| FR-011                | Tile/style failure or pre-mount → themed loading/"Map unavailable" panel, never blank.                  |
| FR-012                | A concrete themed `.map-chrome` legend ships now and re-themes with the base.                           |
| FR-013                | Real interactive themed tile map replaces the placeholder Skeleton.                                     |
| FR-015                | OpenFreeMap/OpenMapTiles/OSM attribution is visible and legible in both styles.                         |
