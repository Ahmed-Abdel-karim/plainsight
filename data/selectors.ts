import type {
  CityDataset,
  Listing,
  Neighbourhood,
  ScopeAggregates,
} from "./contract";
import type { ListingFilters, Scope } from "./types";

/** E4-S5 + E5: pre-baked aggregates for the current scope. Runs once per request. */
export function selectScopeAggregates(
  dataset: CityDataset,
  scope: Scope,
): ScopeAggregates {
  if (scope.type === "city") return dataset.cityAggregates;
  return dataset.neighbourhoodAggregates[scope.id] ?? dataset.cityAggregates;
}

/** E4-S2: static neighbourhood lookup. */
export function selectNeighbourhood(
  dataset: CityDataset,
  id: string,
): Neighbourhood | undefined {
  return dataset.neighbourhoods.find((nb) => nb.id === id);
}

/** E6-S4: static lookup for listing detail page SSR. */
export function selectListingById(
  dataset: CityDataset,
  id: number,
): Listing | undefined {
  return dataset.listings.find((l) => l.id === id);
}

/** E7-S2: initial filter bounds derived from the city's priceScale. Runs once per request. */
export function defaultFilters(dataset: CityDataset): ListingFilters {
  return {
    roomTypes: [],
    priceRange: [dataset.priceScale.min, dataset.priceCap],
  };
}
