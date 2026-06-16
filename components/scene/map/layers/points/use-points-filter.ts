"use client";

/**
 * The GPU `filter` expression for the Browse dot layer, read at the point of
 * use rather than threaded through the canvas. Composes the shared filter state
 * (`useResolvedFilters`) and neighbourhood scope (`useScope`) — both store-backed
 * — into the memoized MapLibre expression the circle layer consumes.
 *
 * Keeping this beside the layer (the way `useListingsHexCells` feeds the hex
 * layer) keeps `MapCanvas` from re-rendering on every filter/scope change and
 * leaves the points layer the sole owner of its derived render input. The memo
 * is load-bearing: `pointsFilterExpression` allocates a fresh array each call,
 * so an un-memoized read would hand MapLibre a new `setFilter` every render.
 */
import { useMemo } from "react";

import type { FilterSpecification } from "maplibre-gl";

import { useResolvedFilters } from "../../../state";
import { useScope } from "../../../use-scope";
import { pointsFilterExpression } from "./points-filter";

export function usePointsFilter(): FilterSpecification {
  const filters = useResolvedFilters();
  const { scope } = useScope();

  return useMemo(
    () => pointsFilterExpression(filters, scope),
    [filters, scope],
  );
}
