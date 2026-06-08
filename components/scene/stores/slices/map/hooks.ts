"use client";

import { useShallow } from "zustand/react/shallow";

import type { SourceId } from "../../../map/types";
import { useSceneStore } from "../../store";
import { mapSelectors } from "./selectors";

export const useMapActions = () => useSceneStore(mapSelectors.mapActions);
export const useMapStatus = () =>
  useSceneStore(useShallow(mapSelectors.mapStatus));
export const useMapRef = () => useSceneStore(useShallow(mapSelectors.mapRef));
export const useMapCity = () => useSceneStore(mapSelectors.city);
export const useHexResolution = () => useSceneStore(mapSelectors.hexResolution);
export const useHoveredListingId = () =>
  useSceneStore(mapSelectors.hoveredListingId);
export const useHoverSource = () => useSceneStore(mapSelectors.hoverSource);
export const useHexInspectInfo = () =>
  useSceneStore(mapSelectors.hexInspectInfo);
export const useIsSourceLoaded = (sourceId: SourceId) =>
  useSceneStore((s) => !!s.loadedSources[sourceId]);

export const useFilterBounds = () => {
  const city = useSceneStore(mapSelectors.city);
  return city
    ? { min: city.priceScale.min, max: city.priceCap }
    : { min: 0, max: 0 };
};
