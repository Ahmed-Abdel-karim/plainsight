import type { ProcessRequestMessage } from "@/lib/listings/worker";

export class Slot {
  #pending: ProcessRequestMessage | null = null;
  #inFlight = false;

  offer(message: ProcessRequestMessage) {
    this.#pending = message;
  }

  take(): ProcessRequestMessage | null {
    if (this.#inFlight || !this.#pending) return null;
    const message = this.#pending;
    this.#pending = null;
    this.#inFlight = true;
    return message;
  }

  settle(): boolean {
    if (!this.#inFlight) return false;
    this.#inFlight = false;
    return this.#pending === null;
  }
}
