export type MapTheme = "dark" | "light";

export const OPENFREEMAP_STYLE: Record<MapTheme, string> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};

export const OVERLAY_LINE: Record<MapTheme, string> = {
  dark: "#cbd5e1",
  light: "#475569",
};

export const POI_LAYER_HINTS = ["poi"] as const;
