import "server-only";

/**
 * Tiny TTL cache with single-flight semantics. Sits in front of the SEMS
 * adapter so concurrent dashboard tabs collapse to one upstream call.
 *
 * Keep this in-memory, per Node process. The sampler's DB writes are the
 * cross-process source of truth.
 */
interface Entry<T> {
  expiresAt: number;
  value: T;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function ttlCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const flying = inflight.get(key);
  if (flying) return flying as Promise<T>;

  const p = (async () => {
    try {
      const v = await fn();
      store.set(key, { value: v, expiresAt: now + ttlMs });
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function invalidate(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

export const TTL = {
  realtime: 25_000,
  overview: 45_000,
  history: 5 * 60_000,
  alerts: 5 * 60_000,
} as const;
