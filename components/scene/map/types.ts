import {
  FILL_LAYER_ID,
  HEX_FILL_LAYER_ID,
  LABEL_LAYER_ID,
  OUTLINE_LAYER_ID,
  POINTS_CIRCLE_LAYER_ID,
  SOURCE_IDS,
} from "./constants";

/** Every addressable map layer. The union the control surface accepts so a
 * caller can only target a layer that actually exists. Widen as domains add layers. */
export type LayerId =
  | typeof FILL_LAYER_ID
  | typeof OUTLINE_LAYER_ID
  | typeof LABEL_LAYER_ID
  | typeof HEX_FILL_LAYER_ID
  | typeof POINTS_CIRCLE_LAYER_ID;

export type SourceId = (typeof SOURCE_IDS)[number];

/** Narrows a raw `sourcedata` event id to one of our sources, filtering out the
 * basemap's chatter. */
export const isKnownSourceId = (id: string | undefined): id is SourceId =>
  id !== undefined && (SOURCE_IDS as readonly string[]).includes(id);
