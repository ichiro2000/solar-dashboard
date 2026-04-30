import type {
  Alert,
  HistoryPoint,
  HistoryRange,
  OverviewSnapshot,
  PlantSummary,
  RealtimeSnapshot,
} from "./types";

export interface SolarDataPort {
  listPlants(): Promise<PlantSummary[]>;
  getOverview(plantId: string): Promise<OverviewSnapshot>;
  getRealtime(plantId: string): Promise<RealtimeSnapshot>;
  getHistory(plantId: string, range: HistoryRange): Promise<HistoryPoint[]>;
  getAlerts(plantId: string): Promise<Alert[]>;
}
