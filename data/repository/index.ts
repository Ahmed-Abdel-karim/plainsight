import "server-only";

import type { CityRepository } from "./port";
import { staticJsonRepository } from "./static-json";

export type { CityRepository };

/**
 * Resolve the active data source. The product ships one immutable static
 * snapshot read from `data/snapshots/`, so there is a single adapter; this stays a
 * function (not a bare `const`) to keep the loaders depending on a seam rather
 * than a concrete module, and to leave one obvious place to wire a different
 * source in. Reading no request API (`cookies()`/`headers()`) here keeps cached
 * reads request-API-free, so `cacheComponents` stays intact.
 */
export function getRepository(): CityRepository {
  return staticJsonRepository;
}
