"use client";

import { createContext, useContext } from "react";

import type { Scope } from "@/data";
import type { FilterBounds } from "./analysis/use-filters";

export interface SceneMeta {
  citySlug: string;
  currency: string;
  scope: Scope;
  bounds: FilterBounds;
  snapshotLabel: string;
}

const SceneMetaContext = createContext<SceneMeta | null>(null);

export function SceneMetaProvider({
  children,
  ...value
}: SceneMeta & { children: React.ReactNode }) {
  return (
    <SceneMetaContext.Provider value={value}>
      {children}
    </SceneMetaContext.Provider>
  );
}

export function useSceneMeta(): SceneMeta {
  const ctx = useContext(SceneMetaContext);
  if (!ctx)
    throw new Error("useSceneMeta must be used within SceneMetaProvider");
  return ctx;
}
