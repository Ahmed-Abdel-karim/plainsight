"use client";

/**
 * Declarative shape for scene-store subscriptions: a triggering `select`, an
 * optional `filter` guard, and the `effect` behavior. `defineSubscriptions`
 * infers each config's value type from its `select` (via the mapped tuple
 * `{ [K in keyof T]: SubscriptionConfig<T[K]> }`) and erases it to a uniform
 * registrar thunk — so heterogeneous configs live in one array while each keeps
 * full internal type safety, and the `subscribe`/`equalityFn` plumbing is
 * written once.
 *
 * Note: hoist `combineSelectors(...)` to a named const before using it as
 * `select`. Written inline, its own generic defers while this config's type
 * parameter is still resolving and the value type collapses to `unknown`.
 */
import type { StoreState } from "../slices";
import type { SceneStoreApi } from "../slices/types";

// Read-and-observe view of the store handed to subscription effects: the
// zustand-derived selector-aware `subscribe` plus `getState`, deliberately
// without `setState` so effects route writes through actions, never poke state
// directly.
export type SceneStore = Pick<SceneStoreApi, "subscribe" | "getState">;

/**
 * The options bag of zustand's selector-aware `subscribe` (its 3rd argument),
 * read off the store type itself. This is the single source of truth for the
 * tunable knobs — currently `equalityFn` and `fireImmediately`:
 *
 *   - `equalityFn` — equality for the selected value; pass `shallow` for object
 *     selectors. Re-typed below to the selected value `V` (zustand reports it
 *     over `unknown` here because the overload's generic collapses under
 *     `Parameters`).
 *   - `fireImmediately` — also run once at subscribe time (`prev === current`).
 *     Only useful when state can pre-exist the subscription. Under module-load
 *     registration the store is at defaults, so leave it off and let the first
 *     real change drive the effect.
 *
 * Sourcing it from `subscribe` means a future zustand migration that renames,
 * removes, or retypes these knobs surfaces as a type error in every config
 * instead of silently drifting from a hand-written copy.
 */
type SubscribeOptions = NonNullable<Parameters<SceneStore["subscribe"]>[2]>;

export type SubscriptionConfig<V> = {
  /** Triggering selector — hoist combineSelectors(...) to a named const. */
  select: (s: StoreState) => V;
  /** Guard — return false to skip the effect for this change. */
  filter?: (value: NoInfer<V>, store: SceneStore) => boolean;
  /** Behavior to run when the value changes and passes the filter. */
  effect: (value: NoInfer<V>, store: SceneStore) => void;
} & {
  // Keys (and their types) driven by zustand; `equalityFn` is the one knob we
  // re-type back to the selected value `V` for ergonomic equality callbacks.
  [K in keyof SubscribeOptions]?: K extends "equalityFn"
    ? (a: NoInfer<V>, b: NoInfer<V>) => boolean
    : SubscribeOptions[K];
};

export function defineSubscriptions<T extends readonly unknown[]>(configs: {
  [K in keyof T]: SubscriptionConfig<T[K]>;
}): ((store: SceneStore) => () => void)[] {
  return (configs as readonly SubscriptionConfig<unknown>[]).map(
    (config) => (store) =>
      store.subscribe(
        config.select,
        (value) => {
          if (config.filter && !config.filter(value, store)) return;
          config.effect(value, store);
        },
        {
          equalityFn: config.equalityFn,
          fireImmediately: config.fireImmediately,
        },
      ),
  );
}
