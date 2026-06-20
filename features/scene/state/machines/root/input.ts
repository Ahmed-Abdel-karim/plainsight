/**
 * Data required to initialise the root machine. The root takes no input — it is
 * the actor-system root (mounted via `createActorContext` with `input: {}`), so
 * its context comes entirely from `Context.Context` defaults.
 */
export interface Input {
  /** No input — see note above. */
  readonly _todo?: never;
}
