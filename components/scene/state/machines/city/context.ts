import type { RoomType, ScopeAggregates } from "@/data/contract";
import type { HexCell } from "@/lib/hex/types";

import type { MapCityPayload } from "@/data/types";

/**
 * City machine context — per-slug state owned by a single spawned city actor.
 *
 * Three groups mirror the three old stores this actor replaces:
 *   - `framing`  ← city-data store  (slug / bbox / priceScale / currency …)
 *   - `filter`   ← filter store     (roomTypes / priceRange / nbhd)
 *   - worker output ← listings store (aggregates / hexCells)
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

  readonly aggregates: ScopeAggregates | null;
  readonly hexCells: HexCell[];
}

export const Context: Context = {
  framing: null,
  filter: {
    roomTypes: [],
    priceRange: null,
    nbhd: null,
  },
  aggregates: null,
  hexCells: [],
};
