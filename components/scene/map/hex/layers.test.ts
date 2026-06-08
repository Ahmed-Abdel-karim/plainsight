import { describe, expect, it } from "vitest";

import { HEX_FILL_LAYER_ID, HEX_SOURCE_ID } from "../constants";
import { PRICE_RAMP, getFillLayer, priceFillExpression } from "./styles";
import { Theme } from "@/components/theme/theme-provider";

const THEMES: Theme[] = ["dark", "light"];
const BREAKS = [100, 150, 200, 250];

describe("hex layer specs", () => {
  it.each(THEMES)(
    "defines the price fill layer on the hex source (%s)",
    (theme) => {
      const layer = getFillLayer(theme, BREAKS, true);

      expect(layer.id).toBe(HEX_FILL_LAYER_ID);
      expect(layer.type).toBe("fill");
      expect(layer.source).toBe(HEX_SOURCE_ID);
      expect(layer.layout?.visibility).toBe("visible");
      expect(layer.paint?.["fill-opacity"]).toBeGreaterThan(0);
    },
  );

  it.each(THEMES)("hides the fill when not visible (%s)", (theme) => {
    expect(getFillLayer(theme, BREAKS, false).layout?.visibility).toBe("none");
  });

  it.each(THEMES)(
    "builds a step ramp pairing each break with the next colour (%s)",
    (theme) => {
      const ramp = PRICE_RAMP[theme];
      const expression = priceFillExpression(theme, BREAKS) as unknown[];

      // ["step", ["get","medianPrice"], ramp0, break0, ramp1, break1, ...]
      expect(expression[0]).toBe("step");
      expect(expression[2]).toBe(ramp[0]);
      expect(expression.slice(3)).toEqual([
        BREAKS[0],
        ramp[1],
        BREAKS[1],
        ramp[2],
        BREAKS[2],
        ramp[3],
        BREAKS[3],
        ramp[4],
      ]);
    },
  );
});
