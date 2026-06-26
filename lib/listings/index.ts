// The listings subsystem's public API — the boundary the rest of the app imports
// from. It re-exports:
//   - projections — pure selection → stats / browse list / city hex grid functions
//   - model       — stored/resolved selection helpers
//   - worker      — Web Worker message contract + createListingsWorker
//
// Deliberately not re-exported:
//   - service/ and scripts/ — internal/offline adapters that should not leak into
//     the client-facing public surface.
export * from "./projections";
export * from "./model";
export * from "./worker";
