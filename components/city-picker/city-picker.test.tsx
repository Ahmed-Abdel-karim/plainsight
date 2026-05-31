import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { cityFixtures } from "@/test/fixtures/cities";
import { CityPickerView } from "./city-picker";

vi.mock("next/image", () => import("@/test/mocks/next-image"));

vi.mock("./city-images", () => ({
  cityImages: {
    london: "/cities/london.png",
    berlin: "/cities/berlin.png",
  },
}));

describe("CityPickerView", () => {
  it("renders each city card with the provided market info and route link", () => {
    render(<CityPickerView cities={cityFixtures} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Choose a market" }),
    ).toBeInTheDocument();

    for (const city of cityFixtures) {
      const snapshot = `${city.snapshotLabel.trim()} snapshot`;

      const cardLink = screen.getByRole("link", {
        name: `${city.name}, ${city.country}. ${city.frame}. ${city.listings}. ${snapshot}.`,
      });

      expect(cardLink).toHaveAttribute("href", `/${city.slug}`);
      expect(
        within(cardLink).getByRole("heading", { level: 3, name: city.name }),
      ).toBeInTheDocument();
      expect(cardLink).toHaveTextContent(city.country);
      expect(cardLink).toHaveTextContent(city.frame);
      expect(cardLink).toHaveTextContent(city.listings);
      expect(cardLink).toHaveTextContent(snapshot);
    }
  });
});
