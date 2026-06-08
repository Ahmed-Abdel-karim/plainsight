"use client";

import type { Feature, FeatureCollection, Polygon } from "geojson";
import { cellToBoundary } from "h3-js";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import type { Theme } from "@/components/theme/theme-provider";
import type { HexCell } from "@/lib/hex/types";

import { HEX_SOURCE_ID } from "../constants";
import { getFillLayer } from "./styles";
import { useHexListeners } from "./listeners";

/** Properties carried on each hex feature (read by the fill + inspect). */
export interface HexFeatureProps {
  medianPrice: number;
  count: number;
}

interface HexLayersProps {
  cells: HexCell[];
  /** City quantile breaks (`priceScale.breaks`) driving the colour buckets. */
  breaks: number[];
  /** Resolved theme from the canvas — recolours the ramp on toggle in place. */
  theme: Theme;
  /** Hidden in the Browse lens (the dots take over); shown in Analyse (FR-006). */
  visible?: boolean;
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
 * yields an empty collection → no fills (FR-007). Per-layer style stays in
 * `styles.ts`; the canvas composes this and never touches the source id.
 */
export function HexLayers({
  cells,
  breaks,
  theme,
  visible = true,
}: HexLayersProps) {
  const data = useMemo<FeatureCollection<Polygon, HexFeatureProps>>(
    () => ({ type: "FeatureCollection", features: cells.map(cellToFeature) }),
    [cells],
  );

  const fillLayer = useMemo(
    () => getFillLayer(theme, breaks, visible),
    [theme, breaks, visible],
  );
  useHexListeners(visible, cells);

  return (
    <Source id={HEX_SOURCE_ID} type="geojson" data={data}>
      <Layer {...fillLayer} />
    </Source>
  );
}
