import {
  type EventObject,
  type MachineContext,
  assertEvent,
  assign,
} from "xstate";

type EventOf<
  TEvent extends EventObject,
  TType extends TEvent["type"],
> = Extract<TEvent, { type: TType }>;

/** Keys of one event whose value is assignable to the target context field. */
type PayloadKeyFor<TEvent, TValue> = {
  [K in keyof TEvent]: TEvent[K] extends TValue ? K : never;
}[keyof TEvent];

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
