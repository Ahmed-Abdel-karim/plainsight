"use client";

import { Source } from "react-map-gl/maplibre";

import { POINTS_SOURCE_ID } from "../../constants";
import { MapLayer } from "../layer";
import { getCircleLayer } from "./styles";
import { usePointsListeners } from "./listeners";
import { usePointsFilter } from "./use-points-filter";
import type { BrowseCollection } from "@/data/contract";
import { useBrowsePoints } from "@/features/scene/browse/use-browse-points";
import { useLens } from "@/features/scene/shared/use-lens";
import { useCityFraming, useMapIsSuppressed } from "@/features/scene/state";

// Stable empty reference so blanking on a city switch doesn't churn the source.
const EMPTY_COLLECTION: BrowseCollection = {
  type: "FeatureCollection",
  features: [],
};

/**
 * The Browse dot source + circle layer. The `geojson` source uses
 * `promoteId: "id"` so hover/selected are MapLibre **feature-state** keyed by
 * the listing id. Filtering is the GPU `filter` expression (state in, no ids
 * out), read from the store via `usePointsFilter` so the layer owns its derived
 * render input. Per-layer style stays in `styles.ts`; the canvas composes this
 * and never touches the source id. Hover/selected emphasis is painted by the
 * actor system (the map machine), not here.
 */
export function PointsLayers({ visible }: { visible: boolean }) {
  const filter = usePointsFilter();
  const city = useCityFraming();
  const listeners = usePointsListeners(visible);
  const { isBrowse } = useLens();
  const suppressed = useMapIsSuppressed();
  const { collection } = useBrowsePoints(
    city?.slug ?? "",
    city?.snapshotId ?? "",
    { enabled: isBrowse },
  );
  // Blank the dots while a city switch is in flight (the map overlay covers them
  // anyway); they repaint from the new city's collection on CITY.READY.
  const data = suppressed ? EMPTY_COLLECTION : collection;
  if (!data) return;
  return (
    <Source
      id={POINTS_SOURCE_ID}
      type="geojson"
      data={data}
      promoteId="id"
      attribution={
        city ? `Inside Airbnb Date: ${city.snapshotLabel.trim()}` : undefined
      }
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
