"use client";

import { useEffect, useState } from "react";

import type { CarouselApi } from "@/components/ui/carousel";

/** Tracks Embla's selected slide index for gallery counters and dots. */
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

export function useCarouselSelection() {
  const [api, setApi] = useState<CarouselApi>();
  const selectedIndex = useSelectedIndex(api);

  return { api, setApi, selectedIndex };
}

export function useListingLightboxState() {
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  function openAt(index: number) {
    setStartIndex(index);
    setOpen(true);
  }

  return {
    open,
    onOpenChange: setOpen,
    openAt,
    startIndex,
  };
}

export function useLightboxStartIndex(
  open: boolean,
  api: CarouselApi,
  startIndex: number,
) {
  useEffect(() => {
    if (open && api) api.scrollTo(startIndex, true);
  }, [open, api, startIndex]);
}
