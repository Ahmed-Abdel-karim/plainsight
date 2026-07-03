import type {
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "@/lib/listings";

import { ResultCache } from "./cache";
import { Channel, type ChannelDeps } from "./channel";
import type { Dataset, ProcessType } from "./types";

export interface ProcessControllerDeps {
  postRequest: (message: ProcessRequestMessage) => void;
  emitResult: (response: ProcessResponseMessage) => void;
}

export class ProcessController {
  #cache = new ResultCache();
  #loadedDataset: Dataset | null = null;
  #channels: Record<ProcessType, Channel>;

  constructor(private readonly deps: ProcessControllerDeps) {
    const channelDeps: ChannelDeps = {
      postRequest: deps.postRequest,
      deliverResult: (response) => this.#deliverResult(response),
      getIsDataLoaded: (message) => this.#isDataLoaded(message),
    };

    this.#channels = {
      hexes: new Channel(channelDeps),
      aggregates: new Channel(channelDeps),
    };
  }

  request(message: ProcessRequestMessage): void {
    const cached = this.#cache.get(message.type);
    const channel = this.#channels[message.type];
    const isMessageCached = cached?.requestId === message.requestId;
    if (isMessageCached) {
      channel.clearPendingMessages();
      this.deps.emitResult(cached);
      return;
    }

    channel.submitRequest(message);
  }

  receiveResponse(response: ProcessResponseMessage): void {
    this.#channels[response.payload.type].receiveResponse(response);
  }

  dataReady(dataset: Dataset): void {
    this.#loadedDataset = dataset;
    for (const channel of Object.values(this.#channels)) channel.onDataReady();
  }

  // Abandon all coordination and forget which dataset is loaded, keeping the
  // result cache (content-addressed, still valid). Used on a worker crash and on
  // a scene reset — both leave the worker thread holding nothing.
  reset(): void {
    this.#loadedDataset = null;
    for (const channel of Object.values(this.#channels)) channel.reset();
  }

  #deliverResult(response: ProcessResponseMessage): void {
    if (response.status === "success")
      this.#cache.set(response.payload.type, response);
    this.deps.emitResult(response);
  }

  #isDataLoaded(message: ProcessRequestMessage): boolean {
    const loaded = this.#loadedDataset;
    return (
      loaded !== null &&
      loaded.slug === message.slug &&
      loaded.snapshotId === message.snapshotId
    );
  }
}
