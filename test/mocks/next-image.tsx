/**
 * Shared test double for `next/image`.
 *
 * Renders a plain <img> and drops the Next-specific props (`fill`, `priority`,
 * `placeholder`, `quality`, `sizes`, ...) that React would otherwise warn about
 * on a native element. Use it from a component test with:
 *
 *   vi.mock("next/image", () => import("@/test/mocks/next-image"));
 */
interface NextImageProps {
  alt: string;
  src: string;
  className?: string;
}

export default function NextImage({ alt, src, className }: NextImageProps) {
  // eslint-disable-next-line @next/next/no-img-element -- Test double for next/image.
  return <img alt={alt} className={className} src={src} />;
}
