import { describe, expect, it } from "vitest";

import { getRepository } from "./index";
import { postgresRepository } from "./postgres";
import { staticJsonRepository } from "./static-json";

describe("getRepository", () => {
  it("returns the static JSON adapter by default", () => {
    // No DATA_SOURCE env set in the test runner.
    expect(getRepository()).toBe(staticJsonRepository);
  });

  it("memoises the resolved adapter", () => {
    expect(getRepository()).toBe(getRepository());
  });
});

describe("postgresRepository (stub)", () => {
  it("rejects with an explicit not-implemented error — proving the seam routes here", async () => {
    await expect(
      postgresRepository.getScopeAggregates("london", { type: "city" }),
    ).rejects.toThrow(/not implemented/i);
  });
});
