"use client";

import { shallowEqual } from "@xstate/react";
import { useCallback } from "react";

import type { RoomType } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import {
  isDefaultFilters,
  priceBounds,
  resolveFilters,
} from "@/lib/filters/normalize";

import { SceneActorContext } from "../../provider";
import type { CityMachineActor } from "./machine";
import { createMachineStateSelector } from "../utils";

/**
 * Returns the current city actorRef, or `undefined` before the first
 * `CITY.CHANGED` dispatch. Reactive — re-renders consumers when root spawns a
 * new city (i.e. on navigation). Converts `null` → `undefined` so
 * `useSelector` can handle the absent-actor case without a null guard.
 */
function useCityRef(): CityMachineActor | undefined {
  return SceneActorContext.useSelector((s) => s.context.cityRef ?? undefined);
}

const createCitySelector = createMachineStateSelector(useCityRef);

/**
 * Send function for the current city actor. Subscribes to root so it updates
 * when a new city is spawned. Returns `undefined` before the first spawn.
 */
export function useCitySend() {
  return useCityRef()?.send;
}

/** True once the city actor has loaded its data and entered `ready` (the state
 *  in which filters apply and hex/aggregate results stream in). `false` while
 *  `loading`/`error`, or before the first city is spawned. */
export const useCityIsReady = createCitySelector(
  (s) => s?.matches("ready") ?? false,
);

export const useCityFraming = createCitySelector(
  (s) => s?.context.framing ?? null,
);

// --- action hooks ---

export function useSetRoomTypes() {
  const send = useCitySend();
  return useCallback(
    (roomTypes: RoomType[]) =>
      send?.({ type: "FILTER.SET_ROOM_TYPES", roomTypes }),
    [send],
  );
}

export function useSetPriceRange() {
  const send = useCitySend();
  return useCallback(
    (priceRange: [number, number] | null) =>
      send?.({ type: "FILTER.SET_PRICE_RANGE", priceRange }),
    [send],
  );
}

export function useSetNbhd() {
  const send = useCitySend();
  return useCallback(
    (nbhd: string | null) => send?.({ type: "FILTER.SET_NBHD", nbhd }),
    [send],
  );
}

// --- filter ---

export const useRoomTypes = createCitySelector(
  (s) => s?.context.filter.roomTypes ?? [],
);

export const usePriceRange = createCitySelector(
  (s) => s?.context.filter.priceRange ?? null,
);

export const useNbhd = createCitySelector(
  (s) => s?.context.filter.nbhd ?? null,
);

export const usePriceBounds = createCitySelector(
  (s) => priceBounds(s?.context.framing ?? null),
  shallowEqual,
);

export const useResolvedFilters = createCitySelector(
  (s): ListingFilters =>
    resolveFilters(
      s?.context.filter ?? { roomTypes: [], priceRange: null },
      priceBounds(s?.context.framing ?? null),
    ),
  shallowEqual,
);

export const useIsDefaultFilter = createCitySelector((s) =>
  isDefaultFilters(
    s?.context.filter ?? { roomTypes: [], priceRange: null },
    priceBounds(s?.context.framing ?? null),
  ),
);

export function useResetFilters() {
  const send = useCitySend();
  return useCallback(() => {
    send?.({ type: "FILTER.SET_ROOM_TYPES", roomTypes: [] });
    send?.({ type: "FILTER.SET_PRICE_RANGE", priceRange: null });
  }, [send]);
}

/**
 * Composite matching the old `useFilters` facade's return shape, for the one
 * consumer (the filter panel) that drives every control. Setters here are
 * thin pass-throughs — normalization lives in the city machine.
 */
export function useFilterControls() {
  const filters = useResolvedFilters();
  const bounds = usePriceBounds();
  const isDefault = useIsDefaultFilter();
  const setRoomTypes = useSetRoomTypes();
  const setPriceRange = useSetPriceRange();
  const reset = useResetFilters();
  return { filters, bounds, isDefault, setRoomTypes, setPriceRange, reset };
}

// --- worker output ---

export const useAggregates = createCitySelector(
  (s) => s?.context.aggregates ?? null,
);

export const useHexCells = createCitySelector((s) => s?.context.hexCells ?? []);

export const useHexCellsPending = createCitySelector(
  (s) => s?.context.hexCells == null,
);
