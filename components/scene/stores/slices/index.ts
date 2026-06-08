"use client";

// Type-only barrel — no runtime exports.
// StoreState is the composition of all slice types and is used as the generic
// parameter for StateCreator in each slice's index.ts.
import type { MapSlice } from "./map";
import type { ListingsSlice } from "./listings";
import type { UiSlice } from "./ui";

export type { MapSlice } from "./map";
export type { ListingsSlice } from "./listings";
export type { UiSlice } from "./ui";

// Using interface (not type alias) so TypeScript resolves the cross-module
// circular type dependency lazily without "circularly references itself" errors.
export interface StoreState extends MapSlice, ListingsSlice, UiSlice {}
