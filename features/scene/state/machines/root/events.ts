import type { MapCityPayload } from "@/data/types";

import type { Input as CityInput } from "../city/input";
import type { NavStarted } from "../navigation/events";

export interface Init {
  readonly type: "xstate.init";
}

/**
 * A new city was navigated to. The `/[city]` page dispatches this per slug; the
 * coordinator (re)spawns the `city` actor, passing `payload` as the city
 * machine's `input.framing`.
 */
export interface CityChanged {
  readonly type: "CITY.CHANGED";
  readonly payload: MapCityPayload;
  /** Initial filter seeded from the URL — passed to the city machine's input. */
  readonly filter: CityInput["filter"];
}

/** City actor converged — coordinator resumes map + ui. */
export interface CityReady {
  readonly type: "CITY.READY";
}

/** City load terminally failed — coordinator resumes map + ui so controls are
 *  usable again (recovery path). */
export interface CityFailed {
  readonly type: "CITY.FAILED";
}

/** Projected scene selection changed; mirror it to the URL. */
export interface UrlSync {
  readonly type: "URL.SYNC";
}

export type Events =
  | Init
  | CityChanged
  | NavStarted
  | CityReady
  | CityFailed
  | UrlSync;
