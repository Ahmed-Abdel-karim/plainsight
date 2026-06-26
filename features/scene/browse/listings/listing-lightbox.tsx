"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ListingGalleryImage } from "./listing-gallery-image";
import { getListingPhotos } from "./listing-photos";
import {
  useCarouselSelection,
  useLightboxStartIndex,
} from "./use-listing-gallery-hooks";

/** Fullscreen photo viewer — a second Embla carousel inside a Radix Dialog. */
export function ListingLightbox({
  open,
  onOpenChange,
  startIndex,
  photos,
  listingName,
  variant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startIndex: number;
  photos: ReturnType<typeof getListingPhotos>;
  listingName: string;
  variant: number;
}) {
  const carousel = useCarouselSelection();
  useLightboxStartIndex(open, carousel.api, startIndex);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] border-0 bg-transparent p-0 ring-0 sm:max-w-[100vw]">
        <DialogTitle className="sr-only">{listingName} — photos</DialogTitle>
        <Carousel
          setApi={carousel.setApi}
          opts={{ loop: true, startIndex }}
          className="w-full"
          aria-label={`${listingName} — photos, full screen`}
        >
          <CarouselContent>
            {photos.map((photo, i) => (
              <CarouselItem key={`lb-${photo.url}-${i}`}>
                <div className="relative flex h-[80vh] w-full items-center justify-center">
                  <ListingGalleryImage
                    url={photo.url}
                    alt={`${listingName} — ${photo.label}`}
                    variant={variant}
                    sizes="100vw"
                    objectFit="contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {photos.length > 1 && (
            <>
              <CarouselPrevious className="left-4" size="icon-lg" />
              <CarouselNext className="right-4" size="icon-lg" />
            </>
          )}
        </Carousel>
        <div
          aria-hidden="true"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-background/80 px-2 py-1 type-caption-mono text-muted-foreground"
        >
          {carousel.selectedIndex + 1} / {photos.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}
