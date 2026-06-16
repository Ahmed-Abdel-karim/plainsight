import type { MapLayerEventType } from "maplibre-gl";

import {
  FILL_LAYER_ID,
  HEX_FILL_LAYER_ID,
  LABEL_LAYER_ID,
  OUTLINE_LAYER_ID,
  POINTS_CIRCLE_LAYER_ID,
  SOURCE_IDS,
} from "./constants";

/** Per-event-type optional handler map used by `useLayerListeners`. */
export type LayerListeners = {
  [T in keyof MapLayerEventType]?: (
    event: MapLayerEventType[T] & object,
  ) => void;
};

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

const LAYER_IDS: readonly string[] = [
  FILL_LAYER_ID,
  OUTLINE_LAYER_ID,
  LABEL_LAYER_ID,
  HEX_FILL_LAYER_ID,
  POINTS_CIRCLE_LAYER_ID,
];

/** Narrows an arbitrary string to a registered `LayerId`. Used by `MapLayer` to
 * catch style functions that return an unregistered id at dev time. */
export const isLayerId = (id: string | undefined): id is LayerId =>
  id !== undefined && LAYER_IDS.includes(id);
