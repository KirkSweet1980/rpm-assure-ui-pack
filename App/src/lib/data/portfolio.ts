import { createServerFn } from "@tanstack/react-start";
import { getDemoCustomerDetail, getDemoPortfolio } from "./demo-portfolio";
import { fetchLiveCustomerDetail, fetchLivePortfolio } from "./live-portfolio";
import { applyVendorMapCover, applyVendorMapCoverDetail } from "./apply-vendor-map-cover";
import { getDataMode, hasSqlConfig, sqlConfigDebug } from "./sql-config";
import { getLastPoolError } from "./sql-pool";
import type { CustomerDetailPayload, DetailLeg, PortfolioPayload } from "./types";
import { fillCustomerPanels } from "./fill-customer-panels";
import { withRetry } from "./retry";
import {
  cacheGet,
  cacheGetOrLoad,
  cacheInvalidate,
  CUSTOMER_TTL_MS,
  PORTFOLIO_TTL_MS,
} from "./query-cache";

function normalizeCustomerCode(raw: string): string {
  let s = String(raw ?? "").trim();
  try {
    // Paths may arrive still encoded (AHI%20Carrier)
    s = decodeURIComponent(s);
  } catch {
    /* keep raw */
  }
  return s.trim();
}

async function loadPortfolio(): Promise<PortfolioPayload> {
  return cacheGetOrLoad("portfolio", PORTFOLIO_TTL_MS, async () => {
    const mode = getDataMode();
    if (mode === "demo") {
      return getDemoPortfolio();
    }
    if (!hasSqlConfig()) {
      if (mode === "live") {
        console.warn("[rpm-assure] DATA_MODE=live but SQL env missing — using demo");
      }
      return getDemoPortfolio();
    }
    try {
      const t0 = Date.now();
      const live = await withRetry(
        () => fetchLivePortfolio(),
        { attempts: 3, delaysMs: [400, 1200, 2500], label: "portfolio" },
      );
      console.info(`[rpm-assure] portfolio SQL ${Date.now() - t0}ms`);
      if (live) {
        await applyVendorMapCover(live).catch(() => undefined);
        return live;
      }
      console.warn("[rpm-assure] SQL returned null:", getLastPoolError());
      return getDemoPortfolio();
    } catch (e) {
      console.error("[rpm-assure] portfolio SQL error after retries", e);
      return getDemoPortfolio();
    }
  });
}

async function loadCustomer(
  codeRaw: string,
  legs?: DetailLeg[],
): Promise<CustomerDetailPayload | null> {
  const code = normalizeCustomerCode(codeRaw);
  if (!code) return null;

  const legKey = !legs || legs.includes("all") || legs.length === 0
    ? "all"
    : [...new Set(legs)].sort().join("+");
  const key = "customer:" + code.toUpperCase() + ":" + legKey;

  // Reuse a fresh full payload for subset legs (module clicks stay instant)
  if (legKey !== "all") {
    const full = cacheGet<CustomerDetailPayload>(
      "customer:" + code.toUpperCase() + ":all",
      CUSTOMER_TTL_MS,
    );
    if (full) return full;
  }

  // Never serve a previously cached miss for long — clear null entries
  try {
    const { cacheGet } = await import("./query-cache");
    const hit = cacheGet<CustomerDetailPayload | null>(key, CUSTOMER_TTL_MS);
    if (hit === null) {
      cacheInvalidate(key);
    }
  } catch {
    /* optional */
  }

  return cacheGetOrLoad(key, CUSTOMER_TTL_MS, async () => {
    const mode = getDataMode();
    let result: CustomerDetailPayload | null = null;

    if (mode === "demo") {
      const d = getDemoCustomerDetail(code);
      result = d ? fillCustomerPanels(d) : null;
    } else if (hasSqlConfig()) {
      try {
        const t0 = Date.now();
        const live = await withRetry(
          () => fetchLiveCustomerDetail(code, { legs }),
          { attempts: 3, delaysMs: [400, 1200, 2500], label: `customer:${code}` },
        );
        console.info(
          `[rpm-assure] customer ${code} SQL ${Date.now() - t0}ms live=${!!live}`,
        );
        if (live) {
          await applyVendorMapCoverDetail(live).catch(() => undefined);
          result = live;
        }
      } catch (e) {
        console.error("[rpm-assure] customer SQL error after retries", e);
      }
      if (!result) {
        // Demo fallback so board never blanks a known pilot code
        const demo = getDemoCustomerDetail(code);
        result = demo ? fillCustomerPanels(demo) : null;
      }
    } else {
      const demo = getDemoCustomerDetail(code);
      result = demo ? fillCustomerPanels(demo) : null;
    }

    // Do not cache misses — retry next navigation after map/SQL fix
    if (result == null) {
      console.warn(`[rpm-assure] customer detail null for code="${code}"`);
      // Return null without storing: override cacheGetOrLoad by deleting after
      setTimeout(() => cacheInvalidate(key), 0);
    }
    return result;
  });
}


export { softMissingCustomer } from "./soft-customer";

export const fetchPortfolio = createServerFn({ method: "GET" }).handler(
  async (): Promise<PortfolioPayload> => loadPortfolio(),
);

/** Bust portfolio cache and reload from SQL (Exco auto-refresh / manual refresh). */
export const refreshPortfolio = createServerFn({ method: "GET" })
  .validator((data: { force?: boolean } | undefined) => data ?? {})
  .handler(async ({ data }): Promise<PortfolioPayload> => {
    if (data?.force !== false) {
      cacheInvalidate("portfolio");
    }
    return loadPortfolio();
  });

/** Used by /api/portfolio-refresh (plain JSON, reliable on Windows). */
export async function loadPortfolioForRefresh(force = true): Promise<PortfolioPayload> {
  if (force) cacheInvalidate("portfolio");
  return loadPortfolio();
}

export const fetchCustomerDetail = createServerFn({ method: "POST" })
  .validator((data: { code: string; legs?: DetailLeg[] }) => data)
  .handler(async ({ data }): Promise<CustomerDetailPayload | null> =>
    loadCustomer(data.code, data.legs),
  );

export const fetchDataSourceStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const mode = getDataMode();
    const configured = hasSqlConfig();
    let liveOk = false;
    let error: string | null = null;
    let customerCount: number | null = null;
    if (configured && mode !== "demo") {
      try {
        const p = await loadPortfolio();
        liveOk =
          p.summary.dataMode === "live" || (p.rows?.length ?? 0) > 0;
        customerCount = p?.summary.totalCustomers ?? null;
        if (!liveOk) error = getLastPoolError();
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    }
    const dbg = sqlConfigDebug();
    return {
      mode,
      configured,
      liveOk,
      error,
      customerCount,
      server: process.env.RPM_ASSURE_SQL_SERVER ?? null,
      database: process.env.RPM_ASSURE_SQL_DATABASE ?? "RPMAssure_App",
      debug: dbg,
    };
  },
);
