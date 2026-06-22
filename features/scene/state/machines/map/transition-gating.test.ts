import { afterEach, describe, expect, it } from "vitest";

import { POINTS_SOURCE_ID } from "@/features/scene/map/constants";
import { mountFakeMap, setupSceneSystem } from "../__tests__/utils";

/**
 * Executable spec for the map machine's interaction gate. The design claim is
 * that the *machine* enforces the gate (pointer handlers live only on
 * `interaction.interactive`), so it can't be breached from the view. Suppression
 * is its own parallel region: `SUSPEND` → `interaction.suspended`, `RESUME` →
 * `interaction.interactive`, independent of the `lifecycle` region (which keeps
 * ingesting camera/data throughout).
 *
 * Driven through the connected system (real map + ui + worker actors); only the
 * MapLibre instance is faked (no WebGL in node).
 */
describe("map machine — interaction gating (executable spec)", () => {
  let scene: ReturnType<typeof setupSceneSystem> | undefined;
  let map: ReturnType<typeof mountFakeMap>;

  function start() {
    scene = setupSceneSystem();
    map = mountFakeMap(scene);
    return scene;
  }

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  describe("while interaction.interactive", () => {
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
      expect(s.ui?.getSnapshot().context.hoveredListing?.id).toBe(7);
    });
  });

  describe("SUSPEND enters interaction.suspended", () => {
    it("clears the outgoing city's interaction state on entry", () => {
      const s = start();

      s.map?.send({ type: "SUSPEND" });

      expect(s.map?.getSnapshot().matches({ interaction: "suspended" })).toBe(
        true,
      );
      expect(map.removeFeatureState).toHaveBeenCalledWith({
        source: POINTS_SOURCE_ID,
      });
    });

    it("structurally ignores pointer interactions — the gate", () => {
      const s = start();
      s.map?.send({ type: "SUSPEND" });
      map.setFeatureState.mockClear();

      s.map?.send({ type: "MAP.SELECT", id: 99 });
      s.map?.send({ type: "MAP.HOVER", id: 99, source: "map" });
      s.map?.send({
        type: "MAP.HEX_INSPECT",
        info: { longitude: 0, latitude: 0, medianPrice: 1, count: 1 },
      });

      expect(map.setFeatureState).not.toHaveBeenCalled();
      expect(s.map?.getSnapshot().matches({ interaction: "suspended" })).toBe(
        true,
      );
      expect(s.map?.getSnapshot().context.hexInspectInfo).toBeNull();
    });

    it("still ingests the incoming city while suspended (lifecycle is independent)", () => {
      const s = start();
      s.map?.send({ type: "SUSPEND" });

      s.map?.send({ type: "MAP.FIT_BOUNDS", bbox: [-0.5, 51.3, 0.3, 51.7] });
      s.map?.send({ type: "MAP.RESOLUTION_CHANGED", hexResolution: 7 });

      expect(map.fitBounds).toHaveBeenCalled();
      expect(s.map?.getSnapshot().context.hexResolution).toBe(7);
      // Ingesting the new city does not lift the gate.
      expect(s.map?.getSnapshot().matches({ interaction: "suspended" })).toBe(
        true,
      );
    });
  });

  describe("RESUME returns to interaction.interactive", () => {
    it("restores pointer interaction once the new city has converged", () => {
      const s = start();
      s.map?.send({ type: "SUSPEND" });
      s.map?.send({ type: "RESUME" });

      expect(s.map?.getSnapshot().matches({ interaction: "interactive" })).toBe(
        true,
      );

      map.setFeatureState.mockClear();
      s.map?.send({ type: "MAP.SELECT", id: 5 });
      expect(map.setFeatureState).toHaveBeenCalledWith(
        { source: POINTS_SOURCE_ID, id: 5 },
        { selected: true },
      );
    });
  });
});
