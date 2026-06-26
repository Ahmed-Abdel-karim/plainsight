"use client";

import Image from "next/image";
import { useState } from "react";

import { getListingPhotos } from "./listing-photos";
import { ListingThumb } from "./listing-thumb";
import { shimmer } from "./shimmer";

const COVER_SHIMMER = shimmer(1, 1);

/**
 * 56px set-cover photo for a list row; degrades to the stripe placeholder on
 * load error so the list never shows a broken image.
 */
export function ListingCover({ variant }: { variant: number }) {
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
