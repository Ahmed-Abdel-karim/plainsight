"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map,
  MapRef,
  type MapSourceDataEvent,
  NavigationControl,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Loader2 } from "lucide-react";

import { toBounds } from "@/lib/geo";
import { zoomToResolution } from "@/lib/hex/resolution";
import { HEX_FILL_LAYER_ID } from "./constants";
import {
  HexLayers,
  HexLoadingOverlay,
  NeighbourhoodsLayers,
  PointsLayers,
} from "./layers";
import { OPENFREEMAP_STYLE } from "./map-styles";
import { isKnownSourceId } from "./types";
import { useUpdateMapTheme } from "./hooks/use-update-map-theme";
import {
  useChangeMapResolution,
  useCityFraming,
  useFitMapBounds,
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

export function MapCanvas() {
  const mapRef = useRef<MapRef | null>(null);
  const updateMapTheme = useUpdateMapTheme();
  const reportMapLoaded = useReportMapLoaded();
  const changeMapResolution = useChangeMapResolution();
  const reportSourceLoaded = useReportSourceLoaded();
  const fitMapBounds = useFitMapBounds();
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

  if (isError)
    return (
      <div className="bg-map-bg text-map-label flex h-full min-h-80 items-center justify-center type-label">
        Map unavailable
      </div>
    );

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
        keyboard={!suppressed}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
        interactiveLayerIds={
          !suppressed && !isBrowse ? [HEX_FILL_LAYER_ID] : undefined
        }
        onLoad={handleLoad}
        onMoveEnd={handleMoveEnd}
        onSourceData={handleSourceData}
        onStyleData={updateMapTheme}
        onError={reportMapError}
        onZoomEnd={handleMoveEnd}
      >
        <HexLayers />

        <PointsLayers visible={isBrowse} />
        <NeighbourhoodsLayers interactive={isBrowse} />
        <NavigationControl
          position="top-left"
          visualizePitch={false}
          showCompass={false}
        />
        <AttributionControl compact position="bottom-right" />
      </Map>
      {suppressed && (
        <div
          role="status"
          aria-label={`Loading ${city.cityName}`}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black opacity-50 backdrop-blur-sm dark:bg-white"
        >
          <Loader2
            aria-hidden
            className="size-6 animate-spin text-muted-foreground"
          />
        </div>
      )}

      <HexLoadingOverlay />
    </div>
  );
}
