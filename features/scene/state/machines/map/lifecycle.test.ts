import type { MapRef } from "react-map-gl/maplibre";
import { afterEach, describe, expect, it } from "vitest";

import { POINTS_SOURCE_ID } from "@/features/scene/map/constants";
import { createFakeMaplibreMap } from "@/test/scene/fake-map";
import { mountFakeMap, setupSceneSystem } from "../__tests__/utils";

/**
 * The map actor is session-persistent (it lives in the root layout), so it
 * outlives any single MapLibre instance. These cases pin the two guards that
 * keep it from operating on a *removed* map — the actual cause of the
 * `getSource`-on-undefined crash once the provider was lifted above the canvas.
 */
describe("map machine — instance lifecycle", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  it("drops the ref and returns to loading on MAP.UNMOUNTED", () => {
    scene = setupSceneSystem();
    mountFakeMap(scene);
    expect(
      scene.map
        ?.getSnapshot()
        .matches({ lifecycle: "ready", interaction: "interactive" }),
    ).toBe(true);

    scene.map?.send({ type: "MAP.UNMOUNTED" });

    expect(scene.map?.getSnapshot().matches({ lifecycle: "loading" })).toBe(
      true,
    );
    expect(scene.map?.getSnapshot().context.mapRef).toBeNull();
  });

  it("re-syncs onto a fresh instance after a remount", () => {
    scene = setupSceneSystem();
    mountFakeMap(scene);

    scene.map?.send({ type: "MAP.UNMOUNTED" });
    const next = mountFakeMap(scene);

    scene.ui?.send({ type: "UI.SELECT", id: 5 });
    expect(next.setFeatureState).toHaveBeenCalledWith(
      { source: POINTS_SOURCE_ID, id: 5 },
      { selected: true },
    );
  });

  it("no-ops imperative calls against a removed-but-present instance", () => {
    scene = setupSceneSystem();
    // A ref whose map reports MapLibre's post-`remove()` teardown flag.
    const removed = Object.assign(createFakeMaplibreMap(), { _removed: true });
    const mapRef = { getMap: () => removed } as unknown as MapRef;
    scene.map?.send({ type: "MAP.MOUNTED", mapRef });
    scene.map?.send({ type: "MAP.READY" });

    expect(() => scene?.ui?.send({ type: "UI.SELECT", id: 9 })).not.toThrow();
    expect(removed.setFeatureState).not.toHaveBeenCalled();
  });
});
