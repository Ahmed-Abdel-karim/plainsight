---
description: "Task list for Themed Base Map (Dark-Default, Light Option) — OpenFreeMap + MapLibre"
---

# Tasks: Themed Base Map (Dark-Default, Light Option)

**Input**: Design documents from `specs/004-basemap-theme/` (OpenFreeMap + MapLibre)

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Testing is de-emphasised per the spec, and the renderer is WebGL (not unit-testable in jsdom). The presentational `map-legend.tsx` gets an OPTIONAL display/axe test; the MapLibre client component and the in-place theme swap are verified **manually**. There is no pure projection logic to unit-test (MapLibre handles projection). `pnpm test` runs `vitest run`.

**Organization**: Tasks are grouped by user story (US1 → US2 → US3) so each can be implemented and verified independently. All paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)

## Path Conventions

Single Next.js application. The map is one isolated **Client Component** (`components/scene/map-canvas.tsx`); its host (`map-region.tsx`, `city-scene.tsx`, `app/[city]/page.tsx`) stays a Server Component. The cached `getCityBoundaries` loader and the `--map-*` / `.map-chrome` tokens are reused.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one new dependency the tile map needs.

- [x] T001 Add the `maplibre-gl` and `react-map-gl` dependencies (`pnpm add maplibre-gl react-map-gl`) and confirm their TypeScript types resolve. The MapLibre CSS (`maplibre-gl/dist/maplibre-gl.css`) will be imported inside the client map component (T004), not globally, so it ships only with the map island. No API key/account is needed (OpenFreeMap).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the per-city geometry the map and overlay rely on.

**⚠️ CRITICAL**: No user story work should begin until T002 confirms the data.

- [x] T002 [P] Verify each launch city's `data/json/${slug}.json` carries `bbox: [number,number,number,number]` and `center: [number,number]`, and that `getCityBoundaries(slug)` returns a typed `NeighbourhoodBoundaries` for each `${slug}-boundaries.geojson` (`data/contract.ts`, `data/loaders.ts`). Record any gap; do not change shapes silently.

**Checkpoint**: Geometry confirmed — user stories can begin.

---

## Phase 3: User Story 1 - Dark base map reads clearly by default (Priority: P1) 🎯 MVP

**Goal**: Replace the placeholder Skeleton with a real interactive OpenFreeMap tile map that renders the **dark** style by default, centered on the city, with the neighbourhood overlay, attribution, and POI-free cartography — plus a themed loading/fallback state.

**Independent Test**: Open `/amsterdam` in a fresh session (no stored theme); the map region shows the OpenFreeMap **dark** map centered on Amsterdam, neighbourhood outlines on top, attribution visible, and no POI/business markers.

### Implementation for User Story 1

- [x] T003 [P] [US1] Create the map style config module `components/scene/map-styles.ts` exporting: `type MapTheme = "dark" | "light"`; `OPENFREEMAP_STYLE: Record<MapTheme, string> = { dark: "https://tiles.openfreemap.org/styles/dark", light: "https://tiles.openfreemap.org/styles/positron" }`; `OVERLAY_LINE: Record<MapTheme, string> = { dark: "#cbd5e1", light: "#475569" }` (concrete hex mirroring the neighbourhood-stroke tone — MapLibre's color parser does not accept `oklch`, so these are intentional literals kept in sync with `--map-nbhd-stroke`; tune for contrast in T016); and `POI_LAYER_HINTS = ["poi"] as const` (layer-id substrings hidden in the dark style). Per data-model.md.
- [x] T004 [US1] Create `components/scene/map-canvas.tsx` as a `"use client"` Component with props `{ bbox: [number,number,number,number]; center: [number,number]; boundaries: NeighbourhoodBoundaries; cityName: string }`. Import `react-map-gl/maplibre` and `maplibre-gl/dist/maplibre-gl.css`. Render a React Map GL `<Map>` with `mapStyle = OPENFREEMAP_STYLE[theme]` (theme from `useTheme().resolvedTheme === "dark" ? "dark" : "light"`), `initialViewState`/`fitBounds(bbox)`, `maxBounds`, `keyboard: true`, and declarative `NavigationControl`/`AttributionControl`; set the wrapper `aria-label={`Map of ${cityName}`}`. Render the `neighbourhoods` GeoJSON source + `neighbourhoods-outline` line layer declaratively (`line-color: OVERLAY_LINE[theme]`, `line-width: 1`) and hide POI layers matching `POI_LAYER_HINTS` via `setLayoutProperty(id,'visibility','none')` on load/style data. Skip animated camera moves when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. No `any`/unsafe casts (guard `getStyle().layers`). Depends on T001, T003.
- [x] T005 [US1] Update `components/scene/map-region.tsx` (Server) to props `{ boundaries: NeighbourhoodBoundaries | null; bbox: [number,number,number,number]; center: [number,number]; cityName: string; neighbourhoodCount: number }`: when `boundaries` has ≥1 feature, render `<MapCanvas boundaries bbox center cityName />` inside the existing `<section aria-label="Map">`, wrapped so a themed placeholder (`bg-map-bg`) reserves the region until the client map mounts; otherwise render a quiet themed "Map unavailable" fallback (`bg-map-bg`, muted `text-map-label`) — FR-011. Remove the old `Skeleton` import/usage. (`neighbourhoodCount` is threaded now; consumed by the legend in US3.) Depends on T004.
- [x] T006 [US1] Update `components/scene/city-scene.tsx` (Server): accept `boundaries: NeighbourhoodBoundaries | null`, `bbox: [number,number,number,number]`, `center: [number,number]`, and `neighbourhoodCount: number` props and pass them (with `cityName`) to `<MapRegion>`; keep the `MarketHeader` props/layout unchanged. Depends on T005.
- [x] T007 [US1] Update `app/[city]/page.tsx`: `await getCityBoundaries(city)` and read `dataset.bbox`, `dataset.center`, `dataset.neighbourhoods.length`; pass `boundaries`, `bbox`, `center`, `cityName`, and `neighbourhoodCount` into `<CityScene>`; keep `await`, data fetching, and `notFound()` in this async route boundary. Depends on T006.
- [x] T008 [US1] Manual acceptance (US1): in a fresh session open `/amsterdam` (+ one more city) — the OpenFreeMap **dark** map renders centered on the city, neighbourhood outlines on top, **no POI markers**, attribution visible; the map is keyboard-pannable; the region reflows without clipping at mobile width (FR-001/003/004/013/015, CR-002, SC-001/006).

**Checkpoint**: A real dark tile map renders by default — independently demoable (MVP).

---

## Phase 4: User Story 2 - Switch to a light base map for the environment (Priority: P2)

**Goal**: The app theme toggle swaps the basemap to the **positron (light)** style **in place (no reload)**, the overlay is preserved, both styles stay POI-free, and the choice persists.

**Independent Test**: From the default dark `/amsterdam`, toggle the theme; the map swaps to positron in place (no page reload), neighbourhood outlines persist; navigate to `/berlin` and reload — still light, correct on first paint.

### Implementation for User Story 2

- [x] T009 [US2] In `components/scene/map-canvas.tsx`, drive React Map GL's `mapStyle` from `resolvedTheme`; when it flips, the wrapper swaps styles in place and `onStyleData` re-hides POI layers while the declarative GeoJSON source/layer restores the overlay and recolors it to `OVERLAY_LINE[next]`. Reuse the existing map instance (no page reload). Depends on T004.
- [x] T010 [US2] Verify both styles are POI-free: confirm `positron` shows no POI markers and the dark POI-hide (`POI_LAYER_HINTS`) removes business/POI labels; widen `POI_LAYER_HINTS` if any slip through (FR-003).
- [x] T011 [US2] Manual acceptance (US2): toggle to light → positron renders **in place, no full-page reload**, overlay preserved; reload `/berlin` → still light with the correct style on first paint, no flash of dark (next-themes `resolvedTheme` + persistence, FR-002/005/007/008, SC-002/004).

**Checkpoint**: Dark default AND in-place light swap both work, persist, and are clutter-free.

---

## Phase 5: User Story 3 - Theme switch restyles base and overlays together, in place (Priority: P2)

**Goal**: Ship the concrete themed legend (FR-012) so a single toggle restyles the basemap, the neighbourhood overlay, **and** the legend together — no reload, same city/framing.

**Independent Test**: Toggle the theme while watching the map, the neighbourhood outlines, and the legend; all update in the same interaction with no reload.

### Implementation for User Story 3

- [x] T012 [P] [US3] Create `components/scene/map-legend.tsx` (Server, presentational) with props `{ neighbourhoodCount: number }`: a floating `.map-chrome` panel (scrim + blur, Rule 9) containing a `text-map-label` heading ("Neighbourhoods"), a small swatch, and the count rendered with `tabular-nums`. Token utilities only; no client code.
- [x] T013 [P] [US3] (OPTIONAL) Add `components/scene/map-legend.test.tsx` (dom project): render with a sample count; assert the heading + count are present and `axe` reports no violations (accessibility-first queries). Depends on T012.
- [x] T014 [US3] Render `<MapLegend neighbourhoodCount={…} />` inside `components/scene/map-region.tsx`, positioned over the map region (absolute, `.map-chrome`), using the `neighbourhoodCount` threaded in T005–T007. Depends on T005, T012.
- [x] T015 [US3] Manual acceptance (US3): with `/amsterdam` open, toggle the theme and watch the basemap + neighbourhood outlines + legend — all restyle in the **same interaction**, none left in the prior theme, **no full-page reload**, city/framing unchanged (FR-005/006, SC-003/007).

**Checkpoint**: Base + overlay + legend swap coherently in place — the full spec is demonstrable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 [P] Verify attribution + legend + overlay contrast meets WCAG 2.1 AA in **both** styles (FR-009/015, SC-005, CR-003); tune the `.map-chrome` container and the `OVERLAY_LINE` hex pair (T003) if any pair fails.
- [x] T017 [P] Confirm `maplibre-gl`/`react-map-gl` ship only with the map island — verify the imports live in `map-canvas.tsx` (a Client Component) and are not pulled into non-map routes (e.g. the city picker); check the bundle if unsure.
- [x] T018 [P] Run `pnpm format:check` and `pnpm lint:strict` — clean for all new/changed files.
- [x] T019 Run `pnpm build` — production build succeeds with `cacheComponents: true` preserved (no request-time API in cached work; the client map reads no server cache).
- [x] T020 Run the `quickstart.md` validation steps end-to-end (dark default, in-place light swap, no clutter, attribution, persistence/no-flash, keyboard, reduced-motion, responsive, fallback).

> **Verification (2026-06-01) — `run-app` browser driver** (`.claude/skills/run-app`,
> Playwright + headless Chromium/SwiftShader, 15/15 checks):
> T008/T010/T011/T015/T020 confirmed — dark default, POI-free dark+light, in-place
> light swap with no reload, no-flash + persistence on reload, keyboard pan,
> reduced-motion render, mobile reflow with no zoom/trigger overlap, and the
> "Map unavailable" tile-failure fallback (FR-011). Dark/light/mobile screenshots
> in `/tmp/plainsight-shots/`.
> **T016 caveat:** axe-core reports **no** serious/critical violations in either
> theme, but the legend + attribution float over the WebGL canvas, so axe cannot
> auto-compute their contrast (reported "incomplete"). Legibility was confirmed
> in the both-theme screenshots; a precise AA-ratio measurement of those two
> over-map nodes is the one remaining manual step.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 (add `maplibre-gl` + `react-map-gl`) first — blocks the client map.
- **Foundational (Phase 2)**: T002 confirms geometry — blocks user stories.
- **User Stories (Phase 3+)**: US1 is the MVP. US2 and US3 build on US1's `map-canvas.tsx` / `map-region.tsx`.
- **Polish (Phase 6)**: after the targeted stories.

### User Story Dependencies

- **US1 (P1)**: Depends on Setup + Foundational. Renders the dark map on init. Independently testable.
- **US2 (P2)**: Depends on US1 — adds the live `resolvedTheme` → `mapStyle` swap to `map-canvas.tsx`.
- **US3 (P2)**: Depends on US1 — legend renders into US1's `map-region.tsx`.

### Within Each User Story

- US1: style config (T003) → `map-canvas.tsx` (T004) → `map-region.tsx` (T005) → `city-scene.tsx` (T006) → `page.tsx` (T007) → manual verify (T008).
- US2: swap effect (T009) → POI verify (T010) → manual swap verify (T011).
- US3: `map-legend.tsx` (T012) → render into region (T014) → manual verify (T015).

### Parallel Opportunities

- **Foundational**: T002 is `[P]`.
- **US1**: T003 `[P]` (config file) before T004.
- **US3**: T012 and T013 `[P]`.
- **Polish**: T016/T017/T018 `[P]`.
- Wiring tasks T005→T006→T007 (chained signatures) and T009/T014 (same files as US1) are sequential.

---

## Parallel Example: User Story 3

```bash
Task: "Create map-legend.tsx (T012)"
Task: "map-legend.test.tsx display/axe (T013)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup (add `maplibre-gl` + `react-map-gl`) → Phase 2 Foundational (geometry).
2. Phase 3 US1: style config + `map-canvas.tsx` + wiring + loading/fallback.
3. **STOP and VALIDATE**: `/amsterdam` shows the dark OpenFreeMap map, neighbourhood overlay, attribution, no POI. Demo the MVP.

### Incremental Delivery

1. Foundation → US1 (dark tile map, MVP) → demo.
2. US2 (in-place light swap + persistence) → demo.
3. US3 (themed legend + coherent swap) → demo.
4. Polish: contrast, lazy-load check, format/lint/build, quickstart.

---

## Notes

- The map is the **only** Client Component; `page`/`scene`/`region` stay Server Components and pass serializable props. `getCityBoundaries` (cached) is reused; tiles are fetched client-side from OpenFreeMap.
- `maplibre-gl` is a new dependency (client-only). No API key, no account, no `pmtiles`.
- Theme swap is `next-themes` `resolvedTheme` → React Map GL `mapStyle` (in place, no page reload); the legend/overlay restyle via the `.dark` cascade + `OVERLAY_LINE` recolor.
- `OVERLAY_LINE` hex literals are a tracked Rule 3 exception (MapLibre rejects `oklch`); keep them aligned with `--map-nbhd-stroke`.
- Tests: only the optional `map-legend.test.tsx` (T013); the WebGL map + swap are manual. Commit after each task or logical group.
