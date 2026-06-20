import type { ExpressionSpecification } from "maplibre-gl";

import type { ListingFilters, Scope } from "@/data/types";

/**
 * Build the MapLibre `setFilter` expression for the Browse dot layer from the
 * active price/room filters + neighbourhood scope (ADR D4: the small filter
 * STATE crosses to the GPU, never per-listing ids). Mirrors the `lib/filters`
 * predicate the list uses, so the dots and the list always agree on the set.
 *
 * - price: inclusive `[min, max]` band.
 * - roomTypes: empty = all (no clause); else membership test.
 * - scope: a neighbourhood narrows by `neighbourhoodId`; city-wide adds nothing.
 */
export function pointsFilterExpression(
  filters: ListingFilters,
  scope: Scope,
): ExpressionSpecification {
  const [min, max] = filters.priceRange;
  const clauses: ExpressionSpecification[] = [
    [">=", ["get", "price"], min],
    ["<=", ["get", "price"], max],
  ];

  if (filters.roomTypes.length > 0) {
    clauses.push([
      "in",
      ["get", "roomType"],
      ["literal", filters.roomTypes],
    ] as ExpressionSpecification);
  }

  if (scope.type === "neighbourhood") {
    clauses.push(["==", ["get", "neighbourhoodId"], scope.id]);
  }

  return ["all", ...clauses];
}
