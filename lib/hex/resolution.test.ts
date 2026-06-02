import { describe, expect, it } from "vitest";

import {
  MAX_HEX_RESOLUTION,
  MIN_HEX_RESOLUTION,
  zoomToResolution,
} from "./resolution";

describe("zoomToResolution", () => {
  it("maps each zoom band to the expected resolution", () => {
    expect(zoomToResolution(8)).toBe(5); // pulled well back from the city
    expect(zoomToResolution(9)).toBe(6); // city-wide overview, coarse end
    expect(zoomToResolution(10)).toBe(7); // fitted overview (most cities)
    expect(zoomToResolution(11)).toBe(7); // fitted overview (Amsterdam)
    expect(zoomToResolution(13)).toBe(8); // zoomed into a district
  });

  it("steps up exactly at each breakpoint", () => {
    expect(zoomToResolution(8.4)).toBe(5);
    expect(zoomToResolution(8.5)).toBe(6);
    expect(zoomToResolution(9.4)).toBe(6);
    expect(zoomToResolution(9.5)).toBe(7);
    expect(zoomToResolution(11.4)).toBe(7);
    expect(zoomToResolution(11.5)).toBe(8);
  });

  it("clamps below the coarsest bound", () => {
    expect(zoomToResolution(0)).toBe(MIN_HEX_RESOLUTION);
    expect(zoomToResolution(-5)).toBe(MIN_HEX_RESOLUTION);
  });

  it("clamps at the finest baked bound", () => {
    expect(zoomToResolution(18)).toBe(MAX_HEX_RESOLUTION);
    expect(zoomToResolution(22)).toBe(MAX_HEX_RESOLUTION);
  });
});
