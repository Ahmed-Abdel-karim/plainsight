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
import {
  FILL_LAYER_ID,
  HEX_FILL_LAYER_ID,
  POINTS_CIRCLE_LAYER_ID,
} from "./constants";
import { OPENFREEMAP_STYLE } from "./map-styles";
import { NeighbourhoodsLayers } from "./neighbourhoods";
import { HexLayer } from "./hex/hex-layer";
import { HexInspect, type HexInspectState } from "./hex/hex-inspect";
import type { HexFeatureProps } from "./hex/hex-layer";
import { PointsLayer } from "./points/points-layer";
import { pointsFilterExpression } from "./points/points-filter";
import { usePointsFeatureState } from "./points/use-points-layer";
import { useMapControls } from "./map-controls";
import {
  useHexResolution,
  useHoveredListingId,
  useMapActions,
  useMapCity,
  useMapStatus,
  useMapStore,
} from "./map-store";
import { useListingsActions, useListingsHexCells } from "../listings-store";
import { useFilters } from "../analysis/use-filters";
import { useLens } from "../use-lens";
import { useScope } from "../use-scope";
import { useBrowsePoints } from "../browse/use-browse-points";
import { useResolvedTheme } from "../../theme/theme-provider";
import MapSkeleton from "./map-skeleton";

const MAX_BOUNDS_PADDING_RATIO = 0.3; // Pad maxBounds by 25% to allow some room for UI and avoid edge-clipping

export function MapCanvas() {
  const mapRef = useRef<MapRef | null>(null);
  const { fitTo, styleBasemapPlaceLabels } = useMapControls();
  const { setMapRef, setMapStatus, setHexResolution, setHoveredListing } =
    useMapActions();
  const status = useMapStatus();
  const city = useMapCity();
  const theme = useResolvedTheme();

  // Lens + Browse dot layer state. The dots replace the hex fill in Browse,
  // GPU-filtered by the same price/room state the list uses (FR-006).
  const { isBrowse, selectedId, selectListing } = useLens();
  const { scope, toggleNeighbourhood } = useScope();
  const hoveredListingId = useHoveredListingId();
  const bounds = useMemo(() => (city ? toBounds(city.bbox) : null), [city]);
  const maxBounds = useMemo(
    () => (city ? toBounds(city.bbox, MAX_BOUNDS_PADDING_RATIO) : undefined),
    [city],
  );
  const mapStyle = OPENFREEMAP_STYLE[theme];

  // Hex cells are computed by the listings worker store (the effects below feed
  // it) and read here as a selector — the canvas only renders them.
  const hexCells = useListingsHexCells();
  const hexBounds = useMemo(
    () =>
      city
        ? { min: city.priceScale.min, max: city.priceScale.max }
        : { min: 0, max: 0 },
    [city],
  );

  // Browse dots read the SAME filter state as the hex/cards (shared nuqs
  // `price`/`rooms`), interpreted against the city price bounds — so the dots and
  // the list can never disagree on the matching set (FR-006/SC-003).
  const { filters } = useFilters(hexBounds);
  const dotFilter = useMemo(
    () => pointsFilterExpression(filters, scope),
    [filters, scope],
  );

  // Drive the listings worker store. The map is the eager owner: it adopts the
  // city (idempotent — the sidebar cards do the same so neither races an unset
  // slug) and recomputes the price hexes whenever the filters or zoom-derived
  // resolution change. Cells land in the store and are read back as `hexCells`.
  const resolution = useHexResolution();
  const { syncCity, requestHexes } = useListingsActions();
  const citySlug = city?.slug;
  useEffect(() => {
    if (citySlug) syncCity(citySlug);
  }, [syncCity, citySlug]);
  useEffect(() => {
    if (citySlug) requestHexes(filters, resolution);
  }, [requestHexes, citySlug, filters, resolution]);

  const { collection: browsePoints } = useBrowsePoints(city?.slug ?? "", {
    enabled: isBrowse,
  });
  usePointsFeatureState({
    hoveredId: hoveredListingId,
    selectedId,
    enabled: isBrowse,
  });

  // Browse dot interactions: hover bridges to the list (FR-007, source "map" so
  // the list scrolls), click opens the detail drawer (FR-008/US3).
  const handlePointHover = useCallback(
    (event: MapLayerMouseEvent) => {
      const dot = event.features?.find(
        (feature) => feature.layer.id === POINTS_CIRCLE_LAYER_ID,
      );
      setHoveredListing(typeof dot?.id === "number" ? dot.id : null, "map");
    },
    [setHoveredListing],
  );
  const clearPointHover = useCallback(
    () => setHoveredListing(null, "map"),
    [setHoveredListing],
  );
  // A Browse click prefers a dot (open its detail) over the boundary beneath it;
  // clicking a boundary with no dot narrows the scope to that neighbourhood, and
  // clicking the active one again clears it (FR-008 / FR-013).
  const handleBrowseClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const dot = event.features?.find(
        (feature) => feature.layer.id === POINTS_CIRCLE_LAYER_ID,
      );
      if (dot && typeof dot.id === "number") {
        selectListing(dot.id);
        return;
      }
      const boundary = event.features?.find(
        (feature) => feature.layer.id === FILL_LAYER_ID,
      );
      const nbhdId = boundary?.properties?.id;
      if (typeof nbhdId === "string") toggleNeighbourhood(nbhdId);
    },
    [selectListing, toggleNeighbourhood],
  );

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
        interactiveLayerIds={
          isBrowse
            ? [POINTS_CIRCLE_LAYER_ID, FILL_LAYER_ID]
            : [HEX_FILL_LAYER_ID]
        }
        onLoad={handleLoad}
        onMoveEnd={handleMoveEnd}
        onMouseMove={isBrowse ? handlePointHover : handleHexHover}
        onMouseLeave={isBrowse ? clearPointHover : clearInspect}
        onClick={isBrowse ? handleBrowseClick : handleHexTap}
        onStyleData={() => styleBasemapPlaceLabels(theme)}
        onError={() => setMapStatus("error")}
      >
        <HexLayer
          cells={hexCells}
          breaks={city.priceScale.breaks}
          theme={theme}
          visible={!isBrowse}
        />
        {browsePoints && (
          <PointsLayer
            collection={browsePoints}
            theme={theme}
            filter={dotFilter}
            visible={isBrowse}
          />
        )}
        <NeighbourhoodsLayers boundaries={city.boundaries} theme={theme} />
        <NavigationControl
          position="top-left"
          visualizePitch={false}
          showCompass={false}
        />
        <AttributionControl compact position="bottom-right" />
      </Map>
      {!isBrowse && inspect && (
        <HexInspect {...inspect} currency={city.currency} />
      )}
    </div>
  );
}
