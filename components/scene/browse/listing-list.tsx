"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { BrowsePointProperties } from "@/data/contract";
import { ListingCard } from "./listing-card";

/**
 * The Browse listing list — virtualized over the FULL filtered+sorted set so the
 * largest city (~62k) stays smooth (SC-002, FR-004): only the visible rows are in
 * the DOM. Hover is two-way (FR-007): a card hover sets the shared hovered id;
 * when the hover originates from the MAP, the matching row scrolls into view
 * (only then — so the list never fights the pointer while the user drives it).
 */
export function ListingList({
  listings,
  neighbourhoodNames,
  currency,
  hoveredId,
  hoverSource,
  selectedId,
  onHover,
  onSelect,
}: {
  listings: BrowsePointProperties[];
  neighbourhoodNames: Record<string, string>;
  currency: string;
  hoveredId: number | null;
  hoverSource: "list" | "map" | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  // TanStack Virtual intentionally returns imperative functions that React Compiler skips.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: listings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
    getItemKey: (index) => listings[index].id,
  });

  // Scroll the hovered row into view ONLY when the map drove the hover (FR-007).
  useEffect(() => {
    if (hoveredId === null || hoverSource !== "map") return;
    const index = listings.findIndex((listing) => listing.id === hoveredId);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: "auto" });
  }, [hoveredId, hoverSource, listings, virtualizer]);

  return (
    <div
      ref={parentRef}
      role="list"
      aria-label="Listings matching current filters"
      className="-mx-snug min-h-0 flex-1 overflow-y-auto px-snug"
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const listing = listings[item.index];
          return (
            <div
              key={item.key}
              role="listitem"
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <ListingCard
                listing={listing}
                neighbourhoodName={
                  neighbourhoodNames[listing.neighbourhoodId] ?? "—"
                }
                currency={currency}
                isHovered={hoveredId === listing.id}
                isSelected={selectedId === listing.id}
                onHover={onHover}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
