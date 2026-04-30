import Link from "next/link";

import { cn } from "@/lib/utils";
import type { HistoryRange } from "@/lib/solar/types";

const RANGES: { id: HistoryRange; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export function RangePicker({ current }: { current: HistoryRange }) {
  return (
    <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
      {RANGES.map((r) => (
        <Link
          key={r.id}
          href={`/history?range=${r.id}`}
          prefetch={false}
          className={cn(
            "inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium transition-all",
            r.id === current
              ? "bg-background text-foreground shadow"
              : "hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
