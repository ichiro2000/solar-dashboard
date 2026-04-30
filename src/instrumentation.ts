/**
 * Next.js instrumentation hook — runs once per server process. We use it to
 * boot the in-process SEMS sampler.
 *
 * Splitting the Node-runtime side into its own file lets webpack's compile-
 * time NEXT_RUNTIME check exclude it from the edge bundle. Without this,
 * webpack would try to resolve `crypto` for the edge runtime and fail.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
