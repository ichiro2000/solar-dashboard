import { Cloud, Leaf, Trees } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  co2Kg: number | undefined;
  trees: number | undefined;
  coalKg: number | undefined;
}

function compact(n: number | undefined, unit: string): string {
  if (n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k ${unit}`;
  return `${Math.round(n)} ${unit}`;
}

export function EnvironmentalImpact({ co2Kg, trees, coalKg }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Environmental impact</CardTitle>
        <p className="text-xs text-muted-foreground">Lifetime equivalents</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={<Cloud className="size-4 text-sky-400" />}
            label="CO₂ avoided"
            value={compact(co2Kg, "kg")}
          />
          <Stat
            icon={<Trees className="size-4 text-emerald-400" />}
            label="Trees equiv"
            value={trees !== undefined ? `${Math.round(trees)}` : "—"}
          />
          <Stat
            icon={<Leaf className="size-4 text-amber-400" />}
            label="Coal saved"
            value={compact(coalKg, "kg")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}
