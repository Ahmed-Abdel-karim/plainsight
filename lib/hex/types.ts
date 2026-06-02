/**
 * Pure hex-kernel types. The baked listings carry a resolution-8 H3 cell; the
 * scene displays resolutions 5–8 (8 = the baked floor, coarser by truncation).
 */

/** Displayable H3 resolutions: 8 is the baked floor, 5 the coarsest overview. */
export type HexResolution = 5 | 6 | 7 | 8;

/**
 * One aggregated hex cell — the small, serializable unit the worker posts back
 * and the map renders. Empty cells are never produced (every cell has ≥ 1
 * listing); `medianPrice` drives the cell colour.
 */
export interface HexCell {
  /** H3 cell index at the active resolution (parent of the baked res-8 cell). */
  h3: string;
  /** Listings in this cell for the current filtered set (≥ 1). */
  count: number;
  /** Median nightly price of those listings. */
  medianPrice: number;
}
