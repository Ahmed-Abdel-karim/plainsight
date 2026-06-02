"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map,
  type MapLayerMouseEvent,
  MapRef,
  NavigationControl,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { toBounds } from "@/lib/geo";
import { zoomToResolution } from "@/lib/hex/resolution";
import { HEX_FILL_LAYER_ID } from "./constants";
import { OPENFREEMAP_STYLE } from "./map-styles";
import { NeighbourhoodsLayers } from "./neighbourhoods";
import { HexLayer } from "./hex/hex-layer";
import { HexInspect, type HexInspectState } from "./hex/hex-inspect";
import type { HexFeatureProps } from "./hex/hex-layer";
import { useHexLayer } from "./hex/use-hex-layer";
import { useMapControls } from "./map-controls";
import {
  useHexCells,
  useMapActions,
  useMapCity,
  useMapStatus,
  useMapStore,
} from "./map-store";
import { useResolvedTheme } from "../../theme/theme-provider";
import MapSkeleton from "./map-skeleton";

const MAX_BOUNDS_PADDING_RATIO = 0.3; // Pad maxBounds by 25% to allow some room for UI and avoid edge-clipping

export function MapCanvas() {
  const mapRef = useRef<MapRef | null>(null);
  const { fitTo, styleBasemapPlaceLabels } = useMapControls();
  const { setMapRef, setMapStatus, setHexResolution } = useMapActions();
  const status = useMapStatus();
  const city = useMapCity();
  const theme = useResolvedTheme();
  const bounds = useMemo(() => (city ? toBounds(city.bbox) : null), [city]);
  const maxBounds = useMemo(
    () => (city ? toBounds(city.bbox, MAX_BOUNDS_PADDING_RATIO) : undefined),
    [city],
  );
  const mapStyle = OPENFREEMAP_STYLE[theme];

  // The hex price map is the default view: acquire the worker eagerly and feed
  // the store the cells for the active filters + zoom-derived resolution.
  const hexBounds = useMemo(
    () =>
      city
        ? { min: city.priceScale.min, max: city.priceScale.max }
        : { min: 0, max: 0 },
    [city],
  );
  useHexLayer({ slug: city?.slug ?? "", bounds: hexBounds, enabled: !!city });
  const hexCells = useHexCells();

  // Per-cell inspect (US4): hover (desktop) / tap (touch) a hex → median + count.
  const [inspect, setInspect] = useState<HexInspectState | null>(null);
  const inspectFrom = useCallback(
    (event: MapLayerMouseEvent): HexInspectState | null => {
      const feature = event.features?.[0];
      if (!feature) return null;
      const { medianPrice, count } = feature.properties as HexFeatureProps;
      return { x: event.point.x, y: event.point.y, medianPrice, count };
    },
    [],
  );
  const handleHexHover = useCallback(
    (event: MapLayerMouseEvent) => setInspect(inspectFrom(event)),
    [inspectFrom],
  );
  const handleHexTap = useCallback(
    (event: MapLayerMouseEvent) => setInspect(inspectFrom(event)),
    [inspectFrom],
  );
  const clearInspect = useCallback(() => setInspect(null), []);

  // Zoom adaptivity (US2): when the view settles, derive the resolution bucket
  // and update the store only when the bucket actually changes — the bridge hook
  // re-queries the worker off that. Debounced so a flurry of moveends coalesces.
  const handleMoveEnd = useDebouncedCallback((event: ViewStateChangeEvent) => {
    const next = zoomToResolution(event.viewState.zoom);
    if (next !== useMapStore.getState().hexResolution) setHexResolution(next);
  }, 150);

  const handleLoad = useCallback(() => {
    setMapRef(mapRef.current);
    setMapStatus("ready");
    styleBasemapPlaceLabels(theme);
    // Seed the resolution bucket from the framed zoom before any user gesture.
    const map = mapRef.current;
    if (map) setHexResolution(zoomToResolution(map.getZoom()));
  }, [
    setMapRef,
    setMapStatus,
    setHexResolution,
    styleBasemapPlaceLabels,
    theme,
  ]);

  // The map mounts once and persists across city navigation, so frame the active
  // city imperatively: this fires on the first ready frame and again whenever the
  // city changes, animating in place instead of remounting a new map.
  useEffect(() => {
    if (status !== "ready" || !bounds) return;
    fitTo(bounds);
  }, [city?.slug, status, bounds, fitTo]);

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
        interactiveLayerIds={[HEX_FILL_LAYER_ID]}
        onLoad={handleLoad}
        onMoveEnd={handleMoveEnd}
        onMouseMove={handleHexHover}
        onMouseLeave={clearInspect}
        onClick={handleHexTap}
        onStyleData={() => styleBasemapPlaceLabels(theme)}
        onError={() => setMapStatus("error")}
      >
        <HexLayer
          cells={hexCells}
          breaks={city.priceScale.breaks}
          theme={theme}
        />
        <NeighbourhoodsLayers boundaries={city.boundaries} theme={theme} />
        <NavigationControl
          position="top-left"
          visualizePitch={false}
          showCompass={false}
        />
        <AttributionControl compact position="bottom-right" />
      </Map>
      {inspect && <HexInspect {...inspect} currency={city.currency} />}
    </div>
  );
}
