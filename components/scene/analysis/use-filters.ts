"use client";

/**
 * Filter state, mirrored to the URL via nuqs. Maps the query string ⇄ the
 * `ListingFilters` shape the isomorphic aggregate layer expects. Shallow routing
 * (the nuqs default) keeps it entirely client-side — no server component reads
 * `searchParams`, so the cached scene/loaders are untouched.
 *
 *   ?rooms=Private room,Shared room   → roomTypes (empty/absent = all)
 *   ?price=80,240                     → priceRange (absent = full bounds)
 *
 * `clearOnDefault` keeps the URL clean at the default (full-range, all-rooms)
 * view, which is also the `isDefault` signal the dashboard uses to skip the
 * worker and show pre-baked aggregates.
 */
import { useCallback, useMemo } from "react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";

import { ROOM_TYPES, type RoomType } from "@/data/contract";
import type { ListingFilters } from "@/data/types";

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
  const [query, setQuery] = useQueryStates({
    rooms: parseAsArrayOf(parseAsStringLiteral(ROOM_TYPES)).withDefault([]),
    price: parseAsArrayOf(parseAsInteger).withDefault([bounds.min, bounds.max]),
  });

  const roomTypes = query.rooms;
  const priceRange = useMemo<[number, number]>(() => {
    const [min, max] = query.price;
    return [min ?? bounds.min, max ?? bounds.max];
  }, [query.price, bounds.min, bounds.max]);

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
      // All room types selected is the "no filter" state — clear the param.
      setQuery({ rooms: next.length === ROOM_TYPES.length ? [] : next });
    },
    [setQuery],
  );

  const setPriceRange = useCallback(
    (range: [number, number]) => {
      const atDefault = range[0] === bounds.min && range[1] === bounds.max;
      setQuery({ price: atDefault ? null : range });
    },
    [setQuery, bounds.min, bounds.max],
  );

  const reset = useCallback(() => {
    setQuery({ rooms: null, price: null });
  }, [setQuery]);

  return {
    filters,
    bounds,
    isDefault,
    setRoomTypes,
    setPriceRange,
    reset,
  };
}
