"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import { useEffect } from "react";

import type { HexCell } from "@/lib/hex/types";

import { useInspectHex, type HexInspectInfo } from "../../../state";
import type { LayerListener } from "../layer";
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

export function useHexListeners(
  visible: boolean,
  cells: HexCell[],
): LayerListener[] {
  const inspectHex = useInspectHex();

  // A hidden or replaced hex layer must never leave stale inspect data visible.
  useEffect(() => {
    inspectHex(null);
  }, [cells, inspectHex, visible]);

  return [
    { type: "mouseenter", listener: (e) => inspectHex(inspectFrom(e)) },
    { type: "mousemove", listener: (e) => inspectHex(inspectFrom(e)) },
    { type: "mouseleave", listener: () => inspectHex(null) },
    { type: "click", listener: (e) => inspectHex(inspectFrom(e)) },
  ];
}
