import type { MapRef } from "react-map-gl/maplibre";
import { vi } from "vitest";

/**
 * The single, centralised fake for the MapLibre boundary (Principle 2 guardrail 2):
 * one definition shared by the machine harness and the react-map-gl render-boundary
 * mock, so neither can drift from the other. No WebGL, no DOM — just the call surface
 * the app drives.
 */

/**
 * The MapLibre-instance methods the map machine drives imperatively, spied so a test
 * can assert the *contract* with MapLibre without a real canvas. `getSource` returns a
 * truthy stub so the feature-state code paths run.
 */
export interface FakeMaplibreMap {
  getSource: ReturnType<typeof vi.fn>;
  setFeatureState: ReturnType<typeof vi.fn>;
  removeFeatureState: ReturnType<typeof vi.fn>;
  fitBounds: ReturnType<typeof vi.fn>;
  setMaxBounds: ReturnType<typeof vi.fn>;
  setCenter: ReturnType<typeof vi.fn>;
  setZoom: ReturnType<typeof vi.fn>;
  // Touched by the theme-label sync on load; absent layers are skipped, so the
  // getters return nothing and the setter is an inert spy.
  getLayer: ReturnType<typeof vi.fn>;
  getLayoutProperty: ReturnType<typeof vi.fn>;
  setLayoutProperty: ReturnType<typeof vi.fn>;
}

export function createFakeMaplibreMap(): FakeMaplibreMap {
  return {
    getSource: vi.fn(() => ({})),
    setFeatureState: vi.fn(),
    removeFeatureState: vi.fn(),
    fitBounds: vi.fn(),
    setMaxBounds: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    getLayer: vi.fn(() => undefined),
    getLayoutProperty: vi.fn(() => undefined),
    setLayoutProperty: vi.fn(),
  };
}

/**
 * The `MapRef`-level surface the component and `reportMapLoaded` reach: `getMap()`
 * returns the spied instance, and the readiness/listener wiring needs `getZoom` (read
 * for the initial resolution), `getCanvas` (cursor), `on` (layer listeners), and
 * `queryRenderedFeatures` (hit-testing). The same `map` instance is returned by every
 * `getMap()` so a test can assert against the spies it captured.
 */
export function createFakeMapRef(
  map: FakeMaplibreMap = createFakeMaplibreMap(),
): {
  ref: MapRef;
  map: FakeMaplibreMap;
} {
  const ref = {
    getMap: () => map,
    getZoom: () => 11,
    getCanvas: () => ({ style: {} }),
    on: () => ({ unsubscribe: () => {} }),
    queryRenderedFeatures: () => [],
  } as unknown as MapRef;
  return { ref, map };
}
