"use client";

import { ROOM_TYPES } from "@/data/contract";
import type { RoomType } from "@/data/contract";
import type { Lens } from "@/lib/search-params";
import type { UiState } from "./state";
import type { SetFn, GetFn } from "../types";

export function createUiActions(set: SetFn<UiState>, get: GetFn<UiState>) {
  return {
    seed: (next: UiState) => set(next),
    setRoomTypes: (roomTypes: RoomType[]) => {
      const normalised =
        roomTypes.length === ROOM_TYPES.length ? [] : roomTypes;
      set({ roomTypes: normalised });
    },
    setPriceRange: (priceRange: [number, number] | null) => set({ priceRange }),
    reset: () => set({ roomTypes: [], priceRange: null }),
    setLens: (lens: Lens) =>
      set(lens === "analyse" ? { lens, selectedId: null } : { lens }),
    selectListing: (selectedId: number | null) => set({ selectedId }),
    setNeighbourhood: (nbhd: string | null) => set({ nbhd }),
    toggleNeighbourhood: (id: string) =>
      set({ nbhd: get().nbhd === id ? null : id }),
  };
}

export type UiActions = ReturnType<typeof createUiActions>;
