"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { useEffect, useMemo, useState } from "react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../shared/format";
import { useCityFraming } from "../state";
import { useLens } from "../shared/use-lens";
import { useNeighbourhoodNames } from "../shared/use-neighbourhood-names";
import { useBrowsePoints } from "./use-browse-points";
import { ListingDetailBody } from "./listing-detail-body";
import { ListingGallery } from "./listing-gallery";
import { ROOM_DISPLAY } from "../shared/room-display";

/** Side panel on desktop (>=lg), bottom sheet below. */
function useDrawerDirection(): "right" | "bottom" {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop ? "right" : "bottom";
}

/**
 * Listing detail drawer. Opens over the map when a listing is selected from a
 * card or a dot, reading the selected feature from the in-memory points tier by
 * id. The list stays mounted behind it. The `listing` URL param drives open
 * state, so the drawer is shareable and restored on reload; an unknown id simply
 * opens nothing. Closing clears the param; vaul restores focus to the trigger.
 */
export function ListingDetail() {
  const city = useCityFraming();
  const citySlug = city?.slug ?? "";
  const snapshotId = city?.snapshotId ?? "";
  const currency = city?.currency ?? "";
  const snapshotLabel = city?.snapshotLabel ?? "";
  const { isBrowse, selectedId, selectListing } = useLens();
  const direction = useDrawerDirection();
  const { collection } = useBrowsePoints(citySlug, snapshotId, {
    enabled: isBrowse,
  });
  const neighbourhoodNames = useNeighbourhoodNames(
    citySlug || null,
    snapshotId || null,
  );

  const listing = useMemo(() => {
    if (selectedId === null || !collection) return null;
    return (
      collection.features.find((f) => f.properties.id === selectedId)
        ?.properties ?? null
    );
  }, [collection, selectedId]);

  const neighbourhoodName = useMemo(() => {
    if (!listing) return "";
    return (
      neighbourhoodNames[listing.neighbourhoodId] ?? listing.neighbourhoodId
    );
  }, [neighbourhoodNames, listing]);

  const open = listing !== null;
  const rt = listing ? ROOM_DISPLAY[listing.roomType] : null;

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) selectListing(null);
      }}
      direction={direction}
    >
      <DrawerContent className="lg:w-88 lg:max-w-[90vw]">
        {listing && rt ? (
          <div className="flex flex-col gap-stack overflow-y-auto p-gutter">
            <DrawerClose
              aria-label="Close listing details"
              className="absolute top-3 right-3 z-10 flex size-7 items-center justify-center rounded-md bg-muted/80 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              <Cross2Icon className="size-4" />
            </DrawerClose>

            <ListingGallery listing={listing} />

            <DrawerHeader className="gap-snug p-0">
              <div className="flex items-center gap-snug type-caption text-muted-foreground">
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", rt.dot)}
                />
                <span>{rt.long}</span>
                <span aria-hidden="true">·</span>
                <span>{neighbourhoodName}</span>
              </div>
              <DrawerTitle className="type-title text-foreground">
                {listing.name}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {rt.long} in {neighbourhoodName}
              </DrawerDescription>
              <p className="flex items-baseline gap-1">
                <span className="font-mono text-base text-foreground tabular-nums">
                  <span className="sr-only">Nightly price </span>
                  {formatCurrency(listing.price, currency)}
                </span>
                <span
                  aria-hidden="true"
                  className="type-caption-mono text-muted-foreground"
                >
                  / night
                </span>
              </p>
            </DrawerHeader>

            <ListingDetailBody
              listing={listing}
              snapshotLabel={snapshotLabel}
            />
          </div>
        ) : (
          // Radix requires a title in the tree even while empty/closing.
          <DrawerTitle className="sr-only">Listing details</DrawerTitle>
        )}
      </DrawerContent>
    </Drawer>
  );
}
