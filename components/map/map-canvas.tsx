"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Map,
  MapRef,
  NavigationControl,
} from "react-map-gl/maplibre";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { toBounds } from "@/lib/geo";
import { OPENFREEMAP_STYLE, type MapTheme } from "./map-styles";
import { NeighbourhoodsLayers } from "./neighbourhoods";
import { useMapControls } from "./map-controls";
import { useMapActions, useMapCity, useMapStatus } from "./map-store";

function toMapTheme(resolvedTheme: string | undefined): MapTheme {
  return resolvedTheme === "light" ? "light" : "dark";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MapCanvas() {
  const mapRef = useRef<MapRef | null>(null);
  const { fitTo, styleBasemapPlaceLabels } = useMapControls();
  const { setMapRef, setMapStatus } = useMapActions();
  const status = useMapStatus();
  const city = useMapCity();
  const { resolvedTheme } = useTheme();
  const theme = toMapTheme(resolvedTheme);
  const bounds = useMemo(() => (city ? toBounds(city.bbox) : null), [city]);
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
    fitTo(bounds, {
      padding: 32,
      duration: prefersReducedMotion() ? 0 : 300,
    });
  }, [city?.slug, status, bounds, fitTo]);

  if (status === "error") {
    return (
      <div className="bg-map-bg text-map-label flex h-full min-h-80 items-center justify-center type-label">
        Map unavailable
      </div>
    );
  }

  // No city in the store yet (very first paint before MapDataSync runs): keep the
  // same chrome the dynamic-import fallback shows.
  if (!city || !bounds) {
    return (
      <div className="bg-map-bg text-map-label absolute inset-0 flex items-center justify-center type-label">
        Loading map
      </div>
    );
  }

  if (!city.boundaries || city.boundaries.features.length === 0) {
    return (
      <p className="text-map-label absolute inset-0 flex items-center justify-center type-label">
        Map unavailable
      </p>
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
          fitBoundsOptions: { padding: 32 },
        }}
        mapStyle={mapStyle}
        maxBounds={bounds}
        keyboard
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
        onLoad={handleLoad}
        onStyleData={() => styleBasemapPlaceLabels(theme)}
        onError={() => setMapStatus("error")}
      >
        <NeighbourhoodsLayers boundaries={city.boundaries} theme={theme} />
        <NavigationControl position="top-left" visualizePitch={false} />
        <AttributionControl compact position="bottom-right" />
      </Map>
    </div>
  );
}
