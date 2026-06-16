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
import { HexLayers, NeighbourhoodsLayers, PointsLayers } from "./layers";
import { OPENFREEMAP_STYLE } from "./map-styles";
import { isKnownSourceId } from "./types";
import { useUpdateMapTheme } from "./hooks/use-update-map-theme";
import {
  useChangeMapResolution,
  useCityFraming,
  useFitMapBounds,
  useHexCells,
  useInspectHex,
  useMapIsError,
  useMapIsSuppressed,
  useReportMapError,
  useReportMapLoaded,
  useReportSourceLoaded,
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
  const updateMapTheme = useUpdateMapTheme();
  const reportMapLoaded = useReportMapLoaded();
  const changeMapResolution = useChangeMapResolution();
  const reportSourceLoaded = useReportSourceLoaded();
  const fitMapBounds = useFitMapBounds();
  const inspectHex = useInspectHex();
  const reportMapError = useReportMapError();
  const isError = useMapIsError();
  const city = useCityFraming();
  const theme = useResolvedTheme();

  const { isBrowse } = useLens();
  const bounds = useMemo(() => (city ? toBounds(city.bbox) : null), [city]);
  const maxBounds = useMemo(
    () => (city ? toBounds(city.bbox, MAX_BOUNDS_PADDING_RATIO) : undefined),
    [city],
  );
  const mapStyle = OPENFREEMAP_STYLE[theme];

  const suppressed = useMapIsSuppressed();
  const hexCells = useHexCells();
  const cells = suppressed ? NO_CELLS : hexCells;

  const handleAnalyseClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const clickedHex = event.features?.some(
        (feature) => feature.layer.id === HEX_FILL_LAYER_ID,
      );
      if (!clickedHex) inspectHex(null);
    },
    [inspectHex],
  );

  const handleMoveEnd = useDebouncedCallback((event: ViewStateChangeEvent) => {
    changeMapResolution(zoomToResolution(event.viewState.zoom));
  }, 150);

  const handleSourceData = useCallback(
    (event: MapSourceDataEvent) => {
      if (!isKnownSourceId(event.sourceId)) return;
      reportSourceLoaded(event.sourceId, !!event.isSourceLoaded);
    },
    [reportSourceLoaded],
  );

  const handleLoad = useCallback(() => {
    reportMapLoaded(
      mapRef.current!,
      zoomToResolution(mapRef.current!.getZoom()),
    );
    updateMapTheme();
  }, [reportMapLoaded, updateMapTheme]);

  useEffect(() => {
    if (!city) return;
    fitMapBounds(city.bbox);
  }, [city, fitMapBounds]);

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
        onStyleData={updateMapTheme}
        onError={reportMapError}
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
      </Map>
    </div>
  );
}
