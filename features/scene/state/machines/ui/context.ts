import type { Lens } from "@/lib/search-params";

/**
 * UI machine context — cross-navigation UI state the scene owns.
 *
 * The type and its initial value share the name `Context` so a single
 * `import * as Context from "./context"` yields both.
 */
export interface Context {
  readonly lens: Lens;
  readonly selectedId: number | null;
  readonly hoveredListing: { id: number; source: "list" | "map" | null } | null;
}

export const Context: Context = {
  lens: "analyse",
  selectedId: null,
  hoveredListing: null,
};
