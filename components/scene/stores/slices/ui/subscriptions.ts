"use client";

import { shallow } from "zustand/shallow";
import { syncSceneUrl } from "@/lib/search-params";
import { defineSubscriptions } from "../../utils/define-subscription";
import { combineSelectors } from "../../utils/combine-selectors";
import { uiSelectors } from "./selectors";

const urlState = combineSelectors({
  roomTypes: uiSelectors.roomTypes,
  priceRange: uiSelectors.priceRange,
  lens: uiSelectors.lens,
  selectedId: uiSelectors.selectedId,
  nbhd: uiSelectors.nbhd,
});

export const uiSubscriptions = defineSubscriptions([
  // Serialize the UI state into the URL.
  {
    select: urlState,
    equalityFn: shallow,
    effect: (value) => syncSceneUrl(value),
  },
]);
