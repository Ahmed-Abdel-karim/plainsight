"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { ListingGalleryImage } from "./listing-gallery-image";
import { getListingPhotos } from "./listing-photos";

export function ListingInlineGallery({
  photos,
  listingName,
  variant,
  selectedIndex,
  setApi,
  onOpenLightbox,
}: {
  photos: ReturnType<typeof getListingPhotos>;
  listingName: string;
  variant: number;
  selectedIndex: number;
  setApi: (api: CarouselApi) => void;
  onOpenLightbox: (index: number) => void;
}) {
  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      className="w-full"
      aria-label={`${listingName} — photos`}
    >
      <CarouselContent>
        {photos.map((photo, i) => (
          <CarouselItem key={`${photo.url}-${i}`}>
            <button
              type="button"
              onClick={() => onOpenLightbox(i)}
              aria-label={`View photo ${i + 1} of ${photos.length} full screen`}
              className="relative block aspect-video w-full overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              <ListingGalleryImage
                url={photo.url}
                alt={`${listingName} — ${photo.label}`}
                variant={variant}
                sizes="(min-width: 1024px) 352px, 100vw"
                objectFit="cover"
                priority={i === 0}
              />
            </button>
          </CarouselItem>
        ))}
      </CarouselContent>

      {photos.length > 1 && (
        <>
          <CarouselPrevious className="left-2 size-7 border-0 bg-muted/80 text-foreground hover:bg-muted" />
          <CarouselNext className="right-2 size-7 border-0 bg-muted/80 text-foreground hover:bg-muted" />
          <div
            aria-hidden="true"
            className="absolute right-2 bottom-2 rounded-md bg-background/80 px-1.5 py-0.5 type-caption-mono text-muted-foreground"
          >
            {selectedIndex + 1} / {photos.length}
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-2 flex justify-center gap-1"
          >
            {photos.map((p, i) => (
              <span
                key={`dot-${p.url}-${i}`}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === selectedIndex ? "bg-foreground" : "bg-foreground/30",
                )}
              />
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
}
