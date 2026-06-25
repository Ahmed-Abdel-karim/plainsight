import type { AnyActorRef, EventObject } from "xstate";

// --- selector types (createMachineStateSelector) ---

/**
 * Actor constraint that mirrors `useSelector`'s first-parameter requirement.
 * `undefined` is included so dynamic actors (e.g. city, spawned per slug) can
 * be passed directly — `useSelector` returns `undefined` when the actor is
 * absent, and the selector receives `undefined` as its snapshot.
 */
export type SupportedActor =
  | Pick<AnyActorRef, "subscribe" | "getSnapshot">
  | undefined;

/** Snapshot emitted by an actor — same conditional `useSelector` uses internally. */
export type Snapshot<TActor> = TActor extends { getSnapshot(): infer TSnapshot }
  ? TSnapshot
  : undefined;

/** Equality guard passed as the optional third argument to `useSelector`. */
export type Comparator<T> = (a: T, b: T) => boolean;

/**
 * Shape returned by `createMachineStateSelector`:
 *   - callable → zero-argument hook
 *   - `.with()` → one-argument hook
 */
export interface MachineSelector<TActor extends SupportedActor> {
  <TSelected>(
    selector: (snapshot: Snapshot<TActor>) => TSelected,
    compare?: Comparator<TSelected>,
  ): () => TSelected;
  with<TArg, TSelected>(
    selector: (snapshot: Snapshot<TActor>, arg: TArg) => TSelected,
    compare?: Comparator<TSelected>,
  ): (arg: TArg) => TSelected;
}

// --- event-assigner types (createEventAssigner) ---

/** One event of a union narrowed by its `type` discriminant. */
export type EventOf<
  TEvent extends EventObject,
  TType extends TEvent["type"],
> = Extract<TEvent, { type: TType }>;

/** Keys of one event whose value is assignable to the target context field. */
export type PayloadKeyFor<TEvent, TValue> = {
  [K in keyof TEvent]: TEvent[K] extends TValue ? K : never;
}[keyof TEvent];
