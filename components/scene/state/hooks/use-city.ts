"use client";

import { useCallback } from "react";

import type { RoomType } from "@/data/contract";

import { SceneActorContext } from "../provider";
import type { CityMachineActor } from "../machines/city/machine";
import { createMachineStateSelector } from "./utils";

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

// useCityIsReady added once the city machine gains a `ready` state.

export const useCityFraming = createCitySelector(
  (s) => s?.context.framing ?? null,
);

// --- action hooks ---

/**
 * Bulk-seeds all three filter fields in one call. Used by `UrlStoreSync` to
 * restore URL state on first city mount. Returns `undefined` before the city
 * actor exists — callers must gate the effect on `!!useCitySend()`.
 */
export function useSeedCityFilter() {
  const send = useCitySend();
  return useCallback(
    (filter: {
      roomTypes: RoomType[];
      priceRange: [number, number] | null;
      nbhd: string | null;
    }) => {
      send?.({ type: "FILTER.SET_ROOM_TYPES", roomTypes: filter.roomTypes });
      send?.({
        type: "FILTER.SET_PRICE_RANGE",
        priceRange: filter.priceRange,
      });
      send?.({ type: "FILTER.SET_NBHD", nbhd: filter.nbhd });
    },
    [send],
  );
}

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

// --- worker output ---

export const useAggregates = createCitySelector(
  (s) => s?.context.aggregates ?? null,
);

export const useHexCells = createCitySelector((s) => s?.context.hexCells ?? []);
