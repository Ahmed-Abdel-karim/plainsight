"use client";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";

import { useScope } from "../../use-scope";
import { FILL_LAYER_ID, POINTS_CIRCLE_LAYER_ID } from "../constants";
import { useMapRef } from "../../stores";
import { useLayerListeners } from "../use-layer-listeners";

export function useNeighbourhoodsListeners(interactive: boolean): void {
  const mapRef = useMapRef();
  const { toggleNeighbourhood } = useScope();

  useLayerListeners(
    FILL_LAYER_ID,
    {
      click: (event: MapLayerMouseEvent) => {
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
    interactive,
  );
}
