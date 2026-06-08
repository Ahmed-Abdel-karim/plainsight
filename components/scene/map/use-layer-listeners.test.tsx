import { renderHook } from "@testing-library/react";
import type { MapRef } from "react-map-gl/maplibre";
import type { Subscription } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POINTS_CIRCLE_LAYER_ID } from "./constants";
import { useLayerListeners } from "./use-layer-listeners";
import { useSceneStore } from "../stores";

describe("useLayerListeners", () => {
  afterEach(() => {
    useSceneStore
      .getState()
      .mapActions.removeEventListeners(POINTS_CIRCLE_LAYER_ID);
    useSceneStore.setState({ mapRef: null });
  });

  it("delivers events to the latest handlers without re-subscribing", () => {
    const unsubscribe = vi.fn();
    const on = vi.fn<
      (
        eventType: string,
        layerId: string,
        listener: (event: object) => void,
      ) => Subscription
    >(() => ({ unsubscribe }));
    useSceneStore.getState().mapActions.setMapRef({ on } as unknown as MapRef);
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
    useSceneStore.getState().mapActions.setMapRef({ on } as unknown as MapRef);

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
