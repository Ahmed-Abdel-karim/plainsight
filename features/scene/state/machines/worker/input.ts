/**
 * The worker machine takes no input. It is a session-lifetime actor invoked by
 * the root alongside the spawned map/ui actors; the city it serves is whichever
 * `system.get("city")` resolves to at request time, and the slug rides on each
 * request event — so there is nothing to bind at construction.
 */
export type Input = Record<string, never>;
