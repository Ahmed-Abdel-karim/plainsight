import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeView } from "./home-view";

vi.mock("@/components/city-picker/city-picker", () => ({
  CityPicker: () => <div data-testid="city-picker">City picker</div>,
}));

describe("HomeView", () => {
  it("renders the landing header, city picker, and footer", () => {
    render(<HomeView />);

    expect(screen.getByText("Plainsight")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /where short-term rentals are, what they cost, and who controls the market/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/built on dated public inside airbnb snapshots/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("city-picker")).toBeInTheDocument();
    expect(
      screen.getByText(
        /read-only.*inside airbnb data.*no tracking, no sign-up/i,
      ),
    ).toBeInTheDocument();
  });
});
