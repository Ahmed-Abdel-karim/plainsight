"use client";

import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  FilterSpecification,
} from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import type { Theme } from "@/components/theme/theme-provider";
import type { BrowsePointProperties } from "@/data/contract";

import { POINTS_CIRCLE_LAYER_ID, POINTS_SOURCE_ID } from "../constants";
import { DOT_STROKE, roomColorExpression } from "./point-colors";

type PointsCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  BrowsePointProperties
>;

/** Enlarge + stroke the dot when hovered or selected (selected wins). */
function emphasis(
  base: number,
  hover: number,
  selected: number,
): ExpressionSpecification {
  return [
    "case",
    ["boolean", ["feature-state", "selected"], false],
    selected,
    ["boolean", ["feature-state", "hover"], false],
    hover,
    base,
  ];
}

/**
 * The Browse dot layer (FR-006): every matching listing as a circle on a single
 * GL layer that scales to ~62k where DOM markers would not (research D5). The
 * `geojson` source uses `promoteId: "id"` so hover/selected are MapLibre
 * **feature-state** keyed by the listing id. Filtering is the GPU `filter`
 * expression (state in, no ids out); a theme toggle only swaps the colour
 * literals. Visibility is driven by the lens — shown in Browse, `none` in Analyse.
 */
export function PointsLayer({
  collection,
  theme,
  filter,
  visible,
}: {
  collection: PointsCollection;
  theme: Theme;
  filter: FilterSpecification;
  visible: boolean;
}) {
  const layer = useMemo<CircleLayerSpecification>(
    () => ({
      id: POINTS_CIRCLE_LAYER_ID,
      type: "circle",
      source: POINTS_SOURCE_ID,
      layout: { visibility: visible ? "visible" : "none" },
      paint: {
        "circle-color": roomColorExpression(theme),
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          9,
          emphasis(2.2, 4, 5),
          14,
          emphasis(5, 8, 9.5),
        ],
        "circle-stroke-color": DOT_STROKE[theme],
        "circle-stroke-width": emphasis(0.5, 1.4, 1.8),
        "circle-opacity": emphasis(0.82, 1, 1),
        "circle-stroke-opacity": emphasis(0.5, 1, 1),
      },
    }),
    [theme, visible],
  );

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
