"use client";

import type { Feature, FeatureCollection, Polygon } from "geojson";
import { cellToBoundary } from "h3-js";
import { useCallback, useMemo } from "react";
import { Source } from "react-map-gl/maplibre";

import type { Theme } from "@/components/theme/theme-provider";
import type { HexCell } from "@/lib/hex/types";

import { HEX_SOURCE_ID } from "../../constants";
import { MapLayer } from "../layer";
import { getFillLayer } from "./styles";
import { useHexListeners } from "./listeners";
import { HexInspect } from "./hex-inspect";

/** Properties carried on each hex feature (read by the fill + inspect). */
export interface HexFeatureProps {
  medianPrice: number;
  count: number;
}

interface HexLayersProps {
  cells: HexCell[];
  /** City quantile breaks (`priceScale.breaks`) driving the colour buckets. */
  breaks: number[];
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
export function HexLayers({ cells, breaks, visible = true }: HexLayersProps) {
  const data = useMemo<FeatureCollection<Polygon, HexFeatureProps>>(
    () => ({ type: "FeatureCollection", features: cells.map(cellToFeature) }),
    [cells],
  );

  const getHexLayerStyles = useCallback(
    (theme: Theme, v?: boolean) => getFillLayer(theme, breaks, v ?? true),
    [breaks],
  );

  const listeners = useHexListeners(visible, cells);

  return (
    <>
      <HexInspect />
      <Source id={HEX_SOURCE_ID} type="geojson" data={data}>
        <MapLayer
          getLayerStyles={getHexLayerStyles}
          visible={visible}
          listeners={listeners}
        />
      </Source>
    </>
  );
}
