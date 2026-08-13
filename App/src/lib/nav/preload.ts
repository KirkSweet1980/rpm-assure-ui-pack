/**
 * Shared SPA preload strategy for RPM Assure.
 *
 * Goals:
 * - Intent preload (hover/focus) without stampeding SQL
 * - Deduplicate concurrent preloads of the same href
 * - Cap concurrency so idle warm-up never blocks the active tab
 * - Prefer parent-route cache hits (customer detail is stale for 2–3 min)
 */

// Loosely typed — TanStack Router's preloadRoute generics are too strict for href-based SPA nav.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouterLike = {
  preloadRoute?: (opts: any) => Promise<unknown> | unknown;
  load?: (opts: any) => Promise<unknown> | unknown;
  buildLocation?: (opts: any) => { href?: string; pathname?: string };
  state?: { location?: { pathname?: string } };
  navigate?: (opts: any) => Promise<unknown> | unknown;
};

const done = new Map<string, number>(); // href -> completedAt
const inflight = new Map<string, Promise<void>>();
let active = 0;
const queue: Array<() => void> = [];

const DONE_TTL_MS = 90_000;
const MAX_CONCURRENT = 2;

function normalizeHref(href: string): string {
  if (!href) return "";
  try {
    // Absolute URL → path only
    if (/^https?:\/\//i.test(href)) {
      const u = new URL(href);
      return (u.pathname.replace(/\/$/, "") || "/") + (u.search || "");
    }
  } catch {
    /* keep */
  }
  const path = href.split("#")[0] || "";
  const bare = path.replace(/\/$/, "") || "/";
  return bare.startsWith("/") ? bare : `/${bare}`;
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift();
    next?.();
  }
}

/**
 * Preload a route by in-app href. Safe to call frequently.
 * Returns immediately; work is scheduled with concurrency limit.
 */
export function preloadHref(
  router: RouterLike | null | undefined,
  href: string,
  opts?: { force?: boolean; priority?: "high" | "low" },
): void {
  if (!router || !href) return;
  if (typeof window === "undefined") return;

  const key = normalizeHref(href);
  if (!key || key === "#") return;

  // Skip current location
  try {
    const here = normalizeHref(
      router.state?.location?.pathname || window.location.pathname,
    );
    if (here === key) {
      done.set(key, Date.now());
      return;
    }
  } catch {
    /* ignore */
  }

  const now = Date.now();
  if (!opts?.force) {
    const at = done.get(key);
    if (at != null && now - at < DONE_TTL_MS) return;
    if (inflight.has(key)) return;
  }

  const run = () => {
    active += 1;
    const p = (async () => {
      try {
        const loc =
          typeof router.buildLocation === "function"
            ? router.buildLocation({ to: key, href: key } as never)
            : null;
        if (typeof router.preloadRoute === "function") {
          await Promise.resolve(
            router.preloadRoute({
              to: key,
              href: key,
              ...(loc ? { from: loc } : {}),
            } as never),
          );
        } else if (typeof router.load === "function") {
          await Promise.resolve(router.load({ to: key, href: key } as never));
        }
        done.set(key, Date.now());
      } catch {
        // Soft-fail: next intent can retry
        done.delete(key);
      } finally {
        inflight.delete(key);
        active = Math.max(0, active - 1);
        pump();
      }
    })();
    inflight.set(key, p);
  };

  if (opts?.priority === "high" && active < MAX_CONCURRENT) {
    run();
  } else {
    queue.push(run);
    // High priority jumps the queue front
    if (opts?.priority === "high" && queue.length > 1) {
      const job = queue.pop()!;
      queue.unshift(job);
    }
    pump();
  }
}

/** Cancel pending low-priority idle work (optional). */
export function clearPreloadQueue(): void {
  queue.length = 0;
}

/**
 * Warm a list of hrefs during browser idle time (after paint).
 * Used when landing on a customer workspace to preload covered pillars.
 */
export function warmHrefsIdle(
  router: RouterLike | null | undefined,
  hrefs: string[],
  opts?: { delayMs?: number; max?: number },
): () => void {
  if (!router || typeof window === "undefined") return () => {};
  const delay = opts?.delayMs ?? 120;
  const max = opts?.max ?? 8;
  const list = [...new Set(hrefs.map(normalizeHref).filter(Boolean))].slice(0, max);

  let cancelled = false;
  let idleId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let i = 0;

  const step = () => {
    if (cancelled || i >= list.length) return;
    const href = list[i++];
    preloadHref(router, href, { priority: "low" });
    if (i < list.length) {
      schedule();
    }
  };

  const schedule = () => {
    if (cancelled) return;
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      idleId = ric(() => step(), { timeout: 1200 });
    } else {
      timeoutId = setTimeout(step, 80);
    }
  };

  timeoutId = setTimeout(() => {
    if (!cancelled) schedule();
  }, delay);

  return () => {
    cancelled = true;
    if (timeoutId != null) clearTimeout(timeoutId);
    if (idleId != null) {
      const cic = (
        window as Window & { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback;
      cic?.(idleId);
    }
  };
}
