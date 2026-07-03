import { fromCallback } from "xstate";

import type {
  LoadDataRequestMessage,
  ProcessRequestMessage,
} from "@/lib/listings";

import { ProcessController } from "./process-controller";
import type { Dataset } from "./types";
import { WorkerConnector } from "./worker-connector";

export interface TransportInput {
  createWorker?: () => Worker;
}

export type TransportCommand =
  | { type: "LOAD"; payload: LoadDataRequestMessage["payload"] }
  | { type: "CANCEL_LOAD" }
  | { type: "REQUEST"; message: ProcessRequestMessage }
  | { type: "DATA_READY"; dataset: Dataset }
  | { type: "RESET" };

export const transportActor = fromCallback<TransportCommand, TransportInput>(
  ({ input, sendBack, receive }) => {
    const connector = new WorkerConnector(input.createWorker);

    const processController = new ProcessController({
      postRequest: (message) => connector.post(message),
      emitResult: (response) =>
        sendBack({ type: "TRANSPORT.PROCESS_RESULT", response }),
    });
    connector.listen({
      onLoadResponse: (message) =>
        sendBack({ type: "TRANSPORT.LOAD_RESPONSE", message }),
      onProcessResponse: (response) =>
        processController.receiveResponse(response),
      onError: (error) => {
        processController.reset();
        sendBack({ type: "TRANSPORT.WORKER_ERROR", error });
      },
    });

    receive((command) => {
      switch (command.type) {
        case "LOAD":
          return connector.load(command.payload);
        case "CANCEL_LOAD":
          return connector.cancelLoad();
        case "REQUEST":
          return processController.request(command.message);
        case "DATA_READY":
          return processController.dataReady(command.dataset);
        // Scene reset (navigation left `/city`): abandon any in-flight load and
        // clear the controller's coordination + loaded-dataset identity so a
        // fresh load re-establishes it. Cache is discarded with the actor anyway.
        case "RESET":
          connector.cancelLoad();
          return processController.reset();
      }
    });

    return () => {
      connector.terminate();
    };
  },
);
