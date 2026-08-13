import { createFileRoute } from "@tanstack/react-router";
import { loadPortfolioForRefresh } from "@/lib/data/portfolio";
import { getDataMode, hasSqlConfig, sqlConfigDebug } from "@/lib/data/sql-config";
import { getLastPoolError } from "@/lib/data/sql-pool";

/**
 * Exco / estate auto-refresh endpoint.
 * GET /api/portfolio-refresh?force=1
 * Returns { ok, portfolio, source, refreshedAt }
 */
export const Route = createFileRoute("/api/portfolio-refresh")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const force = url.searchParams.get("force") !== "0";
        try {
          const portfolio = await loadPortfolioForRefresh(force);
          const mode = getDataMode();
          const configured = hasSqlConfig();
          let liveOk = false;
          let error: string | null = null;
          let customerCount: number | null = null;
          if (configured && mode !== "demo") {
            liveOk =
              portfolio.summary?.dataMode === "live" ||
              (portfolio.rows?.length ?? 0) > 0;
            customerCount = portfolio?.summary?.totalCustomers ?? null;
            if (!liveOk) error = getLastPoolError();
          }
          const source = {
            mode,
            configured,
            liveOk,
            error,
            customerCount,
            server: process.env.RPM_ASSURE_SQL_SERVER ?? null,
            database: process.env.RPM_ASSURE_SQL_DATABASE ?? "RPMAssure_App",
            debug: sqlConfigDebug(),
          };
          return new Response(
            JSON.stringify({
              ok: true,
              portfolio,
              source,
              refreshedAt: new Date().toISOString(),
              force,
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
              },
            },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        }
      },
    },
  },
});
