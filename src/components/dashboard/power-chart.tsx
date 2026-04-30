"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryPoint } from "@/lib/solar/types";

interface PowerChartProps {
  points: HistoryPoint[] | undefined;
  loading?: boolean;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function PowerChart({ points, loading }: PowerChartProps) {
  const data = useMemo(
    () =>
      (points ?? []).map((p) => ({
        ts: p.ts,
        label: formatTime(p.ts),
        pv: Number(p.pvKw.toFixed(3)),
      })),
    [points],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>PV generation</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <span>No production data yet today</span>
            <span className="text-xs">PV chart fills in as the day progresses</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={24}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={44}
                tickFormatter={(v: number) => (Math.abs(v) < 1 ? v.toFixed(2) : v.toFixed(1))}
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} kW`, "PV"]}
              />
              <Area
                dataKey="pv"
                type="monotone"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#pvFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
