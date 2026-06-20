/**
 * A tiny animated-shimmer SVG, base64-encoded for use as `next/image`'s
 * `blurDataURL` with `placeholder="blur"`. Next can auto-generate a blur preview
 * only for statically-imported images, not remote URLs — so the listing gallery
 * (which fetches from Unsplash) supplies its own. No network, no dependency.
 *
 * A data URL can't reference CSS theme tokens, so the gradient uses neutral
 * greys that read acceptably in both light and dark.
 */
function shimmerSvg(w: number, h: number): string {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#9ca3af" offset="20%" />
      <stop stop-color="#d1d5db" offset="50%" />
      <stop stop-color="#9ca3af" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#9ca3af" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.4s" repeatCount="indefinite" />
</svg>`;
}

const toBase64 = (str: string): string =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

/** A base64 `data:image/svg+xml` shimmer sized `w`×`h` for use as `blurDataURL`. */
export function shimmer(w: number, h: number): string {
  return `data:image/svg+xml;base64,${toBase64(shimmerSvg(w, h))}`;
}
