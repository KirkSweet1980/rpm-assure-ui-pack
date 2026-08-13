import { createFileRoute } from "@tanstack/react-router";
import { loadPortfolioForRefresh } from "@/lib/data/portfolio";

function corsHeaders() {
  const origin = process.env.RPM_ASSURE_WP_ORIGIN || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=60",
  };
}

function tokenOk(request: Request): boolean {
  const expected = process.env.RPM_ASSURE_WP_TOKEN ?? "";
  if (!expected) return false;
  const url = new URL(request.url);
  const got =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    url.searchParams.get("token") ||
    "";
  return got.length > 0 && got === expected;
}

export const Route = createFileRoute("/api/wp/estate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request }) => {
        if (!process.env.RPM_ASSURE_WP_TOKEN) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "Set RPM_ASSURE_WP_TOKEN on the Assure app server.",
            }),
            { status: 503, headers: corsHeaders() },
          );
        }
        if (!tokenOk(request)) {
          return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
            status: 401,
            headers: corsHeaders(),
          });
        }
        try {
          const portfolio = await loadPortfolioForRefresh(false);
          const url = new URL(request.url);
          const only = (url.searchParams.get("code") || "").trim().toUpperCase();
          const rows = (portfolio.rows ?? [])
            .filter((r) => !only || r.customerCode.toUpperCase() === only)
            .map((r) => ({
              code: r.customerCode,
              name: r.displayName,
              health: r.healthRag,
              summary: r.healthSummary,
              collectAt: r.lastImportAt,
              cover: {
                syspro: r.cover?.syspro === true || r.pillarSyspro === true,
                rmm: r.cover?.rmm === true || r.pillarPulseway === true,
                cove: r.cover?.cove === true || r.pillarCove === true,
                epp: r.cover?.epp === true || r.pillarEpp === true,
                csp: r.cover?.csp === true || r.pillarCsp === true,
              },
              jobs: r.sysproJobErrorCount ?? 0,
              finsight: r.sysproDtrVarianceLines ?? 0,
              rmmOffline: r.pulsewayServerOffline ?? r.pulsewayOfflineCount ?? 0,
            }));
          const green = rows.filter((r) => r.health === "Green").length;
          const amber = rows.filter((r) => r.health === "Amber").length;
          const red = rows.filter((r) => r.health === "Red").length;
          return new Response(
            JSON.stringify({
              ok: true,
              generatedAt: new Date().toISOString(),
              totals: { n: rows.length, green, amber, red },
              customers: rows,
            }),
            { status: 200, headers: corsHeaders() },
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: corsHeaders(),
          });
        }
      },
    },
  },
});
