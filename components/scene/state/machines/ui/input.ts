/**
 * Data required to initialise the ui machine. The ui machine takes no input — it
 * is invoked by root with `input: {}`, so its initial context (lens/selection/
 * hover) comes entirely from `Context.Context` defaults.
 */
export interface Input {
  /** No input — see note above. */
  readonly _todo?: never;
}
