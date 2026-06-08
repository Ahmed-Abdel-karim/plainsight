import { render } from "@testing-library/react";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NeighbourhoodBoundaries } from "@/data";
import type { BrowsePointProperties } from "@/data/contract";

const mocks = vi.hoisted(() => ({
  getLayer: vi.fn(),
  queryRenderedFeatures: vi.fn(),
  selectListing: vi.fn(),
  setHoveredListing: vi.fn(),
  toggleNeighbourhood: vi.fn(),
  useLayerListeners: vi.fn(),
}));

vi.mock("react-map-gl/maplibre", () => ({
  Layer: () => null,
  Source: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("./use-layer-listeners", () => ({
  useLayerListeners: mocks.useLayerListeners,
}));
vi.mock("../stores", () => ({
  useMapActions: () => ({ setHoveredListing: mocks.setHoveredListing }),
  useMapRef: () => ({
    getLayer: mocks.getLayer,
    queryRenderedFeatures: mocks.queryRenderedFeatures,
  }),
  // Read by the relocated usePointsFeatureState; inert here so the feature-state
  // effect no-ops while this test exercises the layer's pointer listeners.
  useHoveredListingId: () => null,
  useSelectedId: () => null,
  useIsSourceLoaded: () => false,
}));
vi.mock("../use-lens", () => ({
  useLens: () => ({ selectListing: mocks.selectListing }),
}));
vi.mock("../use-scope", () => ({
  useScope: () => ({ toggleNeighbourhood: mocks.toggleNeighbourhood }),
}));
vi.mock("./points/use-points-filter", () => ({
  usePointsFilter: () => ["all"],
}));

import { FILL_LAYER_ID, POINTS_CIRCLE_LAYER_ID } from "./constants";
import { NeighbourhoodsLayers } from "./neighbourhoods";
import { PointsLayers } from "./points";

const collection = {
  type: "FeatureCollection",
  features: [],
} as GeoJSON.FeatureCollection<GeoJSON.Point, BrowsePointProperties>;
const boundaries = {
  type: "FeatureCollection",
  features: [],
} as unknown as NeighbourhoodBoundaries;

function layerEvent(input: {
  id?: number;
  neighbourhoodId?: string;
}): MapLayerMouseEvent {
  return {
    point: { x: 10, y: 20 },
    features: [
      {
        id: input.id,
        properties: { id: input.neighbourhoodId },
      },
    ],
  } as unknown as MapLayerMouseEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("layer-owned Browse interactions", () => {
  it("registers point hover and click behavior on the points layer", () => {
    render(<PointsLayers collection={collection} theme="light" visible />);

    const [layerId, listeners, enabled] = mocks.useLayerListeners.mock.calls[0];
    const pointEvent = layerEvent({ id: 42 });

    expect(layerId).toBe(POINTS_CIRCLE_LAYER_ID);
    expect(enabled).toBe(true);

    listeners.mousemove(pointEvent);
    expect(mocks.setHoveredListing).toHaveBeenLastCalledWith(42, "map");

    listeners.mouseleave();
    expect(mocks.setHoveredListing).toHaveBeenLastCalledWith(null, "map");

    listeners.click(pointEvent);
    expect(mocks.selectListing).toHaveBeenCalledWith(42);
  });

  it("skips the neighbourhood action when a rendered point overlaps", () => {
    mocks.getLayer.mockReturnValue({});
    mocks.queryRenderedFeatures.mockReturnValue([{}]);
    render(
      <NeighbourhoodsLayers
        boundaries={boundaries}
        theme="light"
        interactive
      />,
    );

    const [layerId, listeners, enabled] = mocks.useLayerListeners.mock.calls[0];
    const boundaryEvent = layerEvent({ neighbourhoodId: "camden" });

    expect(layerId).toBe(FILL_LAYER_ID);
    expect(enabled).toBe(true);

    listeners.click(boundaryEvent);

    expect(mocks.queryRenderedFeatures).toHaveBeenCalledWith(
      boundaryEvent.point,
      { layers: [POINTS_CIRCLE_LAYER_ID] },
    );
    expect(mocks.toggleNeighbourhood).not.toHaveBeenCalled();
  });

  it("toggles the neighbourhood when no rendered point overlaps", () => {
    mocks.getLayer.mockReturnValue({});
    mocks.queryRenderedFeatures.mockReturnValue([]);
    render(
      <NeighbourhoodsLayers
        boundaries={boundaries}
        theme="light"
        interactive
      />,
    );

    const listeners = mocks.useLayerListeners.mock.calls[0][1];
    listeners.click(layerEvent({ neighbourhoodId: "camden" }));

    expect(mocks.toggleNeighbourhood).toHaveBeenCalledWith("camden");
  });
});
