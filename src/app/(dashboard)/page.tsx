import { Activity, Sun, Zap } from "lucide-react";

import { AlertList } from "@/components/dashboard/alert-list";
import { BatteryGauge } from "@/components/dashboard/battery-gauge";
import { EnergyFlowDiagram } from "@/components/dashboard/energy-flow-diagram";
import { EnvironmentalImpact } from "@/components/dashboard/environmental-impact";
import { InverterInfo } from "@/components/dashboard/inverter-info";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LifetimeStats } from "@/components/dashboard/lifetime-stats";
import { PowerChart } from "@/components/dashboard/power-chart";
import { WeatherCard } from "@/components/dashboard/weather-card";
import { Header } from "@/components/layout/header";
import { historyRepository } from "@/lib/solar/repository";
import { getSolarAdapter } from "@/lib/solar/adapter";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const adapter = getSolarAdapter();
  const plants = await adapter.listPlants().catch((err) => {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "listPlants failed");
    return [];
  });
  const plantId = plants[0]?.id;

  if (!plantId) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Overview" />
        <div className="m-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          Could not load any plants from SEMS. Check the server log for details
          and verify <code className="font-mono">SEMS_ACCOUNT</code> /{" "}
          <code className="font-mono">SEMS_PASSWORD</code> in{" "}
          <code className="font-mono">.env.local</code>.
        </div>
      </div>
    );
  }

  const [overview, realtime, alerts, dbHistory] = await Promise.all([
    adapter.getOverview(plantId).catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, "overview failed");
      return null;
    }),
    adapter.getRealtime(plantId).catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, "realtime failed");
      return null;
    }),
    adapter.getAlerts(plantId).catch(() => []),
    historyRepository.getRange(plantId, "day").catch(() => []),
  ]);

  let history = dbHistory;
  if (history.length === 0) {
    history = await adapter.getHistory(plantId, "day").catch(() => []);
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Overview"
        plantName={overview?.plant.name}
        status={overview?.plant.status}
        lastUpdated={overview?.lastUpdated}
        autoRefreshSec={60}
      />
      <div className="grid gap-4 p-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <KpiCard
            label="Current Power"
            value={realtime?.pvPowerKw}
            unit="kW"
            icon={<Sun className="size-4" />}
            loading={realtime === null}
          />
        </div>
        <div className="lg:col-span-3">
          <KpiCard
            label="Today's Yield"
            value={overview?.todayYieldKwh}
            unit="kWh"
            icon={<Activity className="size-4" />}
            loading={overview === null}
            fractionDigits={1}
            accent="emerald"
          />
        </div>
        <div className="lg:col-span-3">
          <KpiCard
            label="Battery SOC"
            value={realtime?.battery.socPct}
            unit="%"
            icon={<Activity className="size-4" />}
            loading={realtime === null}
            fractionDigits={0}
            accent="amber"
            hint={
              realtime
                ? realtime.battery.flow === "in"
                  ? `Charging ${realtime.battery.powerKw.toFixed(2)} kW`
                  : realtime.battery.flow === "out"
                    ? `Discharging ${realtime.battery.powerKw.toFixed(2)} kW`
                    : "Idle"
                : undefined
            }
          />
        </div>
        <div className="lg:col-span-3">
          <KpiCard
            label={realtime?.grid.flow === "out" ? "Grid Export" : "Grid Import"}
            value={realtime?.grid.powerKw}
            unit="kW"
            icon={<Zap className="size-4" />}
            loading={realtime === null}
            accent="sky"
            hint={
              realtime?.grid.flow === "idle"
                ? "No grid flow"
                : realtime?.grid.flow === "out"
                  ? "Exporting to grid"
                  : "Importing from grid"
            }
          />
        </div>

        <div className="lg:col-span-8">
          <EnergyFlowDiagram data={realtime ?? undefined} loading={realtime === null} />
        </div>
        <div className="lg:col-span-4">
          <BatteryGauge
            socPct={realtime?.battery.socPct}
            powerKw={realtime?.battery.powerKw}
            flow={realtime?.battery.flow}
            loading={realtime === null}
          />
        </div>

        <div className="lg:col-span-8">
          <PowerChart points={history} loading={false} />
        </div>
        <div className="lg:col-span-4">
          <AlertList alerts={alerts} loading={false} />
        </div>

        {overview && (
          <>
            <div className="lg:col-span-4">
              <LifetimeStats
                totalYieldKwh={overview.totalYieldKwh}
                monthYieldKwh={overview.monthYieldKwh}
                income={overview.income}
                capacityKw={overview.plant.capacityKw}
              />
            </div>
            <div className="lg:col-span-4">
              <EnvironmentalImpact
                co2Kg={overview.co2OffsetKg}
                trees={overview.treesEquivalent}
                coalKg={overview.coalSavedKg}
              />
            </div>
            {overview.weather ? (
              <div className="lg:col-span-4">
                <WeatherCard
                  description={overview.weather.description}
                  temperatureC={overview.weather.temperatureC}
                  humidityPct={overview.weather.humidityPct}
                  cloudCoverPct={overview.weather.cloudCoverPct}
                  windKph={overview.weather.windKph}
                  location={overview.address}
                />
              </div>
            ) : (
              <div className="lg:col-span-4">
                <InverterInfo
                  sn={overview.inverter?.sn}
                  model={overview.inverter?.model}
                  workMode={overview.inverter?.workMode}
                  firmware={overview.inverter?.firmware}
                  batteryCapacityKwh={overview.inverter?.batteryCapacityKwh}
                  gridVoltage={overview.inverter?.gridVoltage}
                  inverterTempC={realtime?.inverterTempC}
                />
              </div>
            )}
            {overview.weather && overview.inverter && (
              <div className="lg:col-span-12">
                <InverterInfo
                  sn={overview.inverter.sn}
                  model={overview.inverter.model}
                  workMode={overview.inverter.workMode}
                  firmware={overview.inverter.firmware}
                  batteryCapacityKwh={overview.inverter.batteryCapacityKwh}
                  gridVoltage={overview.inverter.gridVoltage}
                  inverterTempC={realtime?.inverterTempC}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
