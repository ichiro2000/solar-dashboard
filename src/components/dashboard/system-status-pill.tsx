import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "@/lib/solar/types";

const COPY: Record<SystemStatus, { label: string; tone: string; dot: string }> = {
  online: { label: "Online", tone: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-400" },
  offline: { label: "Offline", tone: "bg-zinc-500/15 text-zinc-400", dot: "bg-zinc-500" },
  warning: { label: "Warning", tone: "bg-amber-500/15 text-amber-400", dot: "bg-amber-400" },
  fault: { label: "Fault", tone: "bg-rose-500/15 text-rose-400", dot: "bg-rose-400" },
};

export function SystemStatusPill({
  status,
  lastUpdated,
}: {
  status: SystemStatus | undefined;
  lastUpdated?: string;
}) {
  const c = COPY[status ?? "offline"];
  return (
    <div className="flex items-center gap-3">
      <Badge className={cn("gap-2 text-xs font-medium", c.tone)} variant="outline">
        <span className={cn("size-1.5 rounded-full", c.dot)} />
        {c.label}
      </Badge>
      <span className="text-xs text-muted-foreground tabular-nums">
        Updated {lastUpdated ? formatRelative(lastUpdated) : "—"}
      </span>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}
