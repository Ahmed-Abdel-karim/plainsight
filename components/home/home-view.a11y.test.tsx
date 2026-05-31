import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { HomeView } from "./home-view";

vi.mock("@/components/city-picker/city-picker", () => ({
  CityPicker: () => <div data-testid="city-picker">City picker</div>,
}));

describe("HomeView accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<HomeView />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
