import type { ActorRefFrom } from "xstate";

import type { cityMachine } from "../city/machine";
import type { mapMachine } from "../map/machine";
import type { uiMachine } from "../ui/machine";

/**
 * Root machine context. The coordinator holds the refs to the actors the React
 * tree reads: the persistent `map`/`ui` actors (spawned once in the machine's
 * initial context factory) and the dynamic `city` actor (spawned per
 * `CITY.CHANGED`, stopped/replaced on the next one). Actors React never reads —
 * `worker`/`navigation` — stay invoked and are reached over `system.get`.
 */
export interface Context {
  readonly mapRef: ActorRefFrom<typeof mapMachine>;
  readonly uiRef: ActorRefFrom<typeof uiMachine>;
  /** `null` until the first city is dispatched. */
  readonly cityRef: ActorRefFrom<typeof cityMachine> | null;
}
