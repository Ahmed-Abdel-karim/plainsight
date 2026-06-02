/**
 * Message protocol between the main thread and the listings Web Worker.
 *
 * The worker owns the city's full listings array (parsed once, off the main
 * thread) and answers recompute queries, so only small results — never the 62k
 * rows — cross the `postMessage` boundary. Requests carry an `id` the client
 * matches to the resolving promise.
 */
import type { ScopeAggregates } from "@/data/contract";
import type { ListingFilters, Scope } from "@/data/types";
import type { HexCell, HexResolution } from "@/lib/hex/types";

export type ListingsRequest =
  | { type: "load"; slug: string }
  | { type: "aggregates"; id: number; scope: Scope; filters: ListingFilters }
  | {
      type: "hexes";
      id: number;
      filters: ListingFilters;
      resolution: HexResolution;
    };

export type ListingsResponse =
  | { type: "ready"; slug: string; count: number }
  | { type: "aggregates"; id: number; result: ScopeAggregates }
  | { type: "hexes"; id: number; cells: HexCell[] }
  | { type: "error"; id?: number; message: string };
