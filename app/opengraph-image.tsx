import { ImageResponse } from "next/og";

// Default social-share card for every route (city pages inherit it). Generated
// at build time — no params, no data — so it prerenders as a static asset.
export const alt = "Plainsight — Explore short-term rental markets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens as hex (Satori can't parse the app's oklch custom properties).
const BG = "#0a0e12";
const FG = "#f4f7f8";
const MUTED = "#8b9398";
const FAINT = "#6b7378";
const AMBER = "#e08a2b";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: BG,
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "9999px",
            backgroundColor: AMBER,
            marginRight: "18px",
          }}
        />
        <div
          style={{
            fontSize: "30px",
            fontWeight: 600,
            letterSpacing: "8px",
            color: MUTED,
          }}
        >
          PLAINSIGHT
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: "78px",
            fontWeight: 700,
            color: FG,
            lineHeight: 1.05,
          }}
        >
          Explore short-term
        </div>
        <div
          style={{
            fontSize: "78px",
            fontWeight: 700,
            color: FG,
            lineHeight: 1.05,
          }}
        >
          rental markets
        </div>
        <div
          style={{
            marginTop: "30px",
            fontSize: "33px",
            color: MUTED,
            maxWidth: "920px",
            lineHeight: 1.35,
          }}
        >
          Where listings are, what they cost, and who controls the market.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "11px",
            height: "11px",
            borderRadius: "9999px",
            backgroundColor: AMBER,
            marginRight: "14px",
          }}
        />
        <div style={{ fontSize: "24px", color: FAINT }}>
          Public Inside Airbnb snapshots · No sign-up
        </div>
      </div>
    </div>,
    size,
  );
}
