"use client";

import { Source } from "react-map-gl/maplibre";

import { useCityFraming } from "../../../state";
import { useCityBoundaries } from "../../../use-city-boundaries";
import { NEIGHBOURHOODS_SOURCE_ID } from "../../constants";
import { MapLayer } from "../layer";
import { getFillLayer, getLabelLayer, getOutlineLayer } from "./styles";
import { useNeighbourhoodsListeners } from "./listeners";

interface NeighbourhoodsLayersProps {
  interactive?: boolean;
}

export function NeighbourhoodsLayers({
  interactive = false,
}: NeighbourhoodsLayersProps) {
  const listeners = useNeighbourhoodsListeners();

  const boundaries = useCityBoundaries(useCityFraming()?.slug ?? null);
  if (!boundaries) return null;

  return (
    <Source id={NEIGHBOURHOODS_SOURCE_ID} type="geojson" data={boundaries}>
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
