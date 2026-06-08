"use client";

import { Layer, Source } from "react-map-gl/maplibre";

import type { NeighbourhoodBoundaries } from "@/data";
import { useMemo } from "react";
import { Theme } from "@/components/theme/theme-provider";
import { NEIGHBOURHOODS_SOURCE_ID } from "../constants";
import { getFillLayer, getLabelLayer, getOutlineLayer } from "./styles";
import { useNeighbourhoodsListeners } from "./listeners";

interface NeighbourhoodsLayersProps {
  boundaries: NeighbourhoodBoundaries;
  /** Resolved theme supplied by the canvas — the single source of truth. */
  theme: Theme;
  /** Browse owns boundary clicks; Analyse leaves the overlay display-only. */
  interactive?: boolean;
}

/**
 * The neighbourhoods source and the layers that render it. The canvas composes
 * this; it never touches the source id or layer specs directly. Per-layer style
 * and (later) interaction logic stay encapsulated here.
 */
export function NeighbourhoodsLayers({
  boundaries,
  theme,
  interactive = false,
}: NeighbourhoodsLayersProps) {
  const fillLayer = useMemo(() => getFillLayer(theme), [theme]);
  const outlineLayer = useMemo(() => getOutlineLayer(theme), [theme]);
  const labelLayer = useMemo(() => getLabelLayer(theme), [theme]);
  useNeighbourhoodsListeners(interactive);

  return (
    <Source id={NEIGHBOURHOODS_SOURCE_ID} type="geojson" data={boundaries}>
      <Layer {...fillLayer} />
      <Layer {...outlineLayer} />
      <Layer {...labelLayer} />
    </Source>
  );
}
