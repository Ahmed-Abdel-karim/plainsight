import type {
  CityAggregates,
  CityMeta,
  Listing,
  Neighbourhood,
  ScopeAggregates,
} from "./contract";
import type { ListingFilters, Scope } from "./types";

/** E4-S5 + E5: pre-baked aggregates for the current scope. Runs once per request. */
export function selectScopeAggregates(
  cube: CityAggregates,
  scope: Scope,
): ScopeAggregates {
  if (scope.type === "city") return cube.cityAggregates;
  return cube.neighbourhoodAggregates[scope.id] ?? cube.cityAggregates;
}

/** E4-S2: static neighbourhood lookup. */
export function selectNeighbourhood(
  cube: CityAggregates,
  id: string,
): Neighbourhood | undefined {
  return cube.neighbourhoods.find((nb) => nb.id === id);
}

/** E6-S4: static lookup for listing detail page SSR. */
export function selectListingById(
  listings: readonly Listing[],
  id: number,
): Listing | undefined {
  return listings.find((l) => l.id === id);
}

/** E7-S2: initial filter bounds derived from the city's priceScale. Runs once per request. */
export function defaultFilters(meta: CityMeta): ListingFilters {
  return {
    roomTypes: [],
    priceRange: [meta.priceScale.min, meta.priceCap],
  };
}
