"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";

import { useScope } from "../../../use-scope";
import { POINTS_CIRCLE_LAYER_ID } from "../../constants";
import { useMapRef } from "../../../state";
import type { LayerListener } from "../layer";

export function useNeighbourhoodsListeners(): LayerListener[] {
  const mapRef = useMapRef();
  const { toggleNeighbourhood } = useScope();

  return [
    {
      type: "click",
      listener: (event: MapLayerMouseEvent) => {
        const map = mapRef;
        let clickedPoint = false;
        if (map?.getLayer(POINTS_CIRCLE_LAYER_ID)) {
          clickedPoint =
            map.queryRenderedFeatures(event.point, {
              layers: [POINTS_CIRCLE_LAYER_ID],
            }).length > 0;
        }
        if (clickedPoint) return;

        const nbhdId = event.features?.[0]?.properties?.id;
        if (typeof nbhdId === "string") toggleNeighbourhood(nbhdId);
      },
    },
  ];
}
