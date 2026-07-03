import type {
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "@/lib/listings";

/**
 * The Channel's collaborators, injected so the Channel itself performs no I/O
 * and knows nothing about the worker, the cache, or datasets — which keeps it
 * unit-testable by passing spies.
 *
 * - `postRequest`   — take the worker action for a request (internally the connector).
 * - `deliverResult` — hand a result up; the controller's impl caches then forwards,
 *                     so the Channel stays cache-blind.
 * - `getIsDataLoaded` — is this request's dataset loaded yet?
 */
export interface ChannelDeps {
  postRequest: (message: ProcessRequestMessage) => void;
  deliverResult: (response: ProcessResponseMessage) => void;
  getIsDataLoaded: (message: ProcessRequestMessage) => boolean;
}

/**
 * One calculation type's coordination: at most one request in flight, newest
 * request wins, and a request whose data isn't loaded is held until
 * `onDataReady`.
 *
 * Because `requestId` is content-addressed (unique per city + slug + params), a
 * single `#latestRequestedMessage` — what the city currently wants — doubles as
 * both the intent *and* the response match-key. A response matching it is the
 * latest wanted result (deliver); one that doesn't is superseded or abandoned
 * (drop, and post the latest instead). So we never track "what is physically in
 * flight" separately — the returning response resolves that.
 *
 * `#hasRequestInFlight` stays independent: it's *physical channel occupancy*,
 * cleared only when a response actually returns. `clearPendingMessages` drops the
 * wanted message but keeps `#hasRequestInFlight`, so the next request can't post
 * over a worker still computing the abandoned one.
 */
export class Channel {
  #latestRequestedMessage: ProcessRequestMessage | null = null;
  #hasRequestInFlight = false;

  constructor(private readonly deps: ChannelDeps) {}

  /** The city asked for `message`. Newest wins. */
  submitRequest(message: ProcessRequestMessage): void {
    this.#latestRequestedMessage = message;
    this.#postLatestIfReady();
  }

  /** A response for this type came back from the worker. */
  receiveResponse(response: ProcessResponseMessage): void {
    this.#hasRequestInFlight = false;

    const isResponseForLatestRequest =
      this.#latestRequestedMessage?.requestId === response.requestId;

    if (isResponseForLatestRequest) {
      this.#latestRequestedMessage = null; // satisfied
      this.deps.deliverResult(response);
      return;
    }

    // Superseded or abandoned: drop this response, post what we now want.
    this.#postLatestIfReady();
  }

  /** Listings for the wanted message's dataset are now loaded — flush it. */
  onDataReady(): void {
    this.#postLatestIfReady();
  }

  /**
   * Cache hit: the cached result is the newest thing wanted, so forget any
   * outstanding request (its response drops on arrival). `#hasRequestInFlight`
   * is kept — the worker is still busy, and the next request must wait for it to
   * actually return.
   */
  clearPendingMessages(): void {
    this.#latestRequestedMessage = null;
  }

  /** The worker died: forget everything, including that it was busy. */
  reset(): void {
    this.#latestRequestedMessage = null;
    this.#hasRequestInFlight = false;
  }

  /** Post the wanted message iff the channel is free and its data is loaded. */
  #postLatestIfReady(): void {
    const pendingMessage = this.#latestRequestedMessage;
    const isDataLoaded =
      pendingMessage && this.deps.getIsDataLoaded(pendingMessage);
    const isWorkerFree = !this.#hasRequestInFlight;
    if (pendingMessage && isDataLoaded && isWorkerFree) {
      this.#hasRequestInFlight = true;
      this.deps.postRequest(pendingMessage);
    }
  }
}
