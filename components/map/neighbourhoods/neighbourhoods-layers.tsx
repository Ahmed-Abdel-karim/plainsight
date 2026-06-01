"use client";

import { Layer, Source } from "react-map-gl/maplibre";

import type { NeighbourhoodBoundaries } from "@/data";
import { getLabelLayer, getOutlineLayer } from "./layers";
import { NEIGHBOURHOODS_SOURCE_ID } from "../constants";
import { useMemo } from "react";
import { MapTheme } from "../map-styles";

interface NeighbourhoodsLayersProps {
  boundaries: NeighbourhoodBoundaries;
  /** Resolved theme supplied by the canvas — the single source of truth. */
  theme: MapTheme;
}

/**
 * The neighbourhoods source and the layers that render it. The canvas composes
 * this; it never touches the source id or layer specs directly. Per-layer style
 * and (later) interaction logic stay encapsulated here.
 */
export function NeighbourhoodsLayers({
  boundaries,
  theme,
}: NeighbourhoodsLayersProps) {
  const outlineLayer = useMemo(() => getOutlineLayer(theme), [theme]);
  const labelLayer = useMemo(() => getLabelLayer(theme), [theme]);
  return (
    <Source id={NEIGHBOURHOODS_SOURCE_ID} type="geojson" data={boundaries}>
      <Layer {...outlineLayer} />
      <Layer {...labelLayer} />
    </Source>
  );
}
