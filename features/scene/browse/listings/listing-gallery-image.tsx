"use client";

import Image from "next/image";
import { useState } from "react";

import { ListingThumbWide } from "./listing-thumb";
import { shimmer } from "./shimmer";

const GALLERY_SHIMMER = shimmer(16, 9);

/** One Unsplash slide that degrades to the stripe placeholder on load error. */
export function ListingGalleryImage({
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
      blurDataURL={GALLERY_SHIMMER}
      priority={priority}
      onError={() => setFailed(true)}
      className={objectFit === "cover" ? "object-cover" : "object-contain"}
    />
  );
}
