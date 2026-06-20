import type { MapCityPayload } from "@/data/types";

import type { Context } from "./context";

/**
 * Data required to initialise the city machine — the framing payload the
 * `/[city]` page resolves and the root passes at spawn time.
 */
export interface Input {
  readonly framing: MapCityPayload;
  /**
   * Initial filter, seeded from the URL at spawn time. Passed as input (not a
   * post-spawn `FILTER.SET_*` event) because the freshly spawned actor sits in
   * `loading`, which has no filter handlers — an event would be dropped. Seeding
   * via input means the city reaches `ready` already filtered, so its first
   * hex/aggregate request uses the deep-linked filter instead of computing a
   * default view and then correcting it.
   */
  readonly filter: Context["filter"];
}
