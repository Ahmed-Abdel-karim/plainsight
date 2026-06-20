"use client";

import { useCityFraming } from "@/features/scene/state";

export function MapLegend() {
  const neighbourhoodCount = useCityFraming()?.neighbourhoodCount ?? 0;
  const label =
    neighbourhoodCount === 1
      ? "1 neighbourhood"
      : `${neighbourhoodCount.toLocaleString("en")} neighbourhoods`;

  return (
    <aside
      aria-label="Map legend"
      className="map-chrome text-map-label px-3 py-2 shadow-sm"
    >
      <h2 className="type-label">Neighbourhoods</h2>
      <div className="mt-2 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="border-map-nbhd-stroke bg-map-nbhd-fill h-3 w-8 rounded-sm border"
        />
        <span className="text-xs whitespace-nowrap tabular-nums">{label}</span>
      </div>
    </aside>
  );
}
