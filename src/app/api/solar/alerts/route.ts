import { NextResponse } from "next/server";

import { requireSession, resolvePlantId, serverError, unauthorized } from "@/lib/api";
import { TTL, ttlCache } from "@/lib/cache";
import { getSolarAdapter } from "@/lib/solar/adapter";
import { alertRepository } from "@/lib/solar/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireSession())) return unauthorized();

  try {
    const plantId = await resolvePlantId(req);
    const data = await ttlCache(`alerts:${plantId}`, TTL.alerts, async () => {
      const upstream = await getSolarAdapter().getAlerts(plantId);
      alertRepository.upsertAll(plantId, upstream).catch(() => undefined);
      return upstream;
    });
    return NextResponse.json({ alerts: data });
  } catch (err) {
    return serverError(err);
  }
}
