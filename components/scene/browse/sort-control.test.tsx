import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SortControl } from "./sort-control";

// Radix Select's open/select needs pointer APIs jsdom lacks, so the actual
// reorder is verified via run-app; here we assert the control is reachable by
// role/name and reflects the selected key (constitution Testing Layers).
describe("SortControl", () => {
  it("exposes a combobox named 'Sort' showing the current option", () => {
    render(<SortControl value="price_asc" onChange={() => {}} />);
    const trigger = screen.getByRole("combobox", { name: "Sort" });
    expect(trigger).toHaveTextContent("Price: low to high");
  });

  it("reflects a different selected sort key", () => {
    render(<SortControl value="reviews_desc" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveTextContent(
      "Most reviews / month",
    );
  });
});
