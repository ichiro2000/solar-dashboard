/**
 * Tiny in-memory token-bucket rate limiter. Keyed by IP. Used to slow down
 * brute-force attempts against the login form.
 *
 * In a multi-replica deployment, swap to a shared store (Redis, KV) — the
 * call-site uses an interface so this is a one-file change.
 */
interface Bucket {
  tokens: number;
  refilledAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { capacity: number; refillPerSec: number },
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: opts.capacity, refilledAt: now };
  const elapsedSec = (now - b.refilledAt) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsedSec * opts.refillPerSec);
  b.refilledAt = now;

  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(key, b);
    return { allowed: true, retryAfterSec: 0 };
  }

  buckets.set(key, b);
  const retryAfterSec = Math.ceil((1 - b.tokens) / opts.refillPerSec);
  return { allowed: false, retryAfterSec };
}
