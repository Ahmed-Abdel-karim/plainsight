"use client";

import type { StateCreator } from "zustand";
import type { StoreState } from "../index";
import type { UiState } from "./state";
import type { UiActions } from "./actions";
import { initialUiState } from "./state";
import { createUiActions } from "./actions";

export type UiSlice = UiState & { uiActions: UiActions };

export const createUiSlice: StateCreator<
  StoreState,
  [["zustand/subscribeWithSelector", never]],
  [],
  UiSlice
> = (set, get) => ({
  ...initialUiState,
  uiActions: createUiActions(set, get),
});
