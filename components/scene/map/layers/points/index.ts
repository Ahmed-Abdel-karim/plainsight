/**
 * Browse points map domain. Anchored by a single GeoJSON `<Source>` and the
 * circle layer that reads it, plus its theme→paint mapping (`styles.ts`). The
 * collection arrives as a prop; the GPU `filter` (`points-filter.ts`, read from
 * the store via `use-points-filter.ts`) and the feature-state bridge
 * (`use-points-layer.ts`) compose alongside it.
 *
 * Mirrors the neighbourhoods convention: one folder, one `<Source>`, its layers,
 * and a single composable `<…Layers>` component the canvas drops in.
 */
export { PointsLayers } from "./points-layers";
