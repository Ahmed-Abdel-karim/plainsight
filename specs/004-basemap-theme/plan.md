# Implementation Plan: Themed Base Map (Dark-Default, Light Option)

**Branch**: `004-basemap-theme` | **Date**: 2026-05-31 (revised after the tile-provider pivot) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-basemap-theme/spec.md`

## Summary

Replace the placeholder `map-region.tsx` Skeleton with a real, themed **tile** base map: an interactive **MapLibre GL JS** map rendering **OpenFreeMap** vector tiles (free, no API key), hosted through `react-map-gl/maplibre`. Dark is the default via OpenFreeMap's ready-made **`dark`** style; the light option is the **`positron`** style (POIs already removed). The existing app theme toggle drives the swap: a small client component reads `next-themes`' `resolvedTheme`, passes the matching `mapStyle`, and re-hides POI layers after style data events — an **in-place swap, no page reload**. The city's neighbourhood GeoJSON (already shipped, cached via `getCityBoundaries`) rides on top as a themed declarative outline layer, and a token-driven `.map-chrome` legend demonstrates the coherent switch (FR-012). Provider attribution is shown via React Map GL's MapLibre attribution control (FR-015).

The map is the **only** new Client Component; `app/[city]/page.tsx`, `city-scene.tsx`, and `map-region.tsx` stay Server Components and pass serializable primitives (`bbox`, `center`, `boundaries`, `neighbourhoodCount`) into it. Runtime dependencies are `maplibre-gl` and `react-map-gl`. The interactive data layers (priced pins, choropleth fills, drill-down) stay deferred to E4/E5; this delivers the legible, themed, interactive canvas they build on.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.6 App Router

**Primary Dependencies**: **NEW** `maplibre-gl` (WebGL renderer for OpenFreeMap vector styles) and `react-map-gl` (React bindings via `react-map-gl/maplibre`; client-only, ship MapLibre CSS inside the client component). Existing: `next-themes` (wired: `attribute="class"`, `defaultTheme="dark"`), the cached `getCityBoundaries` / `NeighbourhoodBoundaries` data layer (`@/data`), `geojson` types, Tailwind 4 token utilities, `--map-*` tokens and `.map-chrome` in `app/globals.css`/`app/tokens.css` (for the app-drawn legend/overlay/chrome — not the tile basemap). **External service**: OpenFreeMap styles at `https://tiles.openfreemap.org/styles/{dark,positron}` — no key, no account.

**Storage**: Static files in `data/json` — per-city `{slug}-boundaries.geojson` + `{slug}.json` (`bbox`, `center`, `neighbourhoods`), loaded via cached server loaders. Tiles are fetched client-side from OpenFreeMap at runtime (not via Next cache). No new app storage.

**Testing**: Per the constitution's Testing Layers and the spec's testing de-emphasis: the presentational/app-drawn pieces (`map-legend.tsx`, the server `map-region.tsx` fallback/placeholder) get light display + `vitest-axe` tests with fixtures; the MapLibre client component is verified **manually** (WebGL/canvas is not unit-testable in jsdom) — dark default, in-place light swap, POI-free, attribution, keyboard, both-theme contrast. There is **no pure projection logic to unit-test** anymore (MapLibre handles projection), so the previous required projection unit test is dropped.

**Target Platform**: Web application served by Next.js; the map runs in the browser (WebGL).

**Project Type**: Single Next.js application

**Performance Goals**: Page/scene/region render on the server from cached static data; only the map island ships client JS. `maplibre-gl` plus `react-map-gl` are imported only inside the client component so they do not weigh on non-map routes (e.g. the city picker). The theme swap is an in-place `mapStyle` update (re-fetch of the new style + tiles), not a page reload; the app-drawn chrome restyles via the CSS cascade instantly.

**Constraints**: Follow `rules/react-components.md` — single `.dark` theme mechanism (Rule 7); the map is the ported "real map piece" (Rule 8) and its chrome (legend, controls, attribution) floats with `.map-chrome` scrim+blur (Rule 9); app-drawn chrome uses token vocabulary only (Rule 3) — the **tile basemap colors come from OpenFreeMap's external styles**, a documented exception to the token rule (the styles are the provider's, not app chrome). Preserve `cacheComponents: true`; no request-time API in cached work. Both styles meet WCAG 2.1 AA for attribution + legend; respect `prefers-reduced-motion` (no animated camera moves). Required provider attribution must be visible (FR-015).

**Scale/Scope**: One new Client Component (`map-canvas.tsx`) + one presentational legend (`map-legend.tsx`); `map-region.tsx`, `city-scene.tsx`, `app/[city]/page.tsx` updated to thread boundaries/bbox/center/count; `maplibre-gl` and `react-map-gl` added with MapLibre CSS. Four launch cities, each with `bbox`/`center`/boundary GeoJSON already present.

## Constitution Check

_GATE: Re-evaluated after the pivot._

- **Next.js App Router**: PASS (with justification). MapLibre is a **client-only WebGL library**, so `map-canvas.tsx` is a `"use client"` Component — explicitly permitted by Principle I ("Client Components are allowed only when … client-only libraries require them") and isolated in the **smallest practical boundary**. `app/[city]/page.tsx` (async), `city-scene.tsx`, and `map-region.tsx` remain Server Components; data fetching/`await`/`notFound()` stay at the route boundary and pass serializable primitives down.
- **Cache Components**: PASS. `getCityBoundaries`/dataset stay cached (`"use cache"` + `cacheLife("max")`); no `cookies()`/`headers()`/`searchParams` is read in cached work; `cacheComponents: true` preserved. Tile fetches are client-side runtime requests to a third-party provider — inherent to a client map and **not** Next-cached work, so they don't cross a cache boundary. The client component takes primitives as props (no promises).
- **Zustand**: PASS. No store added. Theme is owned by `next-themes`; the map derives its style from `resolvedTheme` and its view from props.
- **React Components**: PASS (with documented exception). No shadcn primitive fits a WebGL map; it is the Rule 8 "ported real map piece." The app-drawn chrome (legend, fallback, any custom control container) uses token utilities + `.map-chrome` (Rules 3/9) and forks no shadcn component. The **tile basemap palette is OpenFreeMap's external style**, not app tokens — a deliberate, documented exception (the alternative, forking + recoloring styles to `--map-*`, is recorded in research Decision 3 as future work).
- **Accessibility**: PASS. The map container has an accessible name (`aria-label="Map of {city}"`); MapLibre provides keyboard pan/zoom; `prefers-reduced-motion` is honored (no animated camera moves; global CSS guard covers chrome); attribution (FR-015) and legend meet WCAG 2.1 AA in both styles; the existing theme toggle stays keyboard-accessible with a visible focus ring. A themed loading placeholder prevents layout shift; a themed fallback covers tile/style failure (FR-011).
- **Type Safety And Verification**: PASS. `maplibre-gl` ships types; `MapCanvasProps` are explicitly typed (`bbox`, `center`, `boundaries`, `neighbourhoodCount`); no `any`/unsafe casts (style-layer inspection for POI-hiding is typed/guarded). Verification targets the riskiest behavior — the in-place style swap + overlay re-add, POI-free result, and no-flash first paint — via a manual both-theme/keyboard pass, with axe-clean app-drawn components.

**Result: PASS — one justified Client Component and one documented token exception; both recorded above. Complexity Tracking notes them.**

## Project Structure

### Documentation (this feature)

```text
specs/004-basemap-theme/
├── plan.md              # This file (revised)
├── research.md          # Phase 0 — OpenFreeMap + MapLibre decision (revised)
├── data-model.md        # Phase 1 — component props + map-config model (revised)
├── quickstart.md        # Phase 1 — run/verify (revised)
├── contracts/
│   └── ui-contract.md    # Phase 1 — component contracts (revised)
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
package.json               # UPDATED — add `maplibre-gl` + `react-map-gl`

app/
└── [city]/
    └── page.tsx           # UPDATED — await getCityBoundaries(city); pass
                          #   boundaries, bbox, center, cityName, neighbourhoodCount

components/
└── scene/
    ├── map-canvas.tsx      # NEW ("use client") — the ONLY client island:
    │                       #   React Map GL MapLibre map; style from resolvedTheme
    │                       #   (dark→dark, light→positron); declarative overlay;
    │                       #   hide POI after style data; controls; keyboard; reduced-motion
    ├── map-legend.tsx      # NEW (Server, presentational) — themed `.map-chrome`
    │                       #   legend demonstrating the coherent swap (FR-012)
    ├── map-legend.test.tsx     # NEW (optional) — display/axe
    ├── map-region.tsx      # UPDATED (Server) — host <MapCanvas> + <MapLegend>;
    │                       #   themed loading placeholder + "Map unavailable" fallback
    └── city-scene.tsx      # UPDATED (Server) — thread boundaries/bbox/center/count
```

> Removed vs the prior draft: `lib/map/projection.ts` (+ test) and `components/scene/base-map.tsx` (+ tests) are **not** created — MapLibre handles projection and rendering. No `--map-*` Tailwind-utility addition is required for the basemap (the legend/overlay chrome use existing utilities).

**Structure Decision**: Single Next.js application. The map is one isolated Client Component under `components/scene/`; all hosting components remain Server Components. The cached `getCityBoundaries` loader is reused unchanged.

## Complexity Tracking

| Decision                                              | Why needed                                                                          | Simpler alternative rejected because                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| One Client Component (`map-canvas`)                   | MapLibre/WebGL is browser-only; an interactive tile map cannot render on the server | Self-rendered SVG (server) gives no street geography; server-side PNG kills interactivity + in-place theming        |
| New deps `maplibre-gl` + `react-map-gl`               | Required renderer plus requested React wrapper for OpenFreeMap vector styles        | No-renderer raster `<img>` grid loses smooth pan/zoom and clean theme styling                                       |
| Tile basemap palette = provider style (not `--map-*`) | Use ready-made `dark`/`positron` → minimal work, real cartography                   | Forking + token-recoloring both styles is more code/maintenance for marginal cohesion now (recorded as future work) |
