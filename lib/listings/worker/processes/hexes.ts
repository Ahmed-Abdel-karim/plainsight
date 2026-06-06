import type { ListingFilters } from "@/data/types";
import { filterListings } from "@/lib/filters";
import { aggregateHexes } from "@/lib/hex/aggregate";
import type { HexCell, HexResolution } from "@/lib/hex/types";

import type { ProcessConfig, ProcessContext } from "../types";

type HexesParams = {
  resolution: HexResolution;
  filters: ListingFilters;
};

export const hexes: ProcessConfig<
  "hexes",
  HexesParams,
  HexCell[],
  ProcessContext
> = {
  hexes: {
    execute: ({ filters, resolution }, { listings }): HexCell[] =>
      aggregateHexes(filterListings(listings, filters), resolution),
    cacheResults: true,
  },
};
