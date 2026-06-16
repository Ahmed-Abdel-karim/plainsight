import { describe, expect, it } from "vitest";

import { getRepository } from "./index";
import { staticJsonRepository } from "./static-json";

describe("getRepository", () => {
  it("returns the static JSON adapter", () => {
    expect(getRepository()).toBe(staticJsonRepository);
  });

  it("returns a stable reference", () => {
    expect(getRepository()).toBe(getRepository());
  });
});
