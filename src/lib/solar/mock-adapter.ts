import type { SolarDataPort } from "./port";
import type {
  Alert,
  HistoryPoint,
  HistoryRange,
  OverviewSnapshot,
  PlantSummary,
  RealtimeSnapshot,
  SystemStatus,
} from "./types";

const MOCK_PLANT: PlantSummary = {
  id: "mock-plant-1",
  name: "Demo Rooftop · 8.2 kWp",
  capacityKw: 8.2,
  status: "online",
  location: { lat: 51.5074, lng: -0.1278, tz: "UTC+1" },
};

// Tiny seeded PRNG so the dashboard looks stable across reloads.
function mulberry32(seed: number) {
  return function rand(): number {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SamplePoint {
  ts: Date;
  pvKw: number;
  loadKw: number;
  batteryKw: number;
  gridKw: number;
  socPct: number;
}

/** PV bell over local "daylight" hours (06–20). Capacity-scaled. */
function pvAt(d: Date, capacityKw: number, jitter = 0): number {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 5.5 || h > 20.5) return 0;
  const center = 13;
  const sigma = 3.2;
  const bell = Math.exp(-Math.pow(h - center, 2) / (2 * sigma * sigma));
  const cloud = 1 - jitter * 0.4;
  return Math.max(0, capacityKw * 0.92 * bell * cloud);
}

/** Domestic load: 0.4 kW base + breakfast and dinner peaks. */
function loadAt(d: Date, jitter = 0): number {
  const h = d.getHours() + d.getMinutes() / 60;
  let load = 0.4;
  load += 1.6 * Math.exp(-Math.pow(h - 7.5, 2) / 0.6); // breakfast
  load += 2.2 * Math.exp(-Math.pow(h - 19, 2) / 1.2); // dinner
  load += 0.5 * Math.exp(-Math.pow(h - 13, 2) / 4); // midday
  return Math.max(0.2, load + jitter * 0.3);
}

/** Generate a coherent sequence so charts look real (battery integrates net flow). */
function sampleRange(from: Date, to: Date, stepMs: number): SamplePoint[] {
  const rand = mulberry32(Math.floor(from.getTime() / 86400000));
  const out: SamplePoint[] = [];
  let soc = 65;
  for (let t = from.getTime(); t <= to.getTime(); t += stepMs) {
    const ts = new Date(t);
    const cloud = (rand() - 0.5) * 0.6;
    const pv = pvAt(ts, MOCK_PLANT.capacityKw, cloud);
    const load = loadAt(ts, (rand() - 0.5) * 0.4);
    const surplus = pv - load;
    // Battery soaks surplus first (up to 4 kW), grid handles the rest.
    let batteryKw = 0;
    if (surplus > 0 && soc < 100) batteryKw = Math.min(surplus, 4);
    else if (surplus < 0 && soc > 15) batteryKw = Math.max(surplus, -3);
    const gridKw = surplus - batteryKw;
    soc = Math.max(5, Math.min(100, soc + (batteryKw * stepMs) / (3600 * 1000) * 8));
    out.push({ ts, pvKw: pv, loadKw: load, batteryKw, gridKw, socPct: soc });
  }
  return out;
}

export class MockAdapter implements SolarDataPort {
  async listPlants(): Promise<PlantSummary[]> {
    return [MOCK_PLANT];
  }

  async getOverview(): Promise<OverviewSnapshot> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const today = sampleRange(startOfDay, now, 5 * 60 * 1000);
    const todayYieldKwh = today.reduce((s, p) => s + p.pvKw * (5 / 60), 0);
    const current = today[today.length - 1];

    const totalYieldKwh = 12_540 + todayYieldKwh;
    return {
      plant: MOCK_PLANT,
      currentPowerKw: current?.pvKw ?? 0,
      todayYieldKwh,
      monthYieldKwh: todayYieldKwh + 220,
      totalYieldKwh,
      co2OffsetKg: totalYieldKwh * 0.5,
      treesEquivalent: Math.round(totalYieldKwh * 0.0166),
      coalSavedKg: Math.round(totalYieldKwh * 0.4),
      lastUpdated: now.toISOString(),
      income: { today: todayYieldKwh * 0.22, total: totalYieldKwh * 0.22, currency: "USD" },
      address: "Demo Avenue, Springfield",
      weather: {
        description: "Partly Cloudy",
        temperatureC: 22,
        humidityPct: 55,
        cloudCoverPct: 40,
        windKph: 12,
      },
      inverter: {
        sn: "DEMO-0000",
        model: "GW8.2K-EH",
        workMode: "Wait Mode",
        batteryCapacityKwh: 16,
        gridVoltage: "236.0V",
      },
    };
  }

  async getRealtime(): Promise<RealtimeSnapshot> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const series = sampleRange(startOfDay, now, 5 * 60 * 1000);
    const p = series[series.length - 1] ?? {
      pvKw: 0, loadKw: 0.4, batteryKw: 0, gridKw: 0.4, socPct: 65, ts: now,
    } as SamplePoint;

    const flowDir = (kw: number): "in" | "out" | "idle" =>
      kw > 0.05 ? "out" : kw < -0.05 ? "in" : "idle";

    const status: SystemStatus = "online";
    return {
      ts: now.toISOString(),
      pvPowerKw: p.pvKw,
      loadPowerKw: p.loadKw,
      battery: { socPct: p.socPct, powerKw: Math.abs(p.batteryKw), flow: flowDir(p.batteryKw) },
      grid: { powerKw: Math.abs(p.gridKw), flow: flowDir(p.gridKw) },
      inverterTempC: 38 + Math.sin(now.getMinutes() / 10) * 3,
      status,
    };
  }

  async getHistory(_plantId: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const now = new Date();
    let from: Date;
    let stepMs: number;
    switch (range) {
      case "day":
        from = new Date(now); from.setHours(0, 0, 0, 0);
        stepMs = 5 * 60 * 1000;
        break;
      case "week":
        from = new Date(now); from.setDate(from.getDate() - 7);
        stepMs = 60 * 60 * 1000;
        break;
      case "month":
        from = new Date(now); from.setDate(from.getDate() - 30);
        stepMs = 6 * 60 * 60 * 1000;
        break;
      case "year":
        from = new Date(now); from.setFullYear(from.getFullYear() - 1);
        stepMs = 24 * 60 * 60 * 1000;
        break;
    }
    return sampleRange(from, now, stepMs).map((p) => ({
      ts: p.ts.toISOString(),
      pvKw: p.pvKw,
      loadKw: p.loadKw,
      batteryKw: p.batteryKw,
      gridKw: p.gridKw,
      socPct: p.socPct,
    }));
  }

  async getAlerts(): Promise<Alert[]> {
    const now = Date.now();
    return [
      {
        id: "A-001",
        severity: "info",
        code: "GRID_OK",
        message: "Grid frequency stable for 24h",
        raisedAt: new Date(now - 24 * 3600_000).toISOString(),
        resolvedAt: new Date(now - 23 * 3600_000).toISOString(),
      },
    ];
  }
}
