# Phase 0 Research: Themed Base Map

**Feature**: 004-basemap-theme | **Date**: 2026-05-31 (revised after the tile-provider pivot)

This phase resolves how the base map is produced (FR-014) and the supporting questions it implies (free provider choice, theme switching, POI removal, attribution, accessibility, and the Server/Client boundary).

> **Revision note**: An earlier draft chose a self-rendered SVG basemap and rejected tile providers. That was reversed on explicit direction: the product wants a real **map-tile** base (recognizable streets/buildings), using a **free, no-API-key** provider, with theme handled by selecting the matching style. Decisions below reflect that pivot.

---

## Decision 1 — Rendering approach (resolves FR-014)

**Decision**: Render the base map from **OpenFreeMap** vector tiles using **MapLibre GL JS**. Use OpenFreeMap's ready-made styles: **`dark`** for the dark default and **`positron`** (POIs removed) for the light option. The app theme control swaps between the two styles in place. Do **not** self-render an SVG basemap.

**Rationale**:

- **Free, no key, no limits.** OpenFreeMap serves OSM-based vector tiles with "no registration, no user database, no API keys, no cookies," and no stated request/view limits; it is self-hostable (open-source) if traffic grows. This is the cleanest "free option."
- **Ready-made dark + clean light** mean almost no custom styling work. `dark` is a finished dark basemap; `positron` is explicitly "POIs removed… clean," which directly satisfies FR-003 for the light style with zero extra effort.
- **MapLibre is the native renderer** for these styles — the official MapLibre examples load `https://tiles.openfreemap.org/styles/{name}` directly — and is open-source/free. It also matches the original data-pipeline intent (the data contract's `feature.id … enabling MapLibre setFeatureState for choropleth repaint` note), so E4/E5's choropleth/drill-down can build on the same renderer.
- **Recognizable geography**: real streets/water/buildings, which the SVG-from-boundaries approach could not provide.

**Alternatives considered**:

- **Self-rendered SVG from local boundary GeoJSON** (the prior draft): rejected — no street-level geography, and the product explicitly wants tiles. (It remains the fallback rendering when tiles fail; see Decision 6.)
- **MapTiler / Stadia free tier**: rejected for now — polished but require an API key (secret + domain restriction) and carry request quotas. OpenFreeMap avoids secret management entirely. Revisit only if OpenFreeMap reliability becomes a concern.
- **Raster `<img>` tiles without a GL renderer / server-side static PNG (`maplibre-gl-native`)**: rejected — loses smooth interaction and, for the static-PNG case, makes theme switching a server round-trip instead of an in-place swap; also heavy native deps. Interactivity (E4/E5) needs the client GL renderer.

---

## Decision 2 — Theme switching mechanism (FR-001/002/005/006/007/008)

**Decision**: Keep the single existing mechanism — `next-themes` (`attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`). The client map component reads `resolvedTheme` and: (a) **initializes** React Map GL/MapLibre with the style matching the resolved theme (no flash), and (b) on theme change, updates the `<Map mapStyle={...}>` prop and re-hides POI layers on `styledata` events. The wrapper swaps the basemap **in place — no full-page reload** (FR-005), while the declarative `<Source>`/`<Layer>` overlay stays mounted. The app-drawn legend/overlay/chrome restyle via the `.dark` CSS cascade as before (FR-006).

**Rationale**: Rule 7 ("one theme mechanism only — the `.dark` class") is preserved; the map simply observes the resolved theme. Choosing the initial style from `resolvedTheme` on first client render avoids a wrong-theme flash (FR-008); persistence across cities/sessions is already handled by next-themes (FR-007).

**Implementation notes**:

- Style swaps replace the provider style; POI-hiding MUST be re-run after style data events. The neighbourhood overlay is React-managed through `Source`/`Layer`, so it is restored by the wrapper rather than manually re-added.
- Optional later refinement: instead of swapping styles, keep one style and recolor layers via `setPaintProperty` from `--map-*` tokens. Deferred — the two ready-made styles meet the requirement with less code. (Note: MapLibre's color parser may not accept `oklch(...)`; a token→hex map would be needed if/when recoloring is pursued.)

---

## Decision 3 — POI removal (FR-003)

**Decision**: Light = `positron` (POIs already removed). Dark = `dark` with any POI/business label layers hidden at init and after style updates via `setLayoutProperty(id, 'visibility', 'none')`, detected by inspecting `map.getStyle().layers` for `poi`/symbol layers sourced from POI data.

**Rationale**: Keeps both themes clutter-free with minimal effort; positron needs nothing, dark needs only a small layer-hide pass. Avoids forking/maintaining full style JSON unless a future need arises.

**Alternative**: Fork both OpenFreeMap styles (open-source) into repo-owned `style.json` files with POI layers stripped and colors aligned to `--map-*`. Rejected for now (more maintenance) but recorded as the path to tighter brand cohesion.

---

## Decision 4 — Server/Client boundary (Constitution §I, §III)

**Decision**: A single small **Client Component** `components/scene/map-canvas.tsx` (`"use client"`) owns MapLibre. Everything above it — `app/[city]/page.tsx`, `city-scene.tsx`, `map-region.tsx` — stays a **Server Component**. The client component receives only serializable props (`bbox`, `center`, `boundaries`, `neighbourhoodCount`). Tile requests go from the browser to OpenFreeMap at runtime (outside Next's cache, inherent to a client map). The city dataset/boundaries stay server-fetched via the cached `getCityBoundaries`/dataset and are passed down as props.

**Rationale**: MapLibre is WebGL/browser-only, so a Client Component is unavoidable — but the constitution explicitly permits Client Components for "client-only libraries" and requires isolating them in the smallest boundary, which this does. No request-time API (`cookies()`/`headers()`/`searchParams`) is read in cached work; `cacheComponents: true` is preserved.

**Alternatives considered**: Server-side static PNG via `maplibre-gl-native` (rejected, Decision 1) — would keep it a Server Component but kill interactivity and in-place theming.

---

## Decision 5 — Attribution (FR-015)

**Decision**: Enable MapLibre's `AttributionControl` so the required "OpenFreeMap © OpenMapTiles · Data from OpenStreetMap" credit shows on the map; verify it is legible (AA) in both styles, using the `.map-chrome`/`--scrim` treatment if a custom container is needed.

**Rationale**: OpenFreeMap requires attribution (auto-added by MapLibre). This is a user-observable, non-negotiable requirement — promoted to FR-015 in the spec.

---

## Decision 6 — Loading + failure states (FR-011)

**Decision**: While the client map mounts/loads, `map-region.tsx` shows a quiet themed placeholder (`bg-map-bg` panel) to reserve layout and avoid shift. If MapLibre fails to load the style/tiles (offline/provider error), surface a quiet themed "Map unavailable" fallback in the same region — never blank.

**Rationale**: The map is now client-loaded and network-dependent, so an explicit loading + error state is required (the SVG draft had neither need). Keeps the scene non-empty in all states.

---

## Decision 7 — Accessibility for a canvas map (Constitution §IV)

**Decision**: Give the map container an accessible name (e.g. `aria-label="Map of {city}"`), keep MapLibre's built-in keyboard pan/zoom, disable/limit map motion under `prefers-reduced-motion` (e.g. avoid animated fly-to; the global reduce-motion guard covers CSS), and ensure attribution + legend meet AA in both styles. The existing theme toggle remains the keyboard-accessible control.

**Rationale**: A WebGL canvas needs an explicit a11y story (unlike the SVG `role="img"` draft). MapLibre supports keyboard navigation by default; the rest is naming, contrast, and motion.

---

## New dependency

| Package        | Why                                                      | Notes                                                                                                         |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `maplibre-gl`  | WebGL renderer for OpenFreeMap vector tiles              | Client-only; ~200KB+ gzip; ship its CSS in the client component                                               |
| `react-map-gl` | React wrapper for MapLibre sources, layers, and controls | Uses `react-map-gl/maplibre`; keeps the map island declarative while retaining MapLibre access for POI hiding |

No API key, no tile/SDK account, no `pmtiles` needed (hosted vector tiles via style URL).

---

## Resolved unknowns summary

| Unknown                         | Resolution                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------- |
| FR-014 rendering mechanism      | **OpenFreeMap vector tiles via MapLibre GL JS** (free, no key)                  |
| Free provider choice            | OpenFreeMap (no key/limits) over MapTiler/Stadia (key + quota)                  |
| Dark default / light option     | Ready-made **`dark`** + **`positron`** styles                                   |
| Theme swap without reload       | `next-themes` `resolvedTheme` → React Map GL `mapStyle` update + POI-hide rerun |
| POI removal (FR-003)            | positron is POI-free; hide POI layers in `dark`                                 |
| Server vs client                | One small **Client Component** (`map-canvas.tsx`); rest stays server            |
| Attribution (FR-015)            | MapLibre `AttributionControl`, AA-legible both themes                           |
| Loading / tile failure (FR-011) | Themed loading placeholder + themed "Map unavailable" fallback                  |
| Token recolor of basemap        | **Not required** now (ready-made styles); deferred (oklch→hex if revisited)     |

No `NEEDS CLARIFICATION` remain. Ready for Phase 1.

---

## Sources

- OpenFreeMap — styles (positron, bright, liberty, dark, fiord, 3d), no-key usage, attribution requirement, self-hosting: [openfreemap.org](https://openfreemap.org/) · [Quick Start](https://openfreemap.org/quick_start/) · [styles repo](https://github.com/hyperknot/openfreemap-styles)
- MapLibre GL JS — `setStyle`/`setPaintProperty`/`setLayoutProperty`, loading OpenFreeMap styles directly: [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js)
