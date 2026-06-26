import type { ListingFilters } from "@/data/types";
import type { HexCell, HexResolution } from "@/lib/hex/types";

import { projectCityHexes } from "../../projections";
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
      projectCityHexes(listings, filters, resolution),
    cacheResults: true,
  },
};
