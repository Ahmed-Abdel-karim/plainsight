import type {
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

import type { Theme } from "@/components/theme/theme-provider";

import {
  FILL_LAYER_ID,
  LABEL_LAYER_ID,
  NEIGHBOURHOODS_SOURCE_ID,
  OUTLINE_LAYER_ID,
} from "../constants";

export const fillLayerTheme: Record<Theme, { color: string; opacity: number }> =
  {
    dark: { color: "#cbd5e1", opacity: 0.08 },
    light: { color: "#475569", opacity: 0.09 },
  };

export const getFillLayer = (theme: Theme): FillLayerSpecification => ({
  id: FILL_LAYER_ID,
  type: "fill",
  source: NEIGHBOURHOODS_SOURCE_ID,
  paint: {
    "fill-color": fillLayerTheme[theme].color,
    "fill-opacity": fillLayerTheme[theme].opacity,
  },
});

export const outlineLayerTheme: Record<Theme, string> = {
  dark: "#cbd5e1",
  light: "#475569",
};

export const getOutlineLayer = (theme: Theme): LineLayerSpecification => ({
  id: OUTLINE_LAYER_ID,
  type: "line",
  source: NEIGHBOURHOODS_SOURCE_ID,
  paint: {
    "line-color": outlineLayerTheme[theme],
    "line-width": 1,
  },
});

/** Label text + halo, tuned to read on each basemap (light text on dark tiles, dark text on positron). */
export const labelLayerTheme: Record<Theme, { text: string; halo: string }> = {
  dark: { text: "#e2e8f0", halo: "#0f172a" },
  light: { text: "#1e293b", halo: "#f8fafc" },
};

export const getLabelLayer = (theme: Theme): SymbolLayerSpecification => ({
  id: LABEL_LAYER_ID,
  type: "symbol",
  source: NEIGHBOURHOODS_SOURCE_ID,
  layout: {
    "text-field": ["get", "name"],
    "text-size": 12,
    "text-font": ["Noto Sans Regular"],
    "text-transform": "uppercase",
    "text-letter-spacing": 0.05,
    "text-max-width": 8,
    "symbol-placement": "point", // one label at each polygon's centroid
  },
  paint: {
    // defaults; overridden by NeighbourhoodsLayers when theme changes
    "text-color": labelLayerTheme[theme].text,
    "text-halo-color": labelLayerTheme[theme].halo,
    "text-halo-width": 1.25,
  },
});
