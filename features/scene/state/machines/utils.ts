"use client";

import { useSelector } from "@xstate/react";
import type { AnyActorRef } from "xstate";

/**
 * Actor constraint that mirrors `useSelector`'s first-parameter requirement.
 * `undefined` is included so dynamic actors (e.g. city, spawned per slug) can
 * be passed directly — `useSelector` returns `undefined` when the actor is
 * absent, and the selector receives `undefined` as its snapshot.
 */
type SupportedActor =
  | Pick<AnyActorRef, "subscribe" | "getSnapshot">
  | undefined;

/** Snapshot emitted by an actor — same conditional `useSelector` uses internally. */
type Snapshot<TActor> = TActor extends { getSnapshot(): infer TSnapshot }
  ? TSnapshot
  : undefined;

/** Equality guard passed as the optional third argument to `useSelector`. */
type Comparator<T> = (a: T, b: T) => boolean;

/**
 * Re-typed wrapper around `useSelector` that accepts our `Snapshot<TActor>`
 * alias. Functionally identical — the single cast here avoids repeating the
 * raw conditional inline at every selector parameter.
 */
const selectActor = useSelector as <TActor extends SupportedActor, TSelected>(
  actor: TActor,
  selector: (snapshot: Snapshot<TActor>) => TSelected,
  compare?: Comparator<TSelected>,
) => TSelected;

/**
 * Shape returned by `createMachineStateSelector`:
 *   - callable → zero-argument hook
 *   - `.with()` → one-argument hook
 */
interface MachineSelector<TActor extends SupportedActor> {
  <TSelected>(
    selector: (snapshot: Snapshot<TActor>) => TSelected,
    compare?: Comparator<TSelected>,
  ): () => TSelected;
  with<TArg, TSelected>(
    selector: (snapshot: Snapshot<TActor>, arg: TArg) => TSelected,
    compare?: Comparator<TSelected>,
  ): (arg: TArg) => TSelected;
}

/**
 * Binds an actor getter to `useSelector`, returning a `MachineSelector`:
 *
 *   const useMyHook = createMachineStateSelector(getActor)((s) => s.context.foo);
 *   // in a component: const foo = useMyHook();
 *
 *   const useMyHook = createMachineStateSelector(getActor).with(
 *     (s, id: string) => s.context.items[id],
 *   );
 *   // in a component: const item = useMyHook(id);
 */
export const createMachineStateSelector = <TActor extends SupportedActor>(
  getActor: () => TActor,
): MachineSelector<TActor> => {
  function select<TSelected>(
    selector: (snapshot: Snapshot<TActor>) => TSelected,
    compare?: Comparator<TSelected>,
  ): () => TSelected {
    return () => selectActor(getActor(), selector, compare);
  }

  select.with = function <TArg, TSelected>(
    selector: (snapshot: Snapshot<TActor>, arg: TArg) => TSelected,
    compare?: Comparator<TSelected>,
  ): (arg: TArg) => TSelected {
    return (arg) => selectActor(getActor(), (s) => selector(s, arg), compare);
  };

  return select;
};
