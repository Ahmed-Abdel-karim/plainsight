"use client";

import { shallowEqual } from "@xstate/react";
import { useCallback } from "react";

import type { RoomType } from "@/data/contract";
import type { ListingFilters } from "@/data/types";
import {
  isDefaultFilters,
  priceBounds,
  resolveFilters,
  resolvePriceRange,
} from "@/lib/filters/normalize";
import { isDefaultListingSelection } from "@/lib/listings";

import { SceneActorContext } from "../../provider";
import type { CityMachineActor } from "./machine";
import { createMachineStateSelector } from "../utils";

/**
 * Returns the current city actorRef, or `undefined` before the first
 * `CITY.CHANGED` dispatch. Reactive — re-renders consumers when root spawns a
 * new city (i.e. on navigation). Converts `null` → `undefined` so
 * `useSelector` can handle the absent-actor case without a null guard.
 */
export function useCityRef(): CityMachineActor | undefined {
  return SceneActorContext.useSelector((s) => s.context.cityRef ?? undefined);
}

export const createCitySelector = createMachineStateSelector(useCityRef);

/**
 * Send function for the current city actor. Subscribes to root so it updates
 * when a new city is spawned. Returns `undefined` before the first spawn.
 */
export function useCitySend() {
  return useCityRef()?.send;
}

/** True once the active leg (`browse` or `analyse`) has loaded its data and
 *  entered `ready`. `false` while a leg is `loading`/`error`, while `deciding`,
 *  or before the first city is spawned. */
export const useCityIsReady = createCitySelector(
  (s) =>
    (s?.matches({ browse: "ready" }) || s?.matches({ analyse: "ready" })) ??
    false,
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

/** The active scope's unfiltered listing total, selected from the city actor's
 *  server-seeded framing: the per-neighbourhood total, falling back to the
 *  city-wide total when city-scoped (or a neighbourhood id is missing). `null`
 *  until framing is seeded. Mirrors `selectScopeAggregates`'s neighbourhood-or-
 *  city selection, applied to the count cube. */
export const useScopeListingCount = createCitySelector((s) => {
  const framing = s?.context.framing;
  if (!framing) return null;
  const nbhd = s.context.filter.nbhd;
  return nbhd === null
    ? framing.cityListingCount
    : (framing.neighbourhoodListingCounts[nbhd] ?? framing.cityListingCount);
});

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

/**
 * Display variant of {@link useResolvedFilters} for the filter panel: resolves
 * the price to the concrete `[min, cap]` band so the slider handles sit on the
 * displayed bounds. (`useResolvedFilters` opens the top to `Infinity` for the
 * predicate — that must not reach the slider.)
 */
export const useDisplayFilters = createCitySelector((s): ListingFilters => {
  const filter = s?.context.filter ?? { roomTypes: [], priceRange: null };
  const bounds = priceBounds(s?.context.framing ?? null);
  return {
    roomTypes: filter.roomTypes,
    priceRange: resolvePriceRange(filter.priceRange, bounds),
  };
}, shallowEqual);

export const useIsDefaultFilter = createCitySelector((s) =>
  isDefaultFilters(
    s?.context.filter ?? { roomTypes: [], priceRange: null },
    priceBounds(s?.context.framing ?? null),
  ),
);

/** True when the active selection is city-wide with default room/price filters. */
export const useIsDefaultListingSelection = createCitySelector((s) =>
  isDefaultListingSelection(
    s?.context.filter ?? { roomTypes: [], priceRange: null, nbhd: null },
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
 * Clears filters *and* neighbourhood scope — the "show me results again"
 * affordance for the empty state, which should widen scope back to the whole
 * city, unlike the filter panel's {@link useResetFilters} (scope is not a
 * filter, so the panel reset leaves it untouched).
 */
export function useResetView() {
  const send = useCitySend();
  return useCallback(() => {
    send?.({ type: "FILTER.SET_ROOM_TYPES", roomTypes: [] });
    send?.({ type: "FILTER.SET_PRICE_RANGE", priceRange: null });
    send?.({ type: "FILTER.SET_NBHD", nbhd: null });
  }, [send]);
}

export function useFilterControls() {
  const filters = useDisplayFilters();
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
