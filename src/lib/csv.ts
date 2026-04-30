import type { HistoryPoint } from "./solar/types";

const ESCAPE = /[",\n\r]/;

function escape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (!ESCAPE.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function pointsToCsv(points: HistoryPoint[]): string {
  const head = ["ts", "pv_kw", "load_kw", "battery_kw", "grid_kw", "soc_pct"].join(",");
  const rows = points.map((p) =>
    [p.ts, p.pvKw, p.loadKw, p.batteryKw, p.gridKw, p.socPct ?? ""].map(escape).join(","),
  );
  return [head, ...rows].join("\n") + "\n";
}
