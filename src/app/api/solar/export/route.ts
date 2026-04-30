import { z } from "zod";

import { requireSession, resolvePlantId, serverError, unauthorized } from "@/lib/api";
import { pointsToCsv } from "@/lib/csv";
import { historyRepository } from "@/lib/solar/repository";

const RangeSchema = z.enum(["day", "week", "month", "year"]);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireSession())) return unauthorized();

  try {
    const url = new URL(req.url);
    const rangeParse = RangeSchema.safeParse(url.searchParams.get("range") ?? "day");
    if (!rangeParse.success) {
      return new Response("invalid_range", { status: 400 });
    }
    const plantId = await resolvePlantId(req);
    const points = await historyRepository.getRange(plantId, rangeParse.data);
    const csv = pointsToCsv(points);
    const filename = `solar-${plantId}-${rangeParse.data}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
