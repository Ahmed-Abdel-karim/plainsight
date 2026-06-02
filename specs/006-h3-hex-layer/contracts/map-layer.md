# Contract: Hex Map Layer (UI)

How the hex price layer is rendered, colored, and inspected on the persistent MapLibre map. Follows
the existing `NeighbourhoodsLayers` pattern (a `<Source>` + `<Layer>` React component, theme passed
in from the canvas).

## Source & layer

- **IDs** (`components/scene/map/constants.ts`): `HEX_SOURCE_ID = "hex-price"`,
  `HEX_FILL_LAYER_ID = "hex-price-fill"`.
- **Source**: `<Source id={HEX_SOURCE_ID} type="geojson" data={featureCollection}>` where
  `featureCollection` is built on the main thread from `HexCell[]` via `cellToBoundary(h3)` →
  `Feature<Polygon, { medianPrice: number; count: number }>`.
- **Layer**: `<Layer type="fill" .../>` with `fill-color` = the price `step` expression and a
  modest `fill-opacity` (legible over both basemaps; tuned in the manual contrast pass). An empty
  result yields an empty FeatureCollection → no fills (FR-007).

## Color ramp (`components/scene/map/hex/hex-colors.ts`)

```ts
// Per-theme hex literals mirroring --price-1..5 (MapLibre rejects oklch — Rule 3 exception).
export const PRICE_RAMP: Record<
  Theme,
  [string, string, string, string, string]
>;

// step expression: medianPrice -> ramp[bucket], using priceScale.breaks (QUANTILE_BREAKS = 5)
export function priceFillExpression(
  theme: Theme,
  breaks: number[],
): DataDrivenPropertyValueSpecification<string>;
```

- `breaks` come from `CityMeta.priceScale.breaks` (via the map city payload).
- The five literals MUST stay in sync with `--price-1..5` (documented exception; same posture as
  `OVERLAY_LINE`).

## Theme reactivity

- The canvas passes the resolved `Theme`; on toggle the layer **recolors only** (swap ramp
  literals) — no worker recompute, no source rebuild.

## Inspect (`components/scene/map/hex/hex-inspect.tsx`) — FR-008

- Desktop hover / touch tap on `HEX_FILL_LAYER_ID` (MapLibre interactive layer events) → a
  `.map-chrome` popup showing **Median** `{currency}{medianPrice}` and **Listings** `{count}`
  (mirrors the prototype `CellTooltip`).
- Dismiss on pointer-leave / tap elsewhere. Reduced-motion respected.

## Legend (`components/scene/map/hex/hex-legend.tsx`) — FR-003 / SC-006

- A `.map-chrome` panel with five ramp swatches and their price ranges (derived from
  `priceScale.breaks` + currency), token utilities only, legible in both themes.

## Reactivity contract (`use-hex-layer.ts` bridge hook)

- Reads filter state (`useFilters(bounds)` where `bounds = priceScale.min/max`) and the active
  resolution (from the map store, set by the canvas's debounced zoom observer).
- On `{ filters | resolution }` change → `client.hexes(filters, resolution)` → `store.setHexCells`.
- Acquires the worker eagerly on scene entry (default view is the hex map), via the existing
  `use-city-listings` registry (ref-counted, one worker per slug).
