import { ConsumptionVsProductionChart } from "@/components/dashboard/consumption-vs-production-chart";
import { ExportButton } from "@/components/dashboard/export-button";
import { PowerChart } from "@/components/dashboard/power-chart";
import { RangePicker } from "@/components/dashboard/range-picker";
import { Header } from "@/components/layout/header";
import { getSolarAdapter } from "@/lib/solar/adapter";
import { historyRepository } from "@/lib/solar/repository";
import type { HistoryRange } from "@/lib/solar/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID: HistoryRange[] = ["day", "week", "month", "year"];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const range: HistoryRange = (VALID as string[]).includes(searchParams.range ?? "")
    ? (searchParams.range as HistoryRange)
    : "day";

  const adapter = getSolarAdapter();
  const plants = await adapter.listPlants().catch(() => []);
  const plantId = plants[0]?.id;

  let points = plantId ? await historyRepository.getRange(plantId, range).catch(() => []) : [];
  if (points.length === 0 && plantId) {
    points = await adapter.getHistory(plantId, range).catch(() => []);
  }

  const overview = plantId
    ? await adapter.getOverview(plantId).catch(() => null)
    : null;

  return (
    <div className="flex flex-col">
      <Header
        title="History"
        plantName={overview?.plant.name}
        status={overview?.plant.status}
        lastUpdated={overview?.lastUpdated}
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RangePicker current={range} />
          <ExportButton range={range} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PowerChart points={points} loading={false} />
          <ConsumptionVsProductionChart points={points} loading={false} />
        </div>
      </div>
    </div>
  );
}
