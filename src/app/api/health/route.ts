import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness probe for DigitalOcean App Platform's health check.
 * Intentionally lightweight — no DB / no SEMS — so a failing upstream
 * doesn't take the container out of rotation.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}
