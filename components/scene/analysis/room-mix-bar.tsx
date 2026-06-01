import { ROOM_TYPES, type RoomType, type ScopeAggregates } from "@/data";
import { formatPercent } from "./format";
import { ChartCard } from "./chart-card";

/**
 * Room-type composition as a 100% stacked proportion bar + legend. This is a
 * proportion bar, not a cartesian chart, so per Rule 8 it's a token-styled
 * port of the prototype's `RoomMixBar` rather than a Recharts chart. Data hue
 * comes from the categorical `cat-1..4` tokens (Rule 3 — data hue on charts
 * only). Static: no hover, no filtering.
 */
const ROOM_META: Record<RoomType, { label: string; bar: string; dot: string }> =
  {
    "Entire home/apt": { label: "Entire", bar: "bg-cat-1", dot: "bg-cat-1" },
    "Private room": { label: "Private", bar: "bg-cat-2", dot: "bg-cat-2" },
    "Shared room": { label: "Shared", bar: "bg-cat-3", dot: "bg-cat-3" },
    "Hotel room": { label: "Hotel", bar: "bg-cat-4", dot: "bg-cat-4" },
  };

export function RoomMixBar({ aggregates }: { aggregates: ScopeAggregates }) {
  const { roomTypeMix } = aggregates;
  const total = ROOM_TYPES.reduce((sum, t) => sum + (roomTypeMix[t] ?? 0), 0);

  const segments = ROOM_TYPES.map((type) => ({
    type,
    ...ROOM_META[type],
    share: total > 0 ? (roomTypeMix[type] ?? 0) / total : 0,
  }));

  return (
    <ChartCard title="Room-type mix" subtitle="Share of listings by type">
      {total === 0 ? (
        <p className="type-caption text-muted-foreground">
          Too few listings to characterise.
        </p>
      ) : (
        <>
          {/* Proportions read off the bar; exact %s live in the legend below,
              so no over-fill labels (which can't clear AA on every data hue). */}
          <div
            className="flex h-7 overflow-hidden rounded-sm"
            aria-hidden="true"
          >
            {segments
              .filter((s) => s.share > 0)
              .map((s) => (
                <div
                  key={s.type}
                  className={s.bar}
                  style={{ width: `${s.share * 100}%`, minWidth: 1 }}
                />
              ))}
          </div>

          <ul className="grid grid-cols-2 gap-x-gutter gap-y-snug">
            {segments.map((s) => (
              <li key={s.type} className="flex items-center gap-snug">
                <span
                  className={`size-2 shrink-0 rounded-[2px] ${s.dot}`}
                  aria-hidden="true"
                />
                <span className="flex-1 type-caption text-muted-foreground">
                  {s.label}
                </span>
                <span className="type-caption-mono text-foreground tabular-nums">
                  {formatPercent(s.share)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ChartCard>
  );
}
