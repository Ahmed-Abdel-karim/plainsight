import type {
  CityAggregates,
  CityMeta,
  Neighbourhood,
  ScopeAggregates,
} from "./contract";
import type { ListingFilters, Scope } from "./types";

/** Selects the pre-baked aggregates for the current market scope. */
export function selectScopeAggregates(
  cube: CityAggregates,
  scope: Scope,
): ScopeAggregates {
  if (scope.type === "city") return cube.cityAggregates;
  return cube.neighbourhoodAggregates[scope.id] ?? cube.cityAggregates;
}

/** Looks up a static neighbourhood by id. */
export function selectNeighbourhood(
  cube: CityAggregates,
  id: string,
): Neighbourhood | undefined {
  return cube.neighbourhoods.find((nb) => nb.id === id);
}

/** Initial listing filters derived from the city's full price range. */
export function defaultFilters(meta: CityMeta): ListingFilters {
  return {
    roomTypes: [],
    priceRange: [meta.priceScale.min, meta.priceCap],
  };
}
