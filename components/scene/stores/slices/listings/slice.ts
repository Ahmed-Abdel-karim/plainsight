"use client";

import type { StateCreator } from "zustand";
import type { StoreState } from "../index";
import type { ListingsState } from "./state";
import type { ListingsActions } from "./actions";
import { initialListingsState } from "./state";
import { createListingsActions } from "./actions";

export type ListingsSlice = ListingsState & {
  listingsActions: ListingsActions;
};

export const createListingsSlice: StateCreator<
  StoreState,
  [["zustand/subscribeWithSelector", never]],
  [],
  ListingsSlice
> = (set, get) => ({
  ...initialListingsState,
  listingsActions: createListingsActions(set, get),
});
