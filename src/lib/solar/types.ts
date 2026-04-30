export type SystemStatus = "online" | "offline" | "warning" | "fault";
export type FlowDirection = "in" | "out" | "idle";

export interface PlantSummary {
  id: string;
  name: string;
  capacityKw: number;
  status: SystemStatus;
  location?: { lat: number; lng: number; tz: string };
}

export interface OverviewSnapshot {
  plant: PlantSummary;
  currentPowerKw: number;
  todayYieldKwh: number;
  monthYieldKwh: number;
  totalYieldKwh: number;
  co2OffsetKg: number;
  treesEquivalent?: number;
  coalSavedKg?: number;
  lastUpdated: string;
  income?: { today: number; total: number; currency: string };
  address?: string;
  weather?: {
    description: string;
    temperatureC: number;
    humidityPct?: number;
    cloudCoverPct?: number;
    windKph?: number;
  };
  inverter?: {
    sn?: string;
    model?: string;
    workMode?: string;
    firmware?: string;
    batteryCapacityKwh?: number;
    gridVoltage?: string;
  };
}

export interface RealtimeSnapshot {
  ts: string;
  pvPowerKw: number;
  loadPowerKw: number;
  battery: { socPct: number; powerKw: number; flow: FlowDirection };
  grid: { powerKw: number; flow: FlowDirection };
  inverterTempC?: number;
  status: SystemStatus;
}

export type HistoryRange = "day" | "week" | "month" | "year";

export interface HistoryPoint {
  ts: string;
  pvKw: number;
  loadKw: number;
  batteryKw: number;
  gridKw: number;
  socPct?: number;
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  code: string;
  message: string;
  raisedAt: string;
  resolvedAt?: string;
}
