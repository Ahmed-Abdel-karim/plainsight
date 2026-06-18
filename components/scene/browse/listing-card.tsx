"use client";

import Image from "next/image";
import { useState } from "react";

import type { BrowsePointProperties } from "@/data/contract";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../analysis/format";
import { getListingPhotos } from "./listing-photos";
import { ListingThumb } from "./listing-thumb";
import { ROOM_DISPLAY } from "./room-display";
import { shimmer } from "./shimmer";

const COVER_SHIMMER = shimmer(1, 1);

/** 56px set-cover photo for a list row; degrades to the stripe placeholder on
 * load error so the list never shows a broken image. */
function ListingCover({ variant }: { variant: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <ListingThumb variant={variant} />;
  const cover = getListingPhotos({ imageVariant: variant })[0];
  return (
    <span className="relative block size-14 shrink-0 overflow-hidden rounded-md bg-muted">
      <Image
        src={cover.url}
        alt=""
        fill
        sizes="56px"
        placeholder="blur"
        blurDataURL={COVER_SHIMMER}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </span>
  );
}

/**
 * One row in the Browse list — a `button` (Rule 1: list rows are buttons) that
 * opens the listing's detail drawer. Room type is conveyed by **label + colour
 * cue** (never colour alone — CR-003). The hover/selected emphasis mirrors the
 * map dot's feature-state (FR-007). At least 44px tall for touch (CR-002).
 */
export function ListingCard({
  listing,
  neighbourhoodName,
  currency,
  isHovered,
  isSelected,
  onHover,
  onSelect,
}: {
  listing: BrowsePointProperties;
  neighbourhoodName: string;
  currency: string;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
}) {
  const rt = ROOM_DISPLAY[listing.roomType];
  const price = formatCurrency(listing.price, currency);

  return (
    <button
      type="button"
      data-listing-id={listing.id}
      aria-pressed={isSelected}
      aria-label={`${listing.name}. ${rt.label} in ${neighbourhoodName}. ${price} per night. Open details.`}
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(listing.id)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(listing.id)}
      className={cn(
        "grid min-h-11 w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-stack rounded-md border border-transparent p-inline text-left transition-colors",
        "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        isHovered && "bg-accent",
        isSelected && "border-brand-emphasis bg-accent",
      )}
    >
      <ListingCover variant={listing.imageVariant} />
      <span className="min-w-0">
        <span className="block truncate text-foreground type-body">
          {listing.name}
        </span>
        <span className="mt-0.5 flex items-center gap-snug type-caption text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full", rt.dot)}
          />
          <span className="shrink-0">{rt.label}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{neighbourhoodName}</span>
        </span>
      </span>
      <span className="text-right">
        <span className="block font-mono text-foreground tabular-nums">
          {price}
        </span>
        <span
          aria-hidden="true"
          className="block type-caption-mono text-muted-foreground"
        >
          / night
        </span>
      </span>
    </button>
  );
}
