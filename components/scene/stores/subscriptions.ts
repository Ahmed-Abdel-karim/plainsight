"use client";

/**
 * Composes all scene-store subscriptions. Order is not load-bearing — each
 * subscription is independent (requests adopt their own city worker via the
 * idempotent `ensureClient`), so no subscription depends on another running
 * first.
 *
 * Every subscription is a plain `{ select, filter, effect }` config; slice
 * configs are co-located in their slice folders and registered here.
 */
import { shallow } from "zustand/shallow";

import { scopeFromNbhd } from "@/lib/search-params";
import { mapSubscriptions } from "./slices/map/subscriptions";
import { uiSubscriptions } from "./slices/ui/subscriptions";
import { mapSelectors } from "./slices/map/selectors";
import { uiSelectors } from "./slices/ui/selectors";
import { combineSelectors } from "./utils/combine-selectors";
import {
  defineSubscriptions,
  type SceneStore,
} from "./utils/define-subscription";

const hexInputs = combineSelectors({
  city: mapSelectors.city,
  hexResolution: mapSelectors.hexResolution,
  roomTypes: uiSelectors.roomTypes,
  priceRange: uiSelectors.priceRange,
});

const aggregateInputs = combineSelectors({
  city: mapSelectors.city,
  nbhd: uiSelectors.nbhd,
  roomTypes: uiSelectors.roomTypes,
  priceRange: uiSelectors.priceRange,
});

const crossSliceSubscriptions = defineSubscriptions([
  // Recompute hexes whenever city, resolution, or filters change. The request
  // adopts the city's worker itself, so this needs no prior city sync.
  {
    select: hexInputs,
    equalityFn: shallow,
    filter: ({ city }) => !!city?.priceScale,
    effect: ({ city, hexResolution, roomTypes, priceRange }, store) => {
      const range: [number, number] = priceRange ?? [
        city!.priceScale.min,
        city!.priceScale.max,
      ];
      store
        .getState()
        .listingsActions.requestHexes(
          city!.slug,
          { roomTypes, priceRange: range },
          hexResolution,
        );
    },
  },
  // Recompute the scope's aggregates whenever the city, neighbourhood scope, or
  // filters move. Mirrors the hex subscription, but resolves the price range
  // against the filter bounds `[priceScale.min, priceCap]` (matching
  // `useFilterBounds`/`use-filters` — deliberately `priceCap`, not
  // `priceScale.max`). `requestAggregates` no-ops on the default view, so the
  // computed `isDefault` keeps the worker idle until a filter goes non-default.
  {
    select: aggregateInputs,
    equalityFn: shallow,
    filter: ({ city }) => !!city?.priceScale,
    effect: ({ city, nbhd, roomTypes, priceRange }, store) => {
      const range: [number, number] = priceRange ?? [
        city!.priceScale.min,
        city!.priceCap,
      ];
      const isDefault =
        roomTypes.length === 0 &&
        range[0] === city!.priceScale.min &&
        range[1] === city!.priceCap;
      store
        .getState()
        .listingsActions.requestAggregates(
          city!.slug,
          scopeFromNbhd(nbhd),
          { roomTypes, priceRange: range },
          isDefault,
        );
    },
  },
]);

export function registerSubscriptions(store: SceneStore) {
  const registrars = [
    ...mapSubscriptions,
    ...uiSubscriptions,
    ...crossSliceSubscriptions,
  ];
  for (const register of registrars) register(store);
}
