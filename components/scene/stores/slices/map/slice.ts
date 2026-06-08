"use client";

import type { StateCreator } from "zustand";
import type { StoreState } from "../index";
import type { MapState } from "./state";
import type { MapActions } from "./actions";
import { initialMapState } from "./state";
import { createMapActions } from "./actions";

export type MapSlice = MapState & { mapActions: MapActions };

export const createMapSlice: StateCreator<
  StoreState,
  [["zustand/subscribeWithSelector", never]],
  [],
  MapSlice
> = (set, get) => ({
  ...initialMapState,
  mapActions: createMapActions(set, get),
});
