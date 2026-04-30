import { logger } from "@/lib/logger";
import { getSolarAdapter } from "@/lib/solar/adapter";
import {
  alertRepository,
  historyRepository,
  plantRepository,
} from "@/lib/solar/repository";

/**
 * Background sampler. Runs in-process inside the Next.js Node runtime,
 * booted from `instrumentation.ts`. One tick = one realtime snapshot per
 * plant + (every 5 ticks) one alerts pull.
 *
 * Cadence chosen per the SEMS gotchas: sub-30s polling has been reported to
 * invalidate tokens. We sample every 60s.
 */

const SAMPLE_INTERVAL_MS = 60_000;
const ALERT_EVERY_N_TICKS = 5; // 5 minutes
const STARTUP_DELAY_MS = 5_000;

let started = false;
let timer: NodeJS.Timeout | null = null;
let tick = 0;

async function runOnce() {
  const adapter = getSolarAdapter();
  try {
    const plants = await adapter.listPlants();
    for (const p of plants) {
      await plantRepository.upsert({
        id: p.id,
        name: p.name,
        capacityKw: p.capacityKw,
        tz: p.location?.tz,
        status: p.status,
      });

      const r = await adapter.getRealtime(p.id);
      await historyRepository.upsertSample(p.id, {
        ts: r.ts,
        pvKw: r.pvPowerKw,
        loadKw: r.loadPowerKw,
        batteryKw: r.battery.flow === "in" ? r.battery.powerKw : -r.battery.powerKw,
        gridKw: r.grid.flow === "out" ? r.grid.powerKw : -r.grid.powerKw,
        socPct: r.battery.socPct,
      });

      if (tick % ALERT_EVERY_N_TICKS === 0) {
        const alerts = await adapter.getAlerts(p.id);
        await alertRepository.upsertAll(p.id, alerts);
      }
    }
    tick += 1;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "sampler tick failed");
  }
}

export function startSampler() {
  if (started) return;
  if ((process.env.ENABLE_SAMPLER ?? "true").toLowerCase() === "false") {
    logger.info("sampler disabled via ENABLE_SAMPLER=false");
    return;
  }
  started = true;
  logger.info({ intervalMs: SAMPLE_INTERVAL_MS }, "sampler starting");
  setTimeout(() => {
    void runOnce();
    timer = setInterval(() => void runOnce(), SAMPLE_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
}

export function stopSampler() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
