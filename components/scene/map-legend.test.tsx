import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { MapLegend } from "./map-legend";

describe("MapLegend", () => {
  it("renders the neighbourhood heading and count", () => {
    render(<MapLegend neighbourhoodCount={22} />);

    expect(
      screen.getByRole("complementary", { name: "Map legend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Neighbourhoods" }),
    ).toBeInTheDocument();
    expect(screen.getByText("22 neighbourhoods")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<MapLegend neighbourhoodCount={1} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
