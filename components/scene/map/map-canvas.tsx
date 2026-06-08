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
import { useCallback, useMemo, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

import { toBounds } from "@/lib/geo";
import { zoomToResolution } from "@/lib/hex/resolution";
import { HEX_FILL_LAYER_ID } from "./constants";
import { HexInspect, HexLayers } from "./hex";
import { OPENFREEMAP_STYLE } from "./map-styles";
import { NeighbourhoodsLayers } from "./neighbourhoods";
import { PointsLayers } from "./points";
import { isKnownSourceId } from "./types";
import { useMapControls } from "./use-map-controls";
import {
  useListingsHexCells,
  useMapActions,
  useMapCity,
  useMapStatus,
  useSceneStore,
} from "../stores";
import { useLens } from "../use-lens";
import { useBrowsePoints } from "../browse/use-browse-points";
import { useResolvedTheme } from "../../theme/theme-provider";
import MapSkeleton from "./map-skeleton";

const MAX_BOUNDS_PADDING_RATIO = 0.3; // Pad maxBounds by 25% to allow some room for UI and avoid edge-clipping

export function MapCanvas() {
  const mapRef = useRef<MapRef | null>(null);
  const { styleBasemapPlaceLabels } = useMapControls();
  const {
    setMapRef,
    setMapStatus,
    setHexResolution,
    setHexInspectInfo,
    setSourceLoaded,
  } = useMapActions();
  const status = useMapStatus();
  const city = useMapCity();
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
  // it) and read here as a selector — the canvas only renders them.
  const hexCells = useListingsHexCells();

  const { collection: browsePoints } = useBrowsePoints(city?.slug ?? "", {
    enabled: isBrowse,
  });

  // Clicking empty space (no hex under the pointer) dismisses the inspect popup;
  // the hex layer owns setting it (see HexLayers). Matters on touch, where there
  // is no mouseleave to clear a tapped cell.
  const handleAnalyseClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const clickedHex = event.features?.some(
        (feature) => feature.layer.id === HEX_FILL_LAYER_ID,
      );
      if (!clickedHex) setHexInspectInfo(null);
    },
    [setHexInspectInfo],
  );

  // Zoom adaptivity (US2): when the view settles, derive the resolution bucket
  // and update the store only when the bucket actually changes — the bridge hook
  // re-queries the worker off that. Debounced so a flurry of moveends coalesces.
  const handleMoveEnd = useDebouncedCallback((event: ViewStateChangeEvent) => {
    const next = zoomToResolution(event.viewState.zoom);
    if (next !== useSceneStore.getState().hexResolution) setHexResolution(next);
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
      setSourceLoaded(event.sourceId, !!event.isSourceLoaded);
    },
    [setSourceLoaded],
  );

  const handleLoad = useCallback(() => {
    setMapRef(mapRef.current);
    setMapStatus("ready");
    styleBasemapPlaceLabels(theme);
    // Seed the resolution bucket from the framed zoom before any user gesture.
    setHexResolution(zoomToResolution(mapRef.current!.getZoom()));
  }, [
    setMapRef,
    setMapStatus,
    setHexResolution,
    styleBasemapPlaceLabels,
    theme,
  ]);

  if (!city || !bounds) return <MapSkeleton />;

  if (
    !city.boundaries ||
    city.boundaries.features.length === 0 ||
    status === "error"
  ) {
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
        onError={() => setMapStatus("error")}
      >
        <HexLayers
          cells={hexCells}
          breaks={city.priceScale.breaks}
          theme={theme}
          visible={!isBrowse}
        />
        {browsePoints && (
          <PointsLayers
            collection={browsePoints}
            theme={theme}
            visible={isBrowse}
          />
        )}
        <NeighbourhoodsLayers
          boundaries={city.boundaries}
          theme={theme}
          interactive={isBrowse}
        />
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
