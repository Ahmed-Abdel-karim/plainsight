import { aggregate } from "./aggregate";
import { hexes } from "./hexes";
import {
  ExtractProcessRequestMessage,
  ExtractProcessResponseMessage,
  type ProcessContext,
} from "../types";

export const processes = {
  ...aggregate,
  ...hexes,
};

/**
 * A process resolved for dispatch. Params and result are erased to `unknown` so
 * the generic worker can invoke any entry without TypeScript intersecting the
 * per-process param types — the request's `type` guarantees they line up.
 */
export type ResolvedProcess = {
  execute: (params: unknown, ctx: ProcessContext) => unknown;
  cacheResults?: boolean;
};

/** Look up a process by its request `type`. */
export function getProcess(type: keyof typeof processes): ResolvedProcess {
  return processes[type] as ResolvedProcess;
}

export type ProcessRequestMessage = ExtractProcessRequestMessage<
  typeof processes
>;

export type ProcessResponseMessage = ExtractProcessResponseMessage<
  typeof processes
>;
