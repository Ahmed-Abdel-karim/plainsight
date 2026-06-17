"use client";

import type { Feature, FeatureCollection, Polygon } from "geojson";
import { cellToBoundary } from "h3-js";
import { useCallback, useMemo } from "react";
import { Source } from "react-map-gl/maplibre";

import type { Theme } from "@/components/theme/theme-provider";
import type { HexCell } from "@/lib/hex/types";

import {
  useHexCells,
  useMapIsSuppressed,
  useCityFraming,
} from "../../../state";
import { useLens } from "../../../use-lens";
import { HEX_SOURCE_ID } from "../../constants";
import { MapLayer } from "../layer";
import { getFillLayer } from "./styles";
import { useHexListeners } from "./listeners";
import { HexInspect } from "./hex-inspect";

// Stable empty reference so the suppressed-hex case doesn't churn memos.
const NO_CELLS: HexCell[] = [];
const EMPTY_BREAKS: number[] = [];

/** Properties carried on each hex feature (read by the fill + inspect). */
export interface HexFeatureProps {
  medianPrice: number;
  count: number;
}

function cellToFeature(cell: HexCell): Feature<Polygon, HexFeatureProps> {
  const ring = cellToBoundary(cell.h3, true);
  ring.push(ring[0]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: { medianPrice: cell.medianPrice, count: cell.count },
  };
}

export function HexLayers() {
  const { isBrowse } = useLens();
  const visible = !isBrowse;

  const suppressed = useMapIsSuppressed();
  const hexCells = useHexCells();
  const cells = suppressed ? NO_CELLS : hexCells;

  const city = useCityFraming();
  const breaks = city?.priceScale.breaks ?? EMPTY_BREAKS;

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
