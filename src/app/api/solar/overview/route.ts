import { NextResponse } from "next/server";

import { requireSession, resolvePlantId, serverError, unauthorized } from "@/lib/api";
import { TTL, ttlCache } from "@/lib/cache";
import { getSolarAdapter } from "@/lib/solar/adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireSession())) return unauthorized();

  try {
    const plantId = await resolvePlantId(req);
    const data = await ttlCache(`overview:${plantId}`, TTL.overview, () =>
      getSolarAdapter().getOverview(plantId),
    );
    return NextResponse.json(data);
  } catch (err) {
    return serverError(err);
  }
}
