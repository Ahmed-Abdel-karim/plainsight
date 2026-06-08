"use client";

// UI slice barrel — the slice's public API. Component consumers import from
// here; `store.ts` imports the creator from `./slice` directly to avoid a cycle
// with `./hooks` (which imports the store).
export * from "./slice";
export * from "./selectors";
export * from "./hooks";
export * from "./subscriptions";
export type { UiState } from "./state";
export type { UiActions } from "./actions";
