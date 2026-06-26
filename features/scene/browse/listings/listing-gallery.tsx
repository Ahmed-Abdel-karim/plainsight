"use client";

import { ListingInlineGallery } from "./listing-inline-gallery";
import { ListingLightbox } from "./listing-lightbox";
import { getListingPhotos } from "./listing-photos";
import {
  useCarouselSelection,
  useListingLightboxState,
} from "./use-listing-gallery-hooks";

/**
 * The listing detail photo gallery (replaces the single placeholder thumb). An
 * inline swipeable carousel in the drawer's 16:9 slot; tapping a photo opens a
 * fullscreen lightbox at that index. Photos come from a curated Unsplash set
 * keyed by `imageVariant` (deterministic per listing) and fall back per-slide to
 * the stripe placeholder if a remote image fails to load.
 */
export function ListingGallery({
  listing,
}: {
  listing: { name: string; imageVariant: number };
}) {
  const photos = getListingPhotos(listing);
  const inlineCarousel = useCarouselSelection();
  const lightbox = useListingLightboxState();

  return (
    <>
      <ListingInlineGallery
        photos={photos}
        listingName={listing.name}
        variant={listing.imageVariant}
        selectedIndex={inlineCarousel.selectedIndex}
        setApi={inlineCarousel.setApi}
        onOpenLightbox={lightbox.openAt}
      />

      <ListingLightbox
        open={lightbox.open}
        onOpenChange={lightbox.onOpenChange}
        startIndex={lightbox.startIndex}
        photos={photos}
        listingName={listing.name}
        variant={listing.imageVariant}
      />
    </>
  );
}
