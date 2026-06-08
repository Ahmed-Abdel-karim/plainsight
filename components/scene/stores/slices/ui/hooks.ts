"use client";

import { useShallow } from "zustand/react/shallow";

import { useSceneStore } from "../../store";
import { uiSelectors } from "./selectors";

export const useSceneActions = () => useSceneStore(uiSelectors.uiActions);
export const useRoomTypes = () => useSceneStore(uiSelectors.roomTypes);
export const useLensValue = () => useSceneStore(uiSelectors.lens);
export const useSelectedId = () => useSceneStore(uiSelectors.selectedId);
export const useNbhd = () => useSceneStore(uiSelectors.nbhd);
export const usePriceRange = () =>
  useSceneStore(useShallow(uiSelectors.priceRange));
