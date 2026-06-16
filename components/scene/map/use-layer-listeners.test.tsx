import { renderHook } from "@testing-library/react";
import type { MapRef } from "react-map-gl/maplibre";
import type { Subscription } from "maplibre-gl";
import { describe, expect, it, vi } from "vitest";

import { POINTS_CIRCLE_LAYER_ID } from "./constants";
import { useLayerListeners } from "./use-layer-listeners";

// Inject the mock mapRef via the state module that useLayerListeners reads from.
const mockMapRef = vi.hoisted(() => ({ current: null as MapRef | null }));
vi.mock("../state", () => ({
  useMapRef: () => mockMapRef.current,
}));

function setup(on: MapRef["on"]) {
  mockMapRef.current = { on } as unknown as MapRef;
  return {};
}

describe("useLayerListeners", () => {
  it("delivers events to the latest handlers without re-subscribing", () => {
    const unsubscribe = vi.fn();
    const on = vi.fn<
      (
        eventType: string,
        layerId: string,
        listener: (event: object) => void,
      ) => Subscription
    >(() => ({ unsubscribe }));
    setup(on as unknown as MapRef["on"]);
    const first = vi.fn();
    const latest = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ listener }: { listener: () => void }) =>
        useLayerListeners(POINTS_CIRCLE_LAYER_ID, { click: listener }),
      { initialProps: { listener: first } },
    );
    const registered = on.mock.calls[0][2] as (event: object) => void;

    registered({});
    rerender({ listener: latest });
    registered({});

    expect(first).toHaveBeenCalledOnce();
    expect(latest).toHaveBeenCalledOnce();
    expect(on).toHaveBeenCalledOnce();

    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("unsubscribes while disabled and registers again when enabled", () => {
    const unsubscribe = vi.fn();
    const on = vi.fn<
      (
        eventType: string,
        layerId: string,
        listener: (event: object) => void,
      ) => Subscription
    >(() => ({ unsubscribe }));
    setup(on as unknown as MapRef["on"]);

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useLayerListeners(POINTS_CIRCLE_LAYER_ID, { click: vi.fn() }, enabled),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });
    expect(unsubscribe).toHaveBeenCalledOnce();

    rerender({ enabled: true });
    expect(on).toHaveBeenCalledTimes(2);
  });
});
