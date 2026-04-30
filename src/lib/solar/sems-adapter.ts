import { logger } from "@/lib/logger";
import type { SolarDataPort } from "./port";
import { semsClient } from "./sems-client";
import type {
  Alert,
  FlowDirection,
  HistoryPoint,
  HistoryRange,
  OverviewSnapshot,
  PlantSummary,
  RealtimeSnapshot,
  SystemStatus,
} from "./types";

/**
 * SEMS adapter — based on a live capture of a real account in 2026.
 *
 *  - Plant list      : v2/PowerStationMonitor/QueryPowerStationMonitorForApp
 *  - Monitor detail  : v2/PowerStation/GetMonitorDetailByPowerstationId
 *  - Daily power     : v2/PowerStationMonitor/GetPowerStationPacByDayForApp
 *  - Warnings        : not exposed on every region/account; we soft-fail to []
 *
 * We deliberately read realtime values from `data.powerflow` (the same block
 * the SEMS web app's flow diagram consumes). It returns clean string values
 * like `"20(W)"` and per-leg status codes for direction, which removes the
 * need to chase per-inverter sign conventions across EH/EM/ET/ES families.
 */

const BATTERY_SIGN: 1 | -1 =
  (process.env.SEMS_BATTERY_SIGN ?? "auto").toLowerCase() === "inverted" ? -1 : 1;
const GRID_SIGN: 1 | -1 =
  (process.env.SEMS_GRID_SIGN ?? "auto").toLowerCase() === "inverted" ? -1 : 1;

let warningEndpointUnavailable = false;

// ---------- helpers ---------------------------------------------------------

/** Parse SEMS strings like "20(W)", "1.2(kW)", "-24(W)" into kW. */
function parsePowerToKw(s: unknown): number {
  if (typeof s === "number") return s / 1000;
  if (typeof s !== "string") return 0;
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*\(?(W|kW|w|kw)?\)?/);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = (m[2] ?? "W").toLowerCase();
  return unit === "kw" ? n : n / 1000;
}

/**
 * SEMS powerflow status codes (empirically):
 *   0 = idle / no flow
 *   1 = flowing in the diagram's "default" direction
 *      - load:    consuming
 *      - grid:    importing (grid → home)
 *      - battery: discharging (battery → home)
 *  -1 / 2 = flowing in the opposite direction
 *      - grid:    exporting (home → grid)
 *      - battery: charging  (home → battery)
 *
 * Some firmwares report status as a string; we coerce.
 */
function flowFromStatus(
  raw: unknown,
  /** true if status=1 means "in" (e.g. battery charging is the +1 case) */
  oneMeansIn = false,
  signFlip: 1 | -1 = 1,
): FlowDirection {
  const n = typeof raw === "string" ? Number(raw) : (raw as number);
  if (!Number.isFinite(n) || n === 0) return "idle";
  const positive = n > 0;
  const isOut = oneMeansIn ? !positive : positive;
  const direction: FlowDirection = isOut ? "out" : "in";
  if (signFlip === -1) {
    return direction === "in" ? "out" : direction === "out" ? "in" : "idle";
  }
  return direction;
}

function statusFromCode(code: number | undefined): SystemStatus {
  switch (code) {
    case 1:
      return "online";
    case 2:
      return "online";
    case -1:
      return "offline";
    case 3:
      return "fault";
    default:
      return "warning";
  }
}

function toDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface MonitorPlantSummary {
  powerstation_id: string;
  stationname?: string;
  location?: string;
  status?: number;
  capacity?: number;
  pac?: number;
  eday?: number;
  emonth?: number;
  etotal?: number;
  longitude?: number | string;
  latitude?: number | string;
}

interface MonitorDetail {
  info?: {
    stationname?: string;
    address?: string;
    capacity?: number;
    status?: number;
    longitude?: number;
    latitude?: number;
    battery_capacity?: number;
    powerstation_id?: string;
  };
  kpi?: {
    pac?: number;
    power?: number;
    total_power?: number;
    month_generation?: number;
    day_income?: number;
    total_income?: number;
    yield_rate?: number;
    currency?: string;
  };
  inverter?: Array<{
    sn?: string;
    name?: string;
    tempperature?: number;
    eday?: number;
    emonth?: number;
    etotal?: number;
    status?: number;
    capacity?: number;
    d?: Record<string, unknown>;
  }>;
  powerflow?: {
    pv?: string;
    pvStatus?: number | string;
    bettery?: string;
    betteryStatus?: number | string;
    load?: string;
    loadStatus?: number | string;
    grid?: string;
    gridStatus?: number | string;
    soc?: number;
  };
  soc?: { power?: number; status?: number };
  hjgx?: { co2?: number; tree?: number; coal?: number };
  weather?: {
    HeWeather6?: Array<{
      now?: {
        cond_txt?: string;
        tmp?: string;
        hum?: string;
        cloud?: string;
        wind_spd?: string;
      };
    }>;
  };
}

// ---------- adapter --------------------------------------------------------

export class SemsAdapter implements SolarDataPort {
  async listPlants(): Promise<PlantSummary[]> {
    const data = await semsClient.call<MonitorPlantSummary[]>(
      "v2/PowerStationMonitor/QueryPowerStationMonitorForApp",
      { page_size: 50, page_index: 1, key: "" },
    );
    if (!Array.isArray(data)) return [];
    return data.map((p) => ({
      id: p.powerstation_id,
      name: p.stationname ?? "Plant",
      capacityKw: Number(p.capacity ?? 0),
      status: statusFromCode(p.status),
      location:
        p.latitude !== undefined && p.longitude !== undefined
          ? {
              lat: Number(p.latitude),
              lng: Number(p.longitude),
              tz: "UTC",
            }
          : undefined,
    }));
  }

  async getOverview(plantId: string): Promise<OverviewSnapshot> {
    const data = await semsClient.call<MonitorDetail>(
      "v2/PowerStation/GetMonitorDetailByPowerstationId",
      { powerStationId: plantId },
    );
    const info = data.info ?? {};
    const kpi = data.kpi ?? {};
    const inv0 = data.inverter?.[0];
    const invD = (inv0?.d ?? {}) as Record<string, unknown>;

    // kpi.pac is in W
    const currentPowerKw = (kpi.pac ?? kpi.power ?? 0) / 1000;
    const todayYieldKwh = inv0?.eday ?? 0;
    const monthYieldKwh = inv0?.emonth ?? kpi.month_generation ?? 0;
    const totalYieldKwh = inv0?.etotal ?? kpi.total_power ?? 0;

    const w = data.weather?.HeWeather6?.[0]?.now;
    const weather = w?.cond_txt
      ? {
          description: w.cond_txt,
          temperatureC: Number(w.tmp ?? 0),
          humidityPct: w.hum ? Number(w.hum) : undefined,
          cloudCoverPct: w.cloud ? Number(w.cloud) : undefined,
          windKph: w.wind_spd ? Number(w.wind_spd) : undefined,
        }
      : undefined;

    return {
      plant: {
        id: info.powerstation_id ?? plantId,
        name: info.stationname ?? "Plant",
        capacityKw: info.capacity ?? 0,
        status: statusFromCode(info.status),
        location:
          info.latitude !== undefined && info.longitude !== undefined
            ? { lat: info.latitude, lng: info.longitude, tz: "UTC" }
            : undefined,
      },
      currentPowerKw,
      todayYieldKwh,
      monthYieldKwh,
      totalYieldKwh,
      // SEMS exposes hjgx.co2 in kg directly when available; fall back to ~0.5 kg/kWh
      co2OffsetKg: data.hjgx?.co2 ?? totalYieldKwh * 0.5,
      treesEquivalent: data.hjgx?.tree,
      coalSavedKg: data.hjgx?.coal,
      lastUpdated: new Date().toISOString(),
      income: kpi.day_income !== undefined || kpi.total_income !== undefined
        ? {
            today: kpi.day_income ?? 0,
            total: kpi.total_income ?? 0,
            currency: kpi.currency ?? "USD",
          }
        : undefined,
      address: info.address,
      weather,
      inverter: inv0
        ? {
            sn: inv0.sn,
            model: typeof invD.model === "string" ? invD.model : undefined,
            workMode: typeof invD.work_mode === "string" ? invD.work_mode : undefined,
            firmware:
              typeof invD.firmware_version === "string"
                ? (invD.firmware_version as string)
                : undefined,
            batteryCapacityKwh: info.battery_capacity,
            gridVoltage:
              typeof invD.grid_voltage === "string"
                ? (invD.grid_voltage as string)
                : undefined,
          }
        : undefined,
    };
  }

  async getRealtime(plantId: string): Promise<RealtimeSnapshot> {
    const data = await semsClient.call<MonitorDetail>(
      "v2/PowerStation/GetMonitorDetailByPowerstationId",
      { powerStationId: plantId },
    );
    const pf = data.powerflow ?? {};
    const inv0 = data.inverter?.[0];

    const pvPowerKw = parsePowerToKw(pf.pv);
    const loadPowerKw = parsePowerToKw(pf.load);
    const batteryPowerKw = parsePowerToKw(pf.bettery);
    const gridPowerKw = parsePowerToKw(pf.grid);

    const batteryFlow = flowFromStatus(pf.betteryStatus, true, BATTERY_SIGN);
    const gridFlow = flowFromStatus(pf.gridStatus, false, GRID_SIGN);

    const socPct = pf.soc ?? data.soc?.power ?? 0;

    return {
      ts: new Date().toISOString(),
      pvPowerKw,
      loadPowerKw,
      battery: {
        socPct,
        powerKw: batteryPowerKw,
        flow: batteryFlow,
      },
      grid: {
        powerKw: gridPowerKw,
        flow: gridFlow,
      },
      inverterTempC: inv0?.tempperature,
      status: statusFromCode(data.info?.status),
    };
  }

  async getHistory(plantId: string, range: HistoryRange): Promise<HistoryPoint[]> {
    if (range !== "day") {
      // Wider ranges aren't reliably available on every account/region; the
      // local DB (sampler) is the source of truth for week/month/year. The
      // history route falls back to the DB when this returns [].
      return [];
    }

    interface PacResp {
      today_power?: number;
      pacs?: Array<{ time?: string; pac?: number; pv?: number }> | null;
    }
    const data = await semsClient.call<PacResp>(
      "v2/PowerStationMonitor/GetPowerStationPacByDayForApp",
      { date: toDate(new Date()), powerStationId: plantId, full_script: false },
    );
    const pacs = data.pacs ?? [];
    return pacs.map((p) => ({
      ts: p.time ? new Date(p.time).toISOString() : new Date().toISOString(),
      pvKw: ((p.pac ?? p.pv ?? 0) as number) / 1000,
      loadKw: 0,
      batteryKw: 0,
      gridKw: 0,
    }));
  }

  async getAlerts(_plantId: string): Promise<Alert[]> {
    // The QueryPowerStationWarning endpoint returns "ver is not fund" on some
    // regions/accounts (notably HK/SG). Soft-fail with an empty list and only
    // log once.
    if (warningEndpointUnavailable) return [];
    try {
      interface WarningResp {
        list?: unknown[];
        record?: unknown[];
      }
      const data = await semsClient.call<WarningResp>(
        "v2/PowerStationWarning/QueryPowerStationWarning",
        { page_size: 50, page_index: 1, powerstation_id: _plantId, status: -1 },
      );
      const rows = (data.list ?? data.record ?? []) as Array<Record<string, unknown>>;
      return rows.map((w, i) => ({
        id: String(w.warning_id ?? w.id ?? i),
        severity:
          Number(w.fault_class ?? 0) >= 3
            ? "critical"
            : Number(w.fault_class ?? 0) === 2
              ? "warning"
              : "info",
        code: String(w.warning_code ?? w.error_code ?? "UNKNOWN"),
        message: String(
          w.warningname ?? w.warning_message ?? w.message ?? "Unspecified warning",
        ),
        raisedAt: String(w.happentime ?? new Date().toISOString()),
        resolvedAt: w.recoverytime ? String(w.recoverytime) : undefined,
      }));
    } catch (err) {
      warningEndpointUnavailable = true;
      logger.info(
        { err: err instanceof Error ? err.message : String(err) },
        "SEMS warning endpoint unavailable for this account; alerts will be empty",
      );
      return [];
    }
  }
}
