"use client";

import { Source } from "react-map-gl/maplibre";

import { POINTS_SOURCE_ID } from "../constants";
import { MapLayer } from "../layer";
import { getCircleLayer } from "./styles";
import { usePointsListeners } from "./listeners";
import { usePointsFeatureState } from "./use-points-layer";
import { usePointsFilter } from "./use-points-filter";
import { useBrowsePoints } from "../../browse/use-browse-points";
import { useLens } from "../../use-lens";
import { useCityFraming } from "../../state";

/**
 * The Browse dot source + circle layer. The `geojson` source uses
 * `promoteId: "id"` so hover/selected are MapLibre **feature-state** keyed by
 * the listing id. Filtering is the GPU `filter` expression (state in, no ids
 * out), read from the store via `usePointsFilter` so the layer owns its derived
 * render input. Per-layer style stays in `styles.ts`; the canvas composes this
 * and never touches the source id.
 */
export function PointsLayers({ visible }: { visible: boolean }) {
  const filter = usePointsFilter();
  const city = useCityFraming();
  const listeners = usePointsListeners(visible);
  usePointsFeatureState(visible);
  const { isBrowse } = useLens();
  const { collection } = useBrowsePoints(city?.slug ?? "", {
    enabled: isBrowse,
  });
  if (!collection) return;
  return (
    <Source
      id={POINTS_SOURCE_ID}
      type="geojson"
      data={collection}
      promoteId="id"
    >
      <MapLayer
        getLayerStyles={getCircleLayer}
        visible={visible}
        listeners={listeners}
        filter={filter}
      />
    </Source>
  );
}
