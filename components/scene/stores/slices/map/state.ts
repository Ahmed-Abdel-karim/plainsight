"use client";

import type { MapRef } from "react-map-gl/maplibre";
import type { Subscription } from "maplibre-gl";
import type { HexResolution } from "@/lib/hex/types";
import type { LayerId, SourceId } from "../../../map/types";
import type {
  MapStatus,
  LayerListeners,
  HexInspectInfo,
  MapCityPayload,
} from "./types";

export interface MapState {
  mapRef: MapRef | null;
  mapStatus: MapStatus;
  city: MapCityPayload | null;
  hexResolution: HexResolution;
  hoveredListingId: number | null;
  hoverSource: "list" | "map" | null;
  hexInspectInfo: HexInspectInfo | null;
  layersSubscriptions: Partial<Record<LayerId, readonly Subscription[]>>;
  // Which of our sources currently hold parsed data. Fed by MapCanvas's
  // `onSourceData` handler and read via useIsSourceLoaded — layers gate
  // feature-state re-apply on it.
  loadedSources: Partial<Record<SourceId, boolean>>;
}

// Re-export for convenience — actions.ts picks these up from here
export type { LayerListeners };

export const initialMapState: MapState = {
  mapRef: null,
  mapStatus: "loading",
  city: null,
  hexResolution: 6,
  hoveredListingId: null,
  hoverSource: null,
  hexInspectInfo: null,
  layersSubscriptions: {},
  loadedSources: {},
};
