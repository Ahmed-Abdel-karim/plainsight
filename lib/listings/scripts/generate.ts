import type { CityAggregates, Listing, Neighbourhood } from "@/data/contract";
import type { FilterBounds } from "@/data/types";

import { createListingsService } from "../service/create-listings-service";

export function buildCityAggregates(
  rows: readonly Listing[],
  bounds: FilterBounds,
  names: Record<string, string>,
): CityAggregates {
  const snapshot = createListingsService(
    rows,
    bounds,
  ).getUnfilteredStatsSnapshot();

  const neighbourhoods: Neighbourhood[] = Object.entries(
    snapshot.neighbourhoods,
  )
    .map(([id, agg]) => ({
      id,
      name: names[id] ?? id,
      medianPrice: agg.medianPrice,
      listingCount: agg.listingCount,
      meetsFloor: agg.meetsFloor,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    cityAggregates: snapshot.city,
    neighbourhoods,
    neighbourhoodAggregates: snapshot.neighbourhoods,
  };
}
