import type {
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "./processes";
import type { RequestMessageType, ResponseMessageType } from "./types";
export {
  type ProcessRequestMessage,
  type ProcessResponseMessage,
} from "./processes";

export type LoadDataRequestMessage = RequestMessageType<
  "load",
  { slug: string; snapshotId: string; assetUrl: string }
>;
export type LoadDataResponseMessage = ResponseMessageType<
  "load",
  {
    type: "load";
    data: {
      slug: string;
      snapshotId: string;
      count: number;
    };
  }
>;

/** Abort an in-flight process by the `requestId` the machine stamped on it. */
export type CancelRequestMessage = {
  type: "cancel";
  payload: { requestId: number };
};

/** Abort the in-flight city load(s), keeping any already-cached rows. */
export type CancelLoadRequestMessage = {
  type: "cancelLoad";
};

export type RequestMessage =
  | LoadDataRequestMessage
  | ProcessRequestMessage
  | CancelRequestMessage
  | CancelLoadRequestMessage;
export type ResponseMessage = LoadDataResponseMessage | ProcessResponseMessage;

/** Spawn the bundled listings worker. Lives here so the bundler-resolved
 *  `new URL("./worker.ts", import.meta.url)` stays next to the worker entry. */
export function createListingsWorker(): Worker {
  return new Worker(new URL("./worker.ts", import.meta.url));
}
