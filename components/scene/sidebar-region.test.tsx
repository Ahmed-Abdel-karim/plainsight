import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { cityFixtures } from "@/test/fixtures/cities";
import { SidebarContent } from "./sidebar-region";

/**
 * `SidebarContent` is the presentational panel shared by the desktop aside and
 * the mobile Drawer. It's rendered here inside the same landmark its wrappers
 * provide, so the display + a11y expectations match real usage.
 */
function renderContent() {
  const [city] = cityFixtures; // London
  return render(
    <aside aria-label="Market analysis">
      <SidebarContent
        citySlug={city.slug}
        country={city.country}
        frame={city.frame}
        listingCount={61963}
        snapshotLabel=" 9/2025"
        cities={cityFixtures}
      />
    </aside>,
  );
}

describe("SidebarContent", () => {
  it("renders the city switcher heading, scope, count, frame, and snapshot", () => {
    renderContent();

    // The active city doubles as the single heading and the menu trigger.
    expect(
      screen.getByRole("heading", { level: 1, name: "London" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "London" })).toBeInTheDocument();

    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(
      screen.getByText("Largest market despite licensing"),
    ).toBeInTheDocument();

    // Result count is a polite live region (Accessibility principle).
    const status = screen.getByRole("status");
    expect(within(status).getByText(/61,963 listings/)).toBeInTheDocument();

    // Snapshot label is trimmed of the index's leading whitespace.
    expect(screen.getByText(/Data:\s*9\/2025/)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderContent();
    expect(await axe(container)).toHaveNoViolations();
  });
});
