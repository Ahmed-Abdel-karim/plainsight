"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import { useEffect } from "react";

import type { HexCell } from "@/lib/hex/types";

import { HEX_FILL_LAYER_ID } from "../constants";
import { useMapActions, type HexInspectInfo } from "../../stores";
import { useLayerListeners } from "../use-layer-listeners";
import type { HexFeatureProps } from "./hex-layers";

function inspectFrom(event: MapLayerMouseEvent): HexInspectInfo | null {
  const feature = event.features?.[0];
  if (!feature) return null;
  const { medianPrice, count } = feature.properties as HexFeatureProps;
  if (typeof medianPrice !== "number" || typeof count !== "number") {
    return null;
  }
  return {
    longitude: event.lngLat.lng,
    latitude: event.lngLat.lat,
    medianPrice,
    count,
  };
}

export function useHexListeners(visible: boolean, cells: HexCell[]): void {
  const { setHexInspectInfo } = useMapActions();

  const updateHexInspect = (event: MapLayerMouseEvent) =>
    setHexInspectInfo(inspectFrom(event));

  useLayerListeners(
    HEX_FILL_LAYER_ID,
    {
      mouseenter: updateHexInspect,
      mousemove: updateHexInspect,
      mouseleave: () => setHexInspectInfo(null),
      click: updateHexInspect,
    },
    visible,
  );

  // A hidden or replaced hex layer must never leave stale inspect data visible.
  useEffect(() => {
    setHexInspectInfo(null);
  }, [cells, setHexInspectInfo, visible]);
}
