import { describe, expect, it } from "vitest";

import { pointsFilterExpression } from "./points-filter";

describe("pointsFilterExpression", () => {
  it("always constrains the inclusive price band", () => {
    const expr = pointsFilterExpression(
      { roomTypes: [], priceRange: [80, 240] },
      { type: "city" },
    );
    expect(expr).toEqual([
      "all",
      [">=", ["get", "price"], 80],
      ["<=", ["get", "price"], 240],
    ]);
  });

  it("adds a room-type membership clause only when some are selected", () => {
    const expr = pointsFilterExpression(
      { roomTypes: ["Private room", "Shared room"], priceRange: [0, 1000] },
      { type: "city" },
    );
    expect(expr).toContainEqual([
      "in",
      ["get", "roomType"],
      ["literal", ["Private room", "Shared room"]],
    ]);
  });

  it("narrows by neighbourhood id when the scope is a neighbourhood", () => {
    const expr = pointsFilterExpression(
      { roomTypes: [], priceRange: [0, 1000] },
      { type: "neighbourhood", id: "camden" },
    );
    expect(expr).toContainEqual(["==", ["get", "neighbourhoodId"], "camden"]);
  });
});
