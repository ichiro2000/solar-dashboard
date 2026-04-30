import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession, resolvePlantId, serverError, unauthorized } from "@/lib/api";
import { TTL, ttlCache } from "@/lib/cache";
import { getSolarAdapter } from "@/lib/solar/adapter";
import { historyRepository } from "@/lib/solar/repository";
import type { HistoryRange } from "@/lib/solar/types";

const RangeSchema = z.enum(["day", "week", "month", "year"]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireSession())) return unauthorized();

  try {
    const url = new URL(req.url);
    const rangeParse = RangeSchema.safeParse(url.searchParams.get("range") ?? "day");
    if (!rangeParse.success) {
      return NextResponse.json({ error: "invalid_range" }, { status: 400 });
    }
    const range: HistoryRange = rangeParse.data;
    const plantId = await resolvePlantId(req);

    const data = await ttlCache(`history:${plantId}:${range}`, TTL.history, async () => {
      // Prefer the local DB for time-series — it has consistent buckets and
      // survives SEMS outages. Fall back to upstream if DB has nothing yet.
      const db = await historyRepository.getRange(plantId, range);
      if (db.length > 0) return db;
      return getSolarAdapter().getHistory(plantId, range);
    });
    return NextResponse.json({ range, points: data });
  } catch (err) {
    return serverError(err);
  }
}
