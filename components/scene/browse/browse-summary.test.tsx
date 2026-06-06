import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrowseSummary } from "./browse-summary";

describe("BrowseSummary", () => {
  it("renders the 'N of total' count in a polite live region", () => {
    render(<BrowseSummary shown={1234} total={61963} />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    // Thousands-separated, and the matching set is announced against the total.
    expect(status).toHaveTextContent("1,234 of 61,963 listings");
  });
});
