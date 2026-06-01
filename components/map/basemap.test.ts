import { describe, expect, it } from "vitest";

import {
  HIDDEN_PLACE_LABELS,
  RETAINED_PLACE_LABELS,
  basemapLabelTheme,
} from "./basemap";
import type { MapTheme } from "./map-styles";

const THEMES: MapTheme[] = ["dark", "light"];

describe("basemap place-label policy", () => {
  it.each(THEMES)(
    "hides city, neighbourhood, state and country labels (%s)",
    (theme) => {
      const hidden = HIDDEN_PLACE_LABELS[theme];
      const city = theme === "dark" ? "place_city" : "label_city";
      const neighbourhood = theme === "dark" ? "place_suburb" : "label_other";
      const state = theme === "dark" ? "place_state" : "label_state";
      const country =
        theme === "dark" ? "place_country_major" : "label_country_1";

      expect(hidden).toContain(city);
      expect(hidden).toContain(neighbourhood);
      expect(hidden).toContain(state);
      expect(hidden).toContain(country);
      // the neighbourhood/hamlet/quarter catch-all is also hidden
      expect(hidden).toContain(
        theme === "dark" ? "place_other" : "label_other",
      );
    },
  );

  it.each(THEMES)(
    "keeps exactly the surrounding town and village labels (%s)",
    (theme) => {
      const expected =
        theme === "dark"
          ? ["place_town", "place_village"]
          : ["label_town", "label_village"];
      expect([...RETAINED_PLACE_LABELS[theme]]).toEqual(expected);
    },
  );

  it.each(THEMES)("never hides a layer it also retains (%s)", (theme) => {
    const hidden = new Set(HIDDEN_PLACE_LABELS[theme]);
    for (const id of RETAINED_PLACE_LABELS[theme]) {
      expect(hidden.has(id)).toBe(false);
    }
  });

  it.each(THEMES)("defines a muted town/village treatment (%s)", (theme) => {
    expect(basemapLabelTheme[theme].text).toMatch(/^rgba\(/);
    expect(basemapLabelTheme[theme].halo).toMatch(/^#/);
  });
});
