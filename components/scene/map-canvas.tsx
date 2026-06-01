"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  AttributionControl,
  Layer,
  Map,
  NavigationControl,
  Source,
  type MapRef,
  type MapStyleDataEvent,
  type MapEvent,
  type LineLayerSpecification,
  type LngLatBoundsLike,
} from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useRef, useState } from "react";

import type { NeighbourhoodBoundaries } from "@/data";
import {
  OPENFREEMAP_STYLE,
  OVERLAY_LINE,
  POI_LAYER_HINTS,
  type MapTheme,
} from "./map-styles";

const SOURCE_ID = "neighbourhoods";
const OUTLINE_LAYER_ID = "neighbourhoods-outline";

interface MapCanvasProps {
  bbox: [number, number, number, number];
  center: [number, number];
  boundaries: NeighbourhoodBoundaries;
  cityName: string;
}

function toMapTheme(resolvedTheme: string | undefined): MapTheme {
  return resolvedTheme === "light" ? "light" : "dark";
}

function hasPoiHint(layerId: string): boolean {
  const normalized = layerId.toLowerCase();
  return POI_LAYER_HINTS.some((hint) => normalized.includes(hint));
}

function toBounds([minLng, minLat, maxLng, maxLat]: [
  number,
  number,
  number,
  number,
]): LngLatBoundsLike {
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MapCanvas({
  bbox,
  center,
  boundaries,
  cityName,
}: MapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { resolvedTheme } = useTheme();
  const theme = toMapTheme(resolvedTheme);
  const bounds = useMemo(() => toBounds(bbox), [bbox]);
  const mapStyle = OPENFREEMAP_STYLE[theme];

  const outlineLayer = useMemo<LineLayerSpecification>(
    () => ({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": OVERLAY_LINE[theme],
        "line-width": 1,
      },
    }),
    [theme],
  );

  const hidePoiLayers = useCallback((map: MapLibreMap) => {
    const layers = map.getStyle().layers ?? [];

    for (const layer of layers) {
      if (layer.type !== "symbol") continue;
      // Hide the OpenMapTiles POI source-layer outright, plus any id hints —
      // targeted enough not to drop wanted street/place labels (FR-003).
      const sourceLayer =
        "source-layer" in layer ? layer["source-layer"] : undefined;
      if (sourceLayer === "poi" || hasPoiHint(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
      }
    }
  }, []);

  const handleLoad = useCallback(
    (event: MapEvent) => {
      const map = event.target;
      hidePoiLayers(map);
      map.fitBounds(bounds, {
        padding: 32,
        duration: prefersReducedMotion() ? 0 : 300,
      });
      setIsReady(true);
    },
    [bounds, hidePoiLayers],
  );

  const handleStyleData = useCallback(
    (event: MapStyleDataEvent) => {
      hidePoiLayers(event.target);
      if (event.target.isStyleLoaded()) {
        setIsReady(true);
      }
    },
    [hidePoiLayers],
  );

  if (hasError) {
    return (
      <div className="bg-map-bg text-map-label flex h-full min-h-80 items-center justify-center type-label">
        Map unavailable
      </div>
    );
  }

  // next-themes resolves the theme only after mount; hold the map until then so
  // a stored-"light" visitor never initializes the dark style first (FR-008).
  // Safe to gate on here because this component is client-only (`map.tsx` loads
  // it with `ssr: false`), so there is no server render to mismatch.
  if (!resolvedTheme) {
    return (
      <div
        aria-label={`Map of ${cityName}`}
        className="bg-map-bg text-map-label absolute inset-0 flex items-center justify-center type-label"
      >
        Loading map
      </div>
    );
  }

  return (
    <div aria-label={`Map of ${cityName}`} className="absolute inset-0">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
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
        onStyleData={handleStyleData}
        onError={() => {
          setHasError(true);
        }}
      >
        <Source id={SOURCE_ID} type="geojson" data={boundaries}>
          <Layer {...outlineLayer} />
        </Source>
        <NavigationControl position="top-left" visualizePitch={false} />
        <AttributionControl compact position="bottom-right" />
      </Map>
      {!isReady ? (
        <div className="bg-map-bg text-map-label absolute inset-0 flex items-center justify-center type-label">
          Loading map
        </div>
      ) : null}
    </div>
  );
}
