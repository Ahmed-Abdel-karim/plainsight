import type { ActorRefFrom } from "xstate";

import type { cityMachine } from "../city/machine";
import type { mapMachine } from "../map/machine";
import type { navigationMachine } from "../navigation/machine";
import type { uiMachine } from "../ui/machine";

/**
 * Root machine context. The coordinator holds the refs to the persistent
 * `map`/`ui`/`navigation` actors (spawned once in the machine's initial context
 * factory) and the dynamic `city` actor (spawned per `CITY.CHANGED`,
 * stopped/replaced on the next one). `navigation` is spawned (not invoked)
 * because React reads it over `system.get` during render, which only resolves
 * once the ref exists at actor-creation time. The `worker`, which React never
 * reads, stays invoked and is reached over `system.get` from other actors.
 */
export interface Context {
  readonly mapRef: ActorRefFrom<typeof mapMachine>;
  readonly uiRef: ActorRefFrom<typeof uiMachine>;
  readonly navigationRef: ActorRefFrom<typeof navigationMachine>;
  /** `null` until the first city is dispatched. */
  readonly cityRef: ActorRefFrom<typeof cityMachine> | null;
}
