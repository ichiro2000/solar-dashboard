"use client";

import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Alert, AlertSeverity } from "@/lib/solar/types";

const ICON: Record<AlertSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

const TONE: Record<AlertSeverity, string> = {
  info: "text-sky-400 bg-sky-500/10",
  warning: "text-amber-400 bg-amber-500/10",
  critical: "text-rose-400 bg-rose-500/10",
};

export function AlertList({
  alerts,
  loading,
}: {
  alerts: Alert[] | undefined;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const active = (alerts ?? []).filter((a) => !a.resolvedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Alerts</span>
          <span className="text-xs font-normal text-muted-foreground">
            {active.length} active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(alerts ?? []).length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-300">
            <CheckCircle2 className="size-4" />
            All systems nominal.
          </div>
        ) : (
          <ul className="space-y-2">
            {(alerts ?? []).slice(0, 8).map((a) => {
              const Icon = ICON[a.severity];
              return (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/20 p-3"
                >
                  <span className={cn("rounded-md p-1.5", TONE[a.severity])}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.message}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{a.code}</span>
                      {" · "}
                      {formatDistanceToNow(new Date(a.raisedAt), { addSuffix: true })}
                      {a.resolvedAt && (
                        <span className="ml-1 text-emerald-400">· resolved</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
