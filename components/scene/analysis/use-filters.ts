"use client";

/**
 * Filter state, read from the scene store and shared (through that store, not
 * props) across the Analyse cards, the filter panel, the Browse list, and the
 * map. The store mirrors the selection to the URL as a `replaceState` side-effect
 * — no consumer reads `useSearchParams`, so none of them force a `cacheComponents`
 * dynamic/Suspense hole (the reason this moved off nuqs).
 *
 *   ?rooms=Private room,Shared room   → roomTypes (empty/absent = all)
 *   ?price=80,240                     → priceRange (absent = full bounds)
 *
 * The store holds `priceRange` nullable (`null` = full range); this hook resolves
 * it against the city's `bounds` and keeps the public shape (`isDefault`,
 * `setRoomTypes`, `setPriceRange`, `reset`) byte-for-byte what it was under nuqs,
 * so every consumer is untouched. `isDefault` (full-range, all-rooms) is the
 * signal the dashboard uses to skip the worker and show pre-baked aggregates.
 */
import { useCallback, useMemo } from "react";

import { type RoomType } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import { usePriceRange, useRoomTypes, useSceneActions } from "../scene-store";

export interface FilterBounds {
  min: number;
  max: number;
}

export interface UseFiltersResult {
  filters: ListingFilters;
  bounds: FilterBounds;
  isDefault: boolean;
  setRoomTypes: (roomTypes: RoomType[]) => void;
  setPriceRange: (range: [number, number]) => void;
  reset: () => void;
}

export function useFilters(bounds: FilterBounds): UseFiltersResult {
  const roomTypes = useRoomTypes();
  const rawPriceRange = usePriceRange();
  const {
    setRoomTypes,
    setPriceRange: setStorePriceRange,
    reset,
  } = useSceneActions();

  const priceRange = useMemo<[number, number]>(
    () => [rawPriceRange?.[0] ?? bounds.min, rawPriceRange?.[1] ?? bounds.max],
    [rawPriceRange, bounds.min, bounds.max],
  );

  const filters = useMemo<ListingFilters>(
    () => ({ roomTypes, priceRange }),
    [roomTypes, priceRange],
  );

  const isDefault =
    roomTypes.length === 0 &&
    priceRange[0] === bounds.min &&
    priceRange[1] === bounds.max;

  const setPriceRange = useCallback(
    (range: [number, number]) => {
      // A full-range selection is the "no filter" state — store `null` so the
      // URL clears the `price` param.
      const atDefault = range[0] === bounds.min && range[1] === bounds.max;
      setStorePriceRange(atDefault ? null : range);
    },
    [setStorePriceRange, bounds.min, bounds.max],
  );

  return {
    filters,
    bounds,
    isDefault,
    setRoomTypes,
    setPriceRange,
    reset,
  };
}
