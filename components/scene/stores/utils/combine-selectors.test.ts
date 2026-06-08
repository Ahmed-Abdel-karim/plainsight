import { describe, it, expect } from "vitest";

import { combineSelectors } from "./combine-selectors";

type State = { x: number; y: string };

describe("combineSelectors", () => {
  it("builds an object keyed by the selector names", () => {
    const select = combineSelectors({
      a: (s: State) => s.x,
      b: (s: State) => s.y,
    });
    expect(select({ x: 1, y: "z" })).toEqual({ a: 1, b: "z" });
  });

  it("returns a fresh object each call (shallow-compare friendly)", () => {
    const select = combineSelectors({ a: (s: State) => s.x });
    const state: State = { x: 1, y: "z" };
    expect(select(state)).not.toBe(select(state));
    expect(select(state)).toEqual(select(state));
  });
});
