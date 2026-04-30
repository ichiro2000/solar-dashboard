import { prisma } from "@/lib/prisma";
import type { Alert, HistoryPoint, HistoryRange, RealtimeSnapshot } from "./types";

const RANGE_LIMITS: Record<HistoryRange, { ms: number; bucketMs: number }> = {
  day: { ms: 24 * 3600_000, bucketMs: 5 * 60_000 },
  week: { ms: 7 * 24 * 3600_000, bucketMs: 30 * 60_000 },
  month: { ms: 30 * 24 * 3600_000, bucketMs: 3 * 3600_000 },
  year: { ms: 365 * 24 * 3600_000, bucketMs: 24 * 3600_000 },
};

export const historyRepository = {
  async upsertSample(
    plantId: string,
    s: Pick<RealtimeSnapshot, "ts"> & {
      pvKw: number;
      loadKw: number;
      batteryKw: number;
      gridKw: number;
      socPct?: number;
    },
  ) {
    await prisma.sample.upsert({
      where: { plantId_ts: { plantId, ts: new Date(s.ts) } },
      create: {
        plantId,
        ts: new Date(s.ts),
        pvKw: s.pvKw,
        loadKw: s.loadKw,
        batteryKw: s.batteryKw,
        gridKw: s.gridKw,
        socPct: s.socPct,
      },
      update: {
        pvKw: s.pvKw,
        loadKw: s.loadKw,
        batteryKw: s.batteryKw,
        gridKw: s.gridKw,
        socPct: s.socPct,
      },
    });
  },

  async getRange(plantId: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const { ms } = RANGE_LIMITS[range];
    const since = new Date(Date.now() - ms);
    const rows = await prisma.sample.findMany({
      where: { plantId, ts: { gte: since } },
      orderBy: { ts: "asc" },
    });
    return rows.map((r) => ({
      ts: r.ts.toISOString(),
      pvKw: r.pvKw,
      loadKw: r.loadKw,
      batteryKw: r.batteryKw,
      gridKw: r.gridKw,
      socPct: r.socPct ?? undefined,
    }));
  },
};

export const alertRepository = {
  async upsertAll(plantId: string, alerts: Alert[]) {
    if (alerts.length === 0) return;
    await prisma.$transaction(
      alerts.map((a) =>
        prisma.alert.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
            plantId,
            severity: a.severity,
            code: a.code,
            message: a.message,
            raisedAt: new Date(a.raisedAt),
            resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : null,
          },
          update: {
            severity: a.severity,
            code: a.code,
            message: a.message,
            resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : null,
          },
        }),
      ),
    );
  },
};

export const plantRepository = {
  async upsert(p: { id: string; name: string; capacityKw: number; tz?: string; status: string }) {
    await prisma.plant.upsert({
      where: { id: p.id },
      create: p,
      update: { name: p.name, capacityKw: p.capacityKw, tz: p.tz, status: p.status },
    });
  },
};
