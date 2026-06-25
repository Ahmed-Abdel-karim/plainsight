// The listings subsystem's public API — the one boundary the rest of the app
// (features, lib/hex) imports from. It re-exports the three cross-consumer
// surfaces:
//   - projections — pure query → stats / browse list / hex grid functions
//   - model       — query resolution (`resolveQuery`, `queryKey`, `isDefaultView`)
//   - worker      — the Web Worker message contract + `createListingsWorker`
//
// Deliberately NOT re-exported, to keep this barrel client-safe and shakeable:
//   - service/ and scripts/ — internal only; `scripts/` is an offline Node
//     generator that must never reach the client graph.
//   - pipe.ts — a generic helper; `lib/hex` imports it directly to avoid a
//     cycle back through this barrel (barrel → projections → hex → pipe).
export * from "./projections";
export * from "./model";
export * from "./worker";
