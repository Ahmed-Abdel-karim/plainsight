import type { MapCityPayload } from "@/data/types";

import type { Input as CityInput } from "../city/input";
import type * as Input from "./input";

/** Auto-fired when the actor starts; carries the machine `input`. */
export interface Init {
  readonly type: "xstate.init";
  readonly input: Input.Input;
}

/**
 * A new city was navigated to. The `/[city]` page dispatches this per slug; the
 * root (re)spawns the `city` actor in response, passing `payload` as the city
 * machine's `input.framing`.
 */
export interface CityChanged {
  readonly type: "CITY.CHANGED";
  readonly payload: MapCityPayload;
  /** Initial filter seeded from the URL — passed to the city machine's input. */
  readonly filter: CityInput["filter"];
}

/**
 * In-scene city switch initiated (city-switcher click). Root enters `navigating`,
 * stamps `pendingSlug`, and fans out to `map` + `ui` via `system.get`.
 * NOT fired on first entry from the home picker — that has no previous city to suppress.
 */
export interface NavStart {
  readonly type: "NAV.START";
  readonly slug: string;
}

/**
 * City actor converged (first hex results landed). Root exits `navigating → idle`
 * and clears `pendingSlug`. Map and ui receive this directly from `city` — root
 * does not relay it.
 */
export interface CityReady {
  readonly type: "CITY.READY";
}

/**
 * The projected scene selection changed and the URL should be mirrored. A bare
 * signal — the root's `syncUrl` action reads the live `ui` + `city` snapshots,
 * so no payload is carried. Handled only in `running.idle`; dropped while
 * `navigating` so intermediate city-switch state never clobbers the URL.
 */
export interface UrlSync {
  readonly type: "URL.SYNC";
}

export type Events = Init | CityChanged | NavStart | CityReady | UrlSync;
