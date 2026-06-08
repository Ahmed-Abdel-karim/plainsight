"use client";

import { Popup } from "react-map-gl/maplibre";

import { useHexInspectInfo, useMapCity } from "../../stores";

/** Compact currency label (e.g. "£149", "€198") — symbol, no fraction. */
function formatPrice(value: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Per-cell readout (FR-008): the hovered/tapped hex's **median price** and
 * **listing count**, mirroring the prototype's `CellTooltip`. The MapLibre
 * popup follows the pointer's geographic position and remains non-interactive
 * so it never swallows the gesture. No transition → reduced-motion safe.
 */
export function HexInspect() {
  const hexInspectInfo = useHexInspectInfo();
  const city = useMapCity();
  if (!hexInspectInfo || !city) return null;
  const { count, latitude, longitude, medianPrice } = hexInspectInfo;
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      anchor="left"
      offset={12}
      closeButton={false}
      closeOnClick={false}
      focusAfterOpen={false}
      maxWidth="none"
      className="hex-inspect-popup"
    >
      <div
        aria-hidden="true"
        className="map-chrome text-map-label pointer-events-none px-3 py-2 shadow-sm"
      >
        <dl className="flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-label">Median</dt>
            <dd className="text-sm font-medium tabular-nums">
              {formatPrice(medianPrice, city.currency)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="type-label">Listings</dt>
            <dd className="text-sm tabular-nums">
              {count.toLocaleString("en")}
            </dd>
          </div>
        </dl>
      </div>
    </Popup>
  );
}
