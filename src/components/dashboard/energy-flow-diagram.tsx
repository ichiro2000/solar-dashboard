"use client";

import { Battery, Home, Sun, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RealtimeSnapshot } from "@/lib/solar/types";

interface Props {
  data: RealtimeSnapshot | undefined;
  loading?: boolean;
}

interface NodeProps {
  x: number;
  y: number;
  label: string;
  value: string;
  icon: React.ReactNode;
  active?: boolean;
}

function FlowNode({ x, y, label, value, icon, active }: NodeProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        x={-56}
        y={-36}
        width={112}
        height={72}
        rx={14}
        className={cn(
          "fill-card stroke-border/80",
          active && "stroke-primary/50",
        )}
        strokeWidth={1}
      />
      <foreignObject x={-50} y={-30} width={100} height={60}>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className={cn("text-muted-foreground", active && "text-primary")}>{icon}</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-sm font-semibold tabular-nums">{value}</div>
        </div>
      </foreignObject>
    </g>
  );
}

interface EdgeProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  active: boolean;
  reversed?: boolean;
  kw: number;
}

function FlowEdge({ from, to, active, reversed, kw }: EdgeProps) {
  const stroke = Math.max(1, Math.min(4, 1 + kw));
  return (
    <line
      x1={reversed ? to.x : from.x}
      y1={reversed ? to.y : from.y}
      x2={reversed ? from.x : to.x}
      y2={reversed ? from.y : to.y}
      strokeWidth={stroke}
      strokeDasharray="6 6"
      className={cn(
        active ? "stroke-primary/80" : "stroke-border/40",
        active && "animate-flow-dash",
      )}
      strokeLinecap="round"
    />
  );
}

export function EnergyFlowDiagram({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System flow</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const SOLAR = { x: 90, y: 60 };
  const LOAD = { x: 510, y: 60 };
  const BATT = { x: 90, y: 240 };
  const GRID = { x: 510, y: 240 };
  const HUB = { x: 300, y: 150 };

  const fmt = (n: number) => `${n.toFixed(2)} kW`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>System flow</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 600 320" className="h-auto w-full">
          <FlowEdge
            from={SOLAR}
            to={HUB}
            active={data.pvPowerKw > 0.05}
            kw={data.pvPowerKw}
          />
          <FlowEdge
            from={HUB}
            to={LOAD}
            active={data.loadPowerKw > 0.05}
            kw={data.loadPowerKw}
          />
          <FlowEdge
            from={HUB}
            to={BATT}
            active={data.battery.flow !== "idle"}
            reversed={data.battery.flow === "out"}
            kw={data.battery.powerKw}
          />
          <FlowEdge
            from={HUB}
            to={GRID}
            active={data.grid.flow !== "idle"}
            reversed={data.grid.flow === "in"}
            kw={data.grid.powerKw}
          />

          <FlowNode
            x={SOLAR.x}
            y={SOLAR.y}
            label="Solar"
            value={fmt(data.pvPowerKw)}
            icon={<Sun className="size-4" />}
            active={data.pvPowerKw > 0.05}
          />
          <FlowNode
            x={LOAD.x}
            y={LOAD.y}
            label="Load"
            value={fmt(data.loadPowerKw)}
            icon={<Home className="size-4" />}
            active={data.loadPowerKw > 0.05}
          />
          <FlowNode
            x={BATT.x}
            y={BATT.y}
            label={`Battery · ${Math.round(data.battery.socPct)}%`}
            value={fmt(data.battery.powerKw)}
            icon={<Battery className="size-4" />}
            active={data.battery.flow !== "idle"}
          />
          <FlowNode
            x={GRID.x}
            y={GRID.y}
            label={data.grid.flow === "out" ? "Grid (export)" : "Grid (import)"}
            value={fmt(data.grid.powerKw)}
            icon={<Zap className="size-4" />}
            active={data.grid.flow !== "idle"}
          />
        </svg>
      </CardContent>
    </Card>
  );
}
