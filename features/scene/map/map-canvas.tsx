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
import { useCallback, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ReloadIcon } from "@radix-ui/react-icons";

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
import {
  useChangeMapResolution,
  useCityFraming,
  useMapIsError,
  useMapIsSuppressed,
  useReportMapError,
  useReportMapLoaded,
  useReportMapUnmounted,
  useReportSourceLoaded,
  useReportStyleLoaded,
} from "../state";
import { useLens } from "../shared/use-lens";
import { useResolvedTheme } from "@/components/theme/theme-provider";
import MapSkeleton from "./map-skeleton";

export function MapCanvas() {
  const mapRef = useRef<MapRef | null>(null);
  const reportStyleLoaded = useReportStyleLoaded();
  const reportMapLoaded = useReportMapLoaded();
  const changeMapResolution = useChangeMapResolution();
  const reportSourceLoaded = useReportSourceLoaded();
  const reportMapUnmounted = useReportMapUnmounted();
  const reportMapError = useReportMapError();
  const isError = useMapIsError();
  const city = useCityFraming();
  const theme = useResolvedTheme();

  const { isBrowse } = useLens();
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

  const handleStyleData = useCallback(
    () => reportStyleLoaded(theme),
    [reportStyleLoaded, theme],
  );

  const handleLoad = useCallback(() => {
    reportMapLoaded(
      mapRef.current!,
      zoomToResolution(mapRef.current!.getZoom()),
    );
    reportStyleLoaded(theme);
    if (process.env.NEXT_PUBLIC_E2E === "true") {
      void import("@mapgrab/map-interface").then(({ installMapGrab }) => {
        if (mapRef.current) installMapGrab(mapRef.current.getMap(), "mainMap");
      });
    }
  }, [reportMapLoaded, reportStyleLoaded, theme]);

  useEffect(() => reportMapUnmounted, [reportMapUnmounted]);

  if (!city) return <MapSkeleton />;

  if (isError)
    return (
      <div className="bg-map-bg text-map-label flex h-full min-h-80 items-center justify-center type-label">
        Map unavailable
      </div>
    );

  return (
    <div
      role="region"
      aria-label={`Map of ${city.cityName}`}
      className="absolute inset-0"
    >
      <Map
        ref={mapRef}
        mapStyle={mapStyle}
        keyboard={!suppressed}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
        interactiveLayerIds={
          !suppressed && !isBrowse ? [HEX_FILL_LAYER_ID] : undefined
        }
        onLoad={handleLoad}
        onMoveEnd={handleMoveEnd}
        onSourceData={handleSourceData}
        onStyleData={handleStyleData}
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
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-white/40"
        >
          <ReloadIcon
            aria-hidden
            className="size-6 animate-spin text-muted-foreground"
          />
        </div>
      )}

      <HexLoadingOverlay />
    </div>
  );
}
