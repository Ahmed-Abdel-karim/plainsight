"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map,
  type MapLayerMouseEvent,
  MapRef,
  type MapSourceDataEvent,
  NavigationControl,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

import { toBounds } from "@/lib/geo";
import { zoomToResolution } from "@/lib/hex/resolution";
import type { HexCell } from "@/lib/hex/types";
import { HEX_FILL_LAYER_ID } from "./constants";
import { HexInspect, HexLayers } from "./hex";
import { OPENFREEMAP_STYLE } from "./map-styles";
import { NeighbourhoodsLayers } from "./neighbourhoods";
import { PointsLayers } from "./points";
import { isKnownSourceId } from "./types";
import { useMapControls } from "./use-map-controls";
import {
  useCityFraming,
  useHexCells,
  useMapError,
  useMapFitBounds,
  useMapHexInspect,
  useMapIsError,
  useMapIsSuppressed,
  useMapResolutionChanged,
  useMapSourceLoaded,
  useNotifyMapLoaded,
} from "../state";
import { useLens } from "../use-lens";
import { useResolvedTheme } from "../../theme/theme-provider";
import MapSkeleton from "./map-skeleton";

const MAX_BOUNDS_PADDING_RATIO = 0.3; // Pad maxBounds by 25% to allow some room for UI and avoid edge-clipping

// Stable empty reference so the suppressed-hex case doesn't churn HexLayers' memo.
const NO_CELLS: HexCell[] = [];

export function MapCanvas() {
  console.log("loaded");
  const mapRef = useRef<MapRef | null>(null);
  const { styleBasemapPlaceLabels } = useMapControls();
  const notifyMapLoaded = useNotifyMapLoaded();
  const mapResolutionChanged = useMapResolutionChanged();
  const mapSourceLoaded = useMapSourceLoaded();
  const mapFitBounds = useMapFitBounds();
  const mapHexInspect = useMapHexInspect();
  const mapError = useMapError();
  const isError = useMapIsError();
  const city = useCityFraming();
  const theme = useResolvedTheme();

  // Lens drives which layer is visible/interactive. The Browse dots replace the
  // hex fill, GPU-filtered by the same price/room state the list uses (FR-006),
  // and their hover/selected emphasis is now owned inside PointsLayers
  // (usePointsFilter / usePointsFeatureState) — neither is threaded here.
  const { isBrowse } = useLens();
  const bounds = useMemo(() => (city ? toBounds(city.bbox) : null), [city]);
  const maxBounds = useMemo(
    () => (city ? toBounds(city.bbox, MAX_BOUNDS_PADDING_RATIO) : undefined),
    [city],
  );
  const mapStyle = OPENFREEMAP_STYLE[theme];

  // Hex cells are computed by the listings worker store (the effects below feed
  // it) and read here as a selector — the canvas only renders them. While the
  // scene is transitioning to a new city, the supervisor (5.4) suppresses them so
  // city B's basemap/breaks never paint city A's cells (output gate, no spinner).
  const suppressed = useMapIsSuppressed();
  const hexCells = useHexCells();
  const cells = suppressed ? NO_CELLS : hexCells;

  // Clicking empty space (no hex under the pointer) dismisses the inspect popup;
  // the hex layer owns setting it (see HexLayers). Matters on touch, where there
  // is no mouseleave to clear a tapped cell.
  const handleAnalyseClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const clickedHex = event.features?.some(
        (feature) => feature.layer.id === HEX_FILL_LAYER_ID,
      );
      if (!clickedHex) mapHexInspect(null);
    },
    [mapHexInspect],
  );

  // Zoom adaptivity (US2): when the view settles, derive the resolution bucket.
  // Debounced so a flurry of moveends coalesces; same-value sends are no-ops for
  // subscribers because XState selectors use strict equality on primitives.
  const handleMoveEnd = useDebouncedCallback((event: ViewStateChangeEvent) => {
    mapResolutionChanged(zoomToResolution(event.viewState.zoom));
  }, 150);

  // Mirror our sources' loaded state into the store as MapLibre (re)parses them,
  // filtered past the basemap's own chatter. `useIsSourceLoaded` reads this so
  // layers can gate feature-state re-apply (PointsLayers) on a reactive flag.
  // GeoJSON `setData` emits a `metadata` pulse (isSourceLoaded=false) before the
  // `content` pulse (true), so the false→true edge survives without the
  // unexposed `sourcedataloading` event.
  const handleSourceData = useCallback(
    (event: MapSourceDataEvent) => {
      if (!isKnownSourceId(event.sourceId)) return;
      mapSourceLoaded(event.sourceId, !!event.isSourceLoaded);
    },
    [mapSourceLoaded],
  );

  const handleLoad = useCallback(() => {
    // MAP.MOUNTED must precede MAP.READY so reconcileToReady can access mapRef.
    notifyMapLoaded(
      mapRef.current!,
      zoomToResolution(mapRef.current!.getZoom()),
    );
    styleBasemapPlaceLabels(theme);
  }, [notifyMapLoaded, styleBasemapPlaceLabels, theme]);

  // Replaces the reactions.ts fly-guard. Machine buffers this during `loading`
  // (pendingFitBounds) and flies immediately once `ready`.
  useEffect(() => {
    if (!city) return;
    mapFitBounds(city.bbox);
  }, [city, mapFitBounds]);

  if (!city || !bounds) return <MapSkeleton />;

  if (isError) {
    return (
      <div className="bg-map-bg text-map-label flex h-full min-h-80 items-center justify-center type-label">
        Map unavailable
      </div>
    );
  }

  return (
    <div aria-label={`Map of ${city.cityName}`} className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: city.center[0],
          latitude: city.center[1],
          zoom: 11,
          bounds,
          fitBoundsOptions: { padding: 35 },
        }}
        mapStyle={mapStyle}
        maxBounds={maxBounds}
        keyboard
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
        interactiveLayerIds={isBrowse ? undefined : [HEX_FILL_LAYER_ID]}
        onLoad={handleLoad}
        onMoveEnd={handleMoveEnd}
        onClick={isBrowse ? undefined : handleAnalyseClick}
        onSourceData={handleSourceData}
        onStyleData={() => styleBasemapPlaceLabels(theme)}
        onError={mapError}
      >
        <HexLayers
          cells={cells}
          breaks={city.priceScale.breaks}
          visible={!isBrowse}
        />

        <PointsLayers visible={isBrowse} />
        <NeighbourhoodsLayers interactive={isBrowse} />
        <NavigationControl
          position="top-left"
          visualizePitch={false}
          showCompass={false}
        />
        <AttributionControl compact position="bottom-right" />
        <HexInspect />
      </Map>
    </div>
  );
}
