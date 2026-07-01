import { fromCallback } from "xstate";

import type {
  LoadDataResponseMessage,
  ProcessResponseMessage,
} from "@/lib/listings";
import type {
  TransportCommand,
  TransportInput,
} from "@/features/scene/state/machines/worker/transport";

/**
 * Drop-in replacement for the worker `transport` — the one boundary that can't
 * run in jsdom (it spawns a real `Worker`). Records the commands the worker posts
 * and lets a test replay responses on demand.
 */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** A process response a test replays. `requestId` is optional: omitted, it is stamped
 *  with the latest matching POST's id (the current request); supply it explicitly
 *  to replay a stale/cancelled request's response and assert it is dropped. */
export type TestProcessResponse = DistributiveOmit<
  ProcessResponseMessage,
  "requestId"
> & {
  requestId?: string;
};

/** The response events the real transport sends up to the worker machine. */
export type TransportResponse =
  | { type: "TRANSPORT.LOAD_RESPONSE"; message: LoadDataResponseMessage }
  | { type: "TRANSPORT.PROCESS_RESPONSE"; message: TestProcessResponse }
  | { type: "TRANSPORT.WORKER_ERROR"; error: Error };

export interface FakeTransport {
  actor: ReturnType<typeof fromCallback<TransportCommand, TransportInput>>;
  /** Commands the worker machine posted to the transport, in order. */
  commands: TransportCommand[];
  /** Replay a worker response (throws if the transport isn't running). */
  response(event: TransportResponse): void;
}

export function createFakeTransport(): FakeTransport {
  const commands: TransportCommand[] = [];
  let sendBack: ((event: TransportResponse) => void) | null = null;

  const actor = fromCallback<TransportCommand, TransportInput>(
    ({ sendBack: sb, receive }) => {
      sendBack = sb;
      receive((command) => {
        commands.push(command);
      });
      return () => {
        sendBack = null;
      };
    },
  );

  const latestRequestId = (type: ProcessResponseMessage["payload"]["type"]) => {
    for (let i = commands.length - 1; i >= 0; i--) {
      const command = commands[i];
      if (command.type === "POST" && command.message.type === type)
        return command.message.requestId;
    }
    return undefined;
  };

  return {
    actor,
    commands,
    response(event) {
      if (!sendBack) throw new Error("fake transport is not running");
      if (event.type === "TRANSPORT.PROCESS_RESPONSE") {
        const requestId =
          event.message.requestId ??
          latestRequestId(event.message.payload.type);
        sendBack({
          type: "TRANSPORT.PROCESS_RESPONSE",
          message: {
            ...event.message,
            requestId: requestId ?? "",
          } as ProcessResponseMessage,
        });
        return;
      }
      sendBack(event);
    },
  };
}
