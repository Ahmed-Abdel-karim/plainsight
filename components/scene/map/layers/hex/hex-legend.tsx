"use client";

import { useCityFraming } from "../../../state";
import { useLens } from "../../../use-lens";
import { useResolvedTheme } from "../../../../theme/theme-provider";
import { PRICE_RAMP } from "./styles";

/** Compact currency label (e.g. "£149", "€198") — symbol, no fraction. */
function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Build the five swatch labels from the quantile `breaks` (4 interior
 * thresholds → 5 buckets), matching the layer's `step` expression exactly:
 * `Under b0`, `b0–b1`, `b1–b2`, `b2–b3`, `b3+`.
 */
function rampRanges(breaks: number[], currency: string): string[] {
  const labels: string[] = [`Under ${formatPrice(breaks[0], currency)}`];
  for (let i = 1; i < breaks.length; i++) {
    labels.push(
      `${formatPrice(breaks[i - 1], currency)}–${formatPrice(breaks[i], currency)}`,
    );
  }
  labels.push(`${formatPrice(breaks[breaks.length - 1], currency)}+`);
  return labels;
}

/**
 * Price-ramp legend for the hex map (FR-003). Renders the five ramp swatches and
 * their price ranges so price is never read by colour alone. Token utilities and
 * the `.map-chrome` surface keep it legible in both themes; the swatches use the
 * same per-theme ramp literals as the fill layer.
 */
export function HexLegend() {
  const city = useCityFraming();
  const theme = useResolvedTheme();
  const { isBrowse } = useLens();
  // The hex price ramp is meaningless over the Browse dots — the room-type
  // legend takes its place (FR-006). `useLens` is SSR-correct (the route reads
  // the param), so this branches identically on server and first client render.
  if (!city || isBrowse) return null;

  const { breaks } = city.priceScale;
  const ramp = PRICE_RAMP[theme];
  const ranges = rampRanges(breaks, city.currency);

  return (
    <aside
      aria-label="Price legend"
      className="map-chrome text-map-label px-3 py-2 shadow-sm"
    >
      <h2 className="type-label">Median price</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {ramp.map((color, i) => (
          <li key={color} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-5 rounded-sm border border-border/40"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs whitespace-nowrap tabular-nums">
              {ranges[i]}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
