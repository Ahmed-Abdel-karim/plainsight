"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import { useEffect } from "react";

import { useMapHover, useMapSelect } from "../../state";
import type { LayerListener } from "../layer";

function pointIdFrom(event: MapLayerMouseEvent): number | null {
  const point = event.features?.[0];
  return typeof point?.id === "number" ? point.id : null;
}

export function usePointsListeners(visible: boolean): LayerListener[] {
  const mapHover = useMapHover();
  const mapSelect = useMapSelect();

  useEffect(() => {
    if (!visible) mapHover(null, null);
    return () => mapHover(null, null);
  }, [mapHover, visible]);

  return [
    { type: "mousemove", listener: (e) => mapHover(pointIdFrom(e), "map") },
    { type: "mouseleave", listener: () => mapHover(null, null) },
    {
      type: "click",
      listener: (e) => {
        const id = pointIdFrom(e);
        if (id !== null) mapSelect(id);
      },
    },
  ];
}
