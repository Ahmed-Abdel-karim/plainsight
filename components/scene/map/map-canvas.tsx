"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map,
  MapRef,
  NavigationControl,
} from "react-map-gl/maplibre";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { toBounds } from "@/lib/geo";
import { OPENFREEMAP_STYLE } from "./map-styles";
import { NeighbourhoodsLayers } from "./neighbourhoods";
import { useMapControls } from "./map-controls";
import { useMapActions, useMapCity, useMapStatus } from "./map-store";
import { useResolvedTheme } from "../../theme/theme-provider";
import MapSkeleton from "./map-skeleton";

const MAX_BOUNDS_PADDING_RATIO = 0.3; // Pad maxBounds by 25% to allow some room for UI and avoid edge-clipping

export function MapCanvas() {
  const mapRef = useRef<MapRef | null>(null);
  const { fitTo, styleBasemapPlaceLabels } = useMapControls();
  const { setMapRef, setMapStatus } = useMapActions();
  const status = useMapStatus();
  const city = useMapCity();
  const theme = useResolvedTheme();
  const bounds = useMemo(() => (city ? toBounds(city.bbox) : null), [city]);
  const maxBounds = useMemo(
    () => (city ? toBounds(city.bbox, MAX_BOUNDS_PADDING_RATIO) : undefined),
    [city],
  );
  const mapStyle = OPENFREEMAP_STYLE[theme];

  const handleLoad = useCallback(() => {
    setMapRef(mapRef.current);
    setMapStatus("ready");
    styleBasemapPlaceLabels(theme);
  }, [setMapRef, setMapStatus, styleBasemapPlaceLabels, theme]);

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
        onLoad={handleLoad}
        onStyleData={() => styleBasemapPlaceLabels(theme)}
        onError={() => setMapStatus("error")}
      >
        <NeighbourhoodsLayers boundaries={city.boundaries} theme={theme} />
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
