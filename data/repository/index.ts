import "server-only";

import { postgresRepository } from "./postgres";
import type {
  CityRepository,
  ListingPage,
  ListingQueryPage,
  SnapshotRef,
} from "./port";
import { staticJsonRepository } from "./static-json";

export type { CityRepository, ListingPage, ListingQueryPage, SnapshotRef };

let cached: CityRepository | undefined;

/**
 * Resolve the active data source. Memoised for the process. Selected by the
 * `DATA_SOURCE` env var (`"static"` default | `"postgres"`); reading it here —
 * not `cookies()`/`headers()` — keeps cached reads request-API-free, so
 * `cacheComponents` stays intact. This is the ONE place a real DB gets wired in.
 */
export function getRepository(): CityRepository {
  if (cached) return cached;
  cached =
    process.env.DATA_SOURCE === "postgres"
      ? postgresRepository
      : staticJsonRepository;
  return cached;
}
