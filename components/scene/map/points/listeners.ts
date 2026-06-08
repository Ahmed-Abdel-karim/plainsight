"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import { useEffect } from "react";

import { useLens } from "../../use-lens";
import { POINTS_CIRCLE_LAYER_ID } from "../constants";
import { useMapActions } from "../../stores";
import { useLayerListeners } from "../use-layer-listeners";

function pointIdFrom(event: MapLayerMouseEvent): number | null {
  const point = event.features?.[0];
  return typeof point?.id === "number" ? point.id : null;
}

export function usePointsListeners(visible: boolean): void {
  const { selectListing } = useLens();
  const { setHoveredListing } = useMapActions();

  useLayerListeners(
    POINTS_CIRCLE_LAYER_ID,
    {
      mousemove: (event) => setHoveredListing(pointIdFrom(event), "map"),
      mouseleave: () => setHoveredListing(null, "map"),
      click: (event) => {
        const id = pointIdFrom(event);
        if (id !== null) selectListing(id);
      },
    },
    visible,
  );

  useEffect(() => {
    if (!visible) setHoveredListing(null, "map");
    return () => setHoveredListing(null, "map");
  }, [setHoveredListing, visible]);
}
