/**
 * Room-type colours for the Browse dot layer.
 *
 * RULE 3 EXCEPTION (documented, tracked): MapLibre's colour parser rejects the
 * `oklch(...)` values our design tokens use (`--cat-1..4`), so the dot ramp is
 * mirrored here as per-theme **hex literals** (same posture as `hex-colors.ts`
 * and `OVERLAY_LINE`). These MUST stay in sync with the `--cat-1..4` tokens in
 * `app/tokens.css` — regenerate by converting the OKLCH tokens to sRGB hex.
 */
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";

import type { Theme } from "@/components/theme/theme-provider";
import { ROOM_TYPES, type RoomType } from "@/data/contract";

/** Per-theme room-type dot colour, mirroring `--cat-1..4`. */
export const ROOM_DOT: Record<Theme, Record<RoomType, string>> = {
  // light :root --cat-1..4
  light: {
    "Entire home/apt": "#e25d1d",
    "Private room": "#53b6eb",
    "Shared room": "#029e72",
    "Hotel room": "#c4759c",
  },
  // dark .dark --cat-1..4
  dark: {
    "Entire home/apt": "#f16935",
    "Private room": "#61c3f9",
    "Shared room": "#3fbe90",
    "Hotel room": "#d887ae",
  },
};

/** Thin stroke that lifts the dots off the basemap in each theme. */
export const DOT_STROKE: Record<Theme, string> = {
  light: "#ffffff",
  dark: "#0b1220",
};

/**
 * MapLibre `match` expression mapping a point's `roomType` to its theme hex.
 * A theme toggle only swaps the literals (no source rebuild).
 */
export function roomColorExpression(
  theme: Theme,
): DataDrivenPropertyValueSpecification<string> {
  const ramp = ROOM_DOT[theme];
  const cases: string[] = [];
  for (const room of ROOM_TYPES) cases.push(room, ramp[room]);
  // The strict `match` tuple type can't be expressed for a spread of cases, so
  // build it as a plain array and assert the expression type once.
  return [
    "match",
    ["get", "roomType"],
    ...cases,
    ramp["Entire home/apt"], // fallback (unreachable — roomType is constrained)
  ] as unknown as DataDrivenPropertyValueSpecification<string>;
}
