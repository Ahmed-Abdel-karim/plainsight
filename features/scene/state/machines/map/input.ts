/**
 * Data required to initialise the map machine.
 *
 * The map takes no input — root spawns it with `input: {}`, and its only
 * "input" (the `MapRef`) arrives later via the `MAP.MOUNTED` event because the
 * map element mounts after the machine starts. So the initial context comes
 * entirely from `Context.Context` defaults. Kept as an empty marker; revisit only
 * if a seed value ever needs to ride in at spawn.
 */
export interface Input {
  /** No input — see note above. */
  readonly _unused?: never;
}
