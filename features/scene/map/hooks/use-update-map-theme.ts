import { useCallback } from "react";
import { useMapRef } from "../../state";
import { useResolvedTheme } from "@/components/theme/theme-provider";
import {
  basemapLabelTheme,
  HIDDEN_PLACE_LABELS,
  RETAINED_PLACE_LABELS,
} from "../map-styles";

/**
 * Restyles basemap place labels (hide/retain/recolour) for the current theme.
 * Returns a stable callback meant for the map's `onLoad`/`onStyleData`
 * handlers, since MapLibre re-issues its own label paint on style (re)load.
 */
export function useUpdateMapTheme() {
  const mapRef = useMapRef();
  const theme = useResolvedTheme();

  return useCallback(() => {
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
  }, [mapRef, theme]);
}
