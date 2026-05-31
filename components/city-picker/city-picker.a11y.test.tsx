import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { cityFixtures } from "@/test/fixtures/cities";
import { CityPickerView } from "./city-picker";

vi.mock("next/image", () => import("@/test/mocks/next-image"));

vi.mock("./city-images", () => ({
  cityImages: {
    london: "/cities/london.png",
    berlin: "/cities/berlin.png",
  },
}));

describe("CityPickerView accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<CityPickerView cities={cityFixtures} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
