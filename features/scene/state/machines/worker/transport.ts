import { fromCallback } from "xstate";

import {
  createListingsWorker,
  type LoadDataResponseMessage,
  type ProcessRequestMessage,
  type ProcessResponseMessage,
  type RequestMessage,
  type ResponseMessage,
} from "@/lib/listings/worker";

/**
 * What the transport accepts from the machine — two commands:
 *   - `LOAD`  — fetch+cache a city's listings (a cache hit replies near-instantly);
 *   - `POST`  — post a stamped process request.
 * The worker is session-lifetime and serves many cities, so the slug rides on
 * every command, together with the snapshot id, rather than being bound once at construction.
 */
export type TransportCommand =
  | { type: "LOAD"; slug: string; snapshotId: string; assetUrl: string }
  | { type: "POST"; message: ProcessRequestMessage };

export interface TransportInput {
  /** Test seam — omit in app code to use the bundled worker. */
  readonly createWorker?: () => Worker;
}

/**
 * The raw `postMessage` pipe — the only imperative escape hatch in the worker
 * stack. It owns nothing but the wire: it forwards every worker reply up
 * **uninterpreted** (the machine decides what they mean and runs the coalescing
 * `settle`), and posts the `load` / process requests the machine hands it. It
 * terminates the worker on stop.
 *
 * The worker thread is created **lazily on the first command**, not on start: the
 * worker actor is session-lifetime and now mounts on the home page too (the scene
 * providers live in the root layout), but only the city machine ever sends a
 * command, so `/` never pays for a `new Worker()` or its bundle.
 */
export const transportActor = fromCallback<TransportCommand, TransportInput>(
  ({ input, sendBack, receive }) => {
    let worker: Worker | undefined;

    const getWorker = () => {
      if (worker) return worker;
      worker = (input.createWorker ?? createListingsWorker)();

      worker.addEventListener(
        "message",
        ({ data }: MessageEvent<ResponseMessage>) => {
          if (data.payload.type === "load") {
            sendBack({
              type: "TRANSPORT.LOAD_REPLY",
              message: data as LoadDataResponseMessage,
            });
          } else {
            sendBack({
              type: "TRANSPORT.PROCESS_REPLY",
              message: data as ProcessResponseMessage,
            });
          }
        },
      );

      worker.addEventListener("error", (event: ErrorEvent) => {
        sendBack({
          type: "TRANSPORT.WORKER_ERROR",
          error: new Error(event.message || "worker error"),
        });
      });

      return worker;
    };

    receive((event) => {
      const w = getWorker();
      if (event.type === "LOAD") {
        w.postMessage({
          type: "load",
          payload: {
            slug: event.slug,
            snapshotId: event.snapshotId,
            assetUrl: event.assetUrl,
          },
        } satisfies RequestMessage);
      } else {
        w.postMessage(event.message);
      }
    });

    return () => worker?.terminate();
  },
);
