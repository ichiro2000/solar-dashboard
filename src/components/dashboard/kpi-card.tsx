"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | undefined;
  unit: string;
  icon: ReactNode;
  loading?: boolean;
  fractionDigits?: number;
  hint?: string;
  accent?: "primary" | "emerald" | "amber" | "sky";
}

const ACCENT: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "text-primary",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
};

/**
 * SSR-safe by default: the static text shows the actual `value` immediately,
 * regardless of whether JS has hydrated. Once mounted on the client, a spring
 * animates value transitions for visual polish — but a non-hydrated page still
 * displays correct numbers.
 */
export function KpiCard({
  label,
  value,
  unit,
  icon,
  loading,
  fractionDigits = 2,
  hint,
  accent = "primary",
}: KpiCardProps) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : null;
  const [mounted, setMounted] = useState(false);
  const spring = useSpring(safeValue ?? 0, { stiffness: 90, damping: 18, mass: 0.6 });
  const display = useTransform(spring, (v) => v.toFixed(fractionDigits));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (safeValue !== null) spring.set(safeValue);
  }, [safeValue, spring]);

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={cn("flex size-4 items-center justify-center", ACCENT[accent])}>
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : safeValue === null ? (
          <div className="text-3xl font-semibold tabular-nums tracking-tight text-muted-foreground">
            —
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            {mounted ? (
              <motion.span className="text-3xl font-semibold tabular-nums tracking-tight">
                {display}
              </motion.span>
            ) : (
              <span className="text-3xl font-semibold tabular-nums tracking-tight">
                {safeValue.toFixed(fractionDigits)}
              </span>
            )}
            <span className="text-sm font-medium text-muted-foreground">{unit}</span>
          </div>
        )}
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
