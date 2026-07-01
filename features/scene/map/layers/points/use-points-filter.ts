"use client";

/**
 * The GPU `filter` expression for the Browse dot layer, derived on the city
 * actor rather than threaded through the canvas. Composes the resolved filter
 * state and neighbourhood scope into the MapLibre expression the circle layer
 * consumes.
 *
 * Keeping this beside the layer (the way `useHexCells` feeds the hex layer)
 * keeps `MapCanvas` from re-rendering on every filter/scope change and leaves
 * the points layer the sole owner of its derived render input.
 * `pointsFilterExpression` allocates a fresh array each call, so the selector
 * compares by value (`isDeepEqual`) — MapLibre only gets a new `setFilter` when
 * the expression actually changes.
 */
import type { FilterSpecification } from "maplibre-gl";

import { priceBounds, resolveFilters } from "@/lib/filters/normalize";
import { createCitySelector } from "@/features/scene/state";
import { pointsFilterExpression } from "./points-filter";
import { isDeepEqual } from "remeda";

export const usePointsFilter = createCitySelector(
  (s): FilterSpecification =>
    pointsFilterExpression(
      resolveFilters(
        s?.context.filter ?? { roomTypes: [], priceRange: null },
        priceBounds(s?.context.framing ?? null),
      ),
      s?.context.filter.nbhd ?? null,
    ),
  isDeepEqual,
);
