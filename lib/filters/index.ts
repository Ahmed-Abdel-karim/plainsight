/**
 * Plainsight — Filter / aggregation utilities
 * -----------------------------------------------------------------------------
 * Pure, isomorphic functions for slicing and summarising listings. Client-safe
 * (no `server-only`, type-only imports from the contract) so the SAME code runs
 * on the server (the repository's on-demand filtered path) and on the client
 * (live recompute as the user drags filters). One implementation → the map and
 * the charts can never drift on what "the filtered set" is.
 */
export { filterListings } from "./filter";
export { sortListings } from "./sort";
export { computeAggregates } from "./aggregate";
