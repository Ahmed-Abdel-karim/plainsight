import type {
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
  FillLayerSpecification,
} from "maplibre-gl";

import type { Theme } from "@/components/theme/theme-provider";

import { HEX_FILL_LAYER_ID, HEX_SOURCE_ID } from "../constants";

/**
 * Price-ramp colours for the hex fill layer.
 *
 * RULE 3 EXCEPTION (documented, tracked): MapLibre's colour parser rejects the
 * `oklch(...)` values our design tokens use (`--price-1..5`), so the ramp is
 * mirrored here as per-theme **hex literals**. These MUST stay in sync with the
 * `--price-1..5` tokens in `app/tokens.css` — same posture as `OVERLAY_LINE` in
 * the basemap layer. Regenerate by converting the OKLCH tokens to sRGB hex.
 */
type Ramp = [string, string, string, string, string];

/** Five-step price ramp (low → high), mirroring `--price-1..5` per theme. */
export const PRICE_RAMP: Record<Theme, Ramp> = {
  // light :root --price-1..5
  light: ["#c1e4f7", "#79c3e1", "#3398c2", "#006c9e", "#004775"],
  // dark .dark --price-1..5
  dark: ["#456d8f", "#2891ac", "#12b0b7", "#3ed0c8", "#57f0df"],
};

/**
 * MapLibre `step` expression mapping a cell's `medianPrice` to one of the five
 * ramp literals, using the city's quantile `breaks` (QUANTILE_BREAKS = 5 → four
 * interior thresholds). Prices below the first break take ramp[0]; each break
 * steps up to the next colour, so the hex ramp matches the rest of the app's
 * quantile-bucketed price encoding.
 */
export function priceFillExpression(
  theme: Theme,
  breaks: number[],
): DataDrivenPropertyValueSpecification<string> {
  const ramp = PRICE_RAMP[theme];
  // ["step", ["get","medianPrice"], ramp0, break0, ramp1, break1, ramp2, ...]
  const stops: (number | string)[] = [];
  // Pair each interior break with the next ramp colour (cap at the 5 stops).
  breaks.slice(0, ramp.length - 1).forEach((threshold, i) => {
    stops.push(threshold, ramp[i + 1]);
  });
  const expression: ExpressionSpecification = [
    "step",
    ["get", "medianPrice"],
    ramp[0],
    ...stops,
  ];
  return expression as DataDrivenPropertyValueSpecification<string>;
}

/** Modest fill so the basemap stays legible under the price ramp (both themes). */
const HEX_FILL_OPACITY = 0.6;

/**
 * The hex price fill spec. The colour is a `step` expression over the city's
 * price breaks; a theme toggle only swaps the ramp literals (no source rebuild).
 * Hidden in the Browse lens (the dots take over); shown in Analyse (FR-006).
 */
export const getFillLayer = (
  theme: Theme,
  breaks: number[],
  visible: boolean,
): FillLayerSpecification => ({
  id: HEX_FILL_LAYER_ID,
  type: "fill",
  source: HEX_SOURCE_ID,
  layout: { visibility: visible ? "visible" : "none" },
  paint: {
    "fill-color": priceFillExpression(theme, breaks),
    "fill-opacity": HEX_FILL_OPACITY,
  },
});
