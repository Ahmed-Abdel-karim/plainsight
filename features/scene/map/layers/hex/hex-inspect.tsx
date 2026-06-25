"use client";

import { Popup } from "react-map-gl/maplibre";

import { useCityFraming, useHexInspectInfo } from "@/features/scene/state";
import { formatCurrency } from "@/features/scene/shared/format";
import { InspectStats } from "@/features/scene/shared/inspect-stats";

export function HexInspect() {
  const hexInspectInfo = useHexInspectInfo();
  const city = useCityFraming();
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
      <InspectStats
        stats={[
          {
            label: "Median",
            value: formatCurrency(medianPrice, city.currency),
            emphasis: true,
          },
          { label: "Listings", value: count.toLocaleString("en") },
        ]}
      />
    </Popup>
  );
}
