//Source IDs
export const NEIGHBOURHOODS_SOURCE_ID = "neighbourhoods";
export const HEX_SOURCE_ID = "hex-price";
export const POINTS_SOURCE_ID = "browse-points";

export const SOURCE_IDS = [
  NEIGHBOURHOODS_SOURCE_ID,
  HEX_SOURCE_ID,
  POINTS_SOURCE_ID,
] as const;

// Layer IDs
export const FILL_LAYER_ID = "neighbourhoods-fill";
export const OUTLINE_LAYER_ID = "neighbourhoods-outline";
export const LABEL_LAYER_ID = "neighbourhoods-label";
export const HEX_FILL_LAYER_ID = "hex-price-fill";
export const POINTS_CIRCLE_LAYER_ID = "browse-points-circle";

export const LAYER_IDS = [
  FILL_LAYER_ID,
  OUTLINE_LAYER_ID,
  LABEL_LAYER_ID,
  HEX_FILL_LAYER_ID,
  POINTS_CIRCLE_LAYER_ID,
] as const;
