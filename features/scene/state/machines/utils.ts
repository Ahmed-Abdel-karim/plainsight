"use client";

import { useSelector } from "@xstate/react";
import {
  type EventObject,
  type MachineContext,
  assertEvent,
  assign,
} from "xstate";

import type {
  Comparator,
  EventOf,
  MachineSelector,
  PayloadKeyFor,
  Snapshot,
  SupportedActor,
} from "./types";

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

/**
 * Structural value-equality for the small JSON-like values map selectors emit
 * (a `toBounds` corner pair, a MapLibre filter expression). A `useSelector`
 * selector re-runs on every snapshot and allocates a fresh array, so comparing
 * by value — not reference — keeps consumers stable across unrelated context
 * changes (e.g. a filter edit must not hand the map a new `maxBounds`).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}

/**
 * Binds a machine's `Context` + `Events`, returning an `assign` factory that
 * writes a single context field from the triggering event — either by copying an
 * event payload key or via a `(event, context) => value` function. The event is
 * narrowed to `type` internally, so call sites drop the `assertEvent` /
 * `event.type === …` boilerplate.
 *
 * @example
 *   const assignFromEvent = createEventAssigner<Context, Events>();
 *   assignFromEvent("UI.SELECT", "selectedId", "id");
 *   assignFromEvent("UI.SET_HOVER", "hoveredListing", (event) =>
 *     event.id ? { id: event.id, source: event.source } : null);
 */
export const createEventAssigner =
  <TContext extends MachineContext, TEvent extends EventObject>() =>
  <TKey extends keyof TContext, TType extends TEvent["type"]>(
    type: TType,
    key: TKey,
    from:
      | PayloadKeyFor<EventOf<TEvent, TType>, TContext[TKey]>
      | ((event: EventOf<TEvent, TType>, context: TContext) => TContext[TKey]),
  ) =>
    assign<TContext, TEvent, undefined, TEvent, never>({
      [key]: ({ context, event }: { context: TContext; event: TEvent }) => {
        assertEvent(event, type);
        const payload = event as unknown as EventOf<TEvent, TType>;
        return typeof from === "function"
          ? from(payload, context)
          : (payload[from] as unknown as TContext[TKey]);
      },
    } as never);
