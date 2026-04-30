"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryPoint } from "@/lib/solar/types";

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ConsumptionVsProductionChart({
  points,
  loading,
}: {
  points: HistoryPoint[] | undefined;
  loading?: boolean;
}) {
  const data = useMemo(
    () =>
      (points ?? []).map((p) => ({
        label: formatTime(p.ts),
        production: Number(p.pvKw.toFixed(3)),
        consumption: Number(p.loadKw.toFixed(3)),
      })),
    [points],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consumption vs Production</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="prodFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={48}
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
                formatter={(v: number, k) => [`${v} kW`, k === "production" ? "Production" : "Consumption"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="production" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#prodFill)" />
              <Line type="monotone" dataKey="consumption" stroke="hsl(38 95% 55%)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
