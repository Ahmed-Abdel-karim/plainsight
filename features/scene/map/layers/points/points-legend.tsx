"use client";

import { ROOM_TYPES } from "@/data/contract";

import { useLens } from "@/features/scene/shared/use-lens";
import { useResolvedTheme } from "@/components/theme/theme-provider";
import { ROOM_DISPLAY } from "@/features/scene/shared/room-display";
import { ROOM_DOT } from "./styles";

/**
 * Room-type legend for the Browse dot layer — shown only in the Browse lens. The
 * dots are colour-coded by room type; pairing each swatch with a text label keeps
 * room type from being conveyed by colour alone on the map (CR-003). The swatches
 * use the same per-theme dot literals as the circle layer.
 */
export function PointsLegend() {
  const { isBrowse } = useLens();
  const theme = useResolvedTheme();
  // Shown only in the Browse lens. `useLens` is SSR-correct (the route reads the
  // param), so this branches identically on server and first client render.
  if (!isBrowse) return null;

  const ramp = ROOM_DOT[theme];

  return (
    <aside
      aria-label="Room type legend"
      className="map-chrome text-map-label px-3 py-2 shadow-sm"
    >
      <h2 className="type-label">Room type</h2>
      <ul className="mt-2 flex flex-col gap-1">
        {ROOM_TYPES.map((room) => (
          <li key={room} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full border border-border/40"
              style={{ backgroundColor: ramp[room] }}
            />
            <span className="text-xs whitespace-nowrap">
              {ROOM_DISPLAY[room].long}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
