/**
 * Lightweight TTL cache for portfolio / customer SQL results.
 * Cuts repeat SQL round-trips when navigating between pages.
 */

type Entry<T> = { at: number; value: T };

const store = new Map<string, Entry<unknown>>();

/** In-flight promises so parallel loaders do not stampede SQL */
const inflight = new Map<string, Promise<unknown>>();

export function cacheGet<T>(key: string, ttlMs: number): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() - e.at > ttlMs) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T): void {
  // Never cache null/undefined misses — they stick for the TTL and hide recoveries
  if (value === null || value === undefined) return;
  store.set(key, { at: Date.now(), value });
}

export function cacheInvalidate(prefix?: string): void {
  if (!prefix) {
    store.clear();
    inflight.clear();
    return;
  }
  for (const k of [...store.keys()]) {
    if (k === prefix || k.startsWith(prefix)) store.delete(k);
  }
  for (const k of [...inflight.keys()]) {
    if (k === prefix || k.startsWith(prefix)) inflight.delete(k);
  }
}

/**
 * Coalesce concurrent loaders for the same key.
 * First caller runs `fn`; others await the same promise.
 * Null results are returned but not stored (see cacheSet).
 */
export async function cacheGetOrLoad<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key, ttlMs);
  if (hit !== undefined) return hit;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const p = (async () => {
    try {
      const value = await fn();
      cacheSet(key, value);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/** Portfolio TTL — keep estate snappy without hammering SQL */
export const PORTFOLIO_TTL_MS = 120_000;
/** Customer detail TTL — longer so pillar/module clicks stay instant */
export const CUSTOMER_TTL_MS = 180_000;
/** Staff profile TTL (client) */
export const PROFILE_TTL_MS = 120_000;
