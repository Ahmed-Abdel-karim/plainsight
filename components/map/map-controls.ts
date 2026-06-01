import { useCallback } from "react";
import type { FitBoundsOptions } from "maplibre-gl";
import { type LngLatBoundsLike } from "react-map-gl/maplibre";
import { useMapRef } from "./map-store";
import type { LayerId } from "./types";
import {
  HIDDEN_PLACE_LABELS,
  RETAINED_PLACE_LABELS,
  basemapLabelTheme,
} from "./basemap";
import type { MapTheme } from "./map-styles";

export type { MapStatus } from "./map-store";

/**
 * Control surface for the WebGL map. Owns the imperative handle and a derived
 * status, and exposes *intentions* (`fitTo`, `markReady`, `markError`) rather
 * than the underlying setters or `getMap()` — so the canvas never reaches into
 * MapLibre directly. This is also the seam tests mock: assert the component
 * issued a command without standing up WebGL.
 */
export function useMapControls() {
  const mapRef = useMapRef();

  const fitTo = useCallback(
    (bounds: LngLatBoundsLike, options?: FitBoundsOptions) => {
      mapRef?.getMap().fitBounds(bounds, options);
    },
    [mapRef],
  );

  const setPaintProperty = useCallback(
    (layerId: LayerId, property: string, value: unknown) => {
      if (!mapRef?.getMap().getLayer(layerId)) {
        console.warn(
          `Layer ${layerId} not found when trying to set paint property ${property}`,
        );
        return;
      }
      mapRef?.getMap().setPaintProperty(layerId, property, value);
    },
    [mapRef],
  );

  const setLayoutProperty = useCallback(
    (layerId: LayerId, property: string, value: unknown) => {
      mapRef?.getMap().setLayoutProperty(layerId, property, value);
    },
    [mapRef],
  );

  const styleBasemapPlaceLabels = useCallback(
    (theme: MapTheme) => {
      const map = mapRef?.getMap();
      if (!map) return;
      for (const id of HIDDEN_PLACE_LABELS[theme]) {
        if (!map.getLayer(id)) continue;
        if (map.getLayoutProperty(id, "visibility") !== "none") {
          map.setLayoutProperty(id, "visibility", "none");
        }
      }
      const { text, halo } = basemapLabelTheme[theme];
      for (const id of RETAINED_PLACE_LABELS[theme]) {
        if (!map.getLayer(id)) continue;
        if (map.getPaintProperty(id, "text-color") !== text) {
          map.setPaintProperty(id, "text-color", text);
          map.setPaintProperty(id, "text-halo-color", halo);
          map.setPaintProperty(id, "text-halo-width", 1.25);
        }
      }
    },
    [mapRef],
  );

  return {
    fitTo,
    setPaintProperty,
    setLayoutProperty,
    styleBasemapPlaceLabels,
    mapRef,
  };
}
