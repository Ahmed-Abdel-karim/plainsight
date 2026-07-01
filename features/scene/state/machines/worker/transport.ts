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
 * What the transport accepts from the machine — three commands:
 *   - `LOAD`        — fetch+cache a city's listings (a cache hit responses near-instantly);
 *   - `POST`        — post a stamped process request;
 *   - `CANCEL_LOAD` — abort the in-flight city load(s), keeping cached rows.
 * The worker is session-lifetime and serves many cities, so the slug rides on
 * every command, together with the snapshot id, rather than being bound once at construction.
 */
export type TransportCommand =
  | { type: "LOAD"; slug: string; snapshotId: string; assetUrl: string }
  | { type: "POST"; message: ProcessRequestMessage }
  | { type: "CANCEL_LOAD" };

export interface TransportInput {
  /** Test seam — omit in app code to use the bundled worker. */
  readonly createWorker?: () => Worker;
}

/**
 * The raw `postMessage` pipe — the only imperative escape hatch in the worker
 * stack. It owns nothing but the wire: it forwards every worker response up
 * **uninterpreted** (the machine decides what they mean and runs the coalescing
 * `settle`), and posts the `load` / process requests the machine hands it. It
 * terminates the worker on stop, and releases it on failure — a crashed worker is
 * dropped so the next command lazily spawns a fresh connection.
 *
 * The worker thread is created **lazily on the first command**, not on start: the
 * worker actor is session-lifetime inside the scene layout, but only the city
 * machine sends commands. Entering the scene does not pay for a `new Worker()` or
 * its bundle until a city load/process request actually needs it.
 */

type LoadResponseHandler = (message: LoadDataResponseMessage) => void;
type ProcessResponseHandler = (message: ProcessResponseMessage) => void;
type ErrorHandler = (error: Error) => void;

class WorkerConnection {
  #worker: Worker | undefined;
  #onLoadResponse?: LoadResponseHandler;
  #onProcessResponse?: ProcessResponseHandler;
  #onError?: ErrorHandler;

  constructor(private readonly input: TransportInput) {}

  onLoadResponse(handler: LoadResponseHandler) {
    this.#onLoadResponse = handler;
    return this;
  }
  onProcessResponse(handler: ProcessResponseHandler) {
    this.#onProcessResponse = handler;
    return this;
  }
  onError(handler: ErrorHandler) {
    this.#onError = handler;
    return this;
  }

  /** Lazily spawns the worker and wires its listeners on first use. */
  #get(): Worker {
    if (this.#worker) return this.#worker;

    const worker = (this.input.createWorker ?? createListingsWorker)();
    worker.addEventListener(
      "message",
      ({ data }: MessageEvent<ResponseMessage>) => {
        if (data.payload.type === "load") {
          this.#onLoadResponse?.(data as LoadDataResponseMessage);
        } else {
          this.#onProcessResponse?.(data as ProcessResponseMessage);
        }
      },
    );

    worker.addEventListener("error", (event: ErrorEvent) => {
      this.#onError?.(new Error(event.message || "worker error"));
      this.#release();
    });

    // Fires when a response can't be deserialized (structured-clone failure) —
    // surface it as a worker error rather than dropping the message silently.
    worker.addEventListener("messageerror", () => {
      this.#onError?.(new Error("worker message error"));
      this.#release();
    });
    this.#worker = worker;
    return worker;
  }

  /** Terminate and drop a failed worker so the next command spawns a fresh one.
   *  A crashed worker can't serve further requests; releasing it here lets a later
   *  load/process transparently recover on a new connection. */
  #release() {
    this.#worker?.terminate();
    this.#worker = undefined;
  }

  /** Spawns the worker if needed, then posts. */
  post(message: RequestMessage) {
    this.#get().postMessage(message);
  }

  /** No-op if the worker was never spawned — never pays for `new Worker()`. */
  postIfSpawned(message: RequestMessage) {
    this.#worker?.postMessage(message);
  }

  terminate() {
    this.#worker?.terminate();
  }
}

export const transportActor = fromCallback<TransportCommand, TransportInput>(
  ({ input, sendBack, receive }) => {
    const worker = new WorkerConnection(input);

    worker
      .onLoadResponse((message) =>
        sendBack({ type: "TRANSPORT.LOAD_RESPONSE", message }),
      )
      .onProcessResponse((message) =>
        sendBack({ type: "TRANSPORT.PROCESS_RESPONSE", message }),
      )
      .onError((error) => sendBack({ type: "TRANSPORT.WORKER_ERROR", error }));

    receive((event) => {
      switch (event.type) {
        case "CANCEL_LOAD":
          worker.postIfSpawned({ type: "cancelLoad" } satisfies RequestMessage);
          break;
        case "LOAD":
          worker.post({
            type: "load",
            payload: {
              slug: event.slug,
              snapshotId: event.snapshotId,
              assetUrl: event.assetUrl,
            },
          } satisfies RequestMessage);
          break;
        case "POST":
          worker.post(event.message);
      }
    });

    return () => worker.terminate();
  },
);
