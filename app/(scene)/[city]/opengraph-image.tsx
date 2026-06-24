// Co-located with the city page so the root OG card merges into each city's own
// `openGraph` (declared in this segment's generateMetadata). Without a
// same-segment image file the per-city `openGraph` override drops the inherited
// root image. Same card for every city — it re-exports the root implementation.
export { default, alt, contentType, size } from "@/app/opengraph-image";
