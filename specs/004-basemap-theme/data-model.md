# Phase 1 Data Model: Themed Base Map

**Feature**: 004-basemap-theme | **Date**: 2026-05-31 (revised after the tile-provider pivot)

No new persisted data is introduced. This feature consumes existing contract types, adds a small map-configuration model, and defines component prop shapes. All types are explicit (constitution Principle V); no `any`/unsafe casts.

---

## Reused contract types (from `@/data`, unchanged)

```ts
type NeighbourhoodBoundaries = FeatureCollection<
  MultiPolygon,
  NeighbourhoodBoundaryProperties
>; // { properties: { id: string; name: string } }

interface CityDataset {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  center: [number, number]; // [lng, lat]
  neighbourhoods: Neighbourhood[]; // only .length used (legend count)
  // …
}
```

**Loader (unchanged, reused):** `getCityBoundaries(slug): Promise<NeighbourhoodBoundaries | null>` — `"use cache"`, `cacheLife("max")`. Passed as a prop into the client map (the boundaries are static/cached; serializing GeoJSON to the client is acceptable).

---

## New: map style configuration (module constant)

A tiny, explicitly-typed mapping from theme → OpenFreeMap style URL. Lives in `components/scene/map-canvas.tsx` (or a colocated `map-styles.ts`).

```ts
type MapTheme = "dark" | "light";

const OPENFREEMAP_STYLE: Record<MapTheme, string> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron", // POIs already removed
};

/** Layer-id substrings whose layers are hidden to satisfy "no POI clutter". */
const POI_LAYER_HINTS = ["poi", "label-poi"] as const; // applied to dark; positron is already clean
```

**Rules**

- The active `MapTheme` is derived from `next-themes`' `resolvedTheme` (`"dark"` → `dark`, anything else → `light`). With `enableSystem={false}` and `defaultTheme="dark"`, the resolved value is known on first client render → the map initializes with the correct style (no flash, FR-008).
- On theme change, swap to `OPENFREEMAP_STYLE[next]` by updating React Map GL's `mapStyle` prop.

---

## New: neighbourhood overlay (MapLibre source/layer, runtime)

The reused boundary GeoJSON is added to the map as an outline overlay so the city's neighbourhoods read on top of the basemap (and so E4/E5 can later bind choropleth fills by `feature.id`).

```ts
// rendered declaratively and restored by React Map GL after style changes
map.addSource("neighbourhoods", { type: "geojson", data: boundaries });
map.addLayer({
  id: "neighbourhoods-outline",
  type: "line",
  source: "neighbourhoods",
  paint: { "line-color": OVERLAY_LINE[theme], "line-width": 1 },
});
```

- `OVERLAY_LINE: Record<MapTheme, string>` is a small hex/rgb pair (MapLibre's color parser does not reliably accept `oklch`, so the overlay does not read `--map-*` directly; values are chosen to mirror the dark/light neighbourhood-stroke tone). Kept minimal and documented.
- POI-hide is re-applied on the `styledata`/`idle` event after every style swap; the overlay is represented as declarative React Map GL source/layer children.

---

## New / updated component prop shapes

### `MapCanvas` — `components/scene/map-canvas.tsx` (**Client**, `"use client"`)

```ts
interface MapCanvasProps {
  bbox: [number, number, number, number];
  center: [number, number];
  boundaries: NeighbourhoodBoundaries; // non-null; null handled by MapRegion fallback
  cityName: string; // accessible name
}
```

Behavior: import `react-map-gl/maplibre` and `maplibre-gl` CSS; render a React Map GL `<Map>` with `mapStyle = OPENFREEMAP_STYLE[theme]`, centered on `center` and/or fit to `bbox`; add `AttributionControl`, `NavigationControl`, and keyboard nav; render the neighbourhood overlay with declarative `<Source>`/`<Layer>`; on `load`/`styledata` hide POI layers; subscribe to `resolvedTheme` changes by changing `mapStyle`; honor `prefers-reduced-motion` (no animated fly-to). Container has `aria-label={`Map of ${cityName}`}`.

### `MapLegend` — `components/scene/map-legend.tsx` (Server, presentational)

```ts
interface MapLegendProps {
  neighbourhoodCount: number;
}
```

Floating `.map-chrome` panel (scrim + blur, Rule 9) with a `text-map-label` heading, a neighbourhood swatch, and the count. Token-driven → restyles with the `.dark` cascade (FR-006/FR-012).

### `MapRegion` — `components/scene/map-region.tsx` (**Server**, UPDATED)

```ts
interface MapRegionProps {
  boundaries: NeighbourhoodBoundaries | null;
  bbox: [number, number, number, number];
  center: [number, number];
  cityName: string;
  neighbourhoodCount: number;
}
```

If `boundaries` has ≥1 feature → render `<MapCanvas …>` + `<MapLegend …>` inside the existing `<section aria-label="Map">`, with a themed loading placeholder (`bg-map-bg`) shown until the client map mounts. Else → quiet themed "Map unavailable" fallback (FR-011).

### `CityScene` — `components/scene/city-scene.tsx` (Server, UPDATED)

Adds `boundaries`, `bbox`, `center`, `neighbourhoodCount` props; threads them (with `cityName`) to `MapRegion`. Existing `MarketHeader` props/layout unchanged.

---

## Entity relationships

```text
CityDataset (slug.json) ── bbox, center, neighbourhoods.length ─┐
                                                                ├─► CityScene ─► MapRegion ─► <MapCanvas/> (client)
NeighbourhoodBoundaries (slug-boundaries.geojson, cached) ──────┘                                  │
                                                                                                   ├─ MapLibre map
resolvedTheme (next-themes) ───────────────────────────────────────────────────────────────────► ├─ style = dark|positron
                                                                                                   └─ neighbourhood overlay (by feature.id)
```

The neighbourhood `feature.id` (= slug) is preserved as the join key for E4/E5 choropleth/drill-down (`setFeatureState`), even though interactivity is out of scope here.

---

## State transitions

- **Theme**: owned by `next-themes`. `dark ⇄ light` → React Map GL `mapStyle` update + POI re-apply. No app component state beyond reading `resolvedTheme`.
- **Map lifecycle (client)**: `mounting → style loading → ready` (overlay added) → on theme change `swapping → ready`; `tile/style error → fallback`. The map instance is created once and reused across theme swaps (no remount, no page reload).
