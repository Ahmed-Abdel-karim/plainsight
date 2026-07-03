import {
  createListingsWorker,
  type LoadDataRequestMessage,
  type LoadDataResponseMessage,
  type ProcessRequestMessage,
  type ProcessResponseMessage,
  type ResponseMessage,
} from "@/lib/listings";

export interface WorkerConnectorHandlers {
  onLoadResponse: (message: LoadDataResponseMessage) => void;
  onProcessResponse: (message: ProcessResponseMessage) => void;
  onError: (error: Error) => void;
}

/**
 * The raw `postMessage` pipe — the only I/O in the worker stack. It owns the
 * `Worker` and forwards every response up uninterpreted; coordination lives in
 * the controller. The worker spawns lazily on first use and is dropped on
 * failure so the next command respawns a fresh one.
 */
export class WorkerConnector {
  #worker: Worker | undefined;
  #handlers: WorkerConnectorHandlers | undefined;

  constructor(
    private readonly createWorker: () => Worker = createListingsWorker,
  ) {}

  listen(handlers: WorkerConnectorHandlers): void {
    this.#handlers = handlers;
  }

  load(payload: LoadDataRequestMessage["payload"]): void {
    this.#connect().postMessage({ type: "load", payload });
  }

  cancelLoad(): void {
    this.#worker?.postMessage({ type: "cancelLoad" });
  }

  post(message: ProcessRequestMessage): void {
    this.#connect().postMessage(message);
  }

  terminate(): void {
    this.#worker?.terminate();
  }

  #connect(): Worker {
    if (this.#worker) return this.#worker;
    const worker = this.createWorker();
    worker.addEventListener(
      "message",
      ({ data }: MessageEvent<ResponseMessage>) => {
        if (data.payload.type === "load")
          this.#handlers?.onLoadResponse(data as LoadDataResponseMessage);
        else this.#handlers?.onProcessResponse(data as ProcessResponseMessage);
      },
    );
    worker.addEventListener("error", (event) =>
      this.#fail(event.message || "worker error"),
    );
    worker.addEventListener("messageerror", () =>
      this.#fail("worker message error"),
    );

    this.#worker = worker;
    return worker;
  }

  #fail(message: string): void {
    this.#handlers?.onError(new Error(message));
    this.#worker?.terminate();
    this.#worker = undefined;
  }
}
