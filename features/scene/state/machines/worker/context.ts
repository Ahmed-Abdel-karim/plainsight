/** The city + snapshot a load is for. Identity is content-derived, not a counter,
 *  so a request and its response match by equality. */
export interface DatasetIdentity {
  readonly slug: string;
  readonly snapshotId: string;
}

/**
 * Worker machine context — the data region only. It tracks the `requestedDataset`
 * (identity of the load in flight or settled), the `loadedDataset` (identity of
 * the rows available for calculation), and the latest load `error`. Calculation
 * coordination lives entirely in the transport actor's controller, not here.
 */
export interface Context {
  requestedDataset: DatasetIdentity | null;
  loadedDataset: DatasetIdentity | null;
  error: Error | null;
}
