"use client";

/**
 * Scene store creation — composes the three slices into one Zustand store.
 *
 * Hooks live with their slice (`slices/<x>/hooks.ts`); subscriptions are
 * registered in `subscriptions.ts`. This file imports slice CREATORS by
 * sub-path (`./slices/<x>/slice`) — never the slice barrel — so the barrel's
 * hooks (which import this file) can't form an import cycle.
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { createMapSlice } from "./slices/map/slice";
import { createListingsSlice } from "./slices/listings/slice";
import { createUiSlice } from "./slices/ui/slice";
import type { StoreState } from "./slices";
import { registerSubscriptions } from "./subscriptions";

export const useSceneStore = create<StoreState>()(
  subscribeWithSelector((...a) => ({
    ...createMapSlice(...a),
    ...createListingsSlice(...a),
    ...createUiSlice(...a),
  })),
);

// Re-export for consumers that import the raw store
export { useSceneStore as useStore };
registerSubscriptions(useSceneStore);
