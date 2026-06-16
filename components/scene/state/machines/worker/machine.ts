import { fromCallback, type ActorRefFrom } from "xstate";

import { CityListingsClient } from "@/lib/listings/client";

import type * as Events from "./events";
import type * as Input from "./input";

/**
 * Worker actor — a fromCallback wrapping one CityListingsClient per city slug.
 * The client is the real state machine (idle/loading/ready/failed internally);
 * this actor bridges its imperative callbacks to the XState event bus and
 * routes REQUEST_* events from city into client.requestProcess().
 *
 * No XState context or finite states — context.ts and actions.ts remain stubs.
 */
export const workerActor = fromCallback<Events.Events, Input.Input>(
  ({ input, receive, sendBack }) => {
    const client = new CityListingsClient({
      slug: input.slug,
      callbacks: {
        onFetchSuccess: (count) => sendBack({ type: "WORKER.FETCH_OK", count }),
        onFetchError: (error) =>
          sendBack({ type: "WORKER.FETCH_ERROR", error }),
        onProcessSuccess: (result) =>
          sendBack({ type: "WORKER.PROCESS_RESULT", result }),
        onProcessError: (processType, error) =>
          sendBack({ type: "WORKER.PROCESS_ERROR", processType, error }),
      },
    });

    receive((event) => {
      if (event.type === "WORKER.REQUEST_HEXES") {
        client.requestProcess({
          type: "hexes",
          params: { filters: event.filters, resolution: event.hexResolution },
        });
      } else if (event.type === "WORKER.REQUEST_AGGREGATES") {
        client.requestProcess({
          type: "aggregates",
          params: { scope: event.scope, filters: event.filters },
        });
      }
    });

    return () => {
      client.dispose();
    };
  },
);

export type WorkerActorRef = ActorRefFrom<typeof workerActor>;
