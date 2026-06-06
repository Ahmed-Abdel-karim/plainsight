import type { ScopeAggregates } from "@/data/contract";
import type { ListingFilters, Scope } from "@/data/types";
import { computeAggregates, filterListings } from "@/lib/filters";

import { scopeListings } from "../../compute";
import type { ProcessConfig, ProcessContext } from "../types";

type AggregateParams = {
  scope: Scope;
  filters: ListingFilters;
};

export const aggregate: ProcessConfig<
  "aggregates",
  AggregateParams,
  ScopeAggregates,
  ProcessContext
> = {
  aggregates: {
    execute: ({ scope, filters }, { listings }): ScopeAggregates =>
      computeAggregates(
        filterListings(scopeListings(listings, scope), filters),
      ),
  },
};
