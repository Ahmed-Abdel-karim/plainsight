import { describe, expect, it } from "vitest";

import {
  FILL_LAYER_ID,
  LABEL_LAYER_ID,
  NEIGHBOURHOODS_SOURCE_ID,
  OUTLINE_LAYER_ID,
} from "../constants";
import { getFillLayer, getLabelLayer, getOutlineLayer } from "./layers";
import { Theme } from "@/components/theme/theme-provider";

const THEMES: Theme[] = ["dark", "light"];

describe("neighbourhood layer specs", () => {
  it.each(THEMES)("defines a low-opacity fill layer (%s)", (theme) => {
    const layer = getFillLayer(theme);

    expect(layer.id).toBe(FILL_LAYER_ID);
    expect(layer.type).toBe("fill");
    expect(layer.source).toBe(NEIGHBOURHOODS_SOURCE_ID);
    expect(layer.paint?.["fill-color"]).toMatch(/^#/);
    expect(layer.paint?.["fill-opacity"]).toBeLessThan(0.1);
  });

  it.each(THEMES)(
    "keeps all layers on the neighbourhood source (%s)",
    (theme) => {
      const layers = [
        getFillLayer(theme),
        getOutlineLayer(theme),
        getLabelLayer(theme),
      ];

      expect(layers.map((layer) => layer.id)).toEqual([
        FILL_LAYER_ID,
        OUTLINE_LAYER_ID,
        LABEL_LAYER_ID,
      ]);
      expect(
        layers.every((layer) => layer.source === NEIGHBOURHOODS_SOURCE_ID),
      ).toBe(true);
    },
  );
});
