"use client";

/**
 * Combines named atomic selectors into one composite selector returning an
 * object keyed by the same names. Lets hooks (via `useShallow`) and
 * subscriptions (via `{ equalityFn: shallow }`) share the canonical atomic
 * selectors instead of re-declaring inline field reads.
 *
 * Builds a fresh object each call, so shallow equality compares the values.
 */
export function combineSelectors<
  M extends Record<string, (s: never) => unknown>,
>(
  selectors: M,
): (s: Parameters<M[keyof M]>[0]) => { [K in keyof M]: ReturnType<M[K]> } {
  const read = selectors as unknown as Record<
    string,
    (state: unknown) => unknown
  >;
  return (s) => {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(read)) out[key] = read[key](s);
    return out as { [K in keyof M]: ReturnType<M[K]> };
  };
}
