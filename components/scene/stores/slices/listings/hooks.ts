"use client";

import { useSceneStore } from "../../store";
import { listingsSelectors } from "./selectors";

export const useListingsActions = () =>
  useSceneStore(listingsSelectors.listingsActions);
export const useFilteredAggregates = () =>
  useSceneStore(listingsSelectors.aggregates);
export const useListingsHexCells = () =>
  useSceneStore(listingsSelectors.hexCells);
export const useFetchError = () => useSceneStore(listingsSelectors.fetchError);
export const useProcessError = () =>
  useSceneStore(listingsSelectors.processError);
