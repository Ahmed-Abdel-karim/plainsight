import type { RoomType } from "@/data/contract";

/**
 * Room-type display for the Browse list rows and the detail drawer: a text label
 * paired with the categorical dot colour token (`--cat-1..4`). Room type is
 * always conveyed by label + colour, never colour alone. The map dots
 * use hex literals (`map/points/layers.ts`) since MapLibre can't read the tokens.
 */
export const ROOM_DISPLAY: Record<RoomType, { label: string; dot: string }> = {
  "Entire home/apt": { label: "Entire home", dot: "bg-cat-1" },
  "Private room": { label: "Private room", dot: "bg-cat-2" },
  "Shared room": { label: "Shared room", dot: "bg-cat-3" },
  "Hotel room": { label: "Hotel room", dot: "bg-cat-4" },
};
