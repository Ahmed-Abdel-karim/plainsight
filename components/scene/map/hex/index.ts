/**
 * Hex price map domain. Anchored by a single GeoJSON `<Source>` and the fill
 * layer that reads it, plus its theme→paint mapping (`styles.ts`). Cells arrive
 * as a prop — the worker recompute and store live elsewhere.
 *
 * Mirrors the neighbourhoods convention: one folder, one `<Source>`, its layers,
 * and a single composable `<…Layers>` component the canvas drops in.
 */
export { HexLayers, type HexFeatureProps } from "./hex-layers";
export { HexInspect } from "./hex-inspect";
export { useHexListeners } from "./listeners";
export { PRICE_RAMP, getFillLayer, priceFillExpression } from "./styles";
