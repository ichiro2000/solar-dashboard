import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKw(kw: number, fractionDigits = 2): string {
  if (!Number.isFinite(kw)) return "—";
  return `${kw.toFixed(fractionDigits)} kW`;
}

export function formatKwh(kwh: number, fractionDigits = 1): string {
  if (!Number.isFinite(kwh)) return "—";
  if (Math.abs(kwh) >= 1000) {
    return `${(kwh / 1000).toFixed(fractionDigits)} MWh`;
  }
  return `${kwh.toFixed(fractionDigits)} kWh`;
}

export function formatPercent(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p)}%`;
}
