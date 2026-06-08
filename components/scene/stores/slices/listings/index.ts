"use client";

/**
 * Listings slice barrel — the slice's public API.
 *
 * This slice has no `subscriptions.ts` by design: its reaction (requestHexes)
 * depends on map + ui state, so it is inherently cross-slice and lives in
 * `stores/subscriptions.ts`, not here. Requests adopt their own city worker
 * (idempotent `ensureClient`), so there is no separate city-sync reaction.
 *
 * Component consumers import from here; `store.ts` imports the creator from
 * `./slice` directly to avoid a cycle with `./hooks` (which imports the store).
 */
export * from "./slice";
export * from "./selectors";
export * from "./hooks";
export type { ListingsState } from "./state";
export type { ListingsActions } from "./actions";
