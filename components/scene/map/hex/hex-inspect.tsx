"use client";

/** Compact currency label (e.g. "£149", "€198") — symbol, no fraction. */
function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export interface HexInspectState {
  /** Pointer pixel position within the map container. */
  x: number;
  y: number;
  medianPrice: number;
  count: number;
}

/**
 * Per-cell readout (FR-008): the hovered/tapped hex's **median price** and
 * **listing count**, mirroring the prototype's `CellTooltip`. A floating
 * `.map-chrome` panel pinned just above-right of the pointer; `pointer-events-
 * none` so it never swallows the gesture. No transition → reduced-motion safe.
 */
export function HexInspect({
  x,
  y,
  medianPrice,
  count,
  currency,
}: HexInspectState & { currency: string }) {
  return (
    <div
      aria-hidden="true"
      className="map-chrome text-map-label pointer-events-none absolute z-20 px-3 py-2 shadow-sm"
      style={{ left: x, top: y, transform: "translate(12px, -50%)" }}
    >
      <dl className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-label">Median</dt>
          <dd className="text-sm font-medium tabular-nums">
            {formatPrice(medianPrice, currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-label">Listings</dt>
          <dd className="text-sm tabular-nums">{count.toLocaleString("en")}</dd>
        </div>
      </dl>
    </div>
  );
}
