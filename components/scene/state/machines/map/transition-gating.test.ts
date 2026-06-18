import { afterEach, describe, expect, it } from "vitest";

import { POINTS_SOURCE_ID } from "../../../map/constants";
import { mountFakeMap, startSceneSystem } from "../__tests__/harness";

/**
 * Executable spec for the map machine's transition gate — the companion proof to
 * `docs/map-machine-transition-gating.md`. The design claim is that the *machine*
 * enforces the gate (pointer handlers live only on `ready.interactive`), so it
 * can't be breached from the view. These cases assert that claim as observable
 * behaviour: the imperative MapLibre calls that do / don't happen, the cross-actor
 * events, and the state the gate rests on.
 *
 * Driven through the connected system (the real map + ui + worker actors); only
 * the MapLibre instance is faked (no WebGL in node).
 */
describe("map machine — transition gating (executable spec)", () => {
  let scene: ReturnType<typeof startSceneSystem> | undefined;
  let map: ReturnType<typeof mountFakeMap>;

  function start() {
    scene = startSceneSystem();
    map = mountFakeMap(scene);
    return scene;
  }

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  describe("while ready.interactive", () => {
    it("applies a selection to the map and forwards it to ui", () => {
      const s = start();

      s.map?.send({ type: "MAP.SELECT", id: 42 });

      expect(map.setFeatureState).toHaveBeenCalledWith(
        { source: POINTS_SOURCE_ID, id: 42 },
        { selected: true },
      );
      expect(s.ui?.getSnapshot().context.selectedId).toBe(42);
    });

    it("applies a hover to the map and forwards it to ui", () => {
      const s = start();

      s.map?.send({ type: "MAP.HOVER", id: 7, source: "map" });

      expect(map.setFeatureState).toHaveBeenCalledWith(
        { source: POINTS_SOURCE_ID, id: 7 },
        { hover: true },
      );
      expect(s.ui?.getSnapshot().context.hoveredListingId).toBe(7);
    });
  });

  describe("NAV.START enters ready.suppressed", () => {
    it("clears the outgoing city's interaction state on entry", () => {
      const s = start();

      s.map?.send({ type: "NAV.START", slug: "berlin" });

      expect(s.map?.getSnapshot().value).toEqual({ ready: "suppressed" });
      expect(map.removeFeatureState).toHaveBeenCalledWith({
        source: POINTS_SOURCE_ID,
      });
    });

    it("structurally ignores pointer interactions — the gate", () => {
      const s = start();
      s.map?.send({ type: "NAV.START", slug: "berlin" });
      map.setFeatureState.mockClear();

      s.map?.send({ type: "MAP.SELECT", id: 99 });
      s.map?.send({ type: "MAP.HOVER", id: 99, source: "map" });
      s.map?.send({
        type: "MAP.HEX_INSPECT",
        info: { longitude: 0, latitude: 0, medianPrice: 1, count: 1 },
      });

      expect(map.setFeatureState).not.toHaveBeenCalled();
      expect(s.map?.getSnapshot().value).toEqual({ ready: "suppressed" });
      expect(s.map?.getSnapshot().context.hexInspectInfo).toBeNull();
    });

    it("still ingests the incoming city while suppressed", () => {
      const s = start();
      s.map?.send({ type: "NAV.START", slug: "berlin" });

      s.map?.send({ type: "MAP.FIT_BOUNDS", bbox: [-0.5, 51.3, 0.3, 51.7] });
      s.map?.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 7 });

      expect(map.fitBounds).toHaveBeenCalled();
      expect(s.map?.getSnapshot().context.hexResolution).toBe(7);
      // Ingesting the new city does not lift the gate.
      expect(s.map?.getSnapshot().value).toEqual({ ready: "suppressed" });
    });
  });

  describe("CITY.READY returns to ready.interactive", () => {
    it("restores pointer interaction once the new city has converged", () => {
      const s = start();
      s.map?.send({ type: "NAV.START", slug: "berlin" });
      s.map?.send({ type: "CITY.READY" });

      expect(s.map?.getSnapshot().value).toEqual({ ready: "interactive" });

      map.setFeatureState.mockClear();
      s.map?.send({ type: "MAP.SELECT", id: 5 });
      expect(map.setFeatureState).toHaveBeenCalledWith(
        { source: POINTS_SOURCE_ID, id: 5 },
        { selected: true },
      );
    });
  });
});
