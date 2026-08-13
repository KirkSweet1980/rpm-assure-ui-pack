/** Transient SQL / network errors worth retrying. Auth and syntax errors are not retried. */
export function isTransientError(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (!m) return true;
  if (
    m.includes("login failed") ||
    m.includes("cannot open database") ||
    m.includes("invalid object") ||
    m.includes("invalid column") ||
    m.includes("permission") ||
    m.includes("syntax")
  ) {
    return false;
  }
  return (
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("econnreset") ||
    m.includes("econnrefused") ||
    m.includes("etimedout") ||
    m.includes("socket") ||
    m.includes("deadlock") ||
    m.includes("was deadlocked") ||
    m.includes("transport-level") ||
    m.includes("connection is closed") ||
    m.includes("connection lost") ||
    m.includes("not connected") ||
    m.includes("failed to connect") ||
    m.includes("network") ||
    m.includes("broken pipe") ||
    m.includes("too many") ||
    m.includes("resource")
  );
}

export type RetryOptions = {
  attempts?: number;
  delaysMs?: number[];
  label?: string;
};

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const delays = opts.delaysMs ?? [250, 800, 2000];
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i + 1);
    } catch (e) {
      last = e;
      const transient = isTransientError(e);
      const more = i < attempts - 1 && transient;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[rpm-assure] retry ${opts.label ?? "op"} attempt ${i + 1}/${attempts} ${more ? "will-retry" : "give-up"}: ${msg.slice(0, 180)}`,
      );
      if (!more) break;
      await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
    }
  }
  throw last;
}

export async function withRetrySoft<T>(
  fn: (attempt: number) => Promise<T>,
  fallback: T,
  opts: RetryOptions = {},
): Promise<T> {
  try {
    return await withRetry(fn, opts);
  } catch {
    return fallback;
  }
}