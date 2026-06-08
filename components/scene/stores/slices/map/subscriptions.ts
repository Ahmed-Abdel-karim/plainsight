"use client";

import { toBounds } from "@/lib/geo";
import { shallow } from "zustand/shallow";
import { defineSubscriptions } from "../../utils/define-subscription";
import { combineSelectors } from "../../utils/combine-selectors";
import { mapSelectors } from "./selectors";

const fitToCity = combineSelectors({
  mapRef: mapSelectors.mapRef,
  mapStatus: mapSelectors.mapStatus,
  city: mapSelectors.city,
});

export const mapSubscriptions = defineSubscriptions([
  // Fit the map to the city bbox once the map is ready.
  {
    select: fitToCity,
    equalityFn: shallow,
    filter: ({ mapRef, mapStatus, city }) =>
      mapStatus === "ready" && !!mapRef && !!city,
    effect: ({ mapRef, city }) =>
      mapRef!
        .getMap()
        .fitBounds(toBounds(city!.bbox), { duration: 0, zoom: 5 }),
  },
]);
