import { useCallback } from "react";
import { useMapRef } from "../stores";
import type { LayerId, SourceId } from "./types";
import {
  HIDDEN_PLACE_LABELS,
  RETAINED_PLACE_LABELS,
  basemapLabelTheme,
} from "./basemap";
import { Theme } from "@/components/theme/theme-provider";

export type { MapStatus } from "../stores";

/**
 * Control surface for the WebGL map. Exposes imperative style mutations
 * (`setPaintProperty`, `setLayoutProperty`, `setFeatureState`,
 * `styleBasemapPlaceLabels`) without exposing `getMap()` directly. The seam
 * tests mock: assert style mutations were issued without standing up WebGL.
 */
export function useMapControls() {
  const mapRef = useMapRef();

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

  // Recolour/resize a single feature via MapLibre feature-state (no source
  // re-issue). Guards source readiness — the source may not yet hold this id on
  // first activation/deep-link, so the call is swallowed and callers re-apply on
  // the next idle.
  const setFeatureState = useCallback(
    (source: SourceId, id: number, state: Record<string, boolean>) => {
      const map = mapRef?.getMap();
      if (!map?.getSource(source)) return;
      try {
        map.setFeatureState({ source, id }, state);
      } catch {
        /* source not ready for this id yet — re-applied on the next idle */
      }
    },
    [mapRef],
  );

  const styleBasemapPlaceLabels = useCallback(
    (theme: Theme) => {
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
    setPaintProperty,
    setLayoutProperty,
    setFeatureState,
    styleBasemapPlaceLabels,
    mapRef,
  };
}
