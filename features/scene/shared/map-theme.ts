import type { Map as MaplibreMap } from "maplibre-gl";

import type { Theme } from "@/components/theme/theme-provider";

/** Basemap place-label layers hidden in the city scene: city (already in the
 *  sidebar, and the map is locked to that one city), neighbourhood/suburb (owned
 *  by our `NeighbourhoodsLayers` overlay), and state/country (redundant context
 *  at city zoom). Layer IDs differ between the OpenFreeMap dark and positron
 *  styles, so they're keyed by theme. `place_other` / `label_other` are the
 *  neighbourhood/hamlet/quarter catch-all layers. */
export const HIDDEN_PLACE_LABELS: Record<Theme, readonly string[]> = {
  dark: [
    "place_city",
    "place_city_large",
    "place_suburb",
    "place_other",
    "place_state",
    "place_country_other",
    "place_country_minor",
    "place_country_major",
  ],
  light: [
    "label_city",
    "label_city_capital",
    "label_other",
    "label_state",
    "label_country_1",
    "label_country_2",
    "label_country_3",
  ],
};

/** Surrounding town/village labels we keep for geographic orientation — these are
 *  the towns/villages *around* the focus city, not the focus city itself. */
export const RETAINED_PLACE_LABELS: Record<Theme, readonly string[]> = {
  dark: ["place_town", "place_village"],
  light: ["label_town", "label_village"],
};

/** Muted treatment for the retained town/village labels — mirrors the `--map-label`
 *  token (as rgba, since MapLibre's color parser can't read oklch) so they recede
 *  behind the brighter neighbourhood overlay labels (#e2e8f0 / #1e293b) and read as
 *  secondary basemap context. */
export const basemapLabelTheme: Record<Theme, { text: string; halo: string }> =
  {
    dark: { text: "rgba(241,245,249,0.58)", halo: "#0f172a" }, // ≈ --map-label dark
    light: { text: "rgba(51,65,85,0.82)", halo: "#f8fafc" }, // ≈ --map-label light
  };

/** Restyles basemap place labels (hide/retain/recolour) for the current theme.
 *  MapLibre re-issues its own label paint on every style (re)load, so this runs
 *  again whenever the style reloads. */
export function applyMapTheme(map: MaplibreMap, theme: Theme): void {
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
}
