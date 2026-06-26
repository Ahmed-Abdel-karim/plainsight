"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortKey } from "@/data/types";

/**
 * Sort control for the Browse list. Changing it reorders the visible list
 * without changing the matching set, so the result count is unaffected. Sort is
 * view state, not URL state: a shared link restores filters + the open listing,
 * not the order.
 */
const OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "reviews_desc", label: "Most reviews / month" },
  { value: "review_count_desc", label: "Most reviewed" },
];

export function SortControl({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-inline">
      <span
        id="browse-sort-label"
        className="type-caption text-muted-foreground"
      >
        Sort
      </span>
      <Select value={value} onValueChange={(next) => onChange(next as SortKey)}>
        <SelectTrigger
          size="sm"
          aria-labelledby="browse-sort-label"
          className="min-h-7"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
