import { NextResponse } from "next/server";

import { requireSession, resolvePlantId, serverError, unauthorized } from "@/lib/api";
import { TTL, ttlCache } from "@/lib/cache";
import { getSolarAdapter } from "@/lib/solar/adapter";
import { historyRepository } from "@/lib/solar/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireSession())) return unauthorized();

  try {
    const plantId = await resolvePlantId(req);
    const snap = await ttlCache(`realtime:${plantId}`, TTL.realtime, async () => {
      const r = await getSolarAdapter().getRealtime(plantId);
      // Opportunistic write-through to history table so charts stay populated
      // even when the sampler hasn't ticked yet.
      historyRepository
        .upsertSample(plantId, {
          ts: r.ts,
          pvKw: r.pvPowerKw,
          loadKw: r.loadPowerKw,
          batteryKw: r.battery.flow === "in" ? r.battery.powerKw : -r.battery.powerKw,
          gridKw: r.grid.flow === "out" ? r.grid.powerKw : -r.grid.powerKw,
          socPct: r.battery.socPct,
        })
        .catch(() => undefined);
      return r;
    });
    return NextResponse.json(snap);
  } catch (err) {
    return serverError(err);
  }
}
