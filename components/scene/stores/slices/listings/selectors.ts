"use client";

import type { StoreState } from "../index";

export const listingsSelectors = {
  aggregates: (s: StoreState) => s.aggregates,
  hexCells: (s: StoreState) => s.hexCells,
  fetchError: (s: StoreState) => s.fetchError,
  processError: (s: StoreState) => s.processError,
  listingsActions: (s: StoreState) => s.listingsActions,
};
