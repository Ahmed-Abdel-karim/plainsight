import { renderHook } from "@testing-library/react";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLayer: vi.fn(),
  queryRenderedFeatures: vi.fn(),
  mapHover: vi.fn(),
  mapSelect: vi.fn(),
  toggleNeighbourhood: vi.fn(),
}));

vi.mock("../state", () => ({
  useMapHover: () => mocks.mapHover,
  useMapSelect: () => mocks.mapSelect,
  useMapRef: () => ({
    getLayer: mocks.getLayer,
    queryRenderedFeatures: mocks.queryRenderedFeatures,
  }),
}));
vi.mock("../use-scope", () => ({
  useScope: () => ({ toggleNeighbourhood: mocks.toggleNeighbourhood }),
}));

import { POINTS_CIRCLE_LAYER_ID } from "./constants";
import { usePointsListeners } from "./points/listeners";
import { useNeighbourhoodsListeners } from "./neighbourhoods/listeners";
import type { LayerListener } from "./layer";

function find<T extends LayerListener["type"]>(
  listeners: LayerListener[],
  type: T,
): Extract<LayerListener, { type: T }>["listener"] {
  const found = listeners.find((l) => l.type === type);
  return found!.listener as any;
}

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
    const { result } = renderHook(() => usePointsListeners(true));
    const pointEvent = layerEvent({ id: 42 });

    find(result.current, "mousemove")(pointEvent);
    expect(mocks.mapHover).toHaveBeenLastCalledWith(42, "map");

    find(result.current, "mouseleave")(pointEvent);
    expect(mocks.mapHover).toHaveBeenLastCalledWith(null, null);

    find(result.current, "click")(pointEvent);
    expect(mocks.mapSelect).toHaveBeenCalledWith(42);
  });

  it("skips the neighbourhood action when a rendered point overlaps", () => {
    mocks.getLayer.mockReturnValue({});
    mocks.queryRenderedFeatures.mockReturnValue([{}]);

    const { result } = renderHook(() => useNeighbourhoodsListeners());
    const click = find(result.current, "click");
    const boundaryEvent = layerEvent({ neighbourhoodId: "camden" });

    click(boundaryEvent);

    expect(mocks.queryRenderedFeatures).toHaveBeenCalledWith(
      boundaryEvent.point,
      { layers: [POINTS_CIRCLE_LAYER_ID] },
    );
    expect(mocks.toggleNeighbourhood).not.toHaveBeenCalled();
  });

  it("toggles the neighbourhood when no rendered point overlaps", () => {
    mocks.getLayer.mockReturnValue({});
    mocks.queryRenderedFeatures.mockReturnValue([]);

    const { result } = renderHook(() => useNeighbourhoodsListeners());
    const click = find(result.current, "click");

    click(layerEvent({ neighbourhoodId: "camden" }));

    expect(mocks.toggleNeighbourhood).toHaveBeenCalledWith("camden");
  });
});
