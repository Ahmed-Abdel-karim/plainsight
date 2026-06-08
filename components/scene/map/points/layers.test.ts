import { describe, expect, it } from "vitest";

import { POINTS_CIRCLE_LAYER_ID, POINTS_SOURCE_ID } from "../constants";
import { ROOM_DOT, getCircleLayer, roomColorExpression } from "./styles";
import { ROOM_TYPES } from "@/data/contract";
import { Theme } from "@/components/theme/theme-provider";

const THEMES: Theme[] = ["dark", "light"];

describe("points layer specs", () => {
  it.each(THEMES)(
    "defines the dot circle layer on the points source (%s)",
    (theme) => {
      const layer = getCircleLayer(theme, true);

      expect(layer.id).toBe(POINTS_CIRCLE_LAYER_ID);
      expect(layer.type).toBe("circle");
      expect(layer.source).toBe(POINTS_SOURCE_ID);
      expect(layer.layout?.visibility).toBe("visible");
    },
  );

  it.each(THEMES)("hides the circle when not visible (%s)", (theme) => {
    expect(getCircleLayer(theme, false).layout?.visibility).toBe("none");
  });

  it.each(THEMES)("maps every room type to its theme colour (%s)", (theme) => {
    const ramp = ROOM_DOT[theme];
    const expression = roomColorExpression(theme) as unknown[];

    expect(expression[0]).toBe("match");
    for (const room of ROOM_TYPES) {
      const at = expression.indexOf(room);
      expect(at).toBeGreaterThan(-1);
      expect(expression[at + 1]).toBe(ramp[room]);
    }
  });
});
