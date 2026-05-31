// Contract — single source of truth for all data shapes
export type {
  Listing,
  ScopeAggregates,
  Neighbourhood,
  PriceScale,
  CityDataset,
  CityIndexEntry,
  NeighbourhoodBoundaries,
  NeighbourhoodBoundaryProperties,
  RoomType,
} from "./contract";
export {
  ROOM_TYPES,
  MIN_LISTING_FLOOR,
  MULTI_LISTING_THRESHOLD,
  PRICE_CAP_PERCENTILE,
  QUANTILE_BREAKS,
  UNASSIGNED_ID,
} from "./contract";

// UI types (TypeScript only — erased at runtime, safe to import anywhere)
export type { CityData, ListingFilters, SortKey, Scope } from "./types";

// Server loaders (server-only guard inside; safe to re-export from a barrel)
export { getCitiesData, getCityDataset, getCityBoundaries } from "./loaders";

// Server-side selectors (run once per request, produce props)
export {
  selectScopeAggregates,
  selectNeighbourhood,
  selectListingById,
  defaultFilters,
} from "./selectors";

// Client-side runtime utilities (filter, sort, live recompute) live in @/lib/filters
