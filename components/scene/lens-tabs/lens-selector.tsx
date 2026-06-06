"use client";

import { Tabs } from "@/components/ui/tabs";

import { type Lens, useLens } from "../use-lens";

export function LensSelector({ children }: { children: React.ReactNode }) {
  const { lens, setLens } = useLens();

  return (
    <Tabs
      value={lens}
      onValueChange={(value) => setLens(value as Lens)}
      className="map-chrome pointer-events-auto p-1 shadow-sm"
    >
      {children}
    </Tabs>
  );
}
