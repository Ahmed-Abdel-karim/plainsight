import type * as Context from "./context";

/**
 * Data required to initialise the ui machine. Skeleton.
 */
export interface Input {
  /** TODO: replace with the real input fields. */
  readonly _todo?: never;
}

/** Builds the initial context from `input`. TODO when the machine is built. */
export const Input = (): Promise<Context.Context> =>
  Promise.resolve({} as Context.Context);
