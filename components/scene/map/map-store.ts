"use client";

import type { MapRef } from "react-map-gl/maplibre";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { BBox, LngLat, NeighbourhoodBoundaries, PriceScale } from "@/data";
import type { HexResolution } from "@/lib/hex/types";

export type MapStatus = "loading" | "ready" | "error";

/** Default overview resolution; the canvas re-seeds it from the initial zoom. */
const DEFAULT_HEX_RESOLUTION: HexResolution = 6;

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
  /** Quantile price breaks (+ min/max) colouring the hex layer + legend. */
  priceScale: PriceScale;
  /** ISO currency code for price labels (e.g. "GBP", "EUR"). */
  currency: string;
}

interface State {
  mapRef: MapRef | null;
  mapStatus: MapStatus;
  city: MapCityPayload | null;
  /** Current H3 resolution bucket, derived from the map zoom. */
  hexResolution: HexResolution;
  /**
   * Ephemeral hovered Browse listing id, shared between the sidebar list and the
   * `ssr:false` map canvas (the two trees that must agree on the hover). Not
   * URL-worthy — it changes every pointer move. `null` when nothing is hovered.
   */
  hoveredListingId: number | null;
  /** Where the current hover originated, so the list only scrolls when the map
   * drives the hover (and never fights the pointer when the list drives it). */
  hoverSource: "list" | "map" | null;
}

interface Actions {
  setMapRef: (mapRef: MapRef | null) => void;
  setMapStatus: (mapStatus: MapStatus) => void;
  setCity: (city: MapCityPayload) => void;
  setHexResolution: (resolution: HexResolution) => void;
  setHoveredListing: (id: number | null, source: "list" | "map") => void;
}

export const useMapStore = create<State & { actions: Actions }>()((set) => ({
  mapRef: null,
  mapStatus: "loading",
  city: null,
  hexResolution: DEFAULT_HEX_RESOLUTION,
  hoveredListingId: null,
  hoverSource: null,
  actions: {
    setMapRef: (mapRef) => set({ mapRef }),
    setMapStatus: (mapStatus) => set({ mapStatus }),
    setCity: (city) => set({ city }),
    setHexResolution: (hexResolution) => set({ hexResolution }),
    setHoveredListing: (hoveredListingId, hoverSource) =>
      set({
        hoveredListingId,
        hoverSource: hoveredListingId === null ? null : hoverSource,
      }),
  },
}));

export const useMapActions = () => useMapStore((state) => state.actions);
export const useMapStatus = () =>
  useMapStore(useShallow((state) => state.mapStatus));
export const useMapRef = () => useMapStore(useShallow((state) => state.mapRef));
export const useMapCity = () => useMapStore((state) => state.city);
export const useHexResolution = () =>
  useMapStore((state) => state.hexResolution);
export const useHoveredListingId = () =>
  useMapStore((state) => state.hoveredListingId);
export const useHoverSource = () => useMapStore((state) => state.hoverSource);
