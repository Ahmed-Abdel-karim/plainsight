import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-map-gl/maplibre", () => ({
  Popup: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="popup"
      data-props={JSON.stringify(props)}
      className={String(props.className)}
    >
      {children}
    </div>
  ),
}));

vi.mock("../../state", () => ({
  useHexInspectInfo: vi.fn(),
  useCityFraming: vi.fn(),
}));

import { useCityFraming, useHexInspectInfo } from "../../state";
import { HexInspect } from "./hex-inspect";

const mockUseHexInspectInfo = vi.mocked(useHexInspectInfo);
const mockUseCityFraming = vi.mocked(useCityFraming);

describe("HexInspect", () => {
  it("renders the inspect content inside a pointer-anchored Popup", () => {
    mockUseHexInspectInfo.mockReturnValue({
      longitude: -0.1,
      latitude: 51.5,
      medianPrice: 149,
      count: 1234,
    });
    mockUseCityFraming.mockReturnValue({ currency: "GBP" } as never);

    render(<HexInspect />);

    const popup = screen.getByTestId("popup");
    const props = JSON.parse(popup.dataset.props ?? "{}");

    expect(props).toMatchObject({
      longitude: -0.1,
      latitude: 51.5,
      anchor: "left",
      offset: 12,
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: false,
      maxWidth: "none",
      className: "hex-inspect-popup",
    });
    expect(screen.getByText("Median")).toBeInTheDocument();
    expect(screen.getByText("£149")).toBeInTheDocument();
    expect(screen.getByText("Listings")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders nothing until inspect info is present", () => {
    mockUseHexInspectInfo.mockReturnValue(null);
    mockUseCityFraming.mockReturnValue({ currency: "GBP" } as never);

    const { container } = render(<HexInspect />);
    expect(container).toBeEmptyDOMElement();
  });
});
