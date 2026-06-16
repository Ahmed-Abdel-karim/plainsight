import type { ProcessType } from "./events";
import type { Slot } from "./slot";

/**
 * Worker machine context. Just the per-type coalescing state — mutable `Slot`
 * refs the machine drives via `offer`/`take`/`settle`; the Map identity is
 * stable, so this is a "ref" in context, not assigned state. There is no `slug`:
 * the worker is shared across cities and the slug rides on each request/reply.
 */
export interface Context {
  readonly slots: Map<ProcessType, Slot>;
}
