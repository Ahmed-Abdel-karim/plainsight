"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getListingPhotos } from "./listing-photos";
import { ListingThumbWide } from "./listing-thumb";
import { shimmer } from "./shimmer";

const SHIMMER = shimmer(16, 9);

/** Tracks embla's selected slide index for a counter/dots readout. */
function useSelectedIndex(api: CarouselApi): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);
  return index;
}

/** One Unsplash slide that degrades to the stripe placeholder on load error. */
function GalleryImage({
  url,
  alt,
  variant,
  sizes,
  objectFit,
  priority,
}: {
  url: string;
  alt: string;
  variant: number;
  sizes: string;
  objectFit: "cover" | "contain";
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <ListingThumbWide variant={variant} />;
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      placeholder="blur"
      blurDataURL={SHIMMER}
      priority={priority}
      onError={() => setFailed(true)}
      className={objectFit === "cover" ? "object-cover" : "object-contain"}
    />
  );
}

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
  const [inlineApi, setInlineApi] = useState<CarouselApi>();
  const inlineIndex = useSelectedIndex(inlineApi);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  function openLightbox(index: number) {
    setStartIndex(index);
    setLightboxOpen(true);
  }

  return (
    <>
      <Carousel
        setApi={setInlineApi}
        opts={{ loop: true }}
        className="w-full"
        aria-label={`${listing.name} — photos`}
      >
        <CarouselContent>
          {photos.map((photo, i) => (
            <CarouselItem key={`${photo.url}-${i}`}>
              <button
                type="button"
                onClick={() => openLightbox(i)}
                aria-label={`View photo ${i + 1} of ${photos.length} full screen`}
                className="relative block aspect-video w-full overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <GalleryImage
                  url={photo.url}
                  alt={`${listing.name} — ${photo.label}`}
                  variant={listing.imageVariant}
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
              {inlineIndex + 1} / {photos.length}
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
                    i === inlineIndex ? "bg-foreground" : "bg-foreground/30",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>

      <Lightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        startIndex={startIndex}
        photos={photos}
        listingName={listing.name}
        variant={listing.imageVariant}
      />
    </>
  );
}

/** Fullscreen photo viewer — a second embla carousel inside a Radix Dialog. */
function Lightbox({
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
  const [api, setApi] = useState<CarouselApi>();
  const index = useSelectedIndex(api);

  // Jump to the tapped photo whenever the lightbox (re)opens.
  useEffect(() => {
    if (open && api) api.scrollTo(startIndex, true);
  }, [open, api, startIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] border-0 bg-transparent p-0 ring-0 sm:max-w-[100vw]">
        <DialogTitle className="sr-only">{listingName} — photos</DialogTitle>
        <Carousel
          setApi={setApi}
          opts={{ loop: true, startIndex }}
          className="w-full"
          aria-label={`${listingName} — photos, full screen`}
        >
          <CarouselContent>
            {photos.map((photo, i) => (
              <CarouselItem key={`lb-${photo.url}-${i}`}>
                <div className="relative flex h-[80vh] w-full items-center justify-center">
                  <GalleryImage
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
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </>
          )}
        </Carousel>
        <div
          aria-hidden="true"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-background/80 px-2 py-1 type-caption-mono text-muted-foreground"
        >
          {index + 1} / {photos.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}
