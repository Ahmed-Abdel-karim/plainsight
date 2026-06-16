import type { MapCityPayload } from "@/data/types";

/**
 * Data required to initialise the city machine — the framing payload the
 * `/[city]` page resolves and the root passes at spawn time.
 */
export interface Input {
  readonly framing: MapCityPayload;
}
