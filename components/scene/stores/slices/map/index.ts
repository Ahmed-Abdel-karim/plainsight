"use client";

// Map slice barrel — the slice's public API. Component consumers import from
// here; `store.ts` imports the creator from `./slice` directly to avoid a cycle
// with `./hooks` (which imports the store).
export * from "./slice";
export * from "./selectors";
export * from "./hooks";
export * from "./subscriptions";
export * from "./types";
export type { MapState } from "./state";
export type { MapActions } from "./actions";
