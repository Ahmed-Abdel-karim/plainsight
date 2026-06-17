"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import type { MapMouseEvent } from "maplibre-gl";
import { useEffect } from "react";

import type { HexCell } from "@/lib/hex/types";

import {
  useInspectHex,
  useMapIsSuppressed,
  useMapRef,
  type HexInspectInfo,
} from "../../../state";
import { HEX_FILL_LAYER_ID } from "../../constants";
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
  const suppressed = useMapIsSuppressed();
  const mapRef = useMapRef();

  // A hidden or replaced hex layer must never leave stale inspect data visible.
  useEffect(() => {
    inspectHex(null);
  }, [cells, inspectHex, visible]);

  // Clear inspect when clicking on empty map space (no hex hit).
  useEffect(() => {
    if (!mapRef || !visible || suppressed) return;
    const handler = (e: MapMouseEvent) => {
      if (
        !mapRef.queryRenderedFeatures(e.point, { layers: [HEX_FILL_LAYER_ID] })
          .length
      ) {
        inspectHex(null);
      }
    };
    const sub = mapRef.on("click", handler);
    return () => sub.unsubscribe();
  }, [mapRef, visible, suppressed, inspectHex]);

  return [
    {
      type: "mouseenter",
      listener: (e) => {
        if (mapRef) mapRef.getCanvas().style.cursor = "pointer";
        inspectHex(inspectFrom(e));
      },
    },
    { type: "mousemove", listener: (e) => inspectHex(inspectFrom(e)) },
    {
      type: "mouseleave",
      listener: () => {
        if (mapRef) mapRef.getCanvas().style.cursor = "";
        inspectHex(null);
      },
    },
    { type: "click", listener: (e) => inspectHex(inspectFrom(e)) },
  ];
}
