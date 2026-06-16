import type {
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "./processes";
import type { RequestMessageType, ResponseMessageType } from "./types";
export {
  type ProcessRequestMessage,
  type ProcessResponseMessage,
} from "./processes";

export type LoadDataRequestMessage = RequestMessageType<"load", string>;
export type LoadDataResponseMessage = ResponseMessageType<
  "load",
  {
    type: "load";
    data: {
      slug: string;
      count: number;
    };
  }
>;

export type RequestMessage = LoadDataRequestMessage | ProcessRequestMessage;
export type ResponseMessage = LoadDataResponseMessage | ProcessResponseMessage;

/** Spawn the bundled listings worker. Lives here so the bundler-resolved
 *  `new URL("./worker.ts", import.meta.url)` stays next to the worker entry. */
export function createListingsWorker(): Worker {
  return new Worker(new URL("./worker.ts", import.meta.url));
}
