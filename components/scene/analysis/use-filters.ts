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

import { ROOM_TYPES, type RoomType } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import {
  useCityFraming,
  usePriceRange,
  useRoomTypes,
  useSetPriceRange,
  useSetRoomTypes,
} from "../state";

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

export function useFilters(): UseFiltersResult {
  const city = useCityFraming();
  const bounds = city
    ? { min: city.priceScale.min, max: city.priceCap }
    : { min: 0, max: 0 };
  const roomTypes = useRoomTypes();
  const storedPriceRange = usePriceRange();
  const _setRoomTypes = useSetRoomTypes();
  const _setPriceRange = useSetPriceRange();

  const priceRange = useMemo<[number, number]>(
    () => [
      storedPriceRange?.[0] ?? bounds.min,
      storedPriceRange?.[1] ?? bounds.max,
    ],
    [storedPriceRange, bounds.min, bounds.max],
  );

  const filters = useMemo<ListingFilters>(
    () => ({ roomTypes, priceRange }),
    [roomTypes, priceRange],
  );

  const isDefault =
    roomTypes.length === 0 &&
    priceRange[0] === bounds.min &&
    priceRange[1] === bounds.max;

  const setRoomTypes = useCallback(
    (next: RoomType[]) => {
      // Mirror the filter store's normalization: all-selected == no filter.
      const normalised = next.length === ROOM_TYPES.length ? [] : next;
      _setRoomTypes(normalised);
    },
    [_setRoomTypes],
  );

  const setPriceRange = useCallback(
    (range: [number, number]) => {
      // A full-range selection is the "no filter" state — store `null` so the
      // URL clears the `price` param.
      const atDefault = range[0] === bounds.min && range[1] === bounds.max;
      _setPriceRange(atDefault ? null : range);
    },
    [_setPriceRange, bounds.min, bounds.max],
  );

  const reset = useCallback(() => {
    _setRoomTypes([]);
    _setPriceRange(null);
  }, [_setRoomTypes, _setPriceRange]);

  return {
    filters,
    bounds,
    isDefault,
    setRoomTypes,
    setPriceRange,
    reset,
  };
}
