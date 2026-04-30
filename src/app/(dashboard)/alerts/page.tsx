import { AlertList } from "@/components/dashboard/alert-list";
import { Header } from "@/components/layout/header";
import { getSolarAdapter } from "@/lib/solar/adapter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AlertsPage() {
  const adapter = getSolarAdapter();
  const plants = await adapter.listPlants().catch(() => []);
  const plantId = plants[0]?.id;

  const [overview, alerts] = await Promise.all([
    plantId ? adapter.getOverview(plantId).catch(() => null) : Promise.resolve(null),
    plantId ? adapter.getAlerts(plantId).catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col">
      <Header
        title="Alerts"
        plantName={overview?.plant.name}
        status={overview?.plant.status}
        lastUpdated={overview?.lastUpdated}
      />
      <div className="p-6">
        <AlertList alerts={alerts} loading={false} />
      </div>
    </div>
  );
}
