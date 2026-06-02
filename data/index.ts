// Contract — single source of truth for all data shapes
export type {
  Listing,
  ScopeAggregates,
  Neighbourhood,
  PriceScale,
  CityMeta,
  CityAggregates,
  CityDataset,
  CityIndexEntry,
  RoomType,
} from "./contract";

// Geospatial types (defined in @/lib/geo; re-exported for data-layer consumers)
export type {
  BBox,
  LngLat,
  NeighbourhoodBoundaries,
  NeighbourhoodBoundaryProperties,
} from "@/lib/geo/types";
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

// Repository — the swap seam. Only the loaders call it (via `./repository`);
// it is deliberately NOT re-exported here so UI code goes through the loaders.
export type {
  CityRepository,
  ListingPage,
  ListingQueryPage,
  SnapshotRef,
} from "./repository";

// Server loaders (server-only guard inside; safe to re-export from a barrel).
// These are the ONLY data entry point for components and pages.
export {
  getCitiesData,
  getCityMeta,
  getCityBoundaries,
  getCityNeighbourhoodCount,
  getSidebarScopeAggregates,
  getSidebarListingCount,
  getSidebarFilterBounds,
  unavailableAggregates,
} from "./loaders";
export type { SidebarScopeType } from "./loaders";

// Server-side selectors (run once per request, produce props)
export {
  selectScopeAggregates,
  selectNeighbourhood,
  selectListingById,
  defaultFilters,
} from "./selectors";

// Client-side runtime utilities (filter, sort, live recompute) live in @/lib/filters
