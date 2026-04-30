import "server-only";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { logger } from "./logger";
import { getSolarAdapter } from "./solar/adapter";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function serverError(err: unknown) {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, "api error");
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

/**
 * Resolve the current plant id. v1 is single-tenant, single-plant —
 * we always grab the first plant. Multi-plant comes later via a query param.
 */
export async function resolvePlantId(req: Request): Promise<string> {
  const url = new URL(req.url);
  const explicit = url.searchParams.get("plantId");
  if (explicit) return explicit;
  const adapter = getSolarAdapter();
  const plants = await adapter.listPlants();
  const first = plants[0];
  if (!first) throw new Error("no plants available");
  return first.id;
}
