import { fromCallback } from "xstate";

import type {
  LoadDataResponseMessage,
  ProcessResponseMessage,
} from "@/lib/listings/worker";
import type {
  TransportCommand,
  TransportInput,
} from "@/features/scene/state/machines/worker/transport";

/**
 * Drop-in replacement for the worker `transport` — the one boundary that can't
 * run in jsdom (it spawns a real `Worker`). Records the commands the worker posts
 * and lets a test replay replies on demand.
 */

type DistributiveOmit<T, K extends keyof any> = T extends unknown
  ? Omit<T, K>
  : never;

/** A process reply a test replays. `requestId` is optional: omitted, it is stamped
 *  with the latest matching POST's id (the current request); supply it explicitly
 *  to replay a stale/cancelled request's reply and assert it is dropped. */
export type ProcessReplyMessage = DistributiveOmit<
  ProcessResponseMessage,
  "requestId"
> & {
  requestId?: number;
};

/** The reply events the real transport sends up to the worker machine. */
export type TransportReply =
  | { type: "TRANSPORT.LOAD_REPLY"; message: LoadDataResponseMessage }
  | { type: "TRANSPORT.PROCESS_REPLY"; message: ProcessReplyMessage }
  | { type: "TRANSPORT.WORKER_ERROR"; error: Error };

export interface FakeTransport {
  actor: ReturnType<typeof fromCallback<TransportCommand, TransportInput>>;
  /** Commands the worker machine posted to the transport, in order. */
  commands: TransportCommand[];
  /** Replay a worker reply (throws if the transport isn't running). */
  reply(event: TransportReply): void;
}

export function createFakeTransport(): FakeTransport {
  const commands: TransportCommand[] = [];
  let sendBack: ((event: TransportReply) => void) | null = null;

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
    reply(event) {
      if (!sendBack) throw new Error("fake transport is not running");
      if (event.type === "TRANSPORT.PROCESS_REPLY") {
        const requestId =
          event.message.requestId ??
          latestRequestId(event.message.payload.type);
        sendBack({
          type: "TRANSPORT.PROCESS_REPLY",
          message: {
            ...event.message,
            requestId: requestId ?? 0,
          } as ProcessResponseMessage,
        });
        return;
      }
      sendBack(event);
    },
  };
}
