import type { ScopeAggregates } from "@/data/contract";

import { type ListingQuery, projectStats } from "../../projection";
import type { ProcessConfig, ProcessContext } from "../types";

export const aggregate: ProcessConfig<
  "aggregates",
  ListingQuery,
  ScopeAggregates,
  ProcessContext
> = {
  aggregates: {
    execute: (query, { listings }): ScopeAggregates =>
      projectStats(listings, query),
  },
};
