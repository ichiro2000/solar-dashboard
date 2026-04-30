/**
 * Node-runtime-only side of instrumentation. Importing from here pulls the
 * Prisma client, the SEMS HTTP client, and `crypto` — none of which can be
 * bundled for the edge runtime.
 *
 * Only ever imported by `instrumentation.ts` under
 * `process.env.NEXT_RUNTIME === "nodejs"`, which Next.js evaluates at compile
 * time so the edge bundle never sees this module.
 */
import { startSampler } from "@/workers/sampler";

startSampler();
