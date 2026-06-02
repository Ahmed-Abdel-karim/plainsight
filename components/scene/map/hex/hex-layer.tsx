"use client";

import type { Feature, FeatureCollection, Polygon } from "geojson";
import { cellToBoundary } from "h3-js";
import type { FillLayerSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import type { Theme } from "@/components/theme/theme-provider";
import type { HexCell } from "@/lib/hex/types";

import { HEX_FILL_LAYER_ID, HEX_SOURCE_ID } from "../constants";
import { priceFillExpression } from "./hex-colors";

/** Properties carried on each hex feature (read by the fill + inspect). */
export interface HexFeatureProps {
  medianPrice: number;
  count: number;
}

/** Modest fill so the basemap stays legible under the price ramp (both themes). */
const HEX_FILL_OPACITY = 0.6;

interface HexLayerProps {
  cells: HexCell[];
  /** City quantile breaks (`priceScale.breaks`) driving the colour buckets. */
  breaks: number[];
  /** Resolved theme from the canvas — recolours the ramp on toggle in place. */
  theme: Theme;
}

/** Turn an H3 cell into a closed GeoJSON polygon ring ([lng,lat], first==last). */
function cellToFeature(cell: HexCell): Feature<Polygon, HexFeatureProps> {
  const ring = cellToBoundary(cell.h3, true); // [lng, lat] pairs, open ring
  ring.push(ring[0]); // close the ring for a valid Polygon
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: { medianPrice: cell.medianPrice, count: cell.count },
  };
}

/**
 * The hex price source + fill layer. Cells (worker output, held in the map
 * store) become a GeoJSON FeatureCollection on the main thread; an empty set
 * yields an empty collection → no fills (FR-007). The fill colour is a `step`
 * expression over the city's price breaks; a theme toggle only swaps the ramp
 * literals (no source rebuild, no worker recompute).
 */
export function HexLayer({ cells, breaks, theme }: HexLayerProps) {
  const data = useMemo<FeatureCollection<Polygon, HexFeatureProps>>(
    () => ({ type: "FeatureCollection", features: cells.map(cellToFeature) }),
    [cells],
  );

  const fillLayer = useMemo<FillLayerSpecification>(
    () => ({
      id: HEX_FILL_LAYER_ID,
      type: "fill",
      source: HEX_SOURCE_ID,
      paint: {
        "fill-color": priceFillExpression(theme, breaks),
        "fill-opacity": HEX_FILL_OPACITY,
      },
    }),
    [theme, breaks],
  );

  return (
    <Source id={HEX_SOURCE_ID} type="geojson" data={data}>
      <Layer {...fillLayer} />
    </Source>
  );
}
