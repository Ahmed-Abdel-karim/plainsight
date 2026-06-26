import type { BrowsePointProperties } from "@/data/contract";

/**
 * Listing photos for the Browse detail gallery. The dataset carries no real
 * imagery — only a stable `imageVariant` bucket — so we simulate a real listing
 * CDN by fetching from Unsplash's image host. `imageVariant` selects which
 * curated *set* a listing draws (its contract-documented purpose), so a given
 * listing always shows the same photos (deterministic + shareable).
 *
 * These are real Unsplash interior/exterior photo IDs; swap any that go stale
 * (the gallery falls back to a stripe placeholder per photo on load error, so a
 * dead id degrades gracefully rather than breaking the UI).
 */
export type ListingPhoto = { url: string; label: string };

const UNSPLASH = "https://images.unsplash.com";

/**
 * Cap what Unsplash serves so the Next image optimizer doesn't fetch multi-MB
 * originals just to downscale them; `next/image` still generates the responsive
 * srcset from this source.
 */
function photo(id: string): string {
  return `${UNSPLASH}/${id}?auto=format&fit=crop&w=1600&q=80`;
}

/** One label per slot — each set is one plausible rental's worth of rooms. */
const ROOM_LABELS = [
  "Living room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Exterior",
] as const;

/** 8 sets × 5 Unsplash photo ids, ordered to match `ROOM_LABELS`. */
const PHOTO_SET_IDS: string[][] = [
  [
    "photo-1493809842364-78817add7ffb",
    "photo-1522771739844-6a9f6d5f14af",
    "photo-1556911220-bff31c812dba",
    "photo-1584622650111-993a426fbf0a",
    "photo-1568605114967-8130f3a36994",
  ],
  [
    "photo-1567767292278-a4f21aa2d36e",
    "photo-1505693416388-ac5ce068fe85",
    "photo-1758240689297-d8613ca753f3",
    "photo-1620626011761-996317b8d101",
    "photo-1512917774080-9991f1c4c750",
  ],
  [
    "photo-1586023492125-27b2c045efd7",
    "photo-1560185007-cde436f6a4d0",
    "photo-1565538810643-b5bdb714032a",
    "photo-1552321554-5fefe8c9ef14",
    "photo-1570129477492-45c003edd2be",
  ],
  [
    "photo-1484154218962-a197022b5858",
    "photo-1560185009-dddeb820c7b7",
    "photo-1556911220-bff31c812dba",
    "photo-1584622650111-993a426fbf0a",
    "photo-1583847268964-b28dc8f51f92",
  ],
  [
    "photo-1502672260266-1c1ef2d93688",
    "photo-1522771739844-6a9f6d5f14af",
    "photo-1758240689297-d8613ca753f3",
    "photo-1620626011761-996317b8d101",
    "photo-1568605114967-8130f3a36994",
  ],
  [
    "photo-1540518614846-7eded433c457",
    "photo-1505693416388-ac5ce068fe85",
    "photo-1565538810643-b5bdb714032a",
    "photo-1552321554-5fefe8c9ef14",
    "photo-1512917774080-9991f1c4c750",
  ],
  [
    "photo-1556228453-efd6c1ff04f6",
    "photo-1560185007-cde436f6a4d0",
    "photo-1556911220-bff31c812dba",
    "photo-1584622650111-993a426fbf0a",
    "photo-1570129477492-45c003edd2be",
  ],
  [
    "photo-1505691938895-1758d7feb511",
    "photo-1560185009-dddeb820c7b7",
    "photo-1758240689297-d8613ca753f3",
    "photo-1620626011761-996317b8d101",
    "photo-1583847268964-b28dc8f51f92",
  ],
];

const PHOTO_SETS: ListingPhoto[][] = PHOTO_SET_IDS.map((ids) =>
  ids.map((id, i) => ({ url: photo(id), label: ROOM_LABELS[i] })),
);

/** The deterministic photo set for a listing, keyed by its `imageVariant`. */
export function getListingPhotos(
  listing: Pick<BrowsePointProperties, "imageVariant">,
): ListingPhoto[] {
  const i =
    ((listing.imageVariant % PHOTO_SETS.length) + PHOTO_SETS.length) %
    PHOTO_SETS.length;
  return PHOTO_SETS[i];
}
