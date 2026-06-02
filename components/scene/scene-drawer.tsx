import type { ReactNode } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * Mobile presentation of the analysis panel. Below `lg` the desktop aside is
 * hidden (see `city-scene.tsx`) and its content lives in this bottom Drawer
 * (Rule 5: same content, drawer wrapper). A floating `.map-chrome` bar over the
 * map (city + listing count) is the trigger; vaul provides the grip, scrim,
 * drag-to-dismiss, focus trap, and Esc-to-close.
 *
 * `triggerCount` is a streamed slot (the listing count fetches independently
 * behind a Suspense boundary), so it isn't threaded in as a number. The button's
 * `aria-label` is kept stable (no interpolated count) so the accessible name
 * doesn't churn while the visible count fills in.
 */
export function SceneDrawer({
  cityName,
  triggerCount,
  children,
}: {
  cityName: string;
  triggerCount: ReactNode;
  children: ReactNode;
}) {
  const label = `${cityName}. Open market analysis.`;
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="map-chrome absolute top-4 left-4 z-20 flex min-h-11 items-center gap-inline rounded-full px-stack py-snug shadow-sm lg:hidden"
        >
          <span className="text-foreground type-label">{cityName}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="type-caption-mono text-muted-foreground">
            {triggerCount}
          </span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">Market analysis</DrawerTitle>
        <DrawerDescription className="sr-only">
          {cityName} market snapshot and filters.
        </DrawerDescription>
        <div className="@container flex flex-col gap-section overflow-y-auto px-gutter pb-gutter">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
