"use client";

import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { useIsNavigating } from "../state";
import { type Lens, useLens } from "../use-lens";

export function LensSelector({ children }: { children: React.ReactNode }) {
  const { lens, setLens } = useLens();
  // The ui machine drops UI.SET_LENS while `navigating`, so a mid-switch click
  // would silently no-op. Disable the control for that window instead of letting
  // it look active. (Re-enabled on CITY.READY.)
  const navigating = useIsNavigating();

  return (
    <Tabs
      value={lens}
      onValueChange={(value) => {
        if (!navigating) setLens(value as Lens);
      }}
      aria-disabled={navigating || undefined}
      className={cn(
        "map-chrome p-1 shadow-sm",
        navigating ? "pointer-events-none opacity-50" : "pointer-events-auto",
      )}
    >
      {children}
    </Tabs>
  );
}
