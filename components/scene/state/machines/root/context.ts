import type { ActorRefFrom } from "xstate";

import type { cityMachine } from "../city/machine";

/**
 * Root machine context — state the scene root owns directly.
 *
 * The type and its initial value share the name `Context` so a single
 * `import * as Context from "./context"` yields both.
 */
export interface Context {
  /**
   * The `city` actor. It is *spawned* fresh per slug on `CITY.CHANGED` (not
   * invoked), so the root holds its ref here to stop/replace it on the next
   * navigation. `null` until the first city is dispatched.
   */
  readonly cityRef: ActorRefFrom<typeof cityMachine> | null;
  /**
   * The slug being navigated to. Set at `NAV.START`, cleared at `CITY.READY`.
   * Latest-wins when a second `NAV.START` arrives before the first resolves.
   */
  readonly pendingSlug: string | null;
}

export const Context: Context = {
  cityRef: null,
  pendingSlug: null,
};
