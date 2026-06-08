"use client";

import type { RoomType } from "@/data/contract";
import type { Lens } from "@/lib/search-params";

export interface UiState {
  roomTypes: RoomType[];
  priceRange: [number, number] | null;
  lens: Lens;
  selectedId: number | null;
  nbhd: string | null;
}

export const initialUiState: UiState = {
  roomTypes: [],
  priceRange: null,
  lens: "analyse",
  selectedId: null,
  nbhd: null,
};
