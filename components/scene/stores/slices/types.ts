"use client";

// Cross-slice store plumbing only. Slice-specific domain types live with their
// slice (e.g. map domain types in `slices/map/types.ts`).
//
// Every store-shaped type here is derived from zustand's own `StoreApi`/`Mutate`
// rather than hand-rolled, so the surface stays in lockstep with the real
// `create()` output (add a middleware -> extend the mutator tuple, nothing else).

import type { StoreApi, Mutate } from "zustand";
import type { StoreState } from "./index";

// The concrete store API after the `subscribeWithSelector` middleware — the
// type-level twin of `useSceneStore`, kept separate (and derived, not
// `typeof useSceneStore`) to avoid an import cycle with `store.ts`. Carries the
// selector-aware `subscribe` overload the subscriptions rely on.
export type SceneStoreApi = Mutate<
  StoreApi<StoreState>,
  [["zustand/subscribeWithSelector", never]]
>;

// The `set`/`get` a slice creator receives, narrowed to its own slice state `S`.
// Sourced from `StoreApi` so the (overloaded, `replace`-aware) `setState`
// signature matches what zustand actually hands the creator.
export type SetFn<S> = StoreApi<S>["setState"];
export type GetFn<S> = StoreApi<S>["getState"];
