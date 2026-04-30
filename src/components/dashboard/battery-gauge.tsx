"use client";

import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BatteryGaugeProps {
  socPct: number | undefined;
  powerKw: number | undefined;
  flow: "in" | "out" | "idle" | undefined;
  loading?: boolean;
}

const RADIUS = 80;
const CIRC = 2 * Math.PI * RADIUS;

function colorFor(pct: number) {
  if (pct >= 60) return "text-emerald-400";
  if (pct >= 30) return "text-amber-400";
  return "text-rose-400";
}

const FLOW_LABEL: Record<NonNullable<BatteryGaugeProps["flow"]>, string> = {
  in: "Charging",
  out: "Discharging",
  idle: "Idle",
};

export function BatteryGauge({ socPct, powerKw, flow, loading }: BatteryGaugeProps) {
  const pct = Math.max(0, Math.min(100, socPct ?? 0));
  const dash = (pct / 100) * CIRC;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Battery</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || socPct === undefined ? (
          <Skeleton className="mx-auto h-44 w-44 rounded-full" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <svg width={196} height={196} viewBox="0 0 196 196" className="-rotate-90">
                <circle
                  cx={98}
                  cy={98}
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={10}
                  className="text-muted/40"
                />
                <motion.circle
                  cx={98}
                  cy={98}
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={10}
                  strokeLinecap="round"
                  className={colorFor(pct)}
                  strokeDasharray={`${dash} ${CIRC}`}
                  initial={false}
                  animate={{ strokeDasharray: `${dash} ${CIRC}` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-semibold tabular-nums tracking-tight">
                  {Math.round(pct)}
                  <span className="ml-1 text-xl text-muted-foreground">%</span>
                </span>
                <span className="text-xs text-muted-foreground">SOC</span>
              </div>
            </div>
            <div className="flex flex-col items-center text-sm">
              <span
                className={cn(
                  "font-medium",
                  flow === "in"
                    ? "text-emerald-400"
                    : flow === "out"
                      ? "text-amber-400"
                      : "text-muted-foreground",
                )}
              >
                {FLOW_LABEL[flow ?? "idle"]}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {(powerKw ?? 0).toFixed(2)} kW
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
