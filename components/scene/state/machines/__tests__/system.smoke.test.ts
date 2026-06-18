import { afterEach, describe, expect, it } from "vitest";

import { startSceneSystem } from "./harness";

/**
 * Phase A smoke test — proves the connected-system harness boots the real actor
 * system without a Web Worker and without a DOM. Not a behaviour test; it pins
 * the test *infrastructure* so the real machine slices can build on it.
 */
describe("scene actor system — harness smoke", () => {
  let scene: ReturnType<typeof startSceneSystem> | undefined;

  afterEach(() => {
    scene?.stop();
    scene = undefined;
  });

  it("boots into running.idle with map, ui and worker invoked", () => {
    scene = startSceneSystem();

    expect(scene.actor.getSnapshot().value).toEqual({ running: "idle" });
    expect(scene.map).toBeDefined();
    expect(scene.ui).toBeDefined();
    expect(scene.worker).toBeDefined();
    // No city until one is dispatched.
    expect(scene.city).toBeUndefined();
  });

  it("runs in a DOM-free (node) environment", () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe(
      "undefined",
    );
  });
});
