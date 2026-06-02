"use client";

import type { MapRef } from "react-map-gl/maplibre";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BBox, LngLat, NeighbourhoodBoundaries } from "@/data";

export type MapStatus = "loading" | "ready" | "error";

/**
 * Per-city data the persistent map renders. The map is mounted once in the
 * `(scene)` layout (above the `[city]` segment, so it survives navigation); each
 * city page pushes its server-fetched payload here via `MapDataSync`, and the
 * canvas reacts (`flyTo` + GeoJSON swap) instead of remounting.
 */
export interface MapCityPayload {
  slug: string;
  cityName: string;
  boundaries: NeighbourhoodBoundaries | null;
  bbox: BBox;
  center: LngLat;
  neighbourhoodCount: number;
}

interface State {
  mapRef: MapRef | null;
  mapStatus: MapStatus;
  city: MapCityPayload | null;
}

interface Actions {
  setMapRef: (mapRef: MapRef | null) => void;
  setMapStatus: (mapStatus: MapStatus) => void;
  setCity: (city: MapCityPayload) => void;
}

export const useMapStore = create<State & { actions: Actions }>()((set) => ({
  mapRef: null,
  mapStatus: "loading",
  city: null,
  actions: {
    setMapRef: (mapRef) => set({ mapRef }),
    setMapStatus: (mapStatus) => set({ mapStatus }),
    setCity: (city) => set({ city }),
  },
}));

export const useMapActions = () => useMapStore((state) => state.actions);
export const useMapStatus = () =>
  useMapStore(useShallow((state) => state.mapStatus));
export const useMapRef = () => useMapStore(useShallow((state) => state.mapRef));
export const useMapCity = () => useMapStore((state) => state.city);
