import type { ScopeAggregates } from "@/data/contract";

import {
  projectScopeStats,
  type ResolvedListingSelection,
} from "../../projections";
import type { ProcessConfig, ProcessContext } from "../types";

/** Aggregates request params: resolved selection plus the city's price cap. */
export type AggregatesParams = ResolvedListingSelection & {
  readonly priceCap: number;
};

export const aggregate: ProcessConfig<
  "aggregates",
  AggregatesParams,
  ScopeAggregates,
  ProcessContext
> = {
  aggregates: {
    execute: ({ priceCap, ...selection }, { listings }): ScopeAggregates =>
      projectScopeStats(listings, selection, priceCap),
  },
};
