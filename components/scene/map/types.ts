import type { MapLayerEventType } from "maplibre-gl";

import { LAYER_IDS, SOURCE_IDS } from "./constants";

/** Per-event-type optional handler map used by `useLayerListeners`. */
export type LayerListeners = {
  [T in keyof MapLayerEventType]?: (
    event: MapLayerEventType[T] & object,
  ) => void;
};

/** Every addressable map layer. The union the control surface accepts so a
 * caller can only target a layer that actually exists. Widen as domains add layers. */
export type LayerId = (typeof LAYER_IDS)[number];

export type SourceId = (typeof SOURCE_IDS)[number];

/** Narrows an arbitrary string to a registered `LayerId`. Used by `MapLayer` to
 * catch style functions that return an unregistered id at dev time. */
export const isLayerId = (id: string | undefined): id is LayerId =>
  id !== undefined && (LAYER_IDS as readonly string[]).includes(id);

/** Narrows a raw `sourcedata` event id to one of our sources, filtering out the
 * basemap's chatter. */
export const isKnownSourceId = (id: string | undefined): id is SourceId =>
  id !== undefined && (SOURCE_IDS as readonly string[]).includes(id);
