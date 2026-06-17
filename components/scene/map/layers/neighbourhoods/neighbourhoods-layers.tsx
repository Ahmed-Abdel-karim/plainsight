"use client";

import { Source } from "react-map-gl/maplibre";

import type { NeighbourhoodBoundaries } from "@/lib/geo/types";
import { useCityFraming, useMapIsSuppressed } from "../../../state";
import { useCityBoundaries } from "../../../use-city-boundaries";
import { NEIGHBOURHOODS_SOURCE_ID } from "../../constants";
import { MapLayer } from "../layer";
import { getFillLayer, getLabelLayer, getOutlineLayer } from "./styles";
import { useNeighbourhoodsListeners } from "./listeners";

interface NeighbourhoodsLayersProps {
  interactive?: boolean;
}

// Stable empty reference so blanking on a city switch doesn't churn the source.
const EMPTY_BOUNDARIES: NeighbourhoodBoundaries = {
  type: "FeatureCollection",
  features: [],
};

export function NeighbourhoodsLayers({
  interactive = false,
}: NeighbourhoodsLayersProps) {
  const listeners = useNeighbourhoodsListeners();
  const suppressed = useMapIsSuppressed();

  const boundaries = useCityBoundaries(useCityFraming()?.slug ?? null);
  // Blank the boundaries while a city switch is in flight; they repaint from the
  // new city's data on CITY.READY (the map overlay covers them meanwhile).
  const data = suppressed ? EMPTY_BOUNDARIES : boundaries;
  if (!data) return null;

  return (
    <Source id={NEIGHBOURHOODS_SOURCE_ID} type="geojson" data={data}>
      <MapLayer
        getLayerStyles={getFillLayer}
        listeners={listeners}
        visible={interactive}
      />
      <MapLayer getLayerStyles={getOutlineLayer} />
      <MapLayer getLayerStyles={getLabelLayer} />
    </Source>
  );
}
