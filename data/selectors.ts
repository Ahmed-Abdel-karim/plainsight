import type {
  CityAggregates,
  Neighbourhood,
  ScopeAggregates,
} from "./contract";

/** Selects the precomputed aggregates for a neighbourhood (`null` = whole city). */
export function selectScopeAggregates(
  aggregates: CityAggregates,
  neighbourhood: string | null,
): ScopeAggregates {
  if (neighbourhood === null) return aggregates.cityAggregates;
  return (
    aggregates.neighbourhoodAggregates[neighbourhood] ??
    aggregates.cityAggregates
  );
}

/** Looks up a static neighbourhood by id. */
export function selectNeighbourhood(
  aggregates: CityAggregates,
  id: string,
): Neighbourhood | undefined {
  return aggregates.neighbourhoods.find((nb) => nb.id === id);
}
