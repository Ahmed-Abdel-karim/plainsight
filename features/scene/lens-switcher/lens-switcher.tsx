"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { useIsNavigating } from "../state";
import { type Lens, useLens } from "../shared/use-lens";

/**
 * Segmented control for the scene's global lens. It switches more than one
 * nearby panel: the market panel content, map layers, legends, and listing
 * selection behavior all respond to the same actor state. That makes this a
 * single-select mode switch, not a tablist.
 */
export function LensSwitcher() {
  const { lens, setLens } = useLens();
  // The ui machine drops UI.SET_LENS while navigating, so a mid-switch click
  // would silently no-op. Disable the control for that window instead of letting
  // it look active.
  const navigating = useIsNavigating();

  return (
    <ToggleGroup
      type="single"
      value={lens}
      onValueChange={(value) => {
        if (!navigating && value) setLens(value as Lens);
      }}
      aria-label="Market lens"
      aria-disabled={navigating || undefined}
      variant="outline"
      size="sm"
      spacing={0}
      className={cn(
        "map-chrome p-1 shadow-sm",
        navigating ? "pointer-events-none opacity-50" : "pointer-events-auto",
      )}
    >
      <ToggleGroupItem value="analyse">Analyse</ToggleGroupItem>
      <ToggleGroupItem value="browse">Browse</ToggleGroupItem>
    </ToggleGroup>
  );
}
