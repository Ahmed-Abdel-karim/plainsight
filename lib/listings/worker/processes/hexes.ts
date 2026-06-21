import type { ListingFilters } from "@/data/types";
import type { HexCell, HexResolution } from "@/lib/hex/types";

import { projectHexes } from "../../projection";
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
      projectHexes(listings, filters, resolution),
    cacheResults: true,
  },
};
