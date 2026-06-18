import { fromCallback } from "xstate";

import type {
  LoadDataResponseMessage,
  ProcessResponseMessage,
} from "@/lib/listings/worker";
import type {
  TransportCommand,
  TransportInput,
} from "@/components/scene/state/machines/worker/transport";

/**
 * Drop-in replacement for the worker `transport` — the one boundary that can't
 * run in jsdom (it spawns a real `Worker`). Records the commands the worker posts
 * and lets a test replay replies on demand.
 */

/** The reply events the real transport sends up to the worker machine. */
export type TransportReply =
  | { type: "TRANSPORT.LOAD_REPLY"; message: LoadDataResponseMessage }
  | { type: "TRANSPORT.PROCESS_REPLY"; message: ProcessResponseMessage }
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

  return {
    actor,
    commands,
    reply(event) {
      if (!sendBack) throw new Error("fake transport is not running");
      sendBack(event);
    },
  };
}
