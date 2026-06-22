import type { ActorRefFrom } from "xstate";

import type { cityMachine } from "../city/machine";

/**
 * Root machine context — the coordinator owns only the spawned `city` actor.
 *
 * The type and its initial value share the name `Context` so a single
 * `import * as Context from "./context"` yields both.
 */
export interface Context {
  /**
   * The `city` actor, spawned fresh per `CITY.CHANGED` and stopped/replaced on
   * the next one. `null` until the first city is dispatched.
   */
  readonly cityRef: ActorRefFrom<typeof cityMachine> | null;
}

export const Context: Context = {
  cityRef: null,
};
