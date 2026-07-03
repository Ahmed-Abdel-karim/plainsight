import type { ProcessResponseMessage } from "@/lib/listings";

import type { ProcessType } from "./types";

export class ResultCache {
  #results: Record<ProcessType, ProcessResponseMessage | null> = {
    hexes: null,
    aggregates: null,
  };

  get(type: ProcessType): ProcessResponseMessage | null {
    return this.#results[type];
  }

  set(type: ProcessType, response: ProcessResponseMessage): void {
    this.#results[type] = response;
  }
}
