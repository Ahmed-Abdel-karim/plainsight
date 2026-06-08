"use client";

import type { StoreState } from "../index";

export const mapSelectors = {
  mapRef: (s: StoreState) => s.mapRef,
  mapStatus: (s: StoreState) => s.mapStatus,
  city: (s: StoreState) => s.city,
  hexResolution: (s: StoreState) => s.hexResolution,
  hoveredListingId: (s: StoreState) => s.hoveredListingId,
  hoverSource: (s: StoreState) => s.hoverSource,
  hexInspectInfo: (s: StoreState) => s.hexInspectInfo,
  mapActions: (s: StoreState) => s.mapActions,
};
