import type { ReactNode } from "react";

/**
 * Shared frame for the three analysis charts — the shadcn-`Card`-equivalent
 * surface (bordered panel on the `bg-card` sidebar) with a title + optional
 * subtitle, mirroring the prototype's `ChartFrame`. Pure presentational.
 */
export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-stack rounded-lg border border-border px-gutter pt-gutter pb-stack">
      <header className="flex flex-col gap-hair">
        <h3 className="type-heading text-foreground">{title}</h3>
        {subtitle ? (
          <p className="type-caption text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
