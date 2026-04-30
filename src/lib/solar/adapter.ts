import "server-only";
import { logger } from "@/lib/logger";
import type { SolarDataPort } from "./port";
import { MockAdapter } from "./mock-adapter";
import { SemsAdapter } from "./sems-adapter";

let _adapter: SolarDataPort | null = null;

export function getSolarAdapter(): SolarDataPort {
  if (_adapter) return _adapter;

  const explicit = (process.env.DATA_SOURCE ?? "").toLowerCase();
  const hasCreds = !!process.env.SEMS_ACCOUNT && !!process.env.SEMS_PASSWORD;
  const useReal =
    explicit === "sems" ||
    (explicit !== "mock" && hasCreds);

  if (useReal) {
    logger.info("using SEMS adapter (live)");
    _adapter = new SemsAdapter();
  } else {
    logger.info({ explicit }, "using mock adapter");
    _adapter = new MockAdapter();
  }
  return _adapter;
}
