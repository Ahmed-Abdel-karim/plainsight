import type * as Context from "./context";

/**
 * Data required to initialise the map machine.
 *
 * DRAFT: the map takes NO input — it is invoked by root with `input: {}`, and
 * its only "input" (the `MapRef`) arrives later via the `MAP.MOUNTED` event
 * because the map element mounts after the machine starts. So the initial
 * context comes entirely from `Context.Context` defaults. Kept as an empty
 * skeleton; revisit only if a seed value ever needs to ride in at spawn.
 */
export interface Input {
  /** No input — see note above. */
  readonly _todo?: never;
}

/** Builds the initial context from `input`. TODO when the machine is built. */
export const Input = (): Promise<Context.Context> =>
  Promise.resolve({} as Context.Context);
