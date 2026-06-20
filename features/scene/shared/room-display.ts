import type { RoomType } from "@/data/contract";

/**
 * Room-type display tokens, shared across the Browse list, Analyse charts, the
 * filter controls, and the map legend. Each room type pairs a `short` label for
 * chips/filters/charts, a `long` label for list rows and legends, and the
 * categorical dot colour (`--cat-1..4`). Room type is always conveyed by
 * label + colour, never colour alone. The map circle layer uses hex literals
 * (`map/layers/points/styles.ts`) since MapLibre can't read the tokens.
 */
export const ROOM_DISPLAY: Record<
  RoomType,
  { short: string; long: string; dot: string }
> = {
  "Entire home/apt": { short: "Entire", long: "Entire home", dot: "bg-cat-1" },
  "Private room": { short: "Private", long: "Private room", dot: "bg-cat-2" },
  "Shared room": { short: "Shared", long: "Shared room", dot: "bg-cat-3" },
  "Hotel room": { short: "Hotel", long: "Hotel room", dot: "bg-cat-4" },
};
