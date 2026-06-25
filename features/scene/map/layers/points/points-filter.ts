import type { ExpressionSpecification } from "maplibre-gl";

import type { ListingFilters } from "@/data/types";
import { isAllRoomTypes } from "@/lib/filters/normalize";

/**
 * Build the MapLibre `setFilter` expression for the Browse dot layer from the
 * active price/room filters + neighbourhood scope (ADR D4: the small filter
 * STATE crosses to the GPU, never per-listing ids). Mirrors the `lib/filters`
 * predicate the list uses, so the dots and the list always agree on the set.
 *
 * - price: inclusive `[min, max]` band.
 * - roomTypes: empty = all (no clause); else membership test.
 * - neighbourhood: a neighbourhood narrows by `neighbourhoodId`; `null` (whole
 *   city) adds nothing.
 */
export function pointsFilterExpression(
  filters: ListingFilters,
  neighbourhood: string | null,
): ExpressionSpecification {
  const [min, max] = filters.priceRange;
  const clauses: ExpressionSpecification[] = [
    [">=", ["get", "price"], min],
    ["<=", ["get", "price"], max],
  ];

  if (!isAllRoomTypes(filters.roomTypes)) {
    clauses.push([
      "in",
      ["get", "roomType"],
      ["literal", filters.roomTypes],
    ] as ExpressionSpecification);
  }

  if (neighbourhood !== null) {
    clauses.push(["==", ["get", "neighbourhoodId"], neighbourhood]);
  }

  return ["all", ...clauses];
}
