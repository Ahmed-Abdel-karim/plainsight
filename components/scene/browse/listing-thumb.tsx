import { cn } from "@/lib/utils";

/**
 * Striped placeholder thumbnail (no real listing imagery in v1, matching the
 * design prototype's `Thumb`). The stripe angle is a stable function of the
 * listing's `imageVariant`, so a given listing always draws the same placeholder.
 * Tokens only — the stripes use the `border`/`muted` design tokens, never raw
 * colours. Purely decorative, so `aria-hidden`.
 */
const STRIPE_ANGLES = [22, 68, 112, 158] as const;

export function ListingThumb({
  variant,
  className,
}: {
  variant: number;
  className?: string;
}) {
  const angle = STRIPE_ANGLES[((variant % 4) + 4) % 4];
  return (
    <div
      aria-hidden="true"
      className={cn("size-14 shrink-0 rounded-md bg-muted", className)}
      style={{
        backgroundImage: `repeating-linear-gradient(${angle}deg, transparent 0 9px, var(--color-border) 9px 11px)`,
      }}
    />
  );
}

/** Wide placeholder for the detail drawer's photo slot (port of design `ThumbWide`). */
export function ListingThumbWide({ variant }: { variant: number }) {
  const angle = STRIPE_ANGLES[((variant % 4) + 4) % 4];
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted"
      style={{
        backgroundImage: `repeating-linear-gradient(${angle}deg, transparent 0 16px, var(--color-border) 16px 19px)`,
      }}
    >
      <span className="absolute bottom-2 left-3 type-caption-mono text-muted-foreground">
        Placeholder · listing photo
      </span>
    </div>
  );
}
