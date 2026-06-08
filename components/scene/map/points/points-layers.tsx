"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import type { Theme } from "@/components/theme/theme-provider";
import type { BrowsePointProperties } from "@/data/contract";

import { POINTS_SOURCE_ID } from "../constants";
import { getCircleLayer } from "./styles";
import { usePointsListeners } from "./listeners";
import { usePointsFeatureState } from "./use-points-layer";
import { usePointsFilter } from "./use-points-filter";

type PointsCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  BrowsePointProperties
>;

/**
 * The Browse dot source + circle layer. The `geojson` source uses
 * `promoteId: "id"` so hover/selected are MapLibre **feature-state** keyed by
 * the listing id. Filtering is the GPU `filter` expression (state in, no ids
 * out), read from the store via `usePointsFilter` so the layer owns its derived
 * render input. Per-layer style stays in `styles.ts`; the canvas composes this
 * and never touches the source id.
 */
export function PointsLayers({
  collection,
  theme,
  visible,
}: {
  collection: PointsCollection;
  theme: Theme;
  visible: boolean;
}) {
  const layer = useMemo(() => getCircleLayer(theme, visible), [theme, visible]);
  const filter = usePointsFilter();
  usePointsListeners(visible);
  usePointsFeatureState(visible);
  return (
    <Source
      id={POINTS_SOURCE_ID}
      type="geojson"
      data={collection}
      promoteId="id"
    >
      <Layer {...layer} filter={filter} />
    </Source>
  );
}
