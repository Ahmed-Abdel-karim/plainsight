import type { RoomType, ScopeAggregates } from "@/data/contract";
import type { HexCell } from "@/lib/hex/types";

import type { MapCityPayload } from "@/data/types";

/**
 * City machine context — per-slug state owned by a single spawned city actor.
 *
 * Groups defining the city's state:
 *   - `framing`: slug / bbox / priceScale / currency
 *   - `filter`: stored selection fields (roomTypes / priceRange / nbhd)
 *   - analyse output: aggregates / hexCells
 *
 * The type and its initial value share the name `Context` so a single
 * `import * as Context from "./context"` yields both.
 */
export interface Context {
  readonly framing: MapCityPayload | null;

  readonly filter: {
    readonly roomTypes: RoomType[];
    readonly priceRange: [number, number] | null;
    readonly nbhd: string | null;
  };

  readonly analyticsLoaded: boolean;

  readonly aggregates: ScopeAggregates | null;
  /** `null` until the first hex result lands (drives the map's per-lens loading
   *  shimmer); `[]` means computed-but-empty. Once set it stays a (possibly
   *  stale) array across recomputes — stale-while-revalidate, no shimmer. */
  readonly hexCells: HexCell[] | null;
}

export const Context: Context = {
  framing: null,
  filter: {
    roomTypes: [],
    priceRange: null,
    nbhd: null,
  },
  analyticsLoaded: false,
  aggregates: null,
  hexCells: null,
};
