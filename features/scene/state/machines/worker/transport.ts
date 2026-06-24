import { fromCallback } from "xstate";

import {
  createListingsWorker,
  type LoadDataResponseMessage,
  type ProcessRequestMessage,
  type ProcessResponseMessage,
  type RequestMessage,
  type ResponseMessage,
} from "@/lib/listings";

/**
 * What the transport accepts from the machine — four commands:
 *   - `LOAD`        — fetch+cache a city's listings (a cache hit replies near-instantly);
 *   - `POST`        — post a stamped process request;
 *   - `CANCEL`      — abort the in-flight process with the given `requestId`;
 *   - `CANCEL_LOAD` — abort the in-flight city load(s), keeping cached rows.
 * The worker is session-lifetime and serves many cities, so the slug rides on
 * every command, together with the snapshot id, rather than being bound once at construction.
 */
export type TransportCommand =
  | { type: "LOAD"; slug: string; snapshotId: string; assetUrl: string }
  | { type: "POST"; message: ProcessRequestMessage }
  | { type: "CANCEL"; requestId: number }
  | { type: "CANCEL_LOAD" };

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

      // Fires when a reply can't be deserialized (structured-clone failure) —
      // surface it as a worker error rather than dropping the message silently.
      worker.addEventListener("messageerror", () => {
        sendBack({
          type: "TRANSPORT.WORKER_ERROR",
          error: new Error("worker message error"),
        });
      });

      return worker;
    };

    receive((event) => {
      // A cancel for a worker that was never spawned is a no-op — never let it
      // be the command that pays for `new Worker()`.
      if (event.type === "CANCEL") {
        worker?.postMessage({
          type: "cancel",
          payload: { requestId: event.requestId },
        } satisfies RequestMessage);
        return;
      }
      if (event.type === "CANCEL_LOAD") {
        worker?.postMessage({ type: "cancelLoad" } satisfies RequestMessage);
        return;
      }
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
