# Quickstart: Themed Base Map

**Feature**: 004-basemap-theme (OpenFreeMap + MapLibre)

## What this delivers

A real, interactive themed tile map in the city scene's map region: **dark by default** (OpenFreeMap `dark` style), **light** via the existing app theme toggle (OpenFreeMap `positron`, POI-free), the city's neighbourhood outlines overlaid on top, a token-driven legend, and required attribution — with the base + overlay + legend restyling together on toggle, no page reload.

## Run it

```bash
pnpm add maplibre-gl react-map-gl   # no API key needed
pnpm install
pnpm dev               # open a city, e.g. http://localhost:3000/amsterdam
```

Supported cities: `amsterdam`, `berlin`, `london`, `manchester`. No tokens/keys/env vars — OpenFreeMap needs no registration.

## Verify the acceptance criteria

1. **Dark by default** — open `/amsterdam` in a fresh session (no stored theme). The map shows the OpenFreeMap **dark** style, centered on the city, with neighbourhood outlines on top. _(FR-001/013, US1)_
2. **No POI clutter** — confirm no business/restaurant/shop markers in either style (positron is POI-free; dark hides POI layers). _(FR-003/SC-006)_
3. **Light option, in place** — click the theme toggle. The basemap swaps to **positron** with **no page reload**; the neighbourhood overlay and legend stay in sync. _(FR-002/005/006, US2/US3)_
4. **Coherent swap** — while toggling, watch the basemap + outlines + legend: all change together, none left in the previous theme, city/framing unchanged. _(FR-006/SC-003/007)_
5. **Persistence / no flash** — choose light, reload, open `/berlin`: still light, correct style on first paint (no flash of dark). _(FR-007/008/SC-004)_
6. **Attribution** — the OpenFreeMap/OpenMapTiles/OSM attribution is visible and legible in both styles. _(FR-015/FR-009)_
7. **Keyboard + focus** — Tab to the theme toggle, activate with Enter/Space (visible focus ring); the map itself is keyboard-pannable. _(CR-001)_
8. **Reduced motion** — with `prefers-reduced-motion`, the map performs no animated camera moves. _(FR-010/CR-003)_
9. **Responsive** — at mobile width the map region reflows without clipping the legend/attribution. _(CR-002)_
10. **Fallback** — (dev check) force offline or a missing boundary file → a quiet themed loading/"Map unavailable" panel, never blank. _(FR-011)_

## Verify the build & checks

```bash
pnpm format:check
pnpm lint:strict
pnpm test          # optional map-legend display/a11y test (the WebGL map is verified manually)
pnpm build         # cacheComponents preserved
```

## Key files

- `components/scene/map-canvas.tsx` — the only Client Component: React Map GL + MapLibre + OpenFreeMap, style from `resolvedTheme`, declarative overlay + POI-hide, attribution, keyboard, reduced-motion.
- `components/scene/map-legend.tsx` — themed `.map-chrome` legend (Server).
- `components/scene/map-region.tsx` — hosts the map + legend, themed loading placeholder + fallback (Server).
- `app/[city]/page.tsx` / `city-scene.tsx` — thread `boundaries`, `bbox`, `center`, `neighbourhoodCount` (Server).
- `data/loaders.ts` — `getCityBoundaries` (reused, cached).

## Notes

- The **map is the only client island**; the page, scene, and region stay Server Components. Tiles are fetched client-side from OpenFreeMap; the city's boundaries/dataset stay server-cached and are passed as props.
- Theme switching swaps OpenFreeMap's ready-made `dark`/`positron` styles — no bespoke per-token recolor logic for the basemap (deferred; would need an oklch→hex map if revisited).
- Interactive data layers (priced pins, choropleth fills, drill-down) are **out of scope** here; they arrive in E4/E5 and bind to the same neighbourhood `feature.id` this overlay already carries.
