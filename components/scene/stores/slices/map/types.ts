"use client";

import type { MapLayerEventType } from "maplibre-gl";
import type { PriceScale } from "@/data/contract";
import type { BBox, LngLat, NeighbourhoodBoundaries } from "@/lib/geo/types";

export type MapStatus = "loading" | "ready" | "error";

type LayerEventType = keyof MapLayerEventType;
export type LayerListeners = {
  [T in LayerEventType]?: (event: MapLayerEventType[T] & object) => void;
};

export interface HexInspectInfo {
  longitude: number;
  latitude: number;
  medianPrice: number;
  count: number;
}

export interface MapCityPayload {
  slug: string;
  cityName: string;
  boundaries: NeighbourhoodBoundaries | null;
  bbox: BBox;
  center: LngLat;
  neighbourhoodCount: number;
  priceScale: PriceScale;
  priceCap: number;
  currency: string;
  snapshotLabel: string;
}
