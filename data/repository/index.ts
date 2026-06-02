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

/**
 * Resolve the active data source. Selected by the `DATA_SOURCE` env var
 * (`"static"` default | `"postgres"`); reading it here — not
 * `cookies()`/`headers()` — keeps cached reads request-API-free, so
 * `cacheComponents` stays intact. Both adapters are module singletons, so the
 * select is free; this stays a function (not a bare `const`) to defer the env
 * read to call time and leave room for a lazy `await import("./postgres")`.
 * This is the ONE place a real DB gets wired in.
 */
export function getRepository(): CityRepository {
  return process.env.DATA_SOURCE === "postgres"
    ? postgresRepository
    : staticJsonRepository;
}
