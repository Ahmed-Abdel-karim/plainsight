import type { ScopeAggregates } from "@/data/contract";

import { type ListingQuery, statsFor } from "../../projections";
import type { ProcessConfig, ProcessContext } from "../types";

/** The aggregates request params: the query plus the city's `priceCap`, which
 *  caps the price histogram (see `computeAggregates`). */
export type AggregatesParams = ListingQuery & { readonly priceCap: number };

export const aggregate: ProcessConfig<
  "aggregates",
  AggregatesParams,
  ScopeAggregates,
  ProcessContext
> = {
  aggregates: {
    execute: ({ priceCap, ...query }, { listings }): ScopeAggregates =>
      statsFor(listings, query, priceCap),
  },
};
