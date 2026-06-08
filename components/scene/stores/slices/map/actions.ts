"use client";

import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerEventType, Subscription } from "maplibre-gl";
import type { HexResolution } from "@/lib/hex/types";
import type { LayerId, SourceId } from "../../../map/types";
import type {
  MapStatus,
  LayerListeners,
  HexInspectInfo,
  MapCityPayload,
} from "./types";
import type { SetFn, GetFn } from "../types";
import type { MapState } from "./state";

type LayerEventType = keyof MapLayerEventType;

function registerLayerListener<T extends LayerEventType>(
  mapRef: MapRef,
  layerId: LayerId,
  eventType: T,
  listener: LayerListeners[T],
): Subscription | undefined {
  if (!listener) return;
  return mapRef.on(eventType, layerId, listener);
}

export function createMapActions(set: SetFn<MapState>, get: GetFn<MapState>) {
  return {
    setMapRef: (mapRef: MapRef | null) => set({ mapRef }),
    setMapStatus: (mapStatus: MapStatus) => set({ mapStatus }),
    setCity: (city: MapCityPayload) => set({ city }),
    setHexResolution: (hexResolution: HexResolution) => set({ hexResolution }),
    setHoveredListing: (
      hoveredListingId: number | null,
      hoverSource: "list" | "map",
    ) =>
      set({
        hoveredListingId,
        hoverSource: hoveredListingId === null ? null : hoverSource,
      }),
    setHexInspectInfo: (hexInspectInfo: HexInspectInfo | null) =>
      set({ hexInspectInfo }),
    // Write-guarded so the `sourcedata` firehose only touches the store on an
    // actual loaded↔unloaded flip — repeated same-value events are no-ops.
    setSourceLoaded: (sourceId: SourceId, loaded: boolean) => {
      if (!!get().loadedSources[sourceId] === loaded) return;
      set((state) => ({
        loadedSources: { ...state.loadedSources, [sourceId]: loaded },
      }));
    },
    setLayerListeners: ({
      layerId,
      listeners,
    }: {
      layerId: LayerId;
      listeners: LayerListeners;
    }) => {
      get().layersSubscriptions[layerId]?.forEach((s) => s.unsubscribe());
      const mapRef = get().mapRef;
      const subscriptions = (Object.keys(listeners) as LayerEventType[]).map(
        (eventType) =>
          mapRef &&
          registerLayerListener(
            mapRef,
            layerId,
            eventType,
            listeners[eventType],
          ),
      );
      set((state) => ({
        layersSubscriptions: {
          ...state.layersSubscriptions,
          [layerId]: subscriptions.filter((s): s is Subscription => !!s),
        },
      }));
    },
    removeEventListeners: (layerId: LayerId) => {
      set((state) => {
        const layerSubscriptions = state.layersSubscriptions[layerId];
        layerSubscriptions?.forEach((s) => s.unsubscribe());
        const layersSubscriptions = { ...state.layersSubscriptions };
        delete layersSubscriptions[layerId];
        return { layersSubscriptions };
      });
    },
  };
}

export type MapActions = ReturnType<typeof createMapActions>;
