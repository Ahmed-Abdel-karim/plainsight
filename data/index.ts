// Server-only DAL surface. This barrel re-exports the server data seam (loaders,
// selectors, the repository port) and nothing client-facing: the loaders pull
// `server-only`, so importing this from a Client Component fails the build.
//
// Client-safe vocabulary is NOT re-exported here — import it from its canonical
// module instead:
//   - domain shapes & constants → `@/data/contract`
//   - UI/presentation types     → `@/data/types`
//   - geospatial types          → `@/lib/geo/types`

// Repository — the server-render data seam, re-exported for the loaders.
export type { CityRepository } from "./repository";

// Server loaders (server-only guard inside). The only data entry point for
// Server Components and pages.
export {
  getCitiesData,
  getCityMeta,
  getCityScopeCounts,
  getStatsSnapshot,
  unavailableAggregates,
} from "./loaders";

// Server-side selectors (run once per request, produce props).
export { selectScopeAggregates, selectNeighbourhood } from "./selectors";
