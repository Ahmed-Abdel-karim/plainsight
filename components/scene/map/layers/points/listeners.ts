"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import { useEffect } from "react";

import { useSetMapHover, useSelectMapFeature } from "../../../state";
import type { LayerListener } from "../layer";

function pointIdFrom(event: MapLayerMouseEvent): number | null {
  const point = event.features?.[0];
  return typeof point?.id === "number" ? point.id : null;
}

export function usePointsListeners(visible: boolean): LayerListener[] {
  const setMapHover = useSetMapHover();
  const selectMapFeature = useSelectMapFeature();

  useEffect(() => {
    if (!visible) setMapHover(null, null);
    return () => setMapHover(null, null);
  }, [setMapHover, visible]);

  return [
    {
      type: "mousemove",
      listener: (e) => setMapHover(pointIdFrom(e), "map"),
    },
    { type: "mouseleave", listener: () => setMapHover(null, null) },
    {
      type: "click",
      listener: (e) => {
        const id = pointIdFrom(e);
        if (id !== null) selectMapFeature(id);
      },
    },
  ];
}
