"use client";

import type { StoreState } from "../index";

export const uiSelectors = {
  roomTypes: (s: StoreState) => s.roomTypes,
  priceRange: (s: StoreState) => s.priceRange,
  lens: (s: StoreState) => s.lens,
  selectedId: (s: StoreState) => s.selectedId,
  nbhd: (s: StoreState) => s.nbhd,
  uiActions: (s: StoreState) => s.uiActions,
};
