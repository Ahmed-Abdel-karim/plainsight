import { fromCallback } from "xstate";

import { ProcessController } from "@/features/scene/state/machines/worker/controller/process-controller";
import type {
  TransportCommand,
  TransportInput,
} from "@/features/scene/state/machines/worker/controller/transport-actor";
import type {
  LoadDataResponseMessage,
  ProcessRequestMessage,
  ProcessResponseMessage,
} from "@/lib/listings";

/**
 * Drop-in replacement for the worker `transport` — the one boundary that can't
 * run in jsdom (it spawns a real `Worker`). It runs the REAL `ProcessController`,
 * so coordination (coalescing, per-type cache, hold-until-ready) is exercised
 * end-to-end; only the Worker is faked. The controller's posts are recorded as
 * `workerPosts`, and a test replays raw worker replies via `workerReply`.
 */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A raw worker process reply a test feeds the controller. `requestId` is optional:
 *  omitted, it is stamped with the latest matching worker post's id (the current
 *  request); supply it explicitly to replay a stale request's reply. */
export type TestProcessResponse = DistributiveOmit<
  ProcessResponseMessage,
  "requestId"
> & {
  requestId?: string;
};

/** Machine-direct events a test drives up: load lifecycle and fatal crash. */
export type TransportResponse =
  | { type: "TRANSPORT.LOAD_RESPONSE"; message: LoadDataResponseMessage }
  | { type: "TRANSPORT.WORKER_ERROR"; error: Error };

type MachineInbound =
  | TransportResponse
  | { type: "TRANSPORT.PROCESS_RESULT"; response: ProcessResponseMessage };

export interface FakeTransport {
  actor: ReturnType<typeof fromCallback<TransportCommand, TransportInput>>;
  /** Commands the worker machine posted to the transport, in order. */
  commands: TransportCommand[];
  /** Requests the real controller posted to the (faked) worker, in order. */
  workerPosts: ProcessRequestMessage[];
  /** Drive a load response or fatal crash up to the machine. */
  response(event: TransportResponse): void;
  /** Feed a raw worker process reply into the real controller. */
  workerReply(reply: TestProcessResponse): void;
}

export function createFakeTransport(): FakeTransport {
  const commands: TransportCommand[] = [];
  const workerPosts: ProcessRequestMessage[] = [];
  let sendBack: ((event: MachineInbound) => void) | null = null;
  let controller: ProcessController | null = null;

  const actor = fromCallback<TransportCommand, TransportInput>(
    ({ sendBack: sb, receive }) => {
      sendBack = sb;
      const ctrl = new ProcessController({
        postRequest: (message) => workerPosts.push(message),
        emitResult: (response) =>
          sb({ type: "TRANSPORT.PROCESS_RESULT", response }),
      });
      controller = ctrl;
      receive((command) => {
        commands.push(command);
        if (command.type === "REQUEST") ctrl.request(command.message);
        else if (command.type === "DATA_READY") ctrl.dataReady(command.dataset);
        else if (command.type === "RESET") ctrl.reset();
      });
      return () => {
        sendBack = null;
        controller = null;
      };
    },
  );

  const latestRequestId = (type: ProcessRequestMessage["type"]) => {
    for (let i = workerPosts.length - 1; i >= 0; i--)
      if (workerPosts[i].type === type) return workerPosts[i].requestId;
    return undefined;
  };

  return {
    actor,
    commands,
    workerPosts,
    response(event) {
      if (!sendBack) throw new Error("fake transport is not running");
      if (event.type === "TRANSPORT.WORKER_ERROR") controller?.reset();
      sendBack(event);
    },
    workerReply(reply) {
      if (!controller) throw new Error("fake transport is not running");
      const requestId = reply.requestId ?? latestRequestId(reply.payload.type);
      controller.receiveResponse({
        ...reply,
        requestId: requestId ?? "",
      } as ProcessResponseMessage);
    },
  };
}
