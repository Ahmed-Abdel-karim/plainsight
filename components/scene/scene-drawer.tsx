"use client";

import type { ReactNode } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

function formatNumber(value: number): string {
  return value.toLocaleString("en");
}

/**
 * Mobile presentation of the analysis panel. Below `lg` the desktop aside is
 * hidden (see `sidebar-region.tsx`) and its content lives in this bottom Drawer
 * (Rule 5: same content, drawer wrapper). A floating `.map-chrome` bar over the
 * map (city + live listing count) is the trigger; vaul provides the grip,
 * scrim, drag-to-dismiss, focus trap, and Esc-to-close.
 */
export function SceneDrawer({
  cityName,
  listingCount,
  children,
}: {
  cityName: string;
  listingCount: number;
  children: ReactNode;
}) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label={`${cityName}, ${formatNumber(listingCount)} listings. Open market analysis.`}
          className="map-chrome absolute top-4 left-4 z-20 flex min-h-11 items-center gap-inline rounded-full px-stack py-snug shadow-sm lg:hidden"
        >
          <span className="text-foreground type-label">{cityName}</span>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <span className="type-caption-mono text-muted-foreground">
            {formatNumber(listingCount)} listings
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
